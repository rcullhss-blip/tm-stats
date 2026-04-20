import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { joinCode } = await request.json()
  if (!joinCode?.trim()) return NextResponse.json({ error: 'Join code required' }, { status: 400 })

  const service = createServiceClient()

  // Look up team by join code (service client bypasses RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (service as any)
    .from('teams')
    .select('id, name, coach_user_id')
    .eq('join_code', joinCode.trim().toUpperCase())
    .single()

  if (!team) return NextResponse.json({ error: 'Invalid join code' }, { status: 400 })

  // Can't join your own team
  if (team.coach_user_id === user.id) {
    return NextResponse.json({ error: 'You cannot join your own team' }, { status: 400 })
  }

  // Check already a member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (service as any)
    .from('team_members')
    .select('id')
    .eq('team_id', team.id)
    .eq('user_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: `You are already in ${team.name}` }, { status: 400 })

  // Join the team
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any).from('team_members').insert({
    team_id: team.id,
    user_id: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, teamName: team.name })
}
