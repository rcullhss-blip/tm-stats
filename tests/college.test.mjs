// Tests for the college release logic. Run with:  npm run test:college
import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanParsed, usableCard, nameSimilarity, matchRoster, validateImport } from '../src/lib/results-import.ts'
import { parseGoal, validateGoal, goalProgress } from '../src/lib/goal.ts'
import { collegeStandings, boardName, placeKey, tidyPlace, rankArea } from '../src/lib/leaderboards.ts'
import { slugBase, makeSlug, parseProfileInfo, scoringSummary } from '../src/lib/recruit-profile.ts'
import { rankBands, bestAndWorst, biggestLeaks } from '../src/lib/sg-bands.ts'
import { teamNudgeKey } from '../src/lib/team-nudge.ts'
import { expectedStrokes, COLLEGE_LEVELS, isCollegeLevel, normalizeSkillLevel } from '../src/lib/sg-engine.ts'

const card18 = Array.from({ length: 18 }, () => 4)

// ── Uploaded results ─────────────────────────────────────────────────────────
test('names match whatever order or punctuation they are printed in', () => {
  assert.equal(nameSimilarity('Murphy, Cole', 'Cole Murphy'), 1)
  assert.equal(nameSimilarity('COLE MURPHY', 'Cole Murphy'), 1)
  assert.ok(nameSimilarity('AJ Moeldrup', 'A.J. Moeldrup') >= 0.5)
  assert.ok(nameSimilarity('Andrew Sciortino', 'Andy Sciortino') >= 0.5)
  assert.equal(nameSimilarity('Cole Murphy', 'Matt Klaus'), 0)
  assert.equal(nameSimilarity('', 'Matt Klaus'), 0)
})

test('roster matching uses each squad player once and refuses weak matches', () => {
  const roster = [{ id: 'a', name: 'Cole Murphy' }, { id: 'b', name: 'Connor Murphy' }, { id: 'c', name: 'Matt Klaus' }]
  assert.deepEqual(matchRoster(['Murphy, Cole', 'Murphy, Connor', 'Klaus, Matt', 'Someone Else'], roster), ['a', 'b', 'c', null])
  // A lone surname is not enough to put scores in someone's account
  assert.deepEqual(matchRoster(['Murphy'], roster), [null])
  // Two printed names that could be the same squad player: only one gets them
  const m = matchRoster(['Cole Murphy', 'Cole Murphy'], roster)
  assert.equal(m.filter(x => x === 'a').length, 1)
})

test('what comes back from reading a file is cleaned', () => {
  const p = cleanParsed({
    event_name: '  Fall Invite ', course_name: 'Home', holes: 18, pars: [4, 4], round_count: 2, dates: ['2026-10-01', 'yesterday'],
    players: [
      { name: 'A B', team: 'X', rounds: [{ round_no: 1, scores: card18, total: 72 }, { round_no: 9, scores: [], total: 70 }] },
      { name: '', team: 'X', rounds: [] },
    ],
    notes: 'ok',
  })
  assert.equal(p.event_name, 'Fall Invite')
  assert.deepEqual(p.pars, [])                      // wrong length: treated as not shown
  assert.deepEqual(p.dates, ['2026-10-01', ''])
  assert.equal(p.players.length, 1)                 // nameless player dropped
  assert.equal(p.players[0].rounds.length, 1)       // round 9 of 2 dropped
  assert.equal(cleanParsed(null).players.length, 0)
  assert.equal(cleanParsed({ holes: 9, round_count: 99 }).round_count, 1)
})

test('only a full believable card can be brought in', () => {
  assert.equal(usableCard(card18, 18), true)
  assert.equal(usableCard(card18.slice(1), 18), false)
  assert.equal(usableCard([...card18.slice(1), 0], 18), false)
  assert.equal(usableCard([...card18.slice(1), 16], 18), false)
  assert.equal(usableCard([], 18), false)
})

