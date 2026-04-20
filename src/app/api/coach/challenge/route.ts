import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is a coach
  const { data: profile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()
  if (profile?.subscription_status !== 'team') {
    return NextResponse.json({ error: 'Coach account required' }, { status: 403 })
  }

  const { roundId, playerId, originalFeedback, coachContext } = await request.json()
  if (!roundId || !playerId || !originalFeedback || !coachContext) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = createServiceClient()

  // Verify coach owns a team that this player is on
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (service as any).from('teams').select('id').eq('coach_user_id', user.id).single()
  if (!team) return NextResponse.json({ error: 'No team found' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (service as any).from('team_members').select('id').eq('team_id', team.id).eq('user_id', playerId).single()
  if (!membership) return NextResponse.json({ error: 'Player not in your team' }, { status: 403 })

  // Generate revised feedback
  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 400,
    messages: [
      {
        role: 'system',
        content: `You are an experienced golf coach. You have AI-generated feedback for one of your players and additional coaching context that the AI doesn't know about.
Your job is to produce a revised, improved recommendation that combines the statistical insight from the AI with your personal coaching knowledge.
Be direct, practical, and specific. Keep the response under 250 words.`,
      },
      {
        role: 'user',
        content: `Original AI feedback:\n${originalFeedback}\n\nCoach context (what the AI doesn't know):\n${coachContext}\n\nPlease produce a revised coaching recommendation that incorporates this additional context.`,
      },
    ],
  })

  const revisedFeedback = completion.choices[0]?.message?.content ?? ''

  // Save to DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any).from('coach_ai_challenges').insert({
    round_id: roundId,
    player_id: playerId,
    coach_id: user.id,
    original_ai_feedback: originalFeedback,
    coach_context: coachContext,
    revised_ai_feedback: revisedFeedback,
  })

  return NextResponse.json({ revisedFeedback })
}
