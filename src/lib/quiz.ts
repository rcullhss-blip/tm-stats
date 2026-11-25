// "Where are you losing shots?" quiz. Five taps, no account.
//
// It compares four numbers a golfer already knows with the benchmark for their
// handicap band (the same bands as the benchmark pages and Strokes Gained) and
// turns each gap into rough shots per round. It is a quick read, not Strokes
// Gained: the result says so and points to the real thing.

import { BANDS, type Band } from './seo-stats'

export type QuizArea = 'tee' | 'approach' | 'short' | 'putting'

export interface QuizOption { label: string; value: number }

export const FAIRWAY_OPTIONS: QuizOption[] = [
  { label: '3 or fewer', value: 3 },
  { label: '4 or 5', value: 4.5 },
  { label: '6 or 7', value: 6.5 },
  { label: '8 or 9', value: 8.5 },
  { label: '10 or more', value: 10.5 },
]

export const GREEN_OPTIONS: QuizOption[] = [
  { label: '2 or fewer', value: 2 },
  { label: '3 to 5', value: 4 },
  { label: '6 to 8', value: 7 },
  { label: '9 to 11', value: 10 },
  { label: '12 or more', value: 12.5 },
]

export const PUTT_OPTIONS: QuizOption[] = [
  { label: '28 or fewer', value: 28 },
  { label: '29 to 31', value: 30 },
  { label: '32 to 34', value: 33 },
  { label: '35 to 37', value: 36 },
  { label: '38 or more', value: 39 },
]

// Out of 10 missed greens, how many end in a chip and one putt.
export const UP_DOWN_OPTIONS: QuizOption[] = [
  { label: '1 or none', value: 8 },
  { label: '2 or 3', value: 25 },
  { label: '4 or 5', value: 45 },
  { label: '6 or more', value: 65 },
]

export interface QuizAnswers {
  band: string      // Band slug
  fairways: number  // of 14
  greens: number    // of 18
  putts: number     // per 18 holes
  upDown: number    // percent
}

export interface QuizLine {
  area: QuizArea
  name: string
  shots: number      // per round against the band. Negative = losing shots.
  yours: string
  typical: string
}

export interface QuizResult {
  band: Band
  lines: QuizLine[]         // fixed order: tee, approach, short, putting
  worst: QuizLine | null    // biggest loss, or null when nothing is half a shot behind
  best: QuizLine | null     // biggest gain of half a shot or more
}

// Under half a shot is inside the rounding of the answers, so it reads as level.
export const LEVEL_MARGIN = 0.5

const round1 = (n: number) => Math.round(n * 10) / 10

/** The answer as the golfer picked it ("6 or 7"), falling back to the number. */
function picked(options: QuizOption[], value: number): string {
  return options.find(o => o.value === value)?.label ?? String(Math.round(value))
}

/** "10–14 handicap" -> "10 to 14 handicap" (site copy uses no dashes). */
export function plainLabel(label: string): string {
  return label.replace(/–/g, ' to ')
}

export function findBand(slug: string): Band | null {
  return BANDS.find(b => b.slug === slug) ?? null
}

export function scoreQuiz(a: QuizAnswers): QuizResult | null {
  const band = findBand(a.band)
  if (!band) return null

  const bandFairways = (band.fir / 100) * 14
  const bandGreens = (band.gir / 100) * 18
  const missChance = 1 - band.upDown / 100 // what a missed green costs this band, on average

  // A missed fairway costs roughly a third of a shot.
  const tee = (a.fairways - bandFairways) * 0.3
  // A missed green costs the chance of not getting up and down.
  const approach = (a.greens - bandGreens) * missChance
  // More greens hit means longer first putts, so allow about half a putt per extra green.
  const expectedPutts = band.puttsPerRound + 0.45 * (a.greens - bandGreens)
  const putting = expectedPutts - a.putts
  // Each extra up and down from the greens they miss saves a shot.
  const short = ((a.upDown - band.upDown) / 100) * (18 - a.greens)

  const lines: QuizLine[] = [
    { area: 'tee', name: 'Off the tee', shots: round1(tee), yours: `${picked(FAIRWAY_OPTIONS, a.fairways)} of 14 fairways`, typical: `${Math.round(bandFairways)} of 14` },
    { area: 'approach', name: 'Approach play', shots: round1(approach), yours: `${picked(GREEN_OPTIONS, a.greens)} of 18 greens`, typical: `${Math.round(bandGreens)} of 18` },
    { area: 'short', name: 'Short game', shots: round1(short), yours: `${picked(UP_DOWN_OPTIONS, a.upDown)} in 10 up and downs`, typical: `${Math.round(band.upDown / 10)} in 10` },
    { area: 'putting', name: 'Putting', shots: round1(putting), yours: `${picked(PUTT_OPTIONS, a.putts)} putts`, typical: `${Math.round(expectedPutts)} for the greens you hit` },
  ]

  const sorted = [...lines].sort((x, y) => x.shots - y.shots)
  const worst = sorted[0].shots <= -LEVEL_MARGIN ? sorted[0] : null
  const top = sorted[sorted.length - 1]
  const best = top.shots >= LEVEL_MARGIN ? top : null
  return { band, lines, worst, best }
}

/** One thing to do about it, and the benchmark page that goes deeper. */
export const AREA_ADVICE: Record<QuizArea, { tip: string; statSlug: string; statName: string }> = {
  tee: {
    tip: 'Pick the club that keeps your worst tee shot in play, not the one that goes furthest on a good day. A ball in the light rough is fine. A ball in the trees or out of bounds is where the shots go.',
    statSlug: 'fairways-hit', statName: 'fairways hit',
  },
  approach: {
    tip: 'Most missed greens finish short. Take one more club than feels right and aim at the middle of the green, not the flag, for your next three rounds.',
    statSlug: 'gir-percentage', statName: 'greens in regulation',
  },
  short: {
    tip: 'Use one simple chip for everything you can: land it about three feet on and let it run. Getting the first one on the green every time beats the odd one that finishes close.',
    statSlug: 'up-and-down', statName: 'up and downs',
  },
  putting: {
    tip: 'Three putts cost more than missed ten footers. Spend your putting practice rolling long ones from 25 to 40 feet until the next putt is inside three feet.',
    statSlug: 'putts-per-round', statName: 'putts per round',
  },
}
