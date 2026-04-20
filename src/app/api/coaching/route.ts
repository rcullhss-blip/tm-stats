import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { calculateRoundSG, handicapToSkillLevel, SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/sg-engine'
import type { ShotEntry, HoleRow } from '@/lib/types'

// Map legacy DB values to new keys (backward compatibility)
const LEGACY_MAP: Record<string, string> = {
  butch: 'fundamentals',
  leadbetter: 'technical',
  pelz: 'short_game',
  haney: 'ball_flight',
}

const COACH_PROMPTS: Record<string, string> = {
  club_pro: 'You are a friendly, experienced club professional. Give practical, encouraging advice in simple language with no jargon. Focus on immediately actionable fixes.',
  fundamentals: 'You are a fundamentals-focused coach. Direct, basics-first, no fluff. Short sentences, clear corrections. Core technique is everything — grip, posture, alignment, ball position first.',
  technical: 'You are a technical analyst coach. Structured and detailed. Always explain cause and effect — what is happening mechanically and why. Use precise language about swing positions and movement patterns.',
  short_game: 'You are a short game specialist. Everything inside 100 yards is your domain. Emphasise the scoring impact of every short game weakness. Pitching, chipping, bunker play, and putting are where rounds are won and lost.',
  ball_flight: 'You are a ball flight coach. Start line, face angle, path, and dispersion patterns are your framework. Always identify the shot pattern first, then diagnose the root cause. Use ball flight laws to explain what is happening.',
  encourager: 'You are a highly positive, motivating coach. Lead with what is going well. Frame every weakness as an exciting opportunity for improvement. Confidence and momentum are the foundation of better golf.',
  straight_talker: 'You are a straight-talking performance coach. Blunt and direct — no padding, no fluff. State exactly what the numbers show and what needs to change. Outcome-focused only.',
}

const FEEDBACK_DEPTH: Record<string, string> = {
  simple: 'Keep it concise — 2-3 key observations in plain English, no jargon. Then suggest 2 simple named drills they can do at their next practice.',
  intermediate: 'Give stats context, 2-3 specific observations, then recommend 2-3 named practice drills with brief instructions on how to do each one.',
  advanced: 'Deep analysis — identify root causes and patterns, then prescribe 3 specific named drills with clear instructions. Explain why each drill targets the identified weakness.',
}

function sanitiseFeedback(text: string): string {
  return text
    .replace(/You are trained on data up to [A-Za-z]+ \d{4}\.?\s*/gi, '')
    .trim()
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your-key-here') {
    return NextResponse.json({ error: 'AI coaching not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = createServiceClient()

  // If playerId is provided, caller is a coach viewing a player's round
  const playerId = body.playerId as string | undefined
  const targetUserId = playerId ?? user.id

  // Verify coach has this player in their team if playerId provided
  let coachContext = ''
  if (playerId) {
    const { data: callerProfile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()
    if (callerProfile?.subscription_status !== 'team') return NextResponse.json({ error: 'Coach account required' }, { status: 403 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: team } = await (service as any).from('teams').select('id').eq('coach_user_id', user.id).single()
    if (!team) return NextResponse.json({ error: 'No team found' }, { status: 403 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership } = await (service as any).from('team_members').select('id, coach_notes').eq('team_id', team.id).eq('user_id', playerId).single()
    if (!membership) return NextResponse.json({ error: 'Player not in your team' }, { status: 403 })
    coachContext = membership.coach_notes ?? ''
  }

  // Fetch profile of the target user (player or self)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (service as any)
    .from('users')
    .select('handicap, sg_baseline, feedback_level, coach_persona, subscription_status')
    .eq('id', targetUserId)
    .single()

  if (!playerId) {
    const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'
    if (!isPro) return NextResponse.json({ error: 'Pro feature' }, { status: 403 })
  }

  const skillLevel: SkillLevel = (profile?.sg_baseline as SkillLevel | null) ?? handicapToSkillLevel(profile?.handicap ?? null)
  const feedbackLevel = profile?.feedback_level ?? 'intermediate'
  const rawPersona = profile?.coach_persona ?? 'club_pro'
  const coachPersona = LEGACY_MAP[rawPersona] ?? rawPersona

  let userPrompt: string

  // ── Overall stats mode ─────────────────────────────────────────────────────
  if (body.mode === 'overall') {
    const s = body.stats as Record<string, unknown>
    const sgBlock = s.hasSG
      ? `\nStrokes Gained averages (vs ${SKILL_LEVEL_LABELS[skillLevel]}, ${s.sgRounds} rounds):
  Total SG: ${s.sgTotal}
  Off tee: ${s.sgOffTee}
  Approach: ${s.sgApproach}
  Around green: ${s.sgAroundGreen}
  Putting: ${s.sgPutt}`
      : '\nStrokes Gained: Not available (no full-tracking rounds)'

    userPrompt = `Here is the overall stats summary for a golfer with handicap ${profile?.handicap ?? 'unknown'} (${s.roundCount} rounds analysed):

Avg score: ${s.avgScore} vs par
Best round: ${s.bestRound} | Worst: ${s.worstRound}
Fairways hit: ${s.firPct !== null ? s.firPct + '%' : 'N/A'}
GIR: ${s.girPct}%
Putts/hole: ${s.puttsPerHole}
Up & down: ${s.udPct !== null ? s.udPct + '%' : 'N/A'}
${sgBlock}

Scoring breakdown — Eagles: ${s.eagles}, Birdies: ${s.birdies}, Pars: ${s.pars}, Bogeys: ${s.bogeys}, Doubles+: ${s.doubles}

Based on these trends, give overall coaching feedback. Identify the biggest area for improvement and what to focus on.`

  // ── Single round review mode ───────────────────────────────────────────────
  } else if (body.mode === 'review') {
    const roundId = body.roundId as string
    if (!roundId) return NextResponse.json({ error: 'Missing roundId' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: round }, { data: holesRaw }] = await Promise.all([
      (service as any).from('rounds').select('*').eq('id', roundId).eq('user_id', targetUserId).single(),
      (service as any).from('holes').select('*').eq('round_id', roundId).order('hole_number'),
    ])

    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const holes: HoleRow[] = holesRaw ?? []
    const totalPar = round.par_total ?? holes.reduce((s, h) => s + h.par, 0)
    const totalScore = round.score_total ?? holes.reduce((s, h) => s + h.score, 0)
    const girs = holes.filter(h => h.gir === true).length
    const totalPutts = holes.reduce((s, h) => s + (h.putts ?? 0), 0)
    const udMade = holes.filter(h => h.up_and_down === true).length
    const udAttempts = holes.filter(h => h.gir === false).length

    const sgData = round.input_mode === 'full'
      ? calculateRoundSG(
          holes.map(h => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots as ShotEntry[] | null })),
          skillLevel
        )
      : null

    const sgBlock = sgData
      ? `Strokes Gained: Total ${sgData.sgTotal.toFixed(2)}, Off tee ${sgData.sgOffTee.toFixed(2)}, Approach ${sgData.sgApproach.toFixed(2)}, Around green ${sgData.sgAroundGreen.toFixed(2)}, Putting ${sgData.sgPutt.toFixed(2)}`
      : 'Strokes Gained: not available'

    userPrompt = `Round data — handicap ${profile?.handicap ?? 'unknown'}, ${round.course_name}, ${round.holes} holes:
Score: ${totalScore} (${totalScore - totalPar > 0 ? '+' : ''}${totalScore - totalPar}) on par ${totalPar}
GIR: ${girs}/${holes.length}, Putts: ${totalPutts}, Up & down: ${udMade}/${udAttempts}
${sgBlock}

Provide a structured round review with exactly these three sections:
WEAKNESS: [One sentence — the single biggest weakness in this round based on the data]
FIX: [One sentence — the single most impactful thing to work on in practice]
MODE: [One of: Club Pro, Fundamentals Coach, Technical Analyst, Short Game Specialist, Ball Flight Coach, Encourager, Straight Talker] — [One sentence explaining why this mode suits this player based on the data]`

    const reviewSystemPrompt = `You are a data-driven golf performance analyst. Output only the three structured sections requested — no introduction, no extra commentary.

End with this exact line:
---
TM Stats coaching modes are generalised coaching styles and are not affiliated with or representative of any individual coach.`

    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        { role: 'system', content: reviewSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const feedback = sanitiseFeedback(sanitiseFeedback(completion.choices[0]?.message?.content ?? ''))
    return NextResponse.json({ feedback, coach: 'review', level: feedbackLevel })

  // ── Practice session planner ──────────────────────────────────────────────
  } else if (body.mode === 'practice') {
    const roundId = body.roundId as string
    if (!roundId) return NextResponse.json({ error: 'Missing roundId' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: round }, { data: holesRaw }] = await Promise.all([
      (service as any).from('rounds').select('*').eq('id', roundId).eq('user_id', targetUserId).single(),
      (service as any).from('holes').select('*').eq('round_id', roundId).order('hole_number'),
    ])

    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const holes: HoleRow[] = holesRaw ?? []
    const totalPar = round.par_total ?? holes.reduce((s, h) => s + h.par, 0)
    const totalScore = round.score_total ?? holes.reduce((s, h) => s + h.score, 0)
    const girs = holes.filter(h => h.gir === true).length
    const totalPutts = holes.reduce((s, h) => s + (h.putts ?? 0), 0)
    const udMade = holes.filter(h => h.up_and_down === true).length
    const udAttempts = holes.filter(h => h.gir === false).length

    const sgData = round.input_mode === 'full'
      ? calculateRoundSG(
          holes.map(h => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots as ShotEntry[] | null })),
          skillLevel
        )
      : null

    const sgBlock = sgData
      ? `Strokes Gained: Total ${sgData.sgTotal.toFixed(2)}, Off tee ${sgData.sgOffTee.toFixed(2)}, Approach ${sgData.sgApproach.toFixed(2)}, Around green ${sgData.sgAroundGreen.toFixed(2)}, Putting ${sgData.sgPutt.toFixed(2)}`
      : 'Strokes Gained: not available'

    const practiceUserPrompt = `Round data — handicap ${profile?.handicap ?? 'unknown'}, ${round.course_name}, ${round.holes} holes:
Score: ${totalScore} (${totalScore - totalPar > 0 ? '+' : ''}${totalScore - totalPar}) on par ${totalPar}
GIR: ${girs}/${holes.length}, Putts: ${totalPutts}, Up & down: ${udMade}/${udAttempts}
${sgBlock}

Build a structured 45-minute practice session based on the weakest areas in this round. Output exactly this format:
FOCUS: [One sentence — the primary weakness this session targets]
BLOCK 1: [Block name] — [Duration]min: [What to do and why]
BLOCK 2: [Block name] — [Duration]min: [What to do and why]
BLOCK 3: [Block name] — [Duration]min: [What to do and why]
BLOCK 4: [Block name] — [Duration]min: [What to do and why]

Durations must total 45 minutes. Be specific and practical — drills achievable at a range or practice green.`

    const practiceSystemPrompt = `${COACH_PROMPTS[coachPersona] ?? COACH_PROMPTS.club_pro}

You are building a structured practice plan. Each block must have a clear drill or activity. Output only the structured format — no introduction, no extra commentary.

End with this exact line:
---
TM Stats coaching modes are generalised coaching styles and are not affiliated with or representative of any individual coach.`

    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      messages: [
        { role: 'system', content: practiceSystemPrompt },
        { role: 'user', content: practiceUserPrompt },
      ],
    })

    const feedback = sanitiseFeedback(completion.choices[0]?.message?.content ?? '')
    return NextResponse.json({ feedback, coach: coachPersona, level: feedbackLevel })

  // ── Pre-round plan ────────────────────────────────────────────────────────
  } else if (body.mode === 'pre_round') {
    const s = body.stats as Record<string, unknown>
    const practicePrompt = `Golfer profile: handicap ${s.handicap ?? 'unknown'}, averaging ${s.avgScore} vs par over last ${s.roundCount} rounds.
Biggest opportunity area: ${s.weakestCategoryLabel ?? 'not available'}.

Generate a pre-round plan with exactly 3 numbered points. Each point must be a specific, actionable course management instruction — not a swing tip. Focus on decision-making and mindset on the course.

Format exactly:
1. [instruction]
2. [instruction]
3. [instruction]

No introduction. No extra commentary.`

    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [
        { role: 'system', content: 'You are a trusted golf performance coach. Output only the 3 numbered points. Calm, confident, clear. No filler words.' },
        { role: 'user', content: practicePrompt },
      ],
    })
    return NextResponse.json({ feedback: sanitiseFeedback(completion.choices[0]?.message?.content ?? '') })

  // ── Pattern finder ────────────────────────────────────────────────────────
  } else if (body.mode === 'patterns') {
    const rounds = body.rounds as Array<{ date: string; scoreToPar: number; roundType: string }>
    if (!rounds?.length) return NextResponse.json({ error: 'No round data' }, { status: 400 })

    const roundSummary = rounds.map(r =>
      `${r.date}: ${r.scoreToPar > 0 ? '+' : ''}${r.scoreToPar} (${r.roundType})`
    ).join('\n')

    const patternPrompt = `Here are a golfer's recent rounds (handicap ${profile?.handicap ?? 'unknown'}):\n${roundSummary}\n\nIdentify ONE clear pattern or insight from this data. Output a single sentence starting with "TM Stats has spotted a pattern:" — always positive or neutral framing, never negative. Examples of tone: "Your scoring improves in practice rounds", "Your last 4 rounds show consistent par-or-better front 9 performance", "You've shot under your handicap in 3 of your last 5 rounds."`

    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 80,
      messages: [
        { role: 'system', content: 'Output one sentence only. No introduction. Always positive or neutral.' },
        { role: 'user', content: patternPrompt },
      ],
    })
    return NextResponse.json({ feedback: sanitiseFeedback(completion.choices[0]?.message?.content ?? '') })

  // ── Bad round recovery ────────────────────────────────────────────────────
  } else if (body.mode === 'recovery') {
    const scoreToPar = body.scoreToPar as number
    const doubles = body.doubles as number
    const weakestStat = body.weakestStat as string | undefined
    const recoveryPrompt = `A golfer (handicap ${body.handicap ?? 'unknown'}) just scored ${scoreToPar > 0 ? '+' : ''}${scoreToPar} vs par with ${doubles} double bogeys or worse. Their weakest stat today: ${weakestStat ?? 'unknown'}.

Output exactly 4 lines with no labels or headers:
Line 1: One calm, non-judgemental opening sentence acknowledging it wasn't their best day.
Line 2: One specific observation about the main issue (based on their weakest stat).
Line 3: One simple, concrete thing to focus on next round to address it.
Line 4: One short reassurance that focuses on moving forward.

No intro, no labels, no extra text.`

    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [
        { role: 'system', content: 'You are a calm, experienced golf mentor. Never dwell on the bad round. Always forward-focused. Tone: reassuring, experienced, brief.' },
        { role: 'user', content: recoveryPrompt },
      ],
    })
    return NextResponse.json({ feedback: sanitiseFeedback(completion.choices[0]?.message?.content ?? '') })

  // ── Single round coaching mode ─────────────────────────────────────────────
  } else {
    const roundId = body.roundId as string
    if (!roundId) return NextResponse.json({ error: 'Missing roundId' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: round }, { data: holesRaw }] = await Promise.all([
      (service as any).from('rounds').select('*').eq('id', roundId).eq('user_id', targetUserId).single(),
      (service as any).from('holes').select('*').eq('round_id', roundId).order('hole_number'),
    ])

    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const holes: HoleRow[] = holesRaw ?? []
    const totalPar = round.par_total ?? holes.reduce((s, h) => s + h.par, 0)
    const totalScore = round.score_total ?? holes.reduce((s, h) => s + h.score, 0)
    const scoreToPar = totalScore - totalPar
    const fairwaysHit = holes.filter(h => h.par !== 3 && h.fir === true).length
    const fairwaysTotal = holes.filter(h => h.par !== 3).length
    const girs = holes.filter(h => h.gir === true).length
    const totalPutts = holes.reduce((s, h) => s + (h.putts ?? 0), 0)
    const udMade = holes.filter(h => h.up_and_down === true).length
    const udAttempts = holes.filter(h => h.gir === false).length
    const sandSaves = holes.filter(h => h.sand_save === true).length
    const sandAttempts = holes.filter(h => h.sand_save !== null).length

    const sgData = round.input_mode === 'full'
      ? calculateRoundSG(
          holes.map(h => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots as ShotEntry[] | null })),
          skillLevel
        )
      : null

    const scoreLabel = scoreToPar === 0 ? 'even par' : scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`
    const statsLines = [
      `Score: ${totalScore} (${scoreLabel}) on a par ${totalPar} course`,
      `Holes: ${round.holes} | Type: ${round.round_type} | Course: ${round.course_name}`,
      fairwaysTotal > 0 ? `Fairways: ${fairwaysHit}/${fairwaysTotal} (${Math.round(fairwaysHit / fairwaysTotal * 100)}%)` : null,
      `GIR: ${girs}/${holes.length} (${Math.round(girs / holes.length * 100)}%)`,
      `Putts: ${totalPutts} total${holes.length > 0 ? `, ${(totalPutts / holes.length).toFixed(1)}/hole` : ''}`,
      udAttempts > 0 ? `Up & down: ${udMade}/${udAttempts} (${Math.round(udMade / udAttempts * 100)}%)` : null,
      sandAttempts > 0 ? `Sand saves: ${sandSaves}/${sandAttempts}` : null,
    ].filter(Boolean).join('\n')

    const sgBlock = sgData
      ? `\nStrokes Gained (vs ${SKILL_LEVEL_LABELS[skillLevel]}):
  Total SG: ${sgData.sgTotal.toFixed(2)}
  Off tee: ${sgData.sgOffTee.toFixed(2)}
  Approach: ${sgData.sgApproach.toFixed(2)}
  Around green: ${sgData.sgAroundGreen.toFixed(2)}
  Putting: ${sgData.sgPutt.toFixed(2)}`
      : '\nStrokes Gained: Not available (round logged in quick mode)'

    const notesBlock = round.notes ? `\nPlayer notes: "${round.notes}"` : ''
    const conditionParts = [
      round.mood ? `Mood: ${round.mood}` : null,
      round.energy_level ? `Energy: ${round.energy_level}` : null,
      round.conditions ? `Conditions: ${round.conditions}` : null,
    ].filter(Boolean)

    userPrompt = `Here is the round data for a golfer with handicap ${profile?.handicap ?? 'unknown'}:

