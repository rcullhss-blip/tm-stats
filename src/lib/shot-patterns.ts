/**
 * Shot patterns (Elite)
 *
 * Groups every tracked shot into a distance band and works out, for each band:
 * Strokes Gained per round and per shot, which way the misses go, and where
 * the ball finished around the target.
 *
 * A miss is stored on the row the ball ended up at (see ShotEntry.miss), so the
 * shot it describes is the last real row before it.
 */

import type { ShotEntry } from './types'
import { calculateRoundSG, type SkillLevel } from './sg-engine'

export type PatternGroup = 'drive' | 'approach' | 'chip' | 'putt'

export interface PatternPoint {
  // Where the ball finished from the target. +x right, +y long.
  // Yards, or feet for putts.
  x: number
  y: number
  sg: number
}

export interface PatternBucket {
  key: string
  group: PatternGroup
  label: string
  unit: 'y' | 'ft'
  shots: number          // every shot in the band
  sgPerShot: number
  sgPerRound: number
  // SG for this band in each round it appeared, newest first
  perRound: number[]
  tracked: number        // shots with a finish recorded
  left: number
  right: number
  short: number
  long: number
  onTarget: number
  points: PatternPoint[]
  avgX: number
  avgY: number
}

interface BandDef { key: string; group: PatternGroup; label: string; min: number; max: number }

// Distances in yards (putts stored in yards too: 1 yard = 3 feet)
const BANDS: BandDef[] = [
  { key: 'drive',     group: 'drive',    label: 'Drives',            min: 0,    max: Infinity },
  { key: 'app200',    group: 'approach', label: 'Approach 200y+',    min: 200,  max: Infinity },
  { key: 'app150',    group: 'approach', label: 'Approach 150–200y', min: 150,  max: 200 },
  { key: 'app100',    group: 'approach', label: 'Approach 100–150y', min: 100,  max: 150 },
  { key: 'app50',     group: 'approach', label: 'Approach 50–100y',  min: 50,   max: 100 },
  { key: 'app30',     group: 'approach', label: 'Pitch 30–50y',      min: 30,   max: 50 },
  { key: 'chip10',    group: 'chip',     label: 'Chips 10–30y',      min: 10,   max: 30 },
  { key: 'chip0',     group: 'chip',     label: 'Chips inside 10y',  min: 0,    max: 10 },
  { key: 'putt40',    group: 'putt',     label: 'Putts 40ft+',       min: 40 / 3, max: Infinity },
  { key: 'putt20',    group: 'putt',     label: 'Putts 20–40ft',     min: 20 / 3, max: 40 / 3 },
  { key: 'putt10',    group: 'putt',     label: 'Putts 10–20ft',     min: 10 / 3, max: 20 / 3 },
  { key: 'putt5',     group: 'putt',     label: 'Putts 5–10ft',      min: 5 / 3,  max: 10 / 3 },
  { key: 'putt0',     group: 'putt',     label: 'Putts inside 5ft',  min: 0,      max: 5 / 3 },
]

function groupOf(shot: ShotEntry, par: number): PatternGroup {
  if (shot.lieType === 'green') return 'putt'
  if (shot.lieType === 'tee' && par !== 3) return 'drive'
  if (shot.distanceToPin < 30) return 'chip'
  return 'approach'
}

function bandFor(shot: ShotEntry, par: number): BandDef | null {
  const group = groupOf(shot, par)
  return BANDS.find(b => b.group === group && shot.distanceToPin >= b.min && shot.distanceToPin < b.max) ?? null
}

export interface PatternRound {
  holes: Array<{ holeNumber: number; par: 3 | 4 | 5; shots: ShotEntry[] | null }>
}

