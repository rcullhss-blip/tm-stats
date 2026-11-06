/**
 * Strokes Gained Engine
 * Based on Mark Broadie's research ("Every Shot Counts")
 * Baseline = expected strokes to hole out for the chosen skill level
 *
 * Model:  expected = PGA Tour average from that spot + the level's gap to tour
 * The gap is shared across the hole the way Broadie found it is in real golf:
 * about two thirds in the long game (driving and approach), about a sixth in
 * the short game and about 15% in putting. That is what keeps the split
 * between the four categories honest.
 */

import type { LieType, LieQuality, ShotEntry } from './types'

// ─── Skill levels ─────────────────────────────────────────────────────────────

export type SkillLevel =
  | 'tour' | 'scratch' | 'h1_4' | 'h5_9' | 'h10_14' | 'h15_19' | 'h20_28' | 'h29'

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  tour:    'PGA Tour',
  scratch: 'Scratch (0)',
  h1_4:    'Handicap 1–4',
  h5_9:    'Handicap 5–9',
  h10_14:  'Handicap 10–14',
  h15_19:  'Handicap 15–19',
  h20_28:  'Handicap 20–28',
  h29:     'Handicap 29+',
}

// Baseline keys stored before the band refresh → map to the nearest new band so
// existing users who manually picked a baseline don't break.
const LEGACY_LEVEL_MAP: Record<string, SkillLevel> = {
  low: 'h5_9', mid: 'h10_14', high: 'h20_28', beginner: 'h29',
}

/** Coerce any stored/raw baseline value to a valid SkillLevel (or null for auto). */
export function normalizeSkillLevel(raw: string | null | undefined): SkillLevel | null {
  if (!raw) return null
  if (raw in SKILL_LEVEL_LABELS) return raw as SkillLevel
  return LEGACY_LEVEL_MAP[raw] ?? null
}

// ─── Skill model ──────────────────────────────────────────────────────────────
// LEVEL_GAP = strokes per 18 holes the level's average round is worse than the
// PGA Tour baseline on the same course. Average scores run about 3 + 0.95 × handicap
// over par, and the tour baseline is about 2.4 under par on a 6,500 yard par 72.
const LEVEL_GAP: Record<SkillLevel, number> = {
  tour:    0,
  scratch: 5.5,
  h1_4:    7.8,
  h5_9:    12.0,
  h10_14:  16.8,
  h15_19:  21.6,
  h20_28:  28.0,
  h29:     35.5,
}

export function handicapToSkillLevel(handicap: number | null): SkillLevel {
  if (handicap === null || handicap <= 0) return 'scratch'
  if (handicap <= 4)  return 'h1_4'
  if (handicap <= 9)  return 'h5_9'
  if (handicap <= 14) return 'h10_14'
  if (handicap <= 19) return 'h15_19'
  if (handicap <= 28) return 'h20_28'
  return 'h29'
}

// ─── PGA Tour baseline ────────────────────────────────────────────────────────
// Average strokes to hole out, from Mark Broadie's published tour tables
// (ShotLink 2004–2012). Each entry: [distanceYards, expectedStrokes].
// A few source rows that dip slightly (short par 3s, mid-range sand) are smoothed
// so expected strokes never fall as the shot gets longer.

const ft = (feet: number) => feet / 3

const GREEN_TOUR: [number, number][] = [
  [0, 1.0],
  [ft(1), 1.001], [ft(2), 1.009], [ft(3), 1.04], [ft(4), 1.13], [ft(5), 1.23],
  [ft(6), 1.34], [ft(7), 1.42], [ft(8), 1.50], [ft(9), 1.56], [ft(10), 1.61],
  [ft(12), 1.70], [ft(15), 1.78], [ft(20), 1.87], [ft(25), 1.93], [ft(30), 1.98],
  [ft(40), 2.06], [ft(50), 2.14], [ft(60), 2.21], [ft(75), 2.31], [ft(90), 2.40],
  [ft(120), 2.55], [ft(165), 2.75],
]

