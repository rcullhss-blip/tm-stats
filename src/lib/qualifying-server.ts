import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildBoard, cleanCard, type BoardRow, type Par, type Qualifier, type QualifierScoreRow } from '@/lib/qualifying'

// The qualifying tables are server only (RLS on, no policies), so every read
// and write goes through the service client AFTER the caller's place on the
// team has been checked here.

export type QualifierRole = 'coach' | 'player'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** The caller's team and role: the team they coach, else the first team they play on. */
export async function teamFor(userId: string): Promise<{ service: Service; teamId: string; teamName: string; role: QualifierRole } | null> {
  const service: Service = createServiceClient()
  const { data: coached } = await service.from('teams').select('id, name').eq('coach_user_id', userId).limit(1)
  if (coached?.[0]) return { service, teamId: coached[0].id, teamName: coached[0].name, role: 'coach' }
  const { data: member } = await service.from('team_members').select('team_id, teams(name)').eq('user_id', userId).limit(1)
  if (member?.[0]) return { service, teamId: member[0].team_id, teamName: member[0].teams?.name ?? 'Team', role: 'player' }
  return null
}

function normalise(row: Record<string, unknown>): Qualifier {
  const holes = row.holes === 9 ? 9 : 18
  const pars = Array.from({ length: holes }, (_, i) => {
    const p = Array.isArray(row.pars) ? row.pars[i] : 4
    return (p === 3 || p === 5 ? p : 4) as Par
  })
  return {
    id: String(row.id),
    team_id: String(row.team_id),
    kind: row.kind === 'tournament' ? 'tournament' : 'qualifying',
    name: String(row.name ?? ''),
    course_name: String(row.course_name ?? ''),
    holes,
    pars,
    round_count: Number(row.round_count) || 1,
    round_dates: Array.isArray(row.round_dates) ? row.round_dates.map(String) : [],
    rounds_finished: Number(row.rounds_finished) || 0,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at ?? ''),
  }
}

/** A qualifier, only if the caller coaches or plays on its team. */
export async function qualifierFor(userId: string, qualifierId: string): Promise<{ service: Service; qualifier: Qualifier; role: QualifierRole } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(qualifierId)) return null
  const service: Service = createServiceClient()
  const { data: row } = await service.from('qualifiers').select('*').eq('id', qualifierId).maybeSingle()
  if (!row) return null
  const { data: team } = await service.from('teams').select('id, coach_user_id').eq('id', row.team_id).maybeSingle()
  if (!team) return null
  if (team.coach_user_id === userId) return { service, qualifier: normalise(row), role: 'coach' }
  const { data: member } = await service.from('team_members').select('id').eq('team_id', team.id).eq('user_id', userId).limit(1)
  if (member?.[0]) return { service, qualifier: normalise(row), role: 'player' }
  return null
}

export interface QualifierState {
  qualifier: Qualifier
  role: QualifierRole
  board: BoardRow[]
  // Coach only: has each player added their stats to each finished round?
  stats: Record<string, { roundNo: number; roundId: string; done: boolean }[]>
}

/** Everything the live page needs: the qualifier, the leaderboard and who has done their stats. */
export async function qualifierState(service: Service, qualifier: Qualifier, role: QualifierRole): Promise<QualifierState> {
  const { data: scoreRaw } = await service.from('qualifier_scores').select('qualifier_id, round_no, user_id, scores, round_id').eq('qualifier_id', qualifier.id)
  const scoreRows: QualifierScoreRow[] = (scoreRaw ?? []).map((r: QualifierScoreRow) => ({ ...r, scores: cleanCard(r.scores, qualifier.holes) }))
  const playerIds = [...new Set(scoreRows.map(r => r.user_id))]
  const { data: users } = playerIds.length > 0
    ? await service.from('users').select('id, name, email').in('id', playerIds)
    : { data: [] }
  const players = (users ?? []).map((u: { id: string; name: string | null; email: string }) => ({ id: u.id, name: u.name ?? u.email.split('@')[0] }))

  const stats: QualifierState['stats'] = {}
  const roundIds = scoreRows.map(r => r.round_id).filter((id): id is string => !!id)
  if (roundIds.length > 0) {
    const { data: rounds } = await service.from('rounds').select('id, stats_pending').in('id', roundIds)
    const pending = new Map<string, boolean>((rounds ?? []).map((r: { id: string; stats_pending: boolean }) => [r.id, r.stats_pending === true]))
    for (const r of scoreRows) {
      if (!r.round_id || !pending.has(r.round_id)) continue
      if (!stats[r.user_id]) stats[r.user_id] = []
      stats[r.user_id].push({ roundNo: r.round_no, roundId: r.round_id, done: !pending.get(r.round_id) })
    }
  }

  return { qualifier, role, board: buildBoard(qualifier, players, scoreRows), stats: role === 'coach' ? stats : {} }
}