test('an import is checked before anything is created', () => {
  const ok = { name: 'Fall Invite', courseName: 'Home', holes: 18, pars: card18, dates: ['2026-10-01', '2026-10-02'], players: [{ userId: 'a', rounds: [card18, null] }, { userId: 'b', rounds: [null, null] }] }
  const good = validateImport(ok)
  assert.ok(!('error' in good))
  assert.equal(good.players.length, 1)              // b has no card at all: left out
  assert.deepEqual(good.players[0].rounds, [card18, null])
  assert.match(validateImport({ ...ok, players: [{ userId: 'a', rounds: [card18] }, { userId: 'a', rounds: [card18] }] }).error, /two names/)
  assert.match(validateImport({ ...ok, pars: card18.slice(1) }).error, /par/)
  assert.match(validateImport({ ...ok, dates: [] }).error, /date/)
  assert.match(validateImport({ ...ok, players: [{ userId: 'b', rounds: [null, null] }] }).error, /score to bring in/)
  assert.match(validateImport({ ...ok, name: '' }).error, /name/)
})

// ── Goals ────────────────────────────────────────────────────────────────────
test('a goal is checked', () => {
  const today = '2026-11-18'
  assert.equal(validateGoal({ metric: 'approach', target: 4, by: '2027-03-01' }, today), null)
  assert.match(validateGoal({ metric: 'chipping', target: 4, by: '2027-03-01' }, today), /part of your game/)
  assert.match(validateGoal({ metric: 'total', target: 40, by: '2027-03-01' }, today), /handicap/)
  assert.match(validateGoal({ metric: 'total', target: 4, by: '2026-11-18' }, today), /future/)
  assert.match(validateGoal({ metric: 'total', target: 4, by: '2029-01-01' }, today), /two years/)
  assert.equal(parseGoal({ metric: 'total', target: 'four', by: '2027-03-01' }), null)
  assert.equal(parseGoal(null), null)
})

test('goal progress: reached, on track, behind, no data, expired', () => {
  const g = { metric: 'approach', target: 4, by: '2027-01-17', start: 8, setAt: '2026-11-18' } // 60 days
  assert.equal(goalProgress(g, 3.9, '2026-12-01').status, 'reached')
  const half = goalProgress(g, 6, '2026-12-18')    // half the gap closed, half the time used
  assert.equal(half.status, 'on_track'); assert.equal(half.fraction, 0.5); assert.equal(half.toGo, 2); assert.equal(half.daysLeft, 30)
  assert.equal(goalProgress(g, 7.5, '2027-01-10').status, 'behind')
  assert.equal(goalProgress(g, null, '2026-12-01').status, 'no_data')
  assert.equal(goalProgress(g, 6, '2027-02-01').status, 'expired')
  assert.equal(goalProgress(g, 9, '2026-12-01').fraction, 0)        // gone backwards: never negative
  assert.equal(goalProgress({ ...g, start: null }, 6, '2026-12-01').status, 'behind')
})

// ── Leaderboards ─────────────────────────────────────────────────────────────
test('college board: three scored players to count, best four cards make the number', () => {
  const teams = [{ id: 't1', name: 'Alpha' }, { id: 't2', name: 'Beta' }, { id: 't3', name: 'Gamma' }]
  const p = (teamId, avgToPar, i) => ({ userId: `${teamId}${i}`, teamId, avgToPar, rounds: 3 })
  const standings = collegeStandings(teams, [
    p('t1', 2, 1), p('t1', 4, 2), p('t1', 6, 3), p('t1', 8, 4), p('t1', 30, 5),   // best four: 5.0
    p('t2', 1, 1), p('t2', 1, 2), p('t2', null, 3),                              // only two scored: out
    p('t3', 3, 1), p('t3', 3, 2), p('t3', 3, 3),                                  // 3.0
  ])
  assert.deepEqual(standings.map(s => [s.name, s.avgToPar, s.players]), [['Gamma', 3, 3], ['Alpha', 5, 5]])
})