const TEE_TOUR: [number, number][] = [
  [60, 2.75], [80, 2.84], [100, 2.92], [120, 2.95], [140, 2.97], [160, 2.99],
  [180, 3.05], [200, 3.12], [220, 3.17], [240, 3.25], [260, 3.45], [280, 3.65],
  [300, 3.71], [320, 3.79], [340, 3.86], [360, 3.92], [380, 3.96], [400, 3.99],
  [420, 4.02], [440, 4.08], [460, 4.17], [480, 4.28], [500, 4.41], [520, 4.54],
  [540, 4.65], [560, 4.74], [580, 4.79], [600, 4.82],
]

const FAIRWAY_TOUR: [number, number][] = [
  [5, 2.10], [10, 2.18], [20, 2.40], [30, 2.50], [40, 2.60], [60, 2.70], [80, 2.75],
  [100, 2.80], [120, 2.85], [140, 2.91], [160, 2.98], [180, 3.08], [200, 3.19],
  [220, 3.32], [240, 3.45], [260, 3.58], [280, 3.69], [300, 3.78], [320, 3.84],
  [340, 3.88], [360, 3.95], [380, 4.03], [400, 4.11], [420, 4.15], [440, 4.20],
  [460, 4.29], [480, 4.40], [500, 4.53], [520, 4.66], [540, 4.78], [560, 4.86],
  [580, 4.91], [600, 4.94],
]

const ROUGH_TOUR: [number, number][] = [
  [5, 2.25], [10, 2.34], [20, 2.59], [30, 2.70], [40, 2.78], [60, 2.91], [80, 2.96],
  [100, 3.02], [120, 3.08], [140, 3.15], [160, 3.23], [180, 3.31], [200, 3.42],
  [220, 3.53], [240, 3.64], [260, 3.74], [280, 3.83], [300, 3.90], [320, 3.95],
  [340, 4.02], [360, 4.11], [380, 4.21], [400, 4.30], [420, 4.34], [440, 4.39],
  [460, 4.48], [480, 4.59], [500, 4.72], [520, 4.85], [540, 4.97], [560, 5.05],
  [580, 5.10], [600, 5.13],
]

const BUNKER_TOUR: [number, number][] = [
  [5, 2.37], [10, 2.43], [20, 2.53], [30, 2.66], [40, 2.82], [60, 3.15], [80, 3.20],
  [100, 3.22], [120, 3.23], [140, 3.25], [160, 3.28], [180, 3.40], [200, 3.55],
  [220, 3.70], [240, 3.84], [260, 3.93], [280, 4.00], [300, 4.04], [320, 4.12],
  [340, 4.26], [360, 4.41], [380, 4.55], [400, 4.69],
]

// ─── Share of the level's gap still to come from each kind of spot ────────────
// Multiplied by LEVEL_GAP. From the tee the whole hole's share is still ahead;
// from the fairway the drive's share is already spent; on the green only the
// putting share is left.

// Putting: 15% of the gap, growing with length as three-putts come in.
const GREEN_SHARE: [number, number][] = [
  [0, 0],
  [ft(1), 0.0003], [ft(2), 0.0010], [ft(3), 0.0020], [ft(4), 0.0035], [ft(5), 0.0048],
  [ft(6), 0.0058], [ft(8), 0.0072], [ft(10), 0.0082], [ft(15), 0.0090], [ft(20), 0.0095],
  [ft(30), 0.0110], [ft(40), 0.0135], [ft(60), 0.0180], [ft(90), 0.0240], [ft(165), 0.0340],
]

// Off the green: short game plus the putts to follow, then approach play on top
// as the shot gets longer.
const OFF_GREEN_SHARE: [number, number][] = [
  [5, 0.017], [10, 0.020], [20, 0.024], [30, 0.026], [50, 0.028], [75, 0.030],
  [100, 0.032], [125, 0.036], [150, 0.040], [175, 0.045], [200, 0.050], [225, 0.054],
  [250, 0.057], [300, 0.060], [400, 0.064], [600, 0.066],
]

// Amateurs give up a little more from the rough and noticeably more from sand.
const ROUGH_SHARE_FACTOR = 1.1
const BUNKER_SHARE_FACTOR = 1.3
const FRINGE_SHARE_FACTOR = 1.2

// From the tee the full hole is ahead: about 0.040 of the gap on a 150 yard
// par 3, 0.058 on a 400 yard par 4, 0.068 on a 520 yard par 5 (18 holes ≈ 1.0).
function teeShare(distYards: number): number {
  if (distYards < 100) return interpolate(OFF_GREEN_SHARE, distYards)
  return (0.028 + 0.00008 * Math.min(distYards, 600)) / 1.03
}

