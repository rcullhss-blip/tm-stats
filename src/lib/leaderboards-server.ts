import type { ShotEntry } from '@/lib/types'
import type { LeaderboardRow } from '@/components/coach/TeamLeaderboard'
import { pooledHandicapLevels } from '@/lib/handicap-level'
import { boardName, collegeStandings, placeKey, rankArea, MIN_GOLFERS_FOR_AREA_BOARD, MIN_TEAMS_FOR_COLLEGE_BOARD, type AreaGolfer, type PlayerForm, type TeamStanding } from '@/lib/leaderboards'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

type HoleInput = { holeNumber: number; par: 3 | 4 | 5; shots: ShotEntry[] | null }

async function holesFor(service: Service, roundIds: string[]): Promise<Map<string, HoleInput[]>> {
  const byRound = new Map<string, HoleInput[]>()
  // Supabase caps a response at 1,000 rows, and 18 holes a round adds up fast
  for (let i = 0; i < roundIds.length; i += 40) {
    const { data } = await service.from('holes').select('round_id, hole_number, par, shots').in('round_id', roundIds.slice(i, i + 40))
    for (const h of data ?? []) {
      if (!byRound.has(h.round_id)) byRound.set(h.round_id, [])
      byRound.get(h.round_id)!.push({ holeNumber: h.hole_number, par: h.par, shots: h.shots })
    }
  }
  return byRound
}

/**
 * The squad leaderboard: scoring over each player's last 5 scored rounds,
 * handicap levels from their last 5 full tracking rounds, and rounds logged in
 * the last 30 days. Rounds still waiting for stats count for scoring only.
 */
export async function squadLeaderboard(service: Service, memberIds: string[]): Promise<LeaderboardRow[]> {
  if (memberIds.length === 0) return []
  const [{ data: profiles }, { data: roundsRaw }] = await Promise.all([
    service.from('users').select('id, name, email, handicap').in('id', memberIds),
    service.from('rounds').select('id, user_id, date, score_total, par_total, input_mode, stats_pending').in('user_id', memberIds).order('date', { ascending: false }),
  ])
  const cutoff = isoDaysAgo(30)
  const byPlayer = new Map<string, { id: string; date: string; score_total: number | null; par_total: number | null; input_mode: string; stats_pending?: boolean }[]>()
  for (const r of roundsRaw ?? []) {
    if (!byPlayer.has(r.user_id)) byPlayer.set(r.user_id, [])
    byPlayer.get(r.user_id)!.push(r)
  }
  const fullIds = new Map<string, string[]>()
  for (const [pid, rounds] of byPlayer) {
    fullIds.set(pid, rounds.filter(r => r.input_mode === 'full' && !r.stats_pending).slice(0, 5).map(r => r.id))
  }
  const holes = await holesFor(service, [...fullIds.values()].flat())

  return (profiles ?? []).map((p: { id: string; name: string | null; email: string; handicap: number | null }) => {
    const rounds = byPlayer.get(p.id) ?? []
    const scored = rounds.filter(r => r.score_total && r.par_total).slice(0, 5)
    const avg = scored.length > 0 ? scored.reduce((s, r) => s + (r.score_total! - r.par_total!), 0) / scored.length : null
    const ids = fullIds.get(p.id) ?? []
    const levels = ids.length > 0 ? pooledHandicapLevels(ids.map(id => holes.get(id) ?? [])) : null
    return {
      id: p.id,
      name: p.name ?? p.email.split('@')[0],
      handicap: p.handicap,
      avgToPar: avg !== null ? Math.round(avg * 10) / 10 : null,
      roundsLast30: rounds.filter(r => r.date >= cutoff).length,
      sgRounds: ids.length,
      level: levels?.total ?? null,
      // Parts of the game need 3 rounds before a handicap level means anything
      offTee: ids.length >= 3 ? levels?.offTee ?? null : null,
      approach: ids.length >= 3 ? levels?.approach ?? null : null,
      aroundGreen: ids.length >= 3 ? levels?.aroundGreen ?? null : null,
      putting: ids.length >= 3 ? levels?.putting ?? null : null,
    }
  })
}

export interface CollegeBoard {
  show: boolean
  standings: TeamStanding[]
  teamsCounting: number
  needed: number
}