${statsLines}${sgBlock}${notesBlock}${conditionParts.length ? '\n' + conditionParts.join(' | ') : ''}

Give them your coaching feedback.`
  }

  const coachContextBlock = coachContext
    ? `\n\nCoach's notes on this player (use this context to inform your feedback):\n${coachContext}`
    : ''

  const systemPrompt = `${COACH_PROMPTS[coachPersona] ?? COACH_PROMPTS.club_pro}${coachContextBlock}

${FEEDBACK_DEPTH[feedbackLevel] ?? FEEDBACK_DEPTH.intermediate}

Format your response in plain text. Use short paragraphs for the analysis. For drills, use this exact format on new lines:
DRILL 1: [Drill name] — [1-2 sentence instruction]
DRILL 2: [Drill name] — [1-2 sentence instruction]
DRILL 3: [Drill name] — [1-2 sentence instruction] (advanced only)

No other markdown. Keep the whole response under 300 words. Do NOT include any disclaimers about training data, knowledge cutoff dates, or AI limitations.

End your response with this exact line on a new line:
---
TM Stats coaching modes are generalised coaching styles and are not affiliated with or representative of any individual coach.`

  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 600,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const feedback = sanitiseFeedback(completion.choices[0]?.message?.content ?? '')
  return NextResponse.json({ feedback, coach: coachPersona, level: feedbackLevel })
}