// ─── Interpolation ────────────────────────────────────────────────────────────

function interpolate(table: [number, number][], distYards: number): number {
  const first = table[0]
  if (distYards <= first[0]) return first[1]
  const last = table[table.length - 1]
  if (distYards >= last[0]) {
    // Carry the final slope on past the end of the table
    const prev = table[table.length - 2]
    const slope = (last[1] - prev[1]) / (last[0] - prev[0])
    return last[1] + (distYards - last[0]) * slope
  }
  for (let i = 1; i < table.length; i++) {
    const [d1, s1] = table[i - 1]
    const [d2, s2] = table[i]
    if (distYards <= d2) {
      const t = (distYards - d1) / (d2 - d1)
      return s1 + t * (s2 - s1)
    }
  }
  return last[1]
}

// The fringe plays like a slightly harder putt, and never harder than a chip
// from the same distance.
function fringeTour(distYards: number): number {
  const putt = interpolate(GREEN_TOUR, distYards)
  return Math.min(putt + 0.06 + 0.012 * distYards, Math.max(putt + 0.03, interpolate(FAIRWAY_TOUR, distYards) - 0.02))
}

function tourExpected(distYards: number, lie: LieType): number {
  switch (lie) {
    case 'green':   return interpolate(GREEN_TOUR, distYards)
    case 'fringe':  return fringeTour(distYards)
    case 'fairway': return interpolate(FAIRWAY_TOUR, distYards)
    case 'tee':     return interpolate(TEE_TOUR, distYards)
    case 'rough':   return interpolate(ROUGH_TOUR, distYards)
    case 'bunker':  return interpolate(BUNKER_TOUR, distYards)
    // A penalty row is a stroke already spent: one more than playing from there
    case 'penalty': return interpolate(ROUGH_TOUR, distYards) + 1
    default:        return interpolate(FAIRWAY_TOUR, distYards)
  }
}

function gapShare(distYards: number, lie: LieType): number {
  switch (lie) {
    case 'green':   return interpolate(GREEN_SHARE, distYards)
    case 'fringe':  return interpolate(GREEN_SHARE, distYards) * FRINGE_SHARE_FACTOR
    case 'tee':     return teeShare(distYards)
    case 'rough':   return interpolate(OFF_GREEN_SHARE, distYards) * ROUGH_SHARE_FACTOR
    case 'bunker':  return interpolate(OFF_GREEN_SHARE, distYards) * BUNKER_SHARE_FACTOR
    case 'penalty': return interpolate(OFF_GREEN_SHARE, distYards) * ROUGH_SHARE_FACTOR
    default:        return interpolate(OFF_GREEN_SHARE, distYards)
  }
}

const LIE_QUALITY_OFFSET: Record<LieQuality, number> = {
  good: 0,
  awkward: 0.2,
  severe: 0.5,
}

export function expectedStrokes(
  distYards: number,
  lie: LieType,
  level: SkillLevel = 'scratch',
  quality: LieQuality = 'good',
): number {
  if (distYards <= 0) return 0
  const lvl = normalizeSkillLevel(level) ?? 'scratch'
  const base = tourExpected(distYards, lie) + LEVEL_GAP[lvl] * gapShare(distYards, lie)
  return base + LIE_QUALITY_OFFSET[quality]
}

// ─── SG per shot ──────────────────────────────────────────────────────────────

export interface SGShot {
  shotNumber: number
  lie: LieType
  distBefore: number
  distAfter: number        // 0 if holed
  lieAfter: LieType | null // null if holed
  expectedBefore: number
  expectedAfter: number    // 0 if holed
  sg: number               // expected_before - expected_after - 1
  category: SGCategory
}

export type SGCategory = 'offTee' | 'approach' | 'aroundGreen' | 'putting'

function shotCategory(
  shot: ShotEntry,
  shotIndex: number,
  par: 3 | 4 | 5,
): SGCategory {
  const { lieType, distanceToPin } = shot

  // Putting: on the green
  if (lieType === 'green') return 'putting'

  // Around green: fringe or within 30y off green
  if (lieType === 'fringe') return 'aroundGreen'
  if (distanceToPin <= 30 && (lieType === 'rough' || lieType === 'bunker' || lieType === 'fairway')) {
    return 'aroundGreen'
  }

  // Off the tee: any shot from the tee on a par 4 or par 5 (includes a re-tee
  // after a lost ball or out of bounds)
  if (par !== 3 && lieType === 'tee') return 'offTee'

  // Everything else is approach
  return 'approach'
}

