import type { PracticeTest } from '@/lib/practice-tests'

/** The guide score for a golfer's own handicap. */
export function guideFor(test: PracticeTest, handicap: number | null): { value: number; label: string } {
  const h = handicap ?? 18
  if (h <= 2) return { value: test.guide.scratch, label: 'scratch' }
  if (h <= 7) return { value: test.guide.h5, label: '5 handicap' }
  if (h <= 13) return { value: test.guide.h10, label: '10 handicap' }
  return { value: test.guide.h18, label: '18 handicap' }
}

export function fmtScore(test: PracticeTest, v: number | null): string {
  if (v === null) return '–'
  return test.scoring === 'avgFeet' ? `${v.toFixed(1)}` : `${v}`
}
