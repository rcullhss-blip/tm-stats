// Course library tests. Run with: node --test tests/course-library.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { courseNameKey, teeKey, teeLabel, mergeHoleValues, yardsFromShots, buildPrefill } from '../src/lib/course-library.ts'

test('course names match regardless of Golf Club / GC suffixes and punctuation', () => {
  const k = courseNameKey('Macclesfield')
  assert.equal(k, 'macclesfield')
  for (const n of ['Macclesfield Golf Club', 'macclesfield GC', 'Macclesfield G.C.', '  MACCLESFIELD golf course ', 'The Macclesfield Golf & Country Club']) {
    assert.equal(courseNameKey(n), k, n)
  }
  assert.equal(courseNameKey("St. Anne's Old Links"), 'st annes old links')
  assert.equal(courseNameKey('Southport and Ainsdale Golf Club'), 'southport and ainsdale')
  // A name made only of suffix words is kept rather than emptied
  assert.equal(courseNameKey('Golf Club'), 'golf club')
  assert.equal(courseNameKey(''), '')
})

test('tee keys and labels', () => {
  assert.equal(teeKey('White tees'), 'white')
  assert.equal(teeKey('  YELLOW tee'), 'yellow')
  assert.equal(teeKey(''), '')
  assert.equal(teeKey(undefined), '')
  assert.equal(teeLabel(' white tees '), 'White')
  assert.equal(teeLabel('blue/white'), 'Blue White')
})

test('merge fills gaps, newest wins, blanks never wipe data', () => {
  const existing = [4, 3, null, 5]
  const incoming = [5, null, 4]
  const merged = mergeHoleValues(existing, incoming)
  assert.equal(merged.length, 18)
  assert.deepEqual(merged.slice(0, 5), [5, 3, 4, 5, null])
  assert.deepEqual(mergeHoleValues(null, null), Array(18).fill(null))
})

test('yardage comes from a tee shot only', () => {
  assert.equal(yardsFromShots([{ lieType: 'tee', distanceToPin: 385 }]), 385)
  assert.equal(yardsFromShots([{ lieType: 'fairway', distanceToPin: 150 }]), null)
  assert.equal(yardsFromShots([{ lieType: 'tee', distanceToPin: 5 }]), null)
  assert.equal(yardsFromShots(null), null)
})

test('prefill: chosen tee first, then own last round, then other tees; nothing known means no prefill', () => {
  const chosen = { tee: 'White', pars: [4, null, 3], yards: [380, null, 160], stroke_index: [7, null, 15] }
  const other = { tee: 'Yellow', pars: [4, 5, 3, 4], yards: [360, 500, 150, 400], stroke_index: null }
  const p = buildPrefill(9, chosen, [other], [5, 4, 4, 3], [null, 480])
  assert.deepEqual(p.pars, [4, 4, 3, 3, 4, 4, 4, 4, 4])
  assert.deepEqual(p.yards, [380, 480, 160, null, null, null, null, null, null])
  assert.deepEqual(p.strokeIndex?.slice(0, 3), [7, null, 15])

  // Pars only from another tee; never its yardages
  const q = buildPrefill(18, null, [other])
  assert.deepEqual(q.pars?.slice(0, 4), [4, 5, 3, 4])
  assert.equal(q.yards, undefined)

  assert.deepEqual(buildPrefill(18, null, []), {})
})
