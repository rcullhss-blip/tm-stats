import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { calculateRoundSG, handicapToSkillLevel, normalizeSkillLevel, SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/sg-engine'
import type { ShotEntry } from '@/lib/types'

// Brief per-player stat breakdown for the admin users list (Rob only).
// Computed on demand when a user is expanded, so the main list stays light.
export async function GET(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = service as any

  // Skill level drives the SG baseline — same derivation as the player's own
  // stats page (explicit sg_baseline, else inferred from handicap).
  const { data: profile } = await sb
    .from('users')
    .select('handicap, sg_baseline')
    .eq('id', userId)
    .single()
  const explicitLevel = normalizeSkillLevel(profile?.sg_baseline)
  const skillLevel: SkillLevel = explicitLevel ?? handicapToSkillLevel(profile?.handicap ?? null)
  const levelInfo = {
    handicap: profile?.handicap ?? null,
    skillLevel: SKILL_LEVEL_LABELS[skillLevel],
    skillLevelSource: explicitLevel ? 'set' : 'from handicap',
  }

  const { data: roundsRaw } = await sb
    .from('rounds')
    .select('id, date, course_name, par_total, score_total, input_mode')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  interface RoundRow {
    id: string
    date: string
    course_name: string | null
    par_total: number | null
    score_total: number | null
    input_mode: string | null
  }
  const rounds: RoundRow[] = roundsRaw ?? []

  if (rounds.length === 0) {
    return NextResponse.json({ rounds: 0, fullRounds: 0, ...levelInfo })
  }

  const roundIds = rounds.map(r => r.id)
  const { data: holesRaw } = await sb
    .from('holes')
    .select('round_id, hole_number, par, score, fir, gir, putts, up_and_down, sand_save, shots')
    .in('round_id', roundIds)

  interface HoleRow {
    round_id: string
    hole_number: number
    par: number
    score: number
    fir: boolean | null
    gir: boolean | null
    putts: number | null
    up_and_down: boolean | null
    sand_save: boolean | null
    shots: ShotEntry[] | null
  }
  const holes: HoleRow[] = holesRaw ?? []

  const holesByRound = new Map<string, HoleRow[]>()
  for (const h of holes) {
    if (!holesByRound.has(h.round_id)) holesByRound.set(h.round_id, [])
    holesByRound.get(h.round_id)!.push(h)
  }

  // Per-round to-par (fall back to summing holes when totals are missing)
  let toParSum = 0
  let toParCount = 0
  let best: { toPar: number; course: string | null; date: string } | null = null
  for (const r of rounds) {
    const rHoles = holesByRound.get(r.id) ?? []
    const par = r.par_total ?? (rHoles.length ? rHoles.reduce((s, h) => s + h.par, 0) : null)
    const score = r.score_total ?? (rHoles.length ? rHoles.reduce((s, h) => s + h.score, 0) : null)
    if (par == null || score == null || par === 0) continue
    const toPar = score - par
    toParSum += toPar
    toParCount++
    if (best === null || toPar < best.toPar) best = { toPar, course: r.course_name, date: r.date }
  }

  // Accuracy metrics across all holes that carry the data
  const firHoles = holes.filter(h => h.par !== 3)
  const firHit = firHoles.filter(h => h.fir === true).length
  const girHit = holes.filter(h => h.gir === true).length
  const puttHoles = holes.filter(h => h.putts != null)
  const puttTotal = puttHoles.reduce((s, h) => s + (h.putts ?? 0), 0)
  const udAttempts = holes.filter(h => h.gir === false).length
  const udMade = holes.filter(h => h.up_and_down === true).length

  const roundsWithHoles = holesByRound.size
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null)

  // Strokes Gained — averaged across full-tracking rounds that have shot data.
  let sgRounds = 0
  const sgAcc = { total: 0, offTee: 0, approach: 0, aroundGreen: 0, putting: 0 }
  for (const r of rounds) {
    if (r.input_mode !== 'full') continue
    const rHoles = holesByRound.get(r.id) ?? []
    const summary = calculateRoundSG(
      rHoles.map(h => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots })),
      skillLevel,
    )
    if (!summary) continue
    sgRounds++
    sgAcc.total += summary.sgTotal
    sgAcc.offTee += summary.sgOffTee
    sgAcc.approach += summary.sgApproach
    sgAcc.aroundGreen += summary.sgAroundGreen
    sgAcc.putting += summary.sgPutt
  }
  const round1 = (n: number) => Math.round((n / sgRounds) * 10) / 10
  const sg = sgRounds > 0
    ? {
        rounds: sgRounds,
        total: round1(sgAcc.total),
        offTee: round1(sgAcc.offTee),
        approach: round1(sgAcc.approach),
        aroundGreen: round1(sgAcc.aroundGreen),
        putting: round1(sgAcc.putting),
      }
    : null

  return NextResponse.json({
    rounds: rounds.length,
    fullRounds: rounds.filter(r => r.input_mode === 'full').length,
    lastRoundDate: rounds[0]?.date ?? null,
    avgToPar: toParCount > 0 ? Math.round((toParSum / toParCount) * 10) / 10 : null,
    bestRound: best,
    girPct: pct(girHit, holes.length),
    firPct: pct(firHit, firHoles.length),
    upDownPct: pct(udMade, udAttempts),
    puttsPerRound: roundsWithHoles > 0 && puttHoles.length > 0
      ? Math.round((puttTotal / roundsWithHoles) * 10) / 10
      : null,
    sg,
    ...levelInfo,
  })
}