test('names on public boards, and places typed differently', () => {
  assert.equal(boardName('Sam Johnson'), 'Sam J.')
  assert.equal(boardName('Mary Jane van der Berg'), 'Mary B.')
  assert.equal(boardName('Cher'), 'Cher')
  assert.equal(boardName('  '), 'Golfer')
  assert.equal(placeKey(' Cheshire  '), placeKey('cheshire'))
  assert.equal(tidyPlace('  north   wales '), 'North Wales')
  assert.equal(tidyPlace('   '), null)
  assert.deepEqual(rankArea([{ userId: 'a', name: 'A', level: 6, rounds: 3 }, { userId: 'b', name: 'B', level: -1, rounds: 5 }]).map(g => [g.name, g.position]), [['B', 1], ['A', 2]])
})

// ── Recruiting profile ───────────────────────────────────────────────────────
test('profile address and details', () => {
  assert.equal(slugBase("Sam O'Neil-Jones"), 'sam-oneil-jones')
  assert.equal(slugBase('Zoë Åkesson'), 'zoe-akesson')
  assert.equal(slugBase('!!!'), '')
  assert.match(makeSlug('Sam Jones', () => 0), /^sam-jones-aaaa$/)
  assert.match(makeSlug('', () => 0.99), /^golfer-[a-z0-9]{4}$/)
  const info = parseProfileInfo({ gradYear: 1999, homeClub: '  Bromborough ', bio: 'x'.repeat(900), contact: '' })
  assert.equal(info.gradYear, null); assert.equal(info.homeClub, 'Bromborough'); assert.equal(info.bio.length, 400); assert.equal(info.contact, null)
})

test('scoring summary uses 18 hole rounds only, newest ten', () => {
  const r = (score, type = 'practice', holes = 18) => ({ date: '2026-11-01', course: 'Home', holes, score, toPar: score - 72, type, teamScored: false })
  const s = scoringSummary([r(74), r(70, 'competition'), r(38, 'practice', 9), r(76, 'tournament')])
  assert.equal(s.rounds, 3); assert.equal(s.avgScore, 73.3); assert.equal(s.avgToPar, 1.3)
  assert.equal(s.best.score, 70); assert.equal(s.competitionRounds, 2); assert.equal(s.competitionAvgToPar, 1)
  const none = scoringSummary([])
  assert.equal(none.rounds, 0); assert.equal(none.avgScore, null); assert.equal(none.best, null)
})

// ── Leaks ────────────────────────────────────────────────────────────────────
test('biggest leaks: only bands that really cost shots, worst first', () => {
  const band = (label, category, sgSum, count) => ({ label, category, minY: 0, maxY: 0, sgSum, count })
  const round = [band('150–175y', 'approach', -2.4, 6), band('5–8ft', 'putting', -0.6, 5), band('250–275y', 'off_tee', 1.0, 8), band('0–10y', 'around_green', -0.05, 4), band('40ft+', 'putting', -3, 2)]
  const ranked = rankBands([round, round])
  assert.deepEqual(biggestLeaks(ranked).map(l => l.label), ['Putts 40ft+', 'Approach 150–175y', 'Putts 5–8ft'])
  assert.equal(biggestLeaks(ranked)[1].sgPerRound, -2.4)       // per round, not per shot
  assert.deepEqual(biggestLeaks(rankBands([[band('250–275y', 'off_tee', 1.0, 8)]])), [])   // nothing losing shots: no leaks
  assert.deepEqual(rankBands([[band('40ft+', 'putting', -3, 2)]]), [])                      // under 3 shots: not ranked
  assert.deepEqual(bestAndWorst([]), { best: [], worst: [] })
  assert.deepEqual(rankBands([null, null]), [])
})

