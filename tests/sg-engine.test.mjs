// Strokes Gained engine tests. Run with:  npm run test:sg
import test from 'node:test'
import assert from 'node:assert/strict'
import { expectedStrokes, calculateHoleSG, calculateRoundSG, handicapToSkillLevel } from '../src/lib/sg-engine.ts'

const LEVELS = ['tour', 'scratch', 'h1_4', 'h5_9', 'h10_14', 'h15_19', 'h20_28', 'h29']
const LIES = ['tee', 'fairway', 'rough', 'bunker', 'fringe', 'green']
const feet = (n) => n / 3
const near = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} expected ${expected} ±${tol}, got ${actual.toFixed(3)}`)
const hole = (par, rows, level) =>
  calculateHoleSG(1, par, rows.map(([lieType, distanceToPin, lieQuality], i) => ({ shotNumber: i + 1, lieType, distanceToPin, ...(lieQuality ? { lieQuality } : {}) })), level)

test('tour level matches the published PGA Tour baseline', () => {
  near(expectedStrokes(400, 'tee', 'tour'), 3.99, 0.005)
  near(expectedStrokes(100, 'tee', 'tour'), 2.92, 0.005)
  near(expectedStrokes(100, 'fairway', 'tour'), 2.80, 0.005)
  near(expectedStrokes(200, 'fairway', 'tour'), 3.19, 0.005)
  near(expectedStrokes(20, 'fairway', 'tour'), 2.40, 0.005)
  near(expectedStrokes(100, 'rough', 'tour'), 3.02, 0.005)
  near(expectedStrokes(20, 'bunker', 'tour'), 2.53, 0.005)
  near(expectedStrokes(feet(3), 'green', 'tour'), 1.04, 0.005)
  near(expectedStrokes(feet(8), 'green', 'tour'), 1.50, 0.005)
  near(expectedStrokes(feet(10), 'green', 'tour'), 1.61, 0.005)
  near(expectedStrokes(feet(20), 'green', 'tour'), 1.87, 0.005)
  near(expectedStrokes(feet(30), 'green', 'tour'), 1.98, 0.005)
})

test('no amateur level is expected to beat the tour from anywhere', () => {
  for (const lie of LIES) {
    for (const d of [0.4, 1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 80, 100, 130, 150, 180, 200, 250, 300, 400, 450, 520, 600]) {
      const tour = expectedStrokes(d, lie, 'tour')
      for (const lvl of LEVELS.slice(1)) assert.ok(expectedStrokes(d, lie, lvl) >= tour, `${lvl} ${lie} ${d}`)
    }
  }
})

test('higher handicap bands always expect more strokes', () => {
  for (const lie of LIES) {
    for (const d of [1, 3, 10, 20, 50, 100, 150, 200, 300, 400, 500]) {
      for (let i = 1; i < LEVELS.length; i++) {
        assert.ok(expectedStrokes(d, lie, LEVELS[i]) > expectedStrokes(d, lie, LEVELS[i - 1]), `${LEVELS[i]} vs ${LEVELS[i - 1]} ${lie} ${d}`)
      }
    }
  }
})

test('expected strokes never fall as the shot gets longer', () => {
  for (const lvl of LEVELS) {
    for (const lie of LIES) {
      let prev = 0
      for (let d = 0.2; d <= 600; d += d < 30 ? 0.2 : 2) {
        const v = expectedStrokes(d, lie, lvl)
        assert.ok(v >= prev - 1e-9, `${lvl} ${lie} dips at ${d.toFixed(1)}y: ${prev.toFixed(3)} -> ${v.toFixed(3)}`)
        prev = v
      }
    }
  }
})

test('worse lies cost strokes: green < fringe < fairway < rough, and sand is harder than fairway', () => {
  for (const lvl of LEVELS) {
    for (const d of [3, 5, 10, 15, 20]) {
      const g = expectedStrokes(d, 'green', lvl), fr = expectedStrokes(d, 'fringe', lvl), fw = expectedStrokes(d, 'fairway', lvl)
      assert.ok(g < fr && fr < fw, `${lvl} ${d}y green ${g.toFixed(2)} fringe ${fr.toFixed(2)} fairway ${fw.toFixed(2)}`)
    }
    for (const d of [10, 20, 50, 100, 150, 200, 300]) {
      assert.ok(expectedStrokes(d, 'fairway', lvl) < expectedStrokes(d, 'rough', lvl), `${lvl} rough ${d}`)
      assert.ok(expectedStrokes(d, 'fairway', lvl) < expectedStrokes(d, 'bunker', lvl), `${lvl} bunker ${d}`)
    }
  }
})

test('a putt is always at least one stroke and a holed ball is zero', () => {
  for (const lvl of LEVELS) {
    assert.equal(expectedStrokes(0, 'green', lvl), 0)
    assert.ok(expectedStrokes(0.1, 'green', lvl) >= 1)
    assert.ok(expectedStrokes(feet(2), 'green', lvl) < 1.05)
  }
})

test('amateur putting is in a realistic range, not better than tour', () => {
  // 8 feet: tour makes about half. A 5 handicap makes fewer, a 24 handicap fewer still.
  near(expectedStrokes(feet(8), 'green', 'h5_9'), 1.59, 0.04)
  near(expectedStrokes(feet(8), 'green', 'h20_28'), 1.70, 0.06)
  near(expectedStrokes(feet(30), 'green', 'h15_19'), 2.22, 0.08)
})

test('average round for each band lands on a realistic score (6,500 yard par 72)', () => {
  const round = (lvl) => 4 * expectedStrokes(165, 'tee', lvl) + 10 * expectedStrokes(390, 'tee', lvl) + 4 * expectedStrokes(510, 'tee', lvl) - 72
  near(round('tour'), -2.3, 0.6, 'tour')
  near(round('scratch'), 3.2, 1.0, 'scratch')
  near(round('h5_9'), 9.7, 1.2, '5-9')
  near(round('h10_14'), 14.5, 1.5, '10-14')
  near(round('h15_19'), 19.3, 1.5, '15-19')
  near(round('h20_28'), 25.7, 2.0, '20-28')
})

test('SG formula: expected before - expected after - 1, and shots add up to the hole', () => {
  const r = hole(4, [['tee', 410], ['fairway', 130], ['green', feet(12)]], 'h5_9')
  assert.equal(r.score, 3)
  for (const s of r.shots) near(s.sg, s.expectedBefore - s.expectedAfter - 1, 1e-9)
  near(r.sgTotal, expectedStrokes(410, 'tee', 'h5_9') - 3, 1e-9)
  near(r.sgOffTee + r.sgApproach + r.sgAroundGreen + r.sgPutt, r.sgTotal, 1e-9)
})

test('the split between categories is believable for a 5 handicap birdie', () => {
  // 280 yard drive into the fairway, 9 iron to 12 feet, putt holed
  const r = hole(4, [['tee', 410], ['fairway', 130], ['green', feet(12)]], 'h5_9')
  near(r.sgOffTee, 0.4, 0.15, 'drive')
  near(r.sgApproach, 0.5, 0.2, 'approach')
  near(r.sgPutt, 0.8, 0.1, 'putt')
  // the old tables gave the approach +1.17 and the drive 0.00
  assert.ok(r.sgApproach < 0.8)
  assert.ok(r.sgOffTee > 0.15)
})

test('a routine tour-standard par scores close to zero in every category at tour level', () => {
  // 295 fairway, 105 to 20 feet, two putts
  const r = hole(4, [['tee', 400], ['fairway', 105], ['green', feet(20)], ['green', feet(2)]], 'tour')
  for (const v of [r.sgOffTee, r.sgApproach, r.sgPutt]) assert.ok(Math.abs(v) < 0.25, `category ${v.toFixed(2)}`)
})

test('hitting a green from 150 with a long putt left is ordinary, not a big gain', () => {
  const r = hole(4, [['tee', 400], ['fairway', 150], ['green', feet(40)], ['green', feet(3)]], 'scratch')
  assert.ok(Math.abs(r.sgApproach) < 0.3, `approach ${r.sgApproach.toFixed(2)}`)
})

test('three putt from 40 feet loses about a shot on the greens', () => {
  const r = hole(3, [['tee', 165], ['green', feet(40)], ['green', feet(6)], ['green', feet(1)]], 'h10_14')
  near(r.sgPutt, -0.85, 0.2)
  assert.equal(r.sgOffTee, 0) // par 3: the tee shot is an approach
})

test('a penalty is charged to the shot that caused it', () => {
  // out of bounds off the tee, re-tee, fairway, green, two putts: 6
  const r = hole(4, [['tee', 400], ['penalty', 400], ['tee', 400], ['fairway', 150], ['green', feet(30)], ['green', feet(3)]], 'h5_9')
  assert.equal(r.score, 6)
  near(r.shots[0].sg, -2, 1e-9, 'tee shot out of bounds')
  near(r.shots[1].sg, 0, 1e-9, 'penalty row')
  assert.equal(r.shots[1].category, 'offTee')
  assert.equal(r.shots[2].category, 'offTee')
  near(r.sgTotal, expectedStrokes(400, 'tee', 'h5_9') - 6, 1e-9)
  // water from the fairway: the approach takes the hit
  const w = hole(4, [['tee', 400], ['fairway', 160], ['penalty', 160], ['fairway', 60], ['green', feet(10)], ['green', feet(1)]], 'h5_9')
  assert.ok(w.shots[1].sg < -1)
  near(w.shots[2].sg, 0, 1e-9)
  assert.equal(w.shots[2].category, 'approach')
})

test('categories: tee shots, approaches, short game and putts', () => {
  const r = hole(5, [['tee', 520], ['rough', 260], ['fairway', 60], ['bunker', 15], ['fringe', 4], ['green', feet(3)]], 'h10_14')
  assert.deepEqual(r.shots.map(s => s.category), ['offTee', 'approach', 'approach', 'aroundGreen', 'aroundGreen', 'putting'])
})

test('lie quality makes the shot harder by a fixed amount', () => {
  near(expectedStrokes(150, 'rough', 'h5_9', 'awkward') - expectedStrokes(150, 'rough', 'h5_9'), 0.2, 1e-9)
  near(expectedStrokes(150, 'rough', 'h5_9', 'severe') - expectedStrokes(150, 'rough', 'h5_9'), 0.5, 1e-9)
})

test('hole-out marker rows and empty holes are handled', () => {
  const r = hole(3, [['tee', 150], ['green', feet(10)], ['green', 0]], 'scratch')
  assert.equal(r.shots.length, 2)
  near(r.sgTotal, expectedStrokes(150, 'tee', 'scratch') - 2, 1e-9)
  assert.equal(calculateHoleSG(1, 4, [], 'scratch'), null)
  assert.equal(calculateRoundSG([{ holeNumber: 1, par: 4, shots: null }], 'scratch'), null)
})

test('handicap picks the right band, and legacy or unknown level names do not break', () => {
  assert.equal(handicapToSkillLevel(null), 'scratch')
  assert.equal(handicapToSkillLevel(2.4), 'h1_4')
  assert.equal(handicapToSkillLevel(7), 'h5_9')
  assert.equal(handicapToSkillLevel(12), 'h10_14')
  assert.equal(handicapToSkillLevel(24), 'h20_28')
  assert.equal(handicapToSkillLevel(36), 'h29')
  assert.equal(expectedStrokes(150, 'fairway', 'low'), expectedStrokes(150, 'fairway', 'h5_9'))
  assert.equal(expectedStrokes(150, 'fairway', 'nonsense'), expectedStrokes(150, 'fairway', 'scratch'))
})
