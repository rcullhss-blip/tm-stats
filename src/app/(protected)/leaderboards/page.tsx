export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import TeamLeaderboard, { type LeaderboardRow } from '@/components/coach/TeamLeaderboard'
import { areaBoards, collegeBoard, squadLeaderboard, type AreaBoard, type CollegeBoard } from '@/lib/leaderboards-server'
import { fmtHandicapLevel } from '@/lib/handicap-level'

const card = { backgroundColor: '#1A1D27' } as const
const heading = 'text-sm font-semibold uppercase tracking-wide mb-3'

function fmtToPar(n: number): string {
  return n === 0 ? 'E' : n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

// Leaderboards a golfer can see: their squad, college teams, and golfers near them.
export default async function LeaderboardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: me } = await service.from('users').select('country, region, leaderboard_opt_in, subscription_status').eq('id', user.id).maybeSingle()

  // Squad: the team the golfer plays on (or coaches)
  let squad: { name: string; rows: LeaderboardRow[]; hidden: boolean; isCoach: boolean } | null = null
  const { data: coached } = await service.from('teams').select('*').eq('coach_user_id', user.id).limit(1)
  let team = coached?.[0] ?? null
  const isCoach = !!team
  if (!team) {
    const { data: membership } = await service.from('team_members').select('team_id').eq('user_id', user.id).limit(1)
    if (membership?.[0]) {
      const { data: t } = await service.from('teams').select('*').eq('id', membership[0].team_id).maybeSingle()
      team = t ?? null
    }
  }
  if (team) {
    const hidden = !isCoach && team.players_see_leaderboard === false
    let rows: LeaderboardRow[] = []
    if (!hidden) {
      const { data: members } = await service.from('team_members').select('user_id').eq('team_id', team.id)
      rows = await squadLeaderboard(service, (members ?? []).map((m: { user_id: string }) => m.user_id))
    }
    squad = { name: team.name, rows, hidden, isCoach }
  }

  let college: CollegeBoard | null = null
  let areas: AreaBoard[] = []
  try { college = await collegeBoard(service) } catch {}
  try { areas = await areaBoards(service, { country: me?.country ?? null, region: me?.region ?? null }) } catch {}
  const optedIn = me?.leaderboard_opt_in === true

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Leaderboards</h1>

      {/* ── Squad ── */}
      {squad ? (
        squad.hidden ? (
          <div className="mb-8">
            <h2 className={heading} style={{ color: '#9A9DB0' }}>{squad.name}</h2>
            <div className="p-4 rounded-xl" style={card}>
              <p className="text-sm" style={{ color: '#9A9DB0' }}>Your coach keeps the squad leaderboard for coaches only.</p>
            </div>
          </div>
        ) : squad.rows.length < 2 ? (
          <div className="mb-8">
            <h2 className={heading} style={{ color: '#9A9DB0' }}>{squad.name}</h2>
            <div className="p-4 rounded-xl" style={card}>
              <p className="text-sm" style={{ color: '#9A9DB0' }}>The squad leaderboard appears once two players are on the team.</p>
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <TeamLeaderboard rows={squad.rows} viewerId={squad.isCoach ? undefined : user.id} title={squad.name} />
          </div>
        )
      ) : (
        <div className="mb-8">
          <h2 className={heading} style={{ color: '#9A9DB0' }}>Your squad</h2>
          <div className="p-4 rounded-xl" style={card}>
            <p className="text-sm mb-1" style={{ color: '#F0F0F0' }}>Not on a team yet</p>
            <p className="text-sm" style={{ color: '#9A9DB0' }}>Join your coach&apos;s team with their code in Profile and your squad leaderboard shows here.</p>
          </div>
        </div>
      )}

      {/* ── College teams ── */}
      <div className="mb-8">
        <h2 className={heading} style={{ color: '#9A9DB0' }}>College teams</h2>
        {college?.show ? (
          <>
            <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>Team scoring to par over the last 60 days: each team&apos;s best four players, last 5 rounds each.</p>
            <div className="rounded-xl overflow-hidden" style={card}>
              {college.standings.map((t, i) => (
                <div key={t.teamId} className="flex items-center justify-between px-4" style={{ minHeight: '52px', borderTop: i > 0 ? '1px solid #2E3247' : 'none', backgroundColor: team?.id === t.teamId ? '#CC222210' : 'transparent' }}>
                  <span className="flex items-center gap-3">
                    <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: i === 0 ? '#22C55E' : '#9A9DB0', width: '20px' }}>{i + 1}</span>
                    <span>
                      <span className="text-sm block" style={{ color: '#F0F0F0' }}>{t.name}</span>
                      <span className="text-xs" style={{ color: '#4A4D60' }}>{t.players} players · {t.rounds} rounds</span>
                    </span>
                  </span>
                  <span className="text-lg font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{fmtToPar(t.avgToPar)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4 rounded-xl" style={card}>
            <p className="text-sm mb-1" style={{ color: '#F0F0F0' }}>Opens when three teams are playing</p>
            <p className="text-sm" style={{ color: '#9A9DB0' }}>
              A team counts once three of its players have logged an 18 hole round in the last 60 days. {college ? `${college.teamsCounting} of ${college.needed} so far.` : ''}
            </p>
          </div>
        )}
      </div>

      {/* ── Golfers near you ── */}
      <div className="mb-8">
        <h2 className={heading} style={{ color: '#9A9DB0' }}>Golfers near you</h2>
        {!optedIn && (
          <div className="p-4 rounded-xl mb-3" style={{ ...card, border: '1px solid #CC222260' }}>
            <p className="text-sm mb-1" style={{ color: '#F0F0F0' }}>You are not on these boards</p>
            <p className="text-sm mb-3" style={{ color: '#9A9DB0' }}>
              They rank golfers by the handicap their last 5 full tracking rounds played like. Only a first name and initial is shown. Add where you play and switch it on in Profile.
            </p>
            <Link href="/profile#leaderboards" className="inline-flex items-center px-4 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '44px' }}>Set it up in Profile</Link>
          </div>
        )}
        {optedIn && !me?.country && (
          <div className="p-4 rounded-xl mb-3" style={card}>
            <p className="text-sm" style={{ color: '#9A9DB0' }}>Add your country in <Link href="/profile#leaderboards" style={{ color: '#CC2222' }}>Profile</Link> to see your country and area boards.</p>
          </div>
        )}
        {areas.map(a => (
          <div key={a.scope} className="mb-4">
            <p className="text-sm font-medium mb-2" style={{ color: '#F0F0F0' }}>{a.label}</p>
            {a.show ? (
              <div className="rounded-xl overflow-hidden" style={card}>
                {a.golfers.slice(0, 50).map((g, i) => (
                  <div key={g.userId} className="flex items-center justify-between px-4" style={{ minHeight: '48px', borderTop: i > 0 ? '1px solid #2E3247' : 'none', backgroundColor: g.userId === user.id ? '#CC222210' : 'transparent' }}>
                    <span className="flex items-center gap-3">
                      <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: i === 0 ? '#22C55E' : '#9A9DB0', width: '24px' }}>{g.position}</span>
                      <span className="text-sm" style={{ color: '#F0F0F0' }}>{g.name}{g.userId === user.id ? ' (you)' : ''}</span>
                    </span>
                    <span className="text-lg font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{fmtHandicapLevel(g.level)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl" style={card}>
                <p className="text-sm" style={{ color: '#9A9DB0' }}>
                  Opens at {a.needed} golfers. <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{a.count}</span> so far.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