// ── Reminders and benchmarks ─────────────────────────────────────────────────
test('one reminder key per ISO week', () => {
  assert.equal(teamNudgeKey(new Date('2026-11-18T09:00:00Z')), 'team_nudge_2026w47')
  assert.equal(teamNudgeKey(new Date('2026-11-16T00:00:00Z')), teamNudgeKey(new Date('2026-11-22T23:59:00Z')))
  assert.notEqual(teamNudgeKey(new Date('2026-11-22T23:59:00Z')), teamNudgeKey(new Date('2026-11-23T00:00:00Z')))
  assert.equal(teamNudgeKey(new Date('2027-01-01T12:00:00Z')), 'team_nudge_2026w53')
  assert.ok(teamNudgeKey().length <= 40)                                                    // email_log column is 40 wide
})

test('college levels sit between tour and the handicap bands they should', () => {
  for (const l of COLLEGE_LEVELS) {
    assert.ok(isCollegeLevel(l)); assert.equal(normalizeSkillLevel(l), l)
    assert.ok(expectedStrokes(400, 'tee', l) > expectedStrokes(400, 'tee', 'tour'), `${l} beats tour`)
  }
  const at = (l) => expectedStrokes(400, 'tee', l)
  assert.ok(at('d1_men') < at('scratch') && at('scratch') < at('d2_men'))
  assert.ok(at('d2_men') < at('d3_men'))
  assert.equal(normalizeSkillLevel('naia_men'), null)
  assert.equal(normalizeSkillLevel('njcaa_men'), null)
  assert.ok(at('d1_women') < at('d2_women') && at('d2_women') < at('d3_women'))
  assert.equal(isCollegeLevel('h5_9'), false)
})

// ── Travel team selection ────────────────────────────────────────────────────
import { rankSquad, parseSaved, standingsCsv, passesFilters } from '../src/lib/selection.ts'
test('selection: filters, leaving rounds out, best of, ranking and ties', () => {
  const R = (userId, q, roundNo, date, toPar, kind = 'qualifying', sg = null) => ({ key: `${q}:${roundNo}:${userId}`, userId, qualifierId: q, event: q, kind, roundNo, date, course: 'C', par: 72, score: 72 + toPar, toPar, sg })
  const players = [{ id: 'a', name: 'Al' }, { id: 'b', name: 'Bo' }, { id: 'c', name: 'Cy' }, { id: 'd', name: 'Di' }]
  const rounds = [
    R('a', 'q1', 1, '2026-09-01', 2), R('a', 'q1', 2, '2026-09-02', 0), R('a', 't1', 1, '2026-10-01', 6, 'tournament', -1.5),
    R('b', 'q1', 1, '2026-09-01', 1), R('b', 'q1', 2, '2026-09-02', 1), R('b', 't1', 1, '2026-10-01', 1, 'tournament', 0.5),
    R('c', 'q1', 1, '2026-09-01', 10),
  ]
  const none = { from: null, to: null, kind: 'all', events: null, bestOf: null }
  let s = rankSquad(players, rounds, none, new Set())
  assert.deepEqual(s.map(x => [x.name, x.avgToPar, x.position]), [['Bo', 1, 1], ['Al', 2.7, 2], ['Cy', 10, 3], ['Di', null, null]])
  // Leave out Al's bad tournament round: Al and Bo tie on +1.0, Bo has more rounds
  s = rankSquad(players, rounds, none, new Set(['t1:1:a']))
  assert.deepEqual(s.slice(0, 2).map(x => [x.name, x.avgToPar, x.position]), [['Bo', 1, 1], ['Al', 1, 1]])
  // Qualifying only: both +1.0 on two rounds, so name order
  s = rankSquad(players, rounds, { ...none, kind: 'qualifying' }, new Set())
  assert.deepEqual(s.slice(0, 2).map(x => [x.name, x.avgToPar]), [['Al', 1], ['Bo', 1]])
  // Date range
  s = rankSquad(players, rounds, { ...none, from: '2026-09-02', to: '2026-09-30' }, new Set())
  assert.deepEqual(s.filter(x => x.avgToPar !== null).map(x => [x.name, x.avgToPar]), [['Al', 0], ['Bo', 1]])
  // Best 2 of the last 3
  s = rankSquad(players, rounds, { ...none, bestOf: { best: 2, of: 3 } }, new Set())
  const al = s.find(x => x.name === 'Al')
  assert.equal(al.avgToPar, 1); assert.equal(al.counted.length, 2); assert.equal(al.available, 3)
  assert.equal(s.find(x => x.name === 'Cy').counted.length, 1)       // fewer rounds than "best": uses what there is
  // Strokes Gained only from rounds that have it
  s = rankSquad(players, rounds, none, new Set())
  assert.equal(s.find(x => x.name === 'Bo').sgAvg, 0.5); assert.equal(s.find(x => x.name === 'Bo').sgRounds, 1)
  assert.equal(s.find(x => x.name === 'Cy').sgAvg, null)
  assert.equal(passesFilters(rounds[0], { ...none, events: ['t1'] }), false)
})
test('selection: saved picks are cleaned, and the spreadsheet escapes commas and quotes', () => {
  const saved = parseSaved({ excluded: ['x', 3, null], squad: 'nope', notes: { a: 'Strong, "steady"', b: '   ', c: 5 } })
  assert.deepEqual(saved, { excluded: ['x'], squad: [], notes: { a: 'Strong, "steady"' } })
  assert.deepEqual(parseSaved(null), { excluded: [], squad: [], notes: {} })
  const csv = standingsCsv([{ userId: 'a', name: 'Al, Jr', counted: [], available: 0, avgToPar: null, avgScore: null, best: null, worst: null, sgAvg: null, sgRounds: 0, position: null }], new Set(['a']), saved.notes)
  assert.match(csv, /"Al, Jr",Yes,0/)
  assert.match(csv, /"Strong, ""steady"""/)
})

