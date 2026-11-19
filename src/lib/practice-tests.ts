/**
 * Practice tests: set drills with a score, so practice can be measured and
 * beaten next time. Plain data in, plain data out, so it can be unit tested.
 *
 * The "guide" scores by handicap are TM Stats' rough guide, not tour data:
 * they are there to give a golfer something to aim at, and are labelled so.
 */

export type TestCategory = 'putting' | 'aroundGreen' | 'approach' | 'offTee'

export interface Station {
  label: string
  // 'count': how many of `of` went in (or hit). 'feet': one distance from the hole per ball.
  kind: 'count' | 'feet'
  of: number
}

export interface PracticeTest {
  key: string
  name: string
  category: TestCategory
  short: string
  setup: string[]
  stations: Station[]
  // How the stations make one score
  scoring: 'sum' | 'avgFeet' | 'streak'
  max: number | null          // best possible score, when there is one
  higherIsBetter: boolean
  unit: string                // shown after the score
  guide: { scratch: number; h5: number; h10: number; h18: number }
}

export const CATEGORY_LABEL: Record<TestCategory, string> = {
  putting: 'Putting', aroundGreen: 'Short game', approach: 'Approach', offTee: 'Driving',
}

export const PRACTICE_TESTS: PracticeTest[] = [
  {
    key: 'putt_ladder', name: 'Putting ladder', category: 'putting',
    short: '10 putts each from 3, 6 and 9 feet. How many go in?',
    setup: ['Pick a fairly flat hole on the practice green.', 'Put a tee at 3, 6 and 9 feet.', 'Hit 10 putts from each tee, one ball at a time, full routine on every putt.'],
    stations: [{ label: '3 feet', kind: 'count', of: 10 }, { label: '6 feet', kind: 'count', of: 10 }, { label: '9 feet', kind: 'count', of: 10 }],
    scoring: 'sum', max: 30, higherIsBetter: true, unit: 'of 30',
    guide: { scratch: 22, h5: 20, h10: 18, h18: 15 },
  },
  {
    key: 'lag', name: 'Lag putting', category: 'putting',
    short: '3 putts each from 30, 40 and 50 feet. How many finish within 3 feet?',
    setup: ['Pick a hole with some slope.', 'Pace out 30, 40 and 50 feet.', 'Three balls from each. Count the ones that stop within 3 feet (about a putter length) of the hole, or go in.'],
    stations: [{ label: '30 feet', kind: 'count', of: 3 }, { label: '40 feet', kind: 'count', of: 3 }, { label: '50 feet', kind: 'count', of: 3 }],
    scoring: 'sum', max: 9, higherIsBetter: true, unit: 'of 9',
    guide: { scratch: 7, h5: 6, h10: 5, h18: 3 },
  },
  {
    key: 'pressure_3ft', name: 'Pressure 3 footers', category: 'putting',
    short: 'How many 3 footers in a row before you miss? Stop at 25.',
    setup: ['Put tees in a circle 3 feet from the hole, round the clock.', 'Go round the circle. One miss ends it.', 'Your score is how many you holed in a row (25 is the most).'],
    stations: [{ label: 'Holed in a row', kind: 'count', of: 25 }],
    scoring: 'streak', max: 25, higherIsBetter: true, unit: 'in a row',
    guide: { scratch: 20, h5: 15, h10: 10, h18: 6 },
  },
  {
    key: 'up_down', name: 'Up and down 9', category: 'aroundGreen',
    short: '3 chips, 3 pitches and 3 bunker shots, each played out. How many up and downs?',
    setup: ['3 chips from just off the green, 3 pitches from 20 to 30 yards, 3 bunker shots.', 'Change the spot every ball: good lies and bad.', 'Putt each one out. Count the ones you get down in two or fewer.'],
    stations: [{ label: 'Chips', kind: 'count', of: 3 }, { label: 'Pitches', kind: 'count', of: 3 }, { label: 'Bunker', kind: 'count', of: 3 }],
    scoring: 'sum', max: 9, higherIsBetter: true, unit: 'of 9',
    guide: { scratch: 6, h5: 5, h10: 4, h18: 2 },
  },
  {
    key: 'wedge', name: 'Wedge distance', category: 'approach',
    short: '3 balls each to 50, 70 and 90 yards. Average distance from the hole, in feet.',
    setup: ['Use a range with flags at known yardages, or pace them out on the course.', 'Three balls at each distance, full routine.', 'Pace or guess how far each one finished from the flag, in feet.'],
    stations: [{ label: '50 yards', kind: 'feet', of: 3 }, { label: '70 yards', kind: 'feet', of: 3 }, { label: '90 yards', kind: 'feet', of: 3 }],
    scoring: 'avgFeet', max: null, higherIsBetter: false, unit: 'ft average',
    guide: { scratch: 15, h5: 19, h10: 24, h18: 32 },
  },
  {
    key: 'greens_9', name: '9 greens', category: 'approach',
    short: '9 approach shots from 120 to 180 yards. How many finish on the green?',
    setup: ['On the course, or on the range picking a green-sized target.', 'Change club and distance every ball, from 120 to 180 yards.', 'Count the ones that would be on the green.'],
    stations: [{ label: 'Greens hit', kind: 'count', of: 9 }],
    scoring: 'sum', max: 9, higherIsBetter: true, unit: 'of 9',
    guide: { scratch: 6, h5: 5, h10: 4, h18: 2 },
  },
  {
    key: 'fairway_finder', name: 'Fairway finder', category: 'offTee',
    short: '14 drives at a 30 yard wide fairway. How many stay in?',
    setup: ['On the range, pick two targets about 30 yards apart as the edges of a fairway.', 'Hit 14 drives, one per "hole", full routine, using your tee club for each hole.', 'Count the ones that finish between the targets.'],
    stations: [{ label: 'Fairways', kind: 'count', of: 14 }],
    scoring: 'sum', max: 14, higherIsBetter: true, unit: 'of 14',
    guide: { scratch: 9, h5: 8, h10: 7, h18: 5 },
  },
]

