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
    .select('*')
    .eq('join_code', joinCode.trim().toUpperCase())
    .single()

  if (!team) return NextResponse.json({ error: 'No team found with that code. Check it with your coach.' }, { status: 400 })

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

  // The squad's Strokes Gained benchmark applies to a new player straight away,
  // unless they have already picked one of their own.
  if (team.benchmark) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).from('users').update({ sg_baseline: team.benchmark }).eq('id', user.id).is('sg_baseline', null)
  }

  // Team players get Pro for the team's first year (the free year for teams).
  // Never downgrades anyone, never shortens Pro they already have.
  let proUntil: string | null = null
  const yearEnd = new Date(new Date(team.created_at).getTime() + 365 * 24 * 60 * 60 * 1000)
  if (yearEnd.getTime() > Date.now()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: me } = await (service as any).from('users').select('subscription_status, promo_expires_at').eq('id', user.id).maybeSingle()
    const status = me?.subscription_status ?? 'free'
    const promoPro = status === 'pro' && me?.promo_expires_at && new Date(me.promo_expires_at) < yearEnd
    if (status === 'free' || promoPro) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).from('users').update({ subscription_status: 'pro', promo_expires_at: yearEnd.toISOString() }).eq('id', user.id)
      proUntil = yearEnd.toISOString().slice(0, 10)
    }
  }

  return NextResponse.json({ ok: true, teamName: team.name, proUntil })
}
