import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()
  if (profile?.subscription_status !== 'team') return NextResponse.json({ error: 'Coach account required' }, { status: 403 })

  const { playerId, notes } = await request.json()
  if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 })

  const service = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (service as any).from('teams').select('id').eq('coach_user_id', user.id).single()
  if (!team) return NextResponse.json({ error: 'No team found' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any)
    .from('team_members')
    .update({ coach_notes: notes ?? null })
    .eq('team_id', team.id)
    .eq('user_id', playerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