export interface HoleSGResult {
  holeNumber: number
  par: 3 | 4 | 5
  score: number
  shots: SGShot[]
  sgTotal: number
  sgPutt: number
  sgAroundGreen: number
  sgApproach: number
  sgOffTee: number
}

export function calculateHoleSG(
  holeNumber: number,
  par: 3 | 4 | 5,
  shots: ShotEntry[],
  level: SkillLevel = 'scratch',
): HoleSGResult | null {
  if (!shots || shots.length === 0) return null

  const sgShots: SGShot[] = []

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i]

    // Skip the hole-out marker (dist=0) — it's not a real shot, just records ball-in-hole.
    // The SG for the shot that holed it is already captured in the previous iteration
    // (expectedAfter = expectedStrokes(0) = 0, which correctly represents holed out).
    if (shot.distanceToPin === 0) continue

    const next = shots[i + 1] ?? null

    // A penalty stroke is charged to the shot that caused it. The penalty row
    // itself is worth exactly one more than wherever the ball is played from
    // next, so it scores 0 and the whole loss lands on the offending shot.
    const expectedAt = (j: number): number => {
      const s = shots[j]
      if (!s) return 0
      if (s.lieType === 'penalty') return 1 + expectedAt(j + 1)
      return expectedStrokes(s.distanceToPin, s.lieType, level, s.lieQuality ?? 'good')
    }

    const expectedBefore = expectedAt(i)
    const expectedAfter = next ? expectedAt(i + 1) : 0
    const sg = expectedBefore - expectedAfter - 1

    sgShots.push({
      shotNumber: shot.shotNumber,
      lie: shot.lieType,
      distBefore: shot.distanceToPin,
      distAfter: next?.distanceToPin ?? 0,
      lieAfter: next?.lieType ?? null,
      expectedBefore,
      expectedAfter,
      sg,
      category: shot.lieType === 'penalty' && sgShots.length > 0 ? sgShots[sgShots.length - 1].category : shotCategory(shot, i, par),
    })
  }

  const byCategory = (cat: SGCategory) =>
    sgShots.filter(s => s.category === cat).reduce((sum, s) => sum + s.sg, 0)

  return {
    holeNumber,
    par,
    score: shots.length,
    shots: sgShots,
    sgTotal: sgShots.reduce((sum, s) => sum + s.sg, 0),
    sgPutt: byCategory('putting'),
    sgAroundGreen: byCategory('aroundGreen'),
    sgApproach: byCategory('approach'),
    sgOffTee: byCategory('offTee'),
  }
}

export interface RoundSGSummary {
  sgTotal: number
  sgPutt: number
  sgAroundGreen: number
  sgApproach: number
  sgOffTee: number
  holes: HoleSGResult[]
}

export function calculateRoundSG(
  holes: Array<{ holeNumber: number; par: 3 | 4 | 5; shots: ShotEntry[] | null }>,
  level: SkillLevel = 'scratch',
): RoundSGSummary | null {
  const results: HoleSGResult[] = []

  for (const h of holes) {
    if (!h.shots || h.shots.length === 0) continue
    const result = calculateHoleSG(h.holeNumber, h.par, h.shots, level)
    if (result) results.push(result)
  }

  if (results.length === 0) return null

  return {
    sgTotal: results.reduce((s, h) => s + h.sgTotal, 0),
    sgPutt: results.reduce((s, h) => s + h.sgPutt, 0),
    sgAroundGreen: results.reduce((s, h) => s + h.sgAroundGreen, 0),
    sgApproach: results.reduce((s, h) => s + h.sgApproach, 0),
    sgOffTee: results.reduce((s, h) => s + h.sgOffTee, 0),
    holes: results,
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmtSG(n: number): string {
  if (Math.abs(n) < 0.005) return 'E'
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2)
}

export function sgColor(n: number): string {
  if (n >= 0.5) return '#22C55E'
  if (n >= 0) return '#4ade80'
  if (n >= -0.5) return '#F59E0B'
  return '#EF4444'
}
