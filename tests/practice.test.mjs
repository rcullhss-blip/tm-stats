// Practice tests. Run with: node --test tests/practice.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { testByKey, scoreTest, testProgress, practiceStreakWeeks, PRACTICE_TESTS } from '../src/lib/practice-tests.ts'

test('every test is well formed', () => {
  for (const t of PRACTICE_TESTS) {
    assert.ok(t.stations.length > 0, t.key)
    if (t.max !== null) assert.equal(t.stations.reduce((s, x) => s + x.of, 0), t.max, t.key)
    const g = t.guide
    if (t.higherIsBetter) assert.ok(g.scratch >= g.h5 && g.h5 >= g.h10 && g.h10 >= g.h18, t.key)
    else assert.ok(g.scratch <= g.h5 && g.h5 <= g.h10 && g.h10 <= g.h18, t.key)
  }
})

test('scoring: counts add up, feet average, bad input refused', () => {
  const ladder = testByKey('putt_ladder')
  assert.deepEqual(scoreTest(ladder, [8, 6, [4]]), { score: 18, detail: [[8], [6], [4]] })
  assert.ok('error' in scoreTest(ladder, [11, 6, 4]))
  assert.ok('error' in scoreTest(ladder, [8, 6]))
  assert.ok('error' in scoreTest(ladder, [8, 6, 2.5]))
  const wedge = testByKey('wedge')
  assert.equal(scoreTest(wedge, [[10, 20, 30], [12, 18, 24], [30, 15, 21]]).score, 20)
  assert.ok('error' in scoreTest(wedge, [[10, 20], [12, 18, 24], [30, 15, 21]]))
  assert.ok('error' in scoreTest(wedge, [[10, 20, -1], [12, 18, 24], [30, 15, 21]]))
})

test('progress: best, new best, change and level, both directions', () => {
  const ladder = testByKey('putt_ladder')
  const r = (score, d) => ({ score, taken_on: `2026-11-${String(d).padStart(2, '0')}` })
  const p = testProgress(ladder, [r(14, 1), r(15, 2), r(16, 3), r(17, 4), r(21, 5)])
  assert.equal(p.best, 21); assert.equal(p.last, 21); assert.equal(p.isNewBest, true); assert.equal(p.taken, 5)
  assert.equal(p.avgLast5, 16.6); assert.equal(p.level, 'h18')
  const wedge = testByKey('wedge')
  const w = testProgress(wedge, [r(30, 1), r(28, 2), r(25, 3), r(20, 4), r(31, 5)])
  assert.equal(w.best, 20); assert.equal(w.isNewBest, false); assert.equal(w.level, 'h18')
  assert.equal(testProgress(ladder, [r(20, 1)]).isNewBest, false)
  assert.equal(testProgress(ladder, []).best, null)
})

test('practice streak counts weeks in a row', () => {
  const today = new Date('2026-11-19T10:00:00Z') // a Thursday
  assert.equal(practiceStreakWeeks(['2026-11-17', '2026-11-10', '2026-11-03'], today), 3)
  assert.equal(practiceStreakWeeks(['2026-11-10', '2026-11-03'], today), 2) // nothing yet this week: streak kept
  assert.equal(practiceStreakWeeks(['2026-11-17', '2026-10-27'], today), 1)
  assert.equal(practiceStreakWeeks([], today), 0)
})