/** College teams against each other on scoring over the last 60 days. */
export async function collegeBoard(service: Service): Promise<CollegeBoard> {
  const { data: teams } = await service.from('teams').select('id, name, on_college_board')
  const listed = (teams ?? []).filter((t: { on_college_board: boolean | null }) => t.on_college_board !== false)
  const { data: members } = await service.from('team_members').select('team_id, user_id')
  const memberRows: { team_id: string; user_id: string }[] = (members ?? []).filter((m: { team_id: string }) => listed.some((t: { id: string }) => t.id === m.team_id))
  const ids = [...new Set(memberRows.map(m => m.user_id))]
  const since = isoDaysAgo(60)
  const rounds: { user_id: string; score_total: number | null; par_total: number | null; holes: number; date: string }[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await service.from('rounds').select('user_id, score_total, par_total, holes, date').in('user_id', ids.slice(i, i + 100)).gte('date', since).order('date', { ascending: false })
    rounds.push(...(data ?? []))
  }
  const form: PlayerForm[] = memberRows.map(m => {
    const mine = rounds.filter(r => r.user_id === m.user_id && r.holes === 18 && r.score_total && r.par_total).slice(0, 5)
    return {
      userId: m.user_id,
      teamId: m.team_id,
      avgToPar: mine.length > 0 ? mine.reduce((s, r) => s + (r.score_total! - r.par_total!), 0) / mine.length : null,
      rounds: mine.length,
    }
  })
  const standings = collegeStandings(listed.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })), form)
  return { show: standings.length >= MIN_TEAMS_FOR_COLLEGE_BOARD, standings, teamsCounting: standings.length, needed: MIN_TEAMS_FOR_COLLEGE_BOARD }
}

export interface AreaBoard {
  scope: 'region' | 'country' | 'world'
  label: string
  show: boolean
  golfers: (AreaGolfer & { position: number })[]
  count: number      // golfers who have opted in for this place (with or without a level yet)
  needed: number
}

/**
 * Golfers who have opted in, ranked by the handicap their last 5 full tracking
 * rounds played like. One board each for the caller's region, country and the world.
 */
export async function areaBoards(service: Service, me: { country: string | null; region: string | null }): Promise<AreaBoard[]> {
  const { data: users } = await service.from('users').select('id, name, country, region').eq('leaderboard_opt_in', true).limit(2000)
  const all: { id: string; name: string | null; country: string | null; region: string | null }[] = users ?? []

  const scopes: { scope: AreaBoard['scope']; label: string; members: typeof all }[] = []
  if (me.region && me.country) {
    scopes.push({ scope: 'region', label: me.region, members: all.filter(u => placeKey(u.region) === placeKey(me.region) && placeKey(u.country) === placeKey(me.country)) })
  }
  if (me.country) scopes.push({ scope: 'country', label: me.country, members: all.filter(u => placeKey(u.country) === placeKey(me.country)) })
  scopes.push({ scope: 'world', label: 'Worldwide', members: all })

  // Levels are only worked out for boards that have enough golfers to show
  const needLevels = new Set<string>()
  for (const s of scopes) if (s.members.length >= MIN_GOLFERS_FOR_AREA_BOARD) s.members.forEach(u => needLevels.add(u.id))
  const levelByUser = new Map<string, { level: number; rounds: number }>()
  const ids = [...needLevels]
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const { data: rounds } = await service.from('rounds').select('id, user_id, date, input_mode, stats_pending').in('user_id', chunk).eq('input_mode', 'full').order('date', { ascending: false })
    const perUser = new Map<string, string[]>()
    for (const r of rounds ?? []) {
      if (r.stats_pending) continue
      const list = perUser.get(r.user_id) ?? []
      if (list.length < 5) { list.push(r.id); perUser.set(r.user_id, list) }
    }
    const holes = await holesFor(service, [...perUser.values()].flat())
    for (const [uid, roundIds] of perUser) {
      const levels = pooledHandicapLevels(roundIds.map(id => holes.get(id) ?? []))
      if (levels?.total != null) levelByUser.set(uid, { level: levels.total, rounds: roundIds.length })
    }
  }

  return scopes.map(s => {
    const golfers: AreaGolfer[] = s.members
      .filter(u => levelByUser.has(u.id))
      .map(u => ({ userId: u.id, name: boardName(u.name), level: levelByUser.get(u.id)!.level, rounds: levelByUser.get(u.id)!.rounds }))
    return {
      scope: s.scope,
      label: s.label,
      show: s.members.length >= MIN_GOLFERS_FOR_AREA_BOARD && golfers.length > 0,
      golfers: rankArea(golfers),
      count: s.members.length,
      needed: MIN_GOLFERS_FOR_AREA_BOARD,
    }
  })
}