// ── Results with totals only ─────────────────────────────────────────────────
import { usableTotal } from '../src/lib/results-import.ts'
test('a results sheet with only totals still brings players in', () => {
  assert.equal(usableTotal(74, 18), true)
  assert.equal(usableTotal(35, 9), true)
  assert.equal(usableTotal(20, 18), false)     // too low to be a real 18
  assert.equal(usableTotal(200, 18), false)
  assert.equal(usableTotal(74.5, 18), false)
  assert.equal(usableTotal('74', 18), false)
  const base = { name: 'Big South', courseName: 'Fripp Island', holes: 18, pars: card18, dates: ['2025-04-13', '2025-04-14', '2025-04-15'] }
  const ok = validateImport({ ...base, players: [
    { userId: 'a', rounds: [null, null, null], totals: [76, 72, 74] },
    { userId: 'b', rounds: [card18, null, null], totals: [999, 83, null] },   // a card wins over a total; nonsense total dropped
    { userId: 'c', rounds: [null, null, null], totals: [null, null, null] },  // nothing: left out
  ] })
  assert.ok(!('error' in ok))
  assert.deepEqual(ok.players.map(p => [p.userId, p.totals]), [['a', [76, 72, 74]], ['b', [null, 83, null]]])
  assert.match(validateImport({ ...base, players: [{ userId: 'c', rounds: [null, null, null], totals: [null, null, null] }] }).error, /score to bring in/)
})

test('hole scores a results sheet never printed are thrown away', () => {
  const made = Array.from({ length: 18 }, () => 4)   // adds to 72
  const sheet = (has, scores, total) => cleanParsed({ event_name: 'E', course_name: 'C', holes: 18, pars: [], round_count: 1, dates: [''], has_hole_scores: has, notes: '', players: [{ name: 'A B', team: 'T', rounds: [{ round_no: 1, scores, total }] }] })
  assert.deepEqual(sheet(false, made, 72).players[0].rounds[0].scores, [])           // file says totals only
  assert.deepEqual(sheet(undefined, made, 72).players[0].rounds[0].scores, [])       // not said: not trusted
  assert.deepEqual(sheet(true, made, 76).players[0].rounds[0].scores, [])            // does not add up to the total
  assert.equal(sheet(true, made, 72).players[0].rounds[0].scores.length, 18)         // printed and adds up: kept
  assert.equal(sheet(false, made, 72).players[0].rounds[0].total, 72)
})