export function testByKey(key: string): PracticeTest | null {
  return PRACTICE_TESTS.find(t => t.key === key) ?? null
}

/** Check and score one go at a test. `values` has one array per station. */
export function scoreTest(test: PracticeTest, values: unknown): { score: number; detail: number[][] } | { error: string } {
  if (!Array.isArray(values) || values.length !== test.stations.length) return { error: 'Fill in every part of the test' }
  const detail: number[][] = []
  for (let i = 0; i < test.stations.length; i++) {
    const st = test.stations[i]
    const v = values[i]
    if (st.kind === 'count') {
      const n = Array.isArray(v) ? v[0] : v
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > st.of) return { error: `${st.label}: enter a number from 0 to ${st.of}` }
      detail.push([n])
    } else {
      if (!Array.isArray(v) || v.length !== st.of || v.some(x => typeof x !== 'number' || !isFinite(x) || x < 0 || x > 300)) return { error: `${st.label}: enter how far each ball finished, in feet` }
      detail.push(v.map(x => Math.round(x * 10) / 10))
    }
  }
  let score: number
  if (test.scoring === 'avgFeet') {
    const all = detail.flat()
    score = Math.round((all.reduce((s, x) => s + x, 0) / all.length) * 10) / 10
  } else {
    score = detail.reduce((s, d) => s + d[0], 0)
  }
  return { score, detail }
}

export interface TestResult { score: number; taken_on: string; created_at?: string }

export function better(test: PracticeTest, a: number, b: number): boolean {
  return test.higherIsBetter ? a > b : a < b
}

export interface TestProgress {
  taken: number
  last: number | null
  best: number | null
  bestOn: string | null
  avgLast5: number | null
  first: number | null
  change: number | null       // last 5 average against the first 5, in "better" terms (positive = improved)
  isNewBest: boolean          // the latest go is the best ever (and not the only one)
  level: 'scratch' | 'h5' | 'h10' | 'h18' | 'below' | null  // which guide level the last 5 average reaches
}

/** Results oldest first. */
export function testProgress(test: PracticeTest, results: TestResult[]): TestProgress {
  const list = [...results].sort((a, b) => (a.taken_on + (a.created_at ?? '')).localeCompare(b.taken_on + (b.created_at ?? '')))
  if (list.length === 0) return { taken: 0, last: null, best: null, bestOn: null, avgLast5: null, first: null, change: null, isNewBest: false, level: null }
  const scores = list.map(r => r.score)
  let bestIdx = 0
  scores.forEach((s, i) => { if (better(test, s, scores[bestIdx]) || (s === scores[bestIdx] && i > bestIdx)) bestIdx = i })
  const avg = (xs: number[]) => Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10
  const last5 = scores.slice(-5)
  const first5 = scores.slice(0, Math.min(5, scores.length))
  const avgLast5 = avg(last5)
  const change = scores.length >= 4 ? Math.round((test.higherIsBetter ? avgLast5 - avg(first5) : avg(first5) - avgLast5) * 10) / 10 : null
  const prevBest = scores.slice(0, -1).reduce<number | null>((b, s) => (b === null || better(test, s, b) ? s : b), null)
  const isNewBest = prevBest !== null && better(test, scores[scores.length - 1], prevBest)
  const g = test.guide
  const reaches = (target: number) => (test.higherIsBetter ? avgLast5 >= target : avgLast5 <= target)
  const level = reaches(g.scratch) ? 'scratch' : reaches(g.h5) ? 'h5' : reaches(g.h10) ? 'h10' : reaches(g.h18) ? 'h18' : 'below'
  return { taken: scores.length, last: scores[scores.length - 1], best: scores[bestIdx], bestOn: list[bestIdx].taken_on, avgLast5, first: scores[0], change, isNewBest, level }
}

export const LEVEL_LABEL: Record<NonNullable<TestProgress['level']>, string> = {
  scratch: 'scratch golfer', h5: '5 handicap', h10: '10 handicap', h18: '18 handicap', below: 'over 18 handicap',
}

/** Weeks in a row (up to this week) with at least one test or session. Dates are YYYY-MM-DD. */
export function practiceStreakWeeks(dates: string[], today = new Date()): number {
  const weekStart = (d: Date) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10) }
  const weeks = new Set(dates.map(d => weekStart(new Date(d + 'T12:00:00Z'))))
  let n = 0
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  // This week counts if practised; otherwise start from last week so the streak is not lost on Monday morning
  if (!weeks.has(weekStart(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 7)
  while (weeks.has(weekStart(cursor))) { n++; cursor.setUTCDate(cursor.getUTCDate() - 7) }
  return n
}

/** Tests that work on a part of the game, for "suggested for you". */
export function testsFor(category: TestCategory): PracticeTest[] {
  return PRACTICE_TESTS.filter(t => t.category === category)
}
