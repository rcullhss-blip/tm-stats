/**
 * Strokes Gained Engine
 * Based on Mark Broadie's research ("Every Shot Counts")
 * Baseline = expected strokes to hole out for the chosen skill level
 */

import type { LieType, ShotEntry } from './types'

// ─── Skill levels ─────────────────────────────────────────────────────────────

export type SkillLevel = 'tour' | 'scratch' | 'low' | 'mid' | 'high' | 'beginner'

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  tour:     'PGA Tour',
  scratch:  'Scratch (0 HCP)',
  low:      'Low amateur (1–9)',
  mid:      'Mid amateur (10–18)',
  high:     'High handicap (19–28)',
  beginner: 'Beginner (29+)',
}

// Scale factors applied to scratch expected strokes.
// Formula: adjusted = 1 + (scratch - 1) * scale
// Putting scales less than approach — gaps narrow on the green.
// 'tour' scales below 1.0 — PGA Tour players expect fewer strokes than scratch.
const SKILL_SCALES: Record<SkillLevel, { putting: number; approach: number }> = {
  tour:     { putting: 0.90, approach: 0.82 },
  scratch:  { putting: 1.00, approach: 1.00 },
  low:      { putting: 1.06, approach: 1.18 },
  mid:      { putting: 1.12, approach: 1.38 },
  high:     { putting: 1.18, approach: 1.60 },
  beginner: { putting: 1.25, approach: 1.85 },
}

export function handicapToSkillLevel(handicap: number | null): SkillLevel {
  if (handicap === null || handicap <= 0) return 'scratch'
  if (handicap <= 9)  return 'low'
  if (handicap <= 18) return 'mid'
  if (handicap <= 28) return 'high'
  return 'beginner'
}

// ─── Baseline data ────────────────────────────────────────────────────────────
// Each entry: [distanceYards, expectedStrokes]
// Interpolation is used between points

const GREEN_BASELINE: [number, number][] = [
  [0,   0],
  [0.3, 1.003],  // ~1 foot
  [0.7, 1.011],  // ~2 feet
  [1.0, 1.030],  // 3 feet
  [1.3, 1.060],  // 4 feet
  [1.7, 1.100],  // 5 feet
  [2.0, 1.170],  // 6 feet
  [2.5, 1.220],  // ~7 feet
  [3.0, 1.280],  // 9 feet
  [4.0, 1.430],  // 12 feet
  [5.0, 1.550],  // 15 feet
  [7.0, 1.680],  // 21 feet
  [8.3, 1.780],  // 25 feet
  [10,  1.860],  // 30 feet
  [13,  1.950],  // 40 feet
  [17,  2.020],  // 50 feet
  [20,  2.080],  // 60 feet
  [30,  2.180],  // 90 feet
  [40,  2.260],  // 120 feet
  [55,  2.360],  // 165 feet
]

const FAIRWAY_BASELINE: [number, number][] = [
  [5,   2.30],
  [10,  2.40],
  [20,  2.55],
  [30,  2.65],
  [40,  2.72],
  [50,  2.80],
  [75,  2.97],
  [100, 3.18],
  [125, 3.38],
  [150, 3.54],
  [175, 3.68],
  [200, 3.80],
  [225, 3.91],
  [250, 4.01],
  [275, 4.10],
  [300, 4.19],
  [350, 4.38],
  [400, 4.57],
  [450, 4.75],
]

const ROUGH_BASELINE: [number, number][] = [
  [5,   2.50],
  [10,  2.60],
  [20,  2.75],
  [30,  2.86],
  [50,  3.05],
  [75,  3.24],
  [100, 3.46],
  [125, 3.67],
  [150, 3.85],
  [175, 4.02],
  [200, 4.17],
  [250, 4.38],
  [300, 4.57],
]

const BUNKER_BASELINE: [number, number][] = [
  [5,   2.50],
  [10,  2.60],
  [20,  2.80],
  [30,  2.93],
  [50,  3.15],
  [75,  3.38],
  [100, 3.64],
  [150, 4.08],
  [200, 4.47],
]

const FRINGE_BASELINE: [number, number][] = [
  [1,   1.90],
  [3,   2.10],
  [5,   2.25],
  [10,  2.40],
  [20,  2.58],
  [30,  2.70],
]

const PENALTY_BASELINE: [number, number][] = [
  [30,  3.20],
  [75,  3.60],
  [100, 3.90],
  [150, 4.25],
  [200, 4.55],
  [250, 4.78],
  [300, 5.00],
]

// ─── Interpolation ────────────────────────────────────────────────────────────

function interpolate(table: [number, number][], distYards: number): number {
  if (distYards <= 0) return 0
  const last = table[table.length - 1]
  if (distYards >= last[0]) {
    // Extrapolate beyond max (each extra 50y ≈ +0.19 strokes)
    return last[1] + ((distYards - last[0]) / 50) * 0.19
  }
  for (let i = 1; i < table.length; i++) {
    const [d1, s1] = table[i - 1]
    const [d2, s2] = table[i]
    if (distYards <= d2) {
      const t = (distYards - d1) / (d2 - d1)
      return s1 + t * (s2 - s1)
    }
  }
  return table[0][1]
}

function scratchExpected(distYards: number, lie: LieType): number {
  switch (lie) {
    case 'green':   return interpolate(GREEN_BASELINE, distYards)
    case 'fringe':  return interpolate(FRINGE_BASELINE, distYards)
    case 'fairway': return interpolate(FAIRWAY_BASELINE, distYards)
    case 'tee':     return interpolate(FAIRWAY_BASELINE, distYards)
    case 'rough':   return interpolate(ROUGH_BASELINE, distYards)
    case 'bunker':  return interpolate(BUNKER_BASELINE, distYards)
    case 'penalty': return interpolate(PENALTY_BASELINE, distYards)
    default:        return interpolate(FAIRWAY_BASELINE, distYards)
  }
}

export function expectedStrokes(distYards: number, lie: LieType, level: SkillLevel = 'scratch'): number {
  if (distYards <= 0) return 0
  const scratch = scratchExpected(distYards, lie)
  if (level === 'scratch') return scratch
  const { putting, approach } = SKILL_SCALES[level]
  const scale = lie === 'green' ? putting : approach
  // Scale the difficulty above "1 shot" — the hole-out stroke is always 1
  return 1 + (scratch - 1) * scale
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

  // Off the tee: first shot on par 4 or par 5 from tee
  if (shotIndex === 0 && par !== 3 && lieType === 'tee') return 'offTee'

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

    const expectedBefore = expectedStrokes(shot.distanceToPin, shot.lieType, level)
    const expectedAfter = next ? expectedStrokes(next.distanceToPin, next.lieType, level) : 0
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
      category: shotCategory(shot, i, par),
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
