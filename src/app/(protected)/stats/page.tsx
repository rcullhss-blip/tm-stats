export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import type { HoleRow, RoundRow, ShotEntry } from '@/lib/types'
import { calculateRoundSG, handicapToSkillLevel, SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/sg-engine'
import StatsView, { type RoundDataPoint, type SGBand } from '@/components/stats/StatsView'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('handicap, sg_baseline, subscription_status, coach_persona')
    .eq('id', user.id)
    .single()

  const skillLevel: SkillLevel = (profile?.sg_baseline as SkillLevel | null) ?? handicapToSkillLevel(profile?.handicap ?? null)
  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'

  const { data: roundsRaw } = await supabase
    .from('rounds')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  const roundList: RoundRow[] = roundsRaw ?? []

  if (roundList.length === 0) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Stats</h1>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#F0F0F0' }}>No data yet</h2>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>Log a few rounds and your stats will appear here.</p>
        </div>
      </div>
    )
  }

  const roundIds = roundList.map(r => r.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbAny = supabase as any
  const [{ data: holesRaw }, { data: handicapHistoryRaw }] = await Promise.all([
    supabase.from('holes').select('*').in('round_id', roundIds),
    sbAny.from('handicap_history').select('handicap, date').eq('user_id', user.id).order('date', { ascending: true }).limit(24),
  ])

  const holesMap = new Map<string, HoleRow[]>()
  for (const h of (holesRaw ?? [])) {
    if (!holesMap.has(h.round_id)) holesMap.set(h.round_id, [])
    holesMap.get(h.round_id)!.push(h)
  }

  // Build per-round data points
  const rounds: RoundDataPoint[] = roundList
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
            holes.map(h => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots as ShotEntry[] | null })),
            skillLevel
          )
        : null

      const sgBands: SGBand[] | null = sgResult ? (() => {
        const bands: SGBand[] = [
          // Putting — stored in yards, labels shown in feet (1yd = 3ft)
          { label: '0–3ft',    category: 'putting',       minY: 0,       maxY: 1.0,       sgSum: 0, count: 0 },
          { label: '3–5ft',    category: 'putting',       minY: 1.001,   maxY: 1.666,     sgSum: 0, count: 0 },
          { label: '5–8ft',    category: 'putting',       minY: 1.667,   maxY: 2.666,     sgSum: 0, count: 0 },
          { label: '8–12ft',   category: 'putting',       minY: 2.667,   maxY: 3.999,     sgSum: 0, count: 0 },
          { label: '12–20ft',  category: 'putting',       minY: 4.0,     maxY: 6.666,     sgSum: 0, count: 0 },
          { label: '20–30ft',  category: 'putting',       minY: 6.667,   maxY: 9.999,     sgSum: 0, count: 0 },
          { label: '30–40ft',  category: 'putting',       minY: 10.0,    maxY: 13.332,    sgSum: 0, count: 0 },
          { label: '40ft+',    category: 'putting',       minY: 13.333,  maxY: Infinity,  sgSum: 0, count: 0 },
          // Around green (non-putting, inside 30y)
          { label: '0–10y',    category: 'around_green',  minY: 0,   maxY: 9.9,       sgSum: 0, count: 0 },
          { label: '10–20y',   category: 'around_green',  minY: 10,  maxY: 19.9,      sgSum: 0, count: 0 },
          { label: '20–30y',   category: 'around_green',  minY: 20,  maxY: 29.9,      sgSum: 0, count: 0 },
          // Approach & off tee (non-putting, 30y+)
          { label: '30–50y',   category: 'approach',      minY: 30,  maxY: 49.9,      sgSum: 0, count: 0 },
          { label: '50–75y',   category: 'approach',      minY: 50,  maxY: 74.9,      sgSum: 0, count: 0 },
          { label: '75–100y',  category: 'approach',      minY: 75,  maxY: 99.9,      sgSum: 0, count: 0 },
          { label: '100–125y', category: 'approach',      minY: 100, maxY: 124.9,     sgSum: 0, count: 0 },
          { label: '125–150y', category: 'approach',      minY: 125, maxY: 149.9,     sgSum: 0, count: 0 },
          { label: '150–175y', category: 'approach',      minY: 150, maxY: 174.9,     sgSum: 0, count: 0 },
          { label: '175–200y', category: 'approach',      minY: 175, maxY: 199.9,     sgSum: 0, count: 0 },
          { label: '175–200y', category: 'off_tee',       minY: 175, maxY: 199.9,     sgSum: 0, count: 0 },
          { label: '200–225y', category: 'off_tee',       minY: 200, maxY: 224.9,     sgSum: 0, count: 0 },
          { label: '225–250y', category: 'off_tee',       minY: 225, maxY: 249.9,     sgSum: 0, count: 0 },
          { label: '250–275y', category: 'off_tee',       minY: 250, maxY: 274.9,     sgSum: 0, count: 0 },
          { label: '275–300y', category: 'off_tee',       minY: 275, maxY: 299.9,     sgSum: 0, count: 0 },
          { label: '300y+',    category: 'off_tee',       minY: 300, maxY: Infinity,  sgSum: 0, count: 0 },
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

      const eagles = holes.filter(h => h.score <= h.par - 2).length
      const birdies = holes.filter(h => h.score === h.par - 1).length
      const pars = holes.filter(h => h.score === h.par).length
      const bogeys = holes.filter(h => h.score === h.par + 1).length
      const doubles = holes.filter(h => h.score >= h.par + 2).length

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
        eagles, birdies, pars, bogeys, doubles,
        totalHoles: holes.length,
      }
    })

  const sgRoundCount = rounds.filter(r => r.sgTotal !== null).length

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Stats</h1>
        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
          {rounds.length} rounds
        </span>
      </div>
      <StatsView
        rounds={rounds}
        skillLevelLabel={SKILL_LEVEL_LABELS[skillLevel]}
        isPro={isPro}
        coachPersona={profile?.coach_persona ?? 'club_pro'}
        sgRoundCount={sgRoundCount}
        handicapHistory={(handicapHistoryRaw ?? []).map((h: { date: string; handicap: number }) => ({ date: h.date, handicap: Number(h.handicap) }))}
        handicap={profile?.handicap ?? null}
      />
    </div>
  )
}
