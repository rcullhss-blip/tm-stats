export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { HoleRow, ShotEntry } from '@/lib/types'
import { calculateRoundSG, fmtSG, sgColor, handicapToSkillLevel, normalizeSkillLevel, type SkillLevel } from '@/lib/sg-engine'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function scoreColor(diff: number): string {
  if (diff < 0) return '#22C55E'
  if (diff === 0) return '#F0F0F0'
  if (diff <= 2) return '#9A9DB0'
  return '#EF4444'
}

export default async function CoachPlayerPage({ params }: PageProps) {
  const { id: playerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verify caller is a coach
  const { data: coachProfile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()
  if (coachProfile?.subscription_status !== 'team') return notFound()

  const service = createServiceClient()

  // Verify this player is in the coach's team
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (service as any).from('teams').select('id').eq('coach_user_id', user.id).single()
  if (!team) return notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (service as any).from('team_members').select('id').eq('team_id', team.id).eq('user_id', playerId).single()
  if (!membership) return notFound()

  // Fetch player profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player } = await (service as any).from('users').select('id, name, email, handicap, sg_baseline').eq('id', playerId).single()
  if (!player) return notFound()

  // Fetch player_context separately (column may not be in generated types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: playerCtxRow } = await (service as any).from('users').select('player_context').eq('id', playerId).single()
  const playerContext: string | null = playerCtxRow?.player_context ?? null

  // Fetch recent rounds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roundsRaw } = await (service as any)
    .from('rounds')
    .select('id, date, course_name, par_total, score_total, input_mode, holes')
    .eq('user_id', playerId)
    .order('date', { ascending: false })
    .limit(10)

  const rounds = roundsRaw ?? []

  // Calculate SG averages across full-tracking rounds
  const skillLevel: SkillLevel = normalizeSkillLevel(player.sg_baseline) ?? handicapToSkillLevel(player.handicap ?? null)

  let sgOffTee = 0, sgApproach = 0, sgAroundGreen = 0, sgPutt = 0, sgCount = 0

  for (const round of rounds) {
    if (round.input_mode !== 'full') continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: holesRaw } = await (service as any).from('holes').select('*').eq('round_id', round.id).order('hole_number')
    if (!holesRaw || holesRaw.length === 0) continue

    const holeList: HoleRow[] = holesRaw
    const holesForSG = holeList.map(h => ({
      holeNumber: h.hole_number,
      par: h.par as 3 | 4 | 5,
      shots: Array.isArray(h.shots) ? (h.shots as unknown as ShotEntry[]) : null,
    }))
    const sg = calculateRoundSG(holesForSG, skillLevel)
    if (!sg) continue
    sgOffTee += sg.sgOffTee
    sgApproach += sg.sgApproach
    sgAroundGreen += sg.sgAroundGreen
    sgPutt += sg.sgPutt
    sgCount++
  }

  const hasSG = sgCount > 0
  const avgSG = hasSG ? {
    offTee: sgOffTee / sgCount,
    approach: sgApproach / sgCount,
    aroundGreen: sgAroundGreen / sgCount,
    putt: sgPutt / sgCount,
  } : null

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <Link href="/coach" className="text-sm mb-6 inline-block" style={{ color: '#9A9DB0' }}>← Squad</Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          {player.name ?? player.email}
        </h1>
        {player.handicap != null && (
          <p className="text-sm mt-1" style={{ color: '#9A9DB0' }}>Handicap {player.handicap}</p>
        )}
      </div>

      {/* Player game context */}
      {playerContext && (
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>Player's Game Context</p>
          <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>{playerContext}</p>
        </div>
      )}

      {/* SG Summary */}
      {hasSG && avgSG && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>
            Strokes Gained avg ({sgCount} round{sgCount !== 1 ? 's' : ''})
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { label: 'Off Tee', value: avgSG.offTee },
              { label: 'Approach', value: avgSG.approach },
              { label: 'Around Green', value: avgSG.aroundGreen },
              { label: 'Putting', value: avgSG.putt },
            ] as { label: string; value: number }[]).map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
                <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>{label}</p>
                <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(value) }}>
                  {fmtSG(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent rounds */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>Recent Rounds</p>

        {rounds.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: '#9A9DB0' }}>No rounds logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rounds.map((r: { id: string; date: string; course_name: string; par_total: number | null; score_total: number | null; input_mode: string }) => {
              const diff = (r.score_total ?? 0) - (r.par_total ?? 0)
              return (
                <Link
                  key={r.id}
                  href={`/coach/players/${playerId}/rounds/${r.id}`}
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F0F0F0' }}>{r.course_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>
                      {formatDate(r.date)} · {r.input_mode === 'full' ? 'Full tracking' : 'Quick'}
                    </p>
                  </div>
                  {r.score_total != null && r.par_total != null && (
                    <span className="text-base font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(diff) }}>
                      {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
