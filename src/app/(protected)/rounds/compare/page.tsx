export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { HoleRow, RoundRow, ShotEntry } from '@/lib/types'
import { calculateRoundSG, handicapToSkillLevel, normalizeSkillLevel, type SkillLevel } from '@/lib/sg-engine'
import CompareClient, { type CompareRound } from '@/components/rounds/CompareClient'

export default async function CompareRoundsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('handicap, sg_baseline, subscription_status')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'
  const skillLevel: SkillLevel = normalizeSkillLevel(profile?.sg_baseline) ?? handicapToSkillLevel(profile?.handicap ?? null)

  const { data: roundsRaw } = await supabase
    .from('rounds')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  const roundList: RoundRow[] = roundsRaw ?? []

  if (roundList.length < 2) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Compare rounds</h1>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">⇄</div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#F0F0F0' }}>Need two rounds to compare</h2>
          <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>Log at least two rounds and you can put them side by side.</p>
          <Link href="/rounds/new" className="inline-block px-6 py-4 rounded-xl font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
            Log a round
          </Link>
        </div>
      </div>
    )
  }

  const roundIds = roundList.map(r => r.id)
  const { data: holesRaw } = await supabase.from('holes').select('*').in('round_id', roundIds)

  const holesMap = new Map<string, HoleRow[]>()
  for (const h of (holesRaw ?? [])) {
    if (!holesMap.has(h.round_id)) holesMap.set(h.round_id, [])
    holesMap.get(h.round_id)!.push(h)
  }

  const compareRounds: CompareRound[] = roundList
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

      const sg = isPro && r.input_mode === 'full'
        ? calculateRoundSG(
            holes.map(h => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots as ShotEntry[] | null })),
            skillLevel
          )
        : null

      const procShots = holes
        .flatMap(h => (Array.isArray(h.shots) ? (h.shots as unknown as ShotEntry[]) : []))
        .filter(s => typeof s.process === 'boolean')

      return {
        id: r.id,
        date: r.date,
        courseName: r.course_name,
        holes: holes.length,
        roundType: r.round_type,
        score: totalScore,
        toPar: totalScore - totalPar,
        firPct: firHoles.length > 0 ? Math.round((firHit / firHoles.length) * 100) : null,
        girPct: Math.round((girHit / holes.length) * 100),
        putts,
        puttsPerHole: Math.round((putts / holes.length) * 100) / 100,
        udPct: udAttempts > 0 ? Math.round((udMade / udAttempts) * 100) : null,
        sgTotal: sg?.sgTotal ?? null,
        sgOffTee: sg?.sgOffTee ?? null,
        sgApproach: sg?.sgApproach ?? null,
        sgAroundGreen: sg?.sgAroundGreen ?? null,
        sgPutt: sg?.sgPutt ?? null,
        processPct: procShots.length > 0 ? Math.round((procShots.filter(s => s.process).length / procShots.length) * 100) : null,
      }
    })

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Compare rounds</h1>
        <Link href="/rounds" className="text-sm" style={{ color: '#9A9DB0' }}>← Rounds</Link>
      </div>
      <CompareClient rounds={compareRounds} isPro={isPro} />
    </div>
  )
}
