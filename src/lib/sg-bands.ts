/**
 * Strokes Gained by distance band, and the ranking built on it
 * ("gaining most" / "costing most" / biggest leaks).
 *
 * One place for the bands so the Stats page and the coach's view of a player
 * always agree.
 */

import type { RoundSGSummary } from './sg-engine'

export interface SGBand {
  label: string
  category: 'putting' | 'around_green' | 'approach' | 'off_tee'
  minY: number
  maxY: number
  sgSum: number
  count: number
}

export interface BandRank {
  label: string
  sgPerRound: number
  shots: number
}

function emptyBands(): SGBand[] {
  return [
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
}

/** Strokes Gained and shot count in every distance band for one round. */
export function bandsForRound(sgResult: RoundSGSummary): SGBand[] {
  const bands = emptyBands()
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
}

const BAND_PREFIX: Record<SGBand['category'], string> = {
  putting: 'Putts', around_green: 'Chips', approach: 'Approach', off_tee: 'Drives',
}

/**
 * Every band with at least 3 shots across the rounds given, best first.
 * sgPerRound is Strokes Gained per round played, so the numbers add up to the
 * round total and a band the golfer rarely faces cannot dominate.
 */
export function rankBands(roundBands: (SGBand[] | null)[]): BandRank[] {
  const n = roundBands.filter(Boolean).length
  const totals = new Map<string, BandRank & { sgSum: number }>()
  for (const bands of roundBands) {
    for (const b of bands ?? []) {
      if (b.count === 0) continue
      const label = `${BAND_PREFIX[b.category]} ${b.label}`
      const t = totals.get(label) ?? { label, sgPerRound: 0, shots: 0, sgSum: 0 }
      t.sgSum += b.sgSum
      t.shots += b.count
      totals.set(label, t)
    }
  }
  return [...totals.values()]
    .filter(b => b.shots >= 3)
    .map(b => ({ label: b.label, shots: b.shots, sgPerRound: b.sgSum / Math.max(n, 1) }))
    .sort((a, b) => b.sgPerRound - a.sgPerRound)
}

/** Top three gaining and top three costing bands (fewer when there is little data). */
export function bestAndWorst(ranked: BandRank[]): { best: BandRank[]; worst: BandRank[] } {
  const side = Math.min(3, Math.floor(ranked.length / 2))
  return {
    best: ranked.slice(0, side),
    worst: ranked.slice(ranked.length - side).reverse(),
  }
}

/**
 * Biggest leaks: the bands that are actually losing shots, worst first.
 * Only bands costing a tenth of a shot a round or more count, so a golfer
 * who is level everywhere is not told they have a leak.
 */
export function biggestLeaks(ranked: BandRank[], max = 3): BandRank[] {
  return [...ranked].reverse().filter(b => b.sgPerRound <= -0.1).slice(0, max)
}
