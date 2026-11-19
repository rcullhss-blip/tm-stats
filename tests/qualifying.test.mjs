// Qualifying leaderboard tests. Run with:  npm run test:qualifying
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBoard, cleanCard, currentRound, isFinished, validateSetup, fmtToPar } from '../src/lib/qualifying.ts'

const pars9 = [4, 3, 5, 4, 4, 3, 4, 5, 4] // par 36
const q = (over = {}) => ({ holes: 9, pars: pars9, round_count: 1, rounds_finished: 0, ...over })
const players = [{ id: 'a', name: 'Alex' }, { id: 'b', name: 'Ben' }, { id: 'c', name: 'Cal' }, { id: 'd', name: 'Dan' }]
const card = (user_id, scores, round_no = 1, round_id = null) => ({ qualifier_id: 'q', round_no, user_id, scores, round_id })

test('lowest to par leads, part cards count only the holes played', () => {
  const board = buildBoard(q(), players, [
    card('a', [4, 3, 5, 4, 4, 3, 4, 5, 4]),          // level, thru 9
    card('b', [3, 3, 4, null, null, null, null, null, null]), // -2 thru 3
    card('c', [5, 4, 6, 5, 5, 4, 5, 6, 5]),          // +9
    card('d', []),                                    // not started
  ])
  assert.deepEqual(board.map(r => r.name), ['Ben', 'Alex', 'Cal', 'Dan'])
  assert.deepEqual(board.map(r => r.toPar), [-2, 0, 9, null])
  assert.deepEqual(board.map(r => r.thru), [3, 9, 9, 0])
  assert.deepEqual(board.map(r => r.position), ['1', '2', '3', '-'])
  assert.equal(board[1].rounds[0].complete, true)
  assert.equal(board[0].rounds[0].complete, false)
})

test('ties share a position', () => {
  const board = buildBoard(q(), players, [
    card('a', [4, 3, 5, 4, 4, 3, 4, 5, 4]),
    card('b', [4, 3, 5, 4, 4, 3, 4, 5, 4]),
    card('c', [3, 3, 5, 4, 4, 3, 4, 5, 4]),
  ])
  assert.deepEqual(board.map(r => `${r.position} ${r.name}`), ['1 Cal', 'T2 Alex', 'T2 Ben', '- Dan'])
})

test('several rounds add up, and the open round drives "thru"', () => {
  const two = q({ round_count: 2, rounds_finished: 1 })
  const board = buildBoard(two, players.slice(0, 2), [
    card('a', [4, 3, 5, 4, 4, 3, 4, 5, 4], 1, 'r1'), card('a', [5, 3, null, null, null, null, null, null, null], 2),
    card('b', [5, 4, 5, 4, 4, 3, 4, 5, 4], 1, 'r2'), card('b', [3, 2, 4, null, null, null, null, null, null], 2),
  ])
  assert.equal(currentRound(two), 2)
  assert.deepEqual(board.map(r => [r.name, r.toPar, r.thru, r.strokes]), [['Ben', -1, 3, 47], ['Alex', 1, 2, 44]])
  assert.equal(board[0].rounds[0].roundId, 'r2')
})

test('finished and current round', () => {
  assert.equal(isFinished({ round_count: 2, rounds_finished: 1 }), false)
  assert.equal(isFinished({ round_count: 2, rounds_finished: 2 }), true)
  assert.equal(currentRound({ round_count: 2, rounds_finished: 2 }), 2)
  assert.equal(currentRound({ round_count: 3, rounds_finished: 0 }), 1)
})

test('a stored card is forced to the right length and to real scores', () => {
  assert.deepEqual(cleanCard([4, '5', 0, 16, 3.5, null, 7], 9), [4, null, null, null, null, null, 7, null, null])
  assert.deepEqual(cleanCard(undefined, 3), [null, null, null])
  assert.deepEqual(cleanCard([4, 4, 4, 4], 2), [4, 4])
})

test('set-up is checked', () => {
  const ok = { name: 'Spring', courseName: 'Home', holes: 9, pars: pars9, roundCount: 1, playerIds: ['a'], dates: ['2026-11-20'] }
  assert.equal(validateSetup(ok), null)
  assert.match(validateSetup({ ...ok, name: ' ' }), /name/)
  assert.match(validateSetup({ ...ok, pars: pars9.slice(1) }), /par/)
  assert.match(validateSetup({ ...ok, pars: [...pars9.slice(1), 6] }), /par/)
  assert.match(validateSetup({ ...ok, playerIds: [] }), /player/)
  assert.match(validateSetup({ ...ok, roundCount: 2 }), /date/)
  assert.match(validateSetup({ ...ok, holes: 12 }), /9 or 18/)
})

test('to par is written the golf way', () => {
  assert.deepEqual([fmtToPar(0), fmtToPar(3), fmtToPar(-2), fmtToPar(null)], ['E', '+3', '-2', '-'])
})

test('coach groups: only qualifier players, nobody twice, 6 at most, tee times checked', async () => {
  const { cleanGroups, groupOf, missingHoles } = await import('../src/lib/qualifying.ts')
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const g = cleanGroups([
    { tee: '08:10', players: ['a', 'b', 'zz', 'a'] },
    { tee: '25:00', players: ['b', 'c'] },
    { tee: '08:20', players: [] },
    { tee: '08:30', players: ['d', 'e', 'f', 'g', 'h', 'c', 'x'] },
    'junk',
  ], ids)
  assert.deepEqual(g, [
    { tee: '08:10', players: ['a', 'b'] },
    { tee: null, players: ['c'] },
    { tee: '08:30', players: ['d', 'e', 'f', 'g', 'h'] },
  ])
  assert.deepEqual(cleanGroups('nope', ids), [])
  assert.equal(groupOf({ groups: { '1': g } }, 1, 'e')?.tee, '08:30')
  assert.equal(groupOf({ groups: { '1': g } }, 2, 'e'), null)
  assert.deepEqual(missingHoles([4, null, 3, null]), [2, 4])
})
