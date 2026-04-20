export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { calculateRoundSG, handicapToSkillLevel, fmtSG, sgColor, SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/sg-engine'
import type { HoleRow, ShotEntry } from '@/lib/types'
import CoachAIChallenge from '@/components/coach/CoachAIChallenge'

interface Props { params: Promise<{ id: string }> }

export default async function CoachPlayerPage({ params }: Props) {
  const { id: playerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()

  // Verify coach owns a team that this player is on
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (service as any).from('teams').select('id, name').eq('coach_user_id', user.id).single()
  if (!team) return notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (service as any).from('team_members').select('id').eq('team_id', team.id).eq('user_id', playerId).single()
  if (!membership) return notFound()

  // Fetch player profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player } = await (service as any).from('users').select('name, email, handicap, sg_baseline').eq('id', playerId).single()
  if (!player) return notFound()

  const skillLevel: SkillLevel = (player.sg_baseline as SkillLevel | null) ?? handicapToSkillLevel(player.handicap ?? null)

  // Fetch last 10 rounds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roundsRaw } = await (service as any)
    .from('rounds')
    .select('*')
    .eq('user_id', playerId)
    .order('date', { ascending: false })
    .limit(10)

  const rounds = roundsRaw ?? []
  const roundIds = rounds.map((r: { id: string }) => r.id)

  // Fetch holes for SG
  let allHoles: HoleRow[] = []
  if (roundIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: holesRaw } = await (service as any).from('holes').select('*').in('round_id', roundIds)
    allHoles = holesRaw ?? []
  }

  // Compute SG averages
  const sgTotals = { offTee: 0, approach: 0, aroundGreen: 0, putt: 0 }
  let sgCount = 0
  for (const r of rounds.filter((r: { input_mode: string }) => r.input_mode === 'full')) {
    const holes = allHoles.filter(h => h.round_id === r.id)
    if (!holes.length) continue
    const sg = calculateRoundSG(
      holes.map(h => ({ holeNumber: h.hole_number, par: h.par as 3|4|5, shots: h.shots as ShotEntry[]|null })),
      skillLevel
    )
    if (!sg) continue
    sgTotals.offTee += sg.sgOffTee
    sgTotals.approach += sg.sgApproach
    sgTotals.aroundGreen += sg.sgAroundGreen
    sgTotals.putt += sg.sgPutt
    sgCount++
  }

  // Scoring averages — split by 9 and 18 holes
  type ScoredRound = { score_total: number; par_total: number; holes: number }
  const scoredRounds = rounds.filter((r: { score_total: number | null; par_total: number | null }) => r.score_total != null && r.par_total != null) as ScoredRound[]
  const scored18 = scoredRounds.filter(r => r.holes >= 18)
  const scored9  = scoredRounds.filter(r => r.holes <= 9)
  const avgGross18 = scored18.length > 0 ? scored18.reduce((s, r) => s + r.score_total, 0) / scored18.length : null
  const avgPar18   = scored18.length > 0 ? scored18.reduce((s, r) => s + (r.score_total - r.par_total), 0) / scored18.length : null
  const avgGross9  = scored9.length > 0  ? scored9.reduce((s, r) => s + r.score_total, 0) / scored9.length : null
  const avgPar9    = scored9.length > 0  ? scored9.reduce((s, r) => s + (r.score_total - r.par_total), 0) / scored9.length : null

  const sgAvgs = sgCount > 0 ? {
    offTee: sgTotals.offTee / sgCount,
    approach: sgTotals.approach / sgCount,
    aroundGreen: sgTotals.aroundGreen / sgCount,
    putt: sgTotals.putt / sgCount,
    total: (sgTotals.offTee + sgTotals.approach + sgTotals.aroundGreen + sgTotals.putt) / sgCount,
  } : null

  function scoreColor(diff: number) {
    if (diff < 0) return '#22C55E'
    if (diff === 0) return '#F0F0F0'
    if (diff <= 3) return '#9A9DB0'
    return '#EF4444'
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/coach" className="text-sm" style={{ color: '#9A9DB0' }}>← {team.name}</Link>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        {player.name ?? player.email}
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>
        {player.handicap != null ? `Handicap ${player.handicap}` : 'No handicap set'}
        {' · '}
        {rounds.length} round{rounds.length !== 1 ? 's' : ''}
      </p>

      {/* Scoring averages */}
      {(avgGross18 !== null || avgGross9 !== null) && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9A9DB0' }}>Scoring average</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
              <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>18 holes</p>
              {avgGross18 !== null ? (
                <>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0', lineHeight: 1 }}>{avgGross18.toFixed(1)}</p>
                  {avgPar18 !== null && (
                    <p className="text-xs mt-1" style={{ fontFamily: 'var(--font-dm-mono)', color: avgPar18 <= 0 ? '#22C55E' : avgPar18 <= 5 ? '#9A9DB0' : '#EF4444' }}>
                      {avgPar18 > 0 ? '+' : ''}{avgPar18.toFixed(1)} to par
                    </p>
                  )}
                </>
              ) : (
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60' }}>—</p>
              )}
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
              <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>9 holes</p>
              {avgGross9 !== null ? (
                <>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0', lineHeight: 1 }}>{avgGross9.toFixed(1)}</p>
                  {avgPar9 !== null && (
                    <p className="text-xs mt-1" style={{ fontFamily: 'var(--font-dm-mono)', color: avgPar9 <= 0 ? '#22C55E' : avgPar9 <= 5 ? '#9A9DB0' : '#EF4444' }}>
                      {avgPar9 > 0 ? '+' : ''}{avgPar9.toFixed(1)} to par
                    </p>
                  )}
                </>
              ) : (
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60' }}>—</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SG Summary */}
      {sgAvgs && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9A9DB0' }}>
            Strokes Gained avg · vs {SKILL_LEVEL_LABELS[skillLevel]}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total SG', value: sgAvgs.total },
              { label: 'Off tee', value: sgAvgs.offTee },
              { label: 'Approach', value: sgAvgs.approach },
              { label: 'Around green', value: sgAvgs.aroundGreen },
              { label: 'Putting', value: sgAvgs.putt },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
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
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Recent rounds</h2>
      <div className="space-y-3 mb-6">
        {rounds.map((r: { id: string; course_name: string; date: string; score_total: number | null; par_total: number | null; holes: number; input_mode: string }) => {
          const diff = (r.score_total ?? 0) - (r.par_total ?? 0)
          return (
            <div key={r.id} className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#F0F0F0' }}>{r.course_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>
                    {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    {' · '}{r.holes}H
                    {r.input_mode === 'full' && ' · SG'}
                  </p>
                </div>
                {r.score_total && r.par_total && (
                  <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(diff) }}>
                    {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* AI Challenge */}
      <CoachAIChallenge
        coachId={user.id}
        playerId={playerId}
        playerName={player.name ?? player.email}
        rounds={rounds.slice(0, 5).map((r: { id: string; course_name: string; date: string; score_total: number | null; par_total: number | null }) => ({
          id: r.id,
          courseName: r.course_name,
          date: r.date,
          scoreToPar: (r.score_total ?? 0) - (r.par_total ?? 0),
        }))}
      />
    </div>
  )
}
