/**
 * Avoidable mistakes in a round: the shots that cost a card without needing a
 * better swing to fix. Counted per hole, from the scorecard and (where the
 * round was tracked shot by shot) the shots themselves.
 */

import type { ShotEntry } from './types'

export interface MistakeHole {
  par: number
  score: number
  putts: number | null
  shots: ShotEntry[] | null
}

export interface Mistake {
  key: 'double' | 'threePutt' | 'par5Bogey' | 'shortApproachBogey' | 'easyChip'
  label: string
  detail: string
  count: number
}

const EASY_CHIP_YARDS = 20
const SHORT_APPROACH_YARDS = 150

export function countMistakes(holes: MistakeHole[]): { total: number; items: Mistake[]; hasShotData: boolean } {
  let double = 0, threePutt = 0, par5Bogey = 0, shortApproachBogey = 0, easyChip = 0
  let hasShotData = false

  for (const h of holes) {
    if (h.score >= h.par + 2) double++
    if ((h.putts ?? 0) >= 3) threePutt++
    if (h.par === 5 && h.score >= 6) par5Bogey++

    // The hole-out marker (distance 0) is not a shot
    const shots = (h.shots ?? []).filter(s => s.distanceToPin > 0)
    if (shots.length === 0) continue
    hasShotData = true

    // Bogey or worse after a full approach from 150 yards or closer, hit in
    // regulation (the shot that should have found the green).
    const approach = shots[h.par - 2]
    if (
      approach && h.score >= h.par + 1 &&
      approach.distanceToPin > 30 && approach.distanceToPin <= SHORT_APPROACH_YARDS &&
      (approach.lieType === 'fairway' || approach.lieType === 'tee')
    ) shortApproachBogey++

    // Three or more to get down from a simple spot close to the green
    const chipIdx = shots.findIndex(s =>
      s.distanceToPin <= EASY_CHIP_YARDS &&
      (s.lieType === 'fairway' || s.lieType === 'fringe') &&
      (s.lieQuality ?? 'good') === 'good'
    )
    if (chipIdx >= 0) {
      const strokesFromThere = shots.slice(chipIdx).filter(s => s.lieType !== 'penalty').length
      if (strokesFromThere >= 3) easyChip++
    }
  }

  const items: Mistake[] = [
    { key: 'double', label: 'Double bogey or worse', detail: 'Any hole two over or more', count: double },
    { key: 'threePutt', label: 'Three putts', detail: 'Three or more putts on a green', count: threePutt },
    { key: 'par5Bogey', label: 'Bogey on a par 5', detail: 'Bogey or worse on a par 5', count: par5Bogey },
  ]
  if (hasShotData) {
    items.push(
      { key: 'shortApproachBogey', label: `Bogey from inside ${SHORT_APPROACH_YARDS}`, detail: `Bogey or worse after an approach from the fairway inside ${SHORT_APPROACH_YARDS} yards`, count: shortApproachBogey },
      { key: 'easyChip', label: 'Easy chip not saved', detail: `Three or more to get down from a good lie inside ${EASY_CHIP_YARDS} yards`, count: easyChip },
    )
  }

  return { total: items.reduce((s, i) => s + i.count, 0), items, hasShotData }
}
