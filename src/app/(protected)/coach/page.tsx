export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CoachTeamSetup from '@/components/coach/CoachTeamSetup'
import type { ShotEntry } from '@/lib/types'
import TeamLeaderboard, { type LeaderboardRow } from '@/components/coach/TeamLeaderboard'
import { pooledHandicapLevels } from '@/lib/handicap-level'

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export default async function CoachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()
  if (profile?.subscription_status !== 'team') return notFound()

  const service = createServiceClient()

  // Fetch coach's team (service client bypasses RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teamsData } = await (service as any)
    .from('teams')
    .select('*')
    .eq('coach_user_id', user.id)
    .limit(1)
  const team = teamsData?.[0] ?? null

  if (!team) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Coach</h1>
        <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>Set up your team to start tracking your players.</p>
        <CoachTeamSetup />
      </div>
    )
  }

  // Fetch team members
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membersRaw } = await (service as any)
    .from('team_members')
    .select('user_id, joined_at')
    .eq('team_id', team.id)

  const memberIds = (membersRaw ?? []).map((m: { user_id: string }) => m.user_id)

  // Fetch member profiles
  let leaderboard: LeaderboardRow[] = []
  let players: { id: string; name: string | null; email: string; handicap: number | null; avgScore: number | null; lastRound: string | null }[] = []
  if (memberIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (service as any)
      .from('users')
      .select('id, name, email, handicap')
      .in('id', memberIds)

    // Fetch recent rounds for each player
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: roundsRaw } = await (service as any)
      .from('rounds')
      .select('id, user_id, date, score_total, par_total, input_mode')
      .in('user_id', memberIds)
      .order('date', { ascending: false })

    const roundsByPlayer = new Map<string, { id: string; score_total: number | null; par_total: number | null; date: string; input_mode: string }[]>()
    for (const r of (roundsRaw ?? [])) {
      if (!roundsByPlayer.has(r.user_id)) roundsByPlayer.set(r.user_id, [])
      roundsByPlayer.get(r.user_id)!.push(r)
    }

    players = (profiles ?? []).map((p: { id: string; name: string | null; email: string; handicap: number | null }) => {
      const pRounds = roundsByPlayer.get(p.id) ?? []
      const scored = pRounds.filter(r => r.score_total && r.par_total).slice(0, 5)
      const avgScore = scored.length > 0
        ? scored.reduce((s, r) => s + (r.score_total! - r.par_total!), 0) / scored.length
        : null
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        handicap: p.handicap,
        avgScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
        lastRound: pRounds[0]?.date ?? null,
      }
    })
  }

  // Leaderboard: handicap levels from each player's last 5 full tracking rounds
  if (memberIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lbRounds } = await (service as any)
      .from('rounds')
      .select('id, user_id, date, input_mode')
      .in('user_id', memberIds)
      .order('date', { ascending: false })

    const cutoff = isoDaysAgo(30)
    const fullByPlayer = new Map<string, string[]>()
    const recentCount = new Map<string, number>()
    for (const r of (lbRounds ?? []) as { id: string; user_id: string; date: string; input_mode: string }[]) {
      if (r.date >= cutoff) recentCount.set(r.user_id, (recentCount.get(r.user_id) ?? 0) + 1)
      if (r.input_mode !== 'full') continue
      const list = fullByPlayer.get(r.user_id) ?? []
      if (list.length < 5) { list.push(r.id); fullByPlayer.set(r.user_id, list) }
    }

    const fullIds = [...fullByPlayer.values()].flat()
    const holesByRound = new Map<string, { holeNumber: number; par: 3 | 4 | 5; shots: ShotEntry[] | null }[]>()
    if (fullIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lbHoles } = await (service as any).from('holes').select('round_id, hole_number, par, shots').in('round_id', fullIds)
      for (const h of lbHoles ?? []) {
        if (!holesByRound.has(h.round_id)) holesByRound.set(h.round_id, [])
        holesByRound.get(h.round_id)!.push({ holeNumber: h.hole_number, par: h.par, shots: h.shots })
      }
    }

    leaderboard = players.map(p => {
      const ids = fullByPlayer.get(p.id) ?? []
      const levels = ids.length > 0 ? pooledHandicapLevels(ids.map(id => holesByRound.get(id) ?? [])) : null
      return {
        id: p.id,
        name: p.name ?? p.email,
        handicap: p.handicap,
        avgToPar: p.avgScore,
        roundsLast30: recentCount.get(p.id) ?? 0,
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

  function scoreColor(v: number | null) {
    if (v === null) return '#4A4D60'
    if (v <= 0) return '#22C55E'
    if (v <= 5) return '#F0F0F0'
    return '#EF4444'
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        {team.name}
      </h1>

      {/* Join code */}
      <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9A9DB0' }}>Player join code</p>
        <p
          className="text-2xl font-bold tracking-widest"
          style={{ fontFamily: 'var(--font-dm-mono)', color: '#CC2222', letterSpacing: '0.2em' }}
        >
          {team.join_code}
        </p>
        <p className="text-xs mt-1" style={{ color: '#4A4D60' }}>
          Players enter this in their Profile → Join a team
        </p>
      </div>

      {/* Leaderboard */}
      {players.length > 1 && <TeamLeaderboard rows={leaderboard} />}

      {/* Players */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>
          Players ({players.length})
        </h2>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: '#9A9DB0' }}>No players yet. Share your join code to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map(p => (
            <Link
              key={p.id}
              href={`/coach/players/${p.id}`}
              className="block p-4 rounded-xl"
              style={{ backgroundColor: '#1A1D27' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{p.name ?? p.email}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>
                    {p.handicap != null ? `Hcp ${p.handicap}` : 'No handicap'}
                    {p.lastRound ? ` · Last round ${new Date(p.lastRound).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                </div>
                {p.avgScore !== null && (
                  <span
                    className="text-lg font-bold"
                    style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(p.avgScore) }}
                  >
                    {p.avgScore > 0 ? `+${p.avgScore}` : p.avgScore === 0 ? 'E' : `${p.avgScore}`}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
