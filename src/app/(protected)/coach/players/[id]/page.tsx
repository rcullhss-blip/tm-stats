export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { calculateRoundSG, handicapToSkillLevel, fmtSG, sgColor, SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/sg-engine'
import type { HoleRow, ShotEntry, RoundRow } from '@/lib/types'
import CoachAIChallenge from '@/components/coach/CoachAIChallenge'
import CoachPlayerNotes from '@/components/coach/CoachPlayerNotes'
import StatsView, { type RoundDataPoint, type SGBand } from '@/components/stats/StatsView'

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
  const { data: membership } = await (service as any).from('team_members').select('id, coach_notes').eq('team_id', team.id).eq('user_id', playerId).single()
  if (!membership) return notFound()
  const coachNotes: string = membership.coach_notes ?? ''

  // Fetch player profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player } = await (service as any).from('users').select('name, email, handicap, sg_baseline').eq('id', playerId).single()
  if (!player) return notFound()

  const skillLevel: SkillLevel = (player.sg_baseline as SkillLevel | null) ?? handicapToSkillLevel(player.handicap ?? null)

  // Fetch last 50 rounds for full stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roundsRaw } = await (service as any)
    .from('rounds')
    .select('*')
    .eq('user_id', playerId)
    .order('date', { ascending: false })
    .limit(50)

  const roundList: RoundRow[] = roundsRaw ?? []
  const roundIds = roundList.map(r => r.id)

  // Fetch holes for all rounds
  let allHoles: HoleRow[] = []
  if (roundIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: holesRaw } = await (service as any).from('holes').select('*').in('round_id', roundIds)
    allHoles = holesRaw ?? []
  }

  const holesMap = new Map<string, HoleRow[]>()
  for (const h of allHoles) {
    if (!holesMap.has(h.round_id)) holesMap.set(h.round_id, [])
    holesMap.get(h.round_id)!.push(h)
  }

  // Build RoundDataPoint[] for StatsView
  const statsRounds: RoundDataPoint[] = roundList
    .filter(r => (holesMap.get(r.id)?.length ?? 0) > 0)
    .map(r => {
      const holes = holesMap.get(r.id) ?? []
      const totalPar = r.par_total ?? holes.reduce((s, h) => s + h.par, 0)
      const totalScore = r.score_total ?? holes.reduce((s, h) => s + h.score, 0)
      const firHoles = holes.filter(h => h.par !== 3)
      const firHit = firHoles.filter(h => h.fir === true).length
      const girHit = holes.filter(h => h.gir === true).length
      const putts = holes.reduce((s, h) => s + (h.putts ?? 0), 0)
      const udAttempts = holes.filter(h => h.gir === false).length
      const udMade = holes.filter(h => h.up_and_down === true).length
      const sandAttempts = holes.filter(h => h.sand_save !== null).length
      const sandSaves = holes.filter(h => h.sand_save === true).length

      const sgResult = r.input_mode === 'full'
        ? calculateRoundSG(
            holes.map(h => ({ holeNumber: h.hole_number, par: h.par as 3|4|5, shots: h.shots as ShotEntry[]|null })),
            skillLevel
          )
        : null

      const sgBands: SGBand[] | null = sgResult ? (() => {
        const bands: SGBand[] = [
          { label: '0–3ft',    category: 'putting',      minY: 0,      maxY: 1.0,      sgSum: 0, count: 0 },
          { label: '3–5ft',    category: 'putting',      minY: 1.001,  maxY: 1.666,    sgSum: 0, count: 0 },
          { label: '5–8ft',    category: 'putting',      minY: 1.667,  maxY: 2.666,    sgSum: 0, count: 0 },
          { label: '8–12ft',   category: 'putting',      minY: 2.667,  maxY: 3.999,    sgSum: 0, count: 0 },
          { label: '12–20ft',  category: 'putting',      minY: 4.0,    maxY: 6.666,    sgSum: 0, count: 0 },
          { label: '20–30ft',  category: 'putting',      minY: 6.667,  maxY: 9.999,    sgSum: 0, count: 0 },
          { label: '30–40ft',  category: 'putting',      minY: 10.0,   maxY: 13.332,   sgSum: 0, count: 0 },
          { label: '40ft+',    category: 'putting',      minY: 13.333, maxY: Infinity, sgSum: 0, count: 0 },
          { label: '0–10y',    category: 'around_green', minY: 0,  maxY: 9.9,      sgSum: 0, count: 0 },
          { label: '10–20y',   category: 'around_green', minY: 10, maxY: 19.9,     sgSum: 0, count: 0 },
          { label: '20–30y',   category: 'around_green', minY: 20, maxY: 29.9,     sgSum: 0, count: 0 },
          { label: '30–50y',   category: 'approach',     minY: 30,  maxY: 49.9,     sgSum: 0, count: 0 },
          { label: '50–75y',   category: 'approach',     minY: 50,  maxY: 74.9,     sgSum: 0, count: 0 },
          { label: '75–100y',  category: 'approach',     minY: 75,  maxY: 99.9,     sgSum: 0, count: 0 },
          { label: '100–125y', category: 'approach',     minY: 100, maxY: 124.9,    sgSum: 0, count: 0 },
          { label: '125–150y', category: 'approach',     minY: 125, maxY: 149.9,    sgSum: 0, count: 0 },
          { label: '150–175y', category: 'approach',     minY: 150, maxY: 174.9,    sgSum: 0, count: 0 },
          { label: '175–200y', category: 'approach',     minY: 175, maxY: 199.9,    sgSum: 0, count: 0 },
          { label: '175–200y', category: 'off_tee',      minY: 175, maxY: 199.9,    sgSum: 0, count: 0 },
          { label: '200–225y', category: 'off_tee',      minY: 200, maxY: 224.9,    sgSum: 0, count: 0 },
          { label: '225–250y', category: 'off_tee',      minY: 225, maxY: 249.9,    sgSum: 0, count: 0 },
          { label: '250–275y', category: 'off_tee',      minY: 250, maxY: 274.9,    sgSum: 0, count: 0 },
          { label: '275–300y', category: 'off_tee',      minY: 275, maxY: 299.9,    sgSum: 0, count: 0 },
          { label: '300y+',    category: 'off_tee',      minY: 300, maxY: Infinity, sgSum: 0, count: 0 },
        ]
        for (const holeResult of sgResult.holes) {
          for (const sgShot of holeResult.shots) {
            if (sgShot.distBefore === 0) continue
            const isPutt = sgShot.lie === 'green'
            const isAroundGreen = !isPutt && sgShot.distBefore < 30
            const isOffTee = !isPutt && !isAroundGreen && sgShot.lie === 'tee' && holeResult.par !== 3
            const distForBand = isOffTee ? (sgShot.distBefore - sgShot.distAfter) : sgShot.distBefore
            const band = bands.find(b => {
              if (isPutt && b.category !== 'putting') return false
              if (isAroundGreen && b.category !== 'around_green') return false
              if (isOffTee && b.category !== 'off_tee') return false
              if (!isPutt && !isAroundGreen && !isOffTee && b.category !== 'approach') return false
              return distForBand >= b.minY && distForBand <= b.maxY
            })
            if (band) { band.sgSum += sgShot.sg; band.count++ }
          }
        }
        return bands
      })() : null

      return {
        id: r.id,
        date: r.date,
        courseName: r.course_name,
        roundType: r.round_type,
        scoreToPar: totalScore - totalPar,
        par: totalPar,
        firPct: firHoles.length > 0 ? (firHit / firHoles.length) * 100 : null,
        girPct: holes.length > 0 ? (girHit / holes.length) * 100 : 0,
        puttsPerHole: holes.length > 0 ? putts / holes.length : 0,
        udPct: udAttempts > 0 ? (udMade / udAttempts) * 100 : null,
        sandSavePct: sandAttempts > 0 ? (sandSaves / sandAttempts) * 100 : null,
        sgTotal: sgResult?.sgTotal ?? null,
        sgOffTee: sgResult?.sgOffTee ?? null,
        sgApproach: sgResult?.sgApproach ?? null,
        sgAroundGreen: sgResult?.sgAroundGreen ?? null,
        sgPutt: sgResult?.sgPutt ?? null,
        sgBands: sgBands ?? null,
        eagles: holes.filter(h => h.score <= h.par - 2).length,
        birdies: holes.filter(h => h.score === h.par - 1).length,
        pars: holes.filter(h => h.score === h.par).length,
        bogeys: holes.filter(h => h.score === h.par + 1).length,
        doubles: holes.filter(h => h.score >= h.par + 2).length,
        totalHoles: holes.length,
      }
    })

  const sgRoundCount = statsRounds.filter(r => r.sgTotal !== null).length

  // Last 10 rounds for the round list and AI challenge
  const rounds = roundList.slice(0, 10)

  // Compute SG averages from all rounds
  const sgTotals = { offTee: 0, approach: 0, aroundGreen: 0, putt: 0 }
  let sgCount = 0
  for (const r of roundList.filter(r => r.input_mode === 'full')) {
    const holes = holesMap.get(r.id) ?? []
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
  const scoredRounds = roundList.filter(r => r.score_total != null && r.par_total != null) as ScoredRound[]
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

      {/* Coach player context */}
      <CoachPlayerNotes playerId={playerId} initialNotes={coachNotes} />

      {/* Advanced stats */}
      {statsRounds.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Advanced stats</h2>
          <StatsView
            rounds={statsRounds}
            skillLevelLabel={SKILL_LEVEL_LABELS[skillLevel]}
            isPro={true}
            coachPersona="club_pro"
            sgRoundCount={sgRoundCount}
            handicapHistory={[]}
            handicap={player.handicap ?? null}
          />
        </div>
      )}

      {/* Recent rounds — clickable */}
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Recent rounds</h2>
      <div className="space-y-3 mb-6">
        {rounds.map((r: RoundRow) => {
          const diff = (r.score_total ?? 0) - (r.par_total ?? 0)
          return (
            <Link
              key={r.id}
              href={`/coach/players/${playerId}/rounds/${r.id}`}
              className="block p-3 rounded-xl"
              style={{ backgroundColor: '#1A1D27' }}
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#F0F0F0' }}>{r.course_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>
                    {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    {' · '}{r.holes}H
                    {r.input_mode === 'full' && ' · SG'}
                    {r.mood && ` · ${r.mood}`}
                    {r.energy_level && ` · ${r.energy_level}`}
                    {r.conditions && ` · ${r.conditions}`}
                  </p>
                </div>
                {r.score_total && r.par_total && (
                  <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: diff < 0 ? '#22C55E' : diff === 0 ? '#F0F0F0' : diff <= 2 ? '#9A9DB0' : '#EF4444' }}>
                    {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`}
                  </span>
                )}
              </div>
              {r.notes && (
                <p className="text-xs mt-1 px-2 py-1.5 rounded-lg italic" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                  &ldquo;{r.notes}&rdquo;
                </p>
              )}
            </Link>
          )
        })}
      </div>

      {/* AI Challenge */}
      <CoachAIChallenge
        coachId={user.id}
        playerId={playerId}
        playerName={player.name ?? player.email}
        rounds={rounds.slice(0, 5).map((r: RoundRow) => ({
          id: r.id,
          courseName: r.course_name,
          date: r.date,
          scoreToPar: (r.score_total ?? 0) - (r.par_total ?? 0),
        }))}
      />
    </div>
  )
}