/** rounds: newest first. */
export function buildShotPatterns(rounds: PatternRound[], level: SkillLevel): PatternBucket[] {
  const acc = new Map<string, PatternBucket & { sgSum: number }>()
  const blank = (b: BandDef): PatternBucket & { sgSum: number } => ({
    key: b.key, group: b.group, label: b.label, unit: b.group === 'putt' ? 'ft' : 'y',
    shots: 0, sgPerShot: 0, sgPerRound: 0, perRound: [], tracked: 0,
    left: 0, right: 0, short: 0, long: 0, onTarget: 0, points: [], avgX: 0, avgY: 0, sgSum: 0,
  })

  let roundsCounted = 0

  for (const round of rounds) {
    const sg = calculateRoundSG(round.holes, level)
    if (!sg) continue
    roundsCounted++
    const roundSum = new Map<string, number>()

    for (const hole of round.holes) {
      const shots = hole.shots ?? []
      const holeSG = sg.holes.find(h => h.holeNumber === hole.holeNumber)
      if (!holeSG) continue

      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i]
        if (shot.lieType === 'penalty' || shot.distanceToPin === 0) continue
        const band = bandFor(shot, hole.par)
        if (!band) continue
        const sgShot = holeSG.shots.find(s => s.shotNumber === shot.shotNumber)
        if (!sgShot) continue

        // A penalty stroke straight after this shot belongs to it
        let shotSG = sgShot.sg
        let j = i + 1
        while (j < shots.length && shots[j].lieType === 'penalty') {
          shotSG += holeSG.shots.find(s => s.shotNumber === shots[j].shotNumber)?.sg ?? 0
          j++
        }

        const b = acc.get(band.key) ?? blank(band)
        b.shots++
        b.sgSum += shotSG
        roundSum.set(band.key, (roundSum.get(band.key) ?? 0) + shotSG)

        // Where it finished: recorded on the next real row
        const next = shots[j]
        if (next?.miss && next.distanceToPin > 0) {
          const { x, y } = next.miss
          b.tracked++
          if (x === 0 && y === 0) b.onTarget++
          if (x < 0) b.left++
          if (x > 0) b.right++
          if (y < 0) b.short++
          if (y > 0) b.long++
          // Distance still to go, in the band's unit, pushed out along the miss
          // direction. A drive only records a side, so it has no plot.
          if (band.group !== 'drive') {
            const remaining = band.group === 'putt' ? next.distanceToPin * 3 : next.distanceToPin
            const norm = Math.hypot(x, y) || 1
            const on = x === 0 && y === 0
            b.points.push({ x: on ? 0 : (x / norm) * remaining, y: on ? 0 : (y / norm) * remaining, sg: shotSG })
          }
        }
        acc.set(band.key, b)
      }
    }

    for (const [key, sum] of roundSum) acc.get(key)?.perRound.push(sum)
  }

  return BANDS
    .map(b => acc.get(b.key))
    .filter((b): b is PatternBucket & { sgSum: number } => !!b && b.shots > 0)
    .map(({ sgSum, ...b }) => ({
      ...b,
      sgPerShot: sgSum / b.shots,
      sgPerRound: sgSum / Math.max(roundsCounted, 1),
      avgX: b.points.length ? b.points.reduce((s, p) => s + p.x, 0) / b.points.length : 0,
      avgY: b.points.length ? b.points.reduce((s, p) => s + p.y, 0) / b.points.length : 0,
    }))
}

/** One or two plain sentences on a bucket's miss pattern, or null if too thin. */
export function describePattern(b: PatternBucket): string | null {
  if (b.tracked < 5) return null
  const pct = (n: number) => Math.round((n / b.tracked) * 100)
  const parts: string[] = []
  if (b.group === 'drive') {
    if (b.left >= b.right * 1.5 && pct(b.left) >= 35) parts.push(`${pct(b.left)}% of drives miss left`)
    else if (b.right >= b.left * 1.5 && pct(b.right) >= 35) parts.push(`${pct(b.right)}% of drives miss right`)
    else parts.push('no one-sided miss off the tee')
  } else {
    if (b.short >= b.long * 1.5 && pct(b.short) >= 35) parts.push(`${pct(b.short)}% finish short`)
    else if (b.long >= b.short * 1.5 && pct(b.long) >= 35) parts.push(`${pct(b.long)}% finish long`)
    if (b.left >= b.right * 1.5 && pct(b.left) >= 35) parts.push(`${pct(b.left)}% finish left`)
    else if (b.right >= b.left * 1.5 && pct(b.right) >= 35) parts.push(`${pct(b.right)}% finish right`)
    if (parts.length === 0) parts.push('misses are spread evenly, no one-sided pattern')
  }
  return `${b.label}: ${parts.join(', ')} (${b.tracked} shots).`
}
