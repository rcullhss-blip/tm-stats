import { createServiceClient } from '@/lib/supabase/service'
import { calculateRoundSG, handicapToSkillLevel, normalizeSkillLevel } from '@/lib/sg-engine'
import { bandForLevel } from '@/lib/seo-stats'
import type { ShotEntry } from '@/lib/types'
import type { TestCategory } from '@/lib/practice-tests'

/**
 * Which part of the game to practise first, from the golfer's own rounds:
 * Strokes Gained when they track shot by shot, otherwise fairways, greens,
 * up and downs and putts against golfers of their level. Null with too little to go on.
 */
export async function weakestArea(userId: string): Promise<{ category: TestCategory; why: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any
  const { data: me } = await sb.from('users').select('handicap, sg_baseline').eq('id', userId).maybeSingle()
  const level = normalizeSkillLevel(me?.sg_baseline) ?? handicapToSkillLevel(me?.handicap ?? null)
  const { data: rounds } = await sb.from('rounds').select('id, input_mode').eq('user_id', userId).eq('stats_pending', false).order('date', { ascending: false }).limit(10)
  if (!rounds || rounds.length === 0) return null
  const ids = rounds.map((r: { id: string }) => r.id)
  const { data: holes } = await sb.from('holes').select('round_id, hole_number, par, fir, gir, putts, up_and_down, shots').in('round_id', ids)
  if (!holes || holes.length === 0) return null

  // Shot by shot: the category losing the most shots
  const full = rounds.filter((r: { input_mode: string }) => r.input_mode === 'full')
  if (full.length >= 2) {
    const sum = { offTee: 0, approach: 0, aroundGreen: 0, putting: 0 }
    let n = 0
    for (const r of full) {
      const hs = holes.filter((h: { round_id: string }) => h.round_id === r.id)
      const sg = calculateRoundSG(hs.map((h: { hole_number: number; par: number; shots: unknown }) => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots as ShotEntry[] | null })), level)
      if (!sg) continue
      sum.offTee += sg.sgOffTee; sum.approach += sg.sgApproach; sum.aroundGreen += sg.sgAroundGreen; sum.putting += sg.sgPutt; n++
    }
    if (n >= 2) {
      const worst = (Object.entries(sum) as [TestCategory, number][]).sort((a, b) => a[1] - b[1])[0]
      return { category: worst[0], why: `losing ${Math.abs(worst[1] / n).toFixed(1)} shots a round there against golfers of your level` }
    }
  }

  // Quick stats: furthest below golfers of your level
  const band = bandForLevel(level)
  const nonPar3 = holes.filter((h: { par: number; fir: boolean | null }) => h.par !== 3 && h.fir !== null)
  const pct = (xs: { v: boolean | null }[]) => xs.length >= 9 ? (xs.filter(x => x.v === true).length / xs.length) * 100 : null
  const fir = pct(nonPar3.map((h: { fir: boolean | null }) => ({ v: h.fir })))
  const gir = pct(holes.filter((h: { gir: boolean | null }) => h.gir !== null).map((h: { gir: boolean | null }) => ({ v: h.gir })))
  const ud = pct(holes.filter((h: { gir: boolean | null; up_and_down: boolean | null }) => h.gir === false && h.up_and_down !== null).map((h: { up_and_down: boolean | null }) => ({ v: h.up_and_down })))
  const puttHoles = holes.filter((h: { putts: number | null }) => typeof h.putts === 'number')
  const ppH = puttHoles.length >= 9 ? puttHoles.reduce((s: number, h: { putts: number }) => s + h.putts, 0) / puttHoles.length : null
  const gaps: { category: TestCategory; gap: number; why: string }[] = []
  if (fir !== null) gaps.push({ category: 'offTee', gap: (band.fir - fir) / band.fir, why: `fairways ${Math.round(fir)}% against ${band.fir}% for golfers of your level` })
  if (gir !== null) gaps.push({ category: 'approach', gap: (band.gir - gir) / band.gir, why: `greens ${Math.round(gir)}% against ${band.gir}%` })
  if (ud !== null) gaps.push({ category: 'aroundGreen', gap: (band.upDown - ud) / band.upDown, why: `up and downs ${Math.round(ud)}% against ${band.upDown}%` })
  if (ppH !== null) gaps.push({ category: 'putting', gap: (ppH - band.puttsPerHole) / band.puttsPerHole * 4, why: `${(ppH * 18).toFixed(1)} putts a round against ${band.puttsPerRound}` })
  const worst = gaps.sort((a, b) => b.gap - a.gap)[0]
  return worst && worst.gap > 0 ? { category: worst.category, why: worst.why } : null
}
