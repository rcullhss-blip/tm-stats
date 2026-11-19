import { createServiceClient } from '@/lib/supabase/service'

export type JoinResult =
  | { ok: true; teamName: string; proUntil: string | null; already?: boolean }
  | { ok: false; error: string; status: number }

/** Look up a team by its join code, only once its coach has been approved. */
export async function teamByCode(code: string): Promise<{ id: string; name: string; coach_user_id: string; benchmark: string | null; created_at: string } | null> {
  const clean = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{4,12}$/.test(clean)) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: team } = await service.from('teams').select('*').eq('join_code', clean).maybeSingle()
  if (!team) return null
  const { data: coach } = await service.from('users').select('subscription_status').eq('id', team.coach_user_id).maybeSingle()
  return coach?.subscription_status === 'team' ? team : null
}

/** Put a golfer on a team. Team players get Pro for the team's first year. */
export async function joinTeam(userId: string, code: string): Promise<JoinResult> {
  const team = await teamByCode(code)
  if (!team) return { ok: false, error: 'No team found with that code. Check it with your coach.', status: 400 }
  if (team.coach_user_id === userId) return { ok: false, error: 'You cannot join your own team', status: 400 }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: existing } = await service.from('team_members').select('id').eq('team_id', team.id).eq('user_id', userId).maybeSingle()
  if (existing) return { ok: true, teamName: team.name, proUntil: null, already: true }

  const { error } = await service.from('team_members').insert({ team_id: team.id, user_id: userId })
  if (error) return { ok: false, error: 'Could not join the team. Try again.', status: 500 }

  // The squad's Strokes Gained benchmark applies straight away, unless they picked their own
  if (team.benchmark) await service.from('users').update({ sg_baseline: team.benchmark }).eq('id', userId).is('sg_baseline', null)

  // Pro for the team's first year (the free year for teams). Never downgrades, never shortens.
  let proUntil: string | null = null
  const yearEnd = new Date(new Date(team.created_at).getTime() + 365 * 24 * 60 * 60 * 1000)
  if (yearEnd.getTime() > Date.now()) {
    const { data: me } = await service.from('users').select('subscription_status, promo_expires_at').eq('id', userId).maybeSingle()
    const status = me?.subscription_status ?? 'free'
    const promoPro = status === 'pro' && me?.promo_expires_at && new Date(me.promo_expires_at) < yearEnd
    if (status === 'free' || promoPro) {
      await service.from('users').update({ subscription_status: 'pro', promo_expires_at: yearEnd.toISOString() }).eq('id', userId)
      proUntil = yearEnd.toISOString().slice(0, 10)
    }
  }
  return { ok: true, teamName: team.name, proUntil }
}
