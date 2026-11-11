/**
 * "Played like a X handicap"
 *
 * Turns Strokes Gained into the handicap a round (or one part of the game)
 * played like. It asks one question of the SG engine: against which handicap
 * level would these exact shots have scored level, zero gained and zero lost?
 *
 * The engine prices every spot as  tour average + level gap × share.  So for
 * any set of shots:
 *
 *   SG vs level = SG vs tour + gap × (share those shots used up)
 *
 * Setting that to zero gives the gap these shots played to, and the gap maps
 * straight back to a handicap (gap ≈ 5.5 + 0.95 × handicap). Nothing here
 * changes the engine; it only reads it at two levels.
 */

import type { ShotEntry } from './types'
import { calculateRoundSG, type RoundSGSummary } from './sg-engine'

type HoleInput = { holeNumber: number; par: 3 | 4 | 5; shots: ShotEntry[] | null }

export interface HandicapLevels {
  total: number | null
  offTee: number | null
  approach: number | null
  aroundGreen: number | null
  putting: number | null
}

// Must match LEVEL_GAP.scratch in sg-engine.ts and the slope of the gap model.
const SCRATCH_GAP = 5.5
const GAP_PER_HANDICAP_SHOT = 0.95

// Best and worst level we will ever quote. One round is a small sample, so a
// hot putter can come out better than tour level: cap it instead of printing it.
export const BEST_LEVEL = -6
export const WORST_LEVEL = 36

function levelFromSG(sgTour: number, sgScratch: number): number | null {
  // Share of the level gap these shots used up
  const share = (sgScratch - sgTour) / SCRATCH_GAP
  // Too few shots in this part of the game to say anything
  if (share < 0.02) return null
  const gap = -sgTour / share
  const handicap = (gap - SCRATCH_GAP) / GAP_PER_HANDICAP_SHOT
  return Math.max(BEST_LEVEL, Math.min(WORST_LEVEL, handicap))
}

function levels(tour: RoundSGSummary, scratch: RoundSGSummary): HandicapLevels {
  return {
    total: levelFromSG(tour.sgTotal, scratch.sgTotal),
    offTee: levelFromSG(tour.sgOffTee, scratch.sgOffTee),
    approach: levelFromSG(tour.sgApproach, scratch.sgApproach),
    aroundGreen: levelFromSG(tour.sgAroundGreen, scratch.sgAroundGreen),
    putting: levelFromSG(tour.sgPutt, scratch.sgPutt),
  }
}

/** Handicap level one round played to, overall and for each part of the game. */
export function roundHandicapLevels(holes: HoleInput[]): HandicapLevels | null {
  const tour = calculateRoundSG(holes, 'tour')
  const scratch = calculateRoundSG(holes, 'scratch')
  if (!tour || !scratch) return null
  return levels(tour, scratch)
}

/** Same, across several rounds pooled together (steadier than one round). */
export function pooledHandicapLevels(rounds: HoleInput[][]): HandicapLevels | null {
  const sum = (): RoundSGSummary => ({ sgTotal: 0, sgPutt: 0, sgAroundGreen: 0, sgApproach: 0, sgOffTee: 0, holes: [] })
  const tour = sum()
  const scratch = sum()
  let counted = 0
  for (const holes of rounds) {
    const t = calculateRoundSG(holes, 'tour')
    const s = calculateRoundSG(holes, 'scratch')
    if (!t || !s) continue
    counted++
    for (const k of ['sgTotal', 'sgPutt', 'sgAroundGreen', 'sgApproach', 'sgOffTee'] as const) {
      tour[k] += t[k]
      scratch[k] += s[k]
    }
  }
  if (counted === 0) return null
  return levels(tour, scratch)
}

/** "6", "scratch", "+2", "36+". Whole numbers only: one round is not precise. */
export function fmtHandicapLevel(level: number): string {
  if (level >= WORST_LEVEL) return `${WORST_LEVEL}+`
  const rounded = Math.round(level)
  if (rounded === 0) return 'scratch'
  if (rounded < 0) return `+${-rounded}`
  return `${rounded}`
}

/** "a 6 handicap", "an 8 handicap", "a scratch golfer", "a +2 handicap". */
export function playedLikePhrase(level: number): string {
  const label = fmtHandicapLevel(level)
  if (label === 'scratch') return 'a scratch golfer'
  const an = /^(8|11|18)/.test(label)
  return `${an ? 'an' : 'a'} ${label} handicap`
}
