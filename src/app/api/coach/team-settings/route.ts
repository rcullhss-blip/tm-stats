import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { normalizeSkillLevel } from '@/lib/sg-engine'

// Coach-only team settings:
//   benchmark             – the Strokes Gained level the whole squad is measured
//                           against (null = each player's own handicap level)
//   playersSeeLeaderboard – whether players can see the squad leaderboard
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()
  if (profile?.subscription_status !== 'team') return NextResponse.json({ error: 'Coach account required' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: team } = await service.from('teams').select('id').eq('coach_user_id', user.id).limit(1).maybeSingle()
  if (!team) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  if ('benchmark' in body) {
    const level = body.benchmark === null ? null : normalizeSkillLevel(String(body.benchmark))
    if (body.benchmark !== null && !level) return NextResponse.json({ error: 'Unknown benchmark' }, { status: 400 })
    update.benchmark = level
  }
  if ('playersSeeLeaderboard' in body) update.players_see_leaderboard = body.playersSeeLeaderboard === true

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })

  const { error } = await service.from('teams').update(update).eq('id', team.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // A team benchmark is applied to every player on the team, so their Stats,
  // rounds and coaching all read against it. A player can still change their own.
  if ('benchmark' in update) {
    const { data: members } = await service.from('team_members').select('user_id').eq('team_id', team.id)
    const ids = (members ?? []).map((m: { user_id: string }) => m.user_id)
    if (ids.length > 0) await service.from('users').update({ sg_baseline: update.benchmark }).in('id', ids)
  }

  return NextResponse.json({ ok: true })
}
