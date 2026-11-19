export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CoachTeamSetup from '@/components/coach/CoachTeamSetup'
import TeamLeaderboard, { type LeaderboardRow } from '@/components/coach/TeamLeaderboard'
import TeamSettings from '@/components/coach/TeamSettings'
import { squadLeaderboard } from '@/lib/leaderboards-server'

// Squad settings: who sees the leaderboard, and (once switched on) the squad's benchmark.
const SQUAD_SETTINGS_LIVE = true

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

  // Leaderboard: scoring, handicap levels and rounds logged for each player
  if (memberIds.length > 0) leaderboard = await squadLeaderboard(service, memberIds)

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

      <Link href="/qualifying" className="flex items-center justify-between p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222260', minHeight: '64px' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Qualifying and live scoring</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Players enter scores on their phones. When the round ends, their stats are half done.</p>
        </div>
        <span className="text-lg" style={{ color: '#CC2222' }}>→</span>
      </Link>

      {SQUAD_SETTINGS_LIVE && <TeamSettings benchmark={team.benchmark ?? null} playersSeeLeaderboard={team.players_see_leaderboard !== false} />}

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
