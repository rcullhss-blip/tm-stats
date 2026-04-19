---
effort: high
description: Write and run tests. Use before shipping any feature, mandatory for the SG engine.
---

# /test — TM Stats Test Writer

When Rob runs /test [feature or file], write comprehensive tests for it. Tests are not optional on TM Stats — wrong SG numbers or lost round data will destroy trust with serious golfers.

## Testing Philosophy
Write tests that catch real bugs, not tests that just confirm the code exists. Every test should have a clear reason — if you can't explain why the test matters, don't write it.

---

## Priority Order — Test These First

### 1. SG Calculation Engine (Mandatory — Ship Nothing Without These)
```javascript
// Test file: __tests__/strokes-gained.test.js

describe('Strokes Gained Engine', () => {

  test('positive SG when holing a 5-foot putt', () => {
    // Expected from 5 feet (scratch baseline) = 1.15
    // After holing = 0 expected strokes remaining
    // SG = 1.15 - 0 - 1 = +0.15
    expect(calculateSGPutt({ distanceFeet: 5, holed: true })).toBeCloseTo(0.15, 1)
  })

  test('negative SG for missed short putt', () => {
    // Expected from 3 feet = 1.05, miss leaves 2 feet (expected 1.01)
    // SG = 1.05 - 1.01 - 1 = -0.96
    expect(calculateSGPutt({ distanceFeet: 3, resultDistanceFeet: 2 })).toBeCloseTo(-0.96, 1)
  })

  test('positive SG for good approach shot', () => {
    // From 150 yards fairway expected = 2.8
    // Result: 8 feet from hole, expected = 1.3
    // SG = 2.8 - 1.3 - 1 = +0.5
    expect(calculateSGApproach({ distanceYards: 150, lie: 'fairway', resultFeet: 8 })).toBeCloseTo(0.5, 1)
  })

  test('scratch golfer total SG vs scratch baseline is near zero', () => {
    const scratchRound = buildScratchRound() // helper: builds a typical scratch round
    const totalSG = calculateRoundSG(scratchRound, 'scratch')
    expect(totalSG.total).toBeGreaterThan(-1.0)
    expect(totalSG.total).toBeLessThan(1.0)
  })

  test('9-hole round calculates correctly without halving', () => {
    const nineHoleRound = buildNineHoleRound()
    const sg = calculateRoundSG(nineHoleRound, 'scratch')
    expect(sg.holesCalculated).toBe(9)
  })

  test('chip-in returns 0 putts SG without crashing', () => {
    expect(() => calculateSGPutt({ distanceFeet: 0, chipIn: true })).not.toThrow()
    expect(calculateSGPutt({ distanceFeet: 0, chipIn: true })).toBe(0)
  })

  test('missing distance data returns null not crash', () => {
    expect(() => calculateSGApproach({ distanceYards: null })).not.toThrow()
    expect(calculateSGApproach({ distanceYards: null })).toBeNull()
  })

  test('FIR not recorded for par 3', () => {
    const hole = { par: 3, score: 3, gir: true, putts: 2 }
    expect(hole.fir).toBeUndefined()
  })

})
```

### 2. Golf Rule Logic
```javascript
describe('Golf Rules', () => {

  test('GIR true for par 4 when on in 2', () => {
    expect(isGIR({ par: 4, shotsToGreen: 2 })).toBe(true)
  })

  test('GIR false for par 4 when on in 3', () => {
    expect(isGIR({ par: 4, shotsToGreen: 3 })).toBe(false)
  })

  test('GIR true for par 3 when on in 1', () => {
    expect(isGIR({ par: 3, shotsToGreen: 1 })).toBe(true)
  })

  test('GIR true for par 5 when on in 3', () => {
    expect(isGIR({ par: 5, shotsToGreen: 3 })).toBe(true)
  })

  test('putts per hole handles zero holes without divide by zero', () => {
    expect(puttsPerHole({ totalPutts: 0, holesPlayed: 0 })).toBe(0)
  })

  test('FIR percentage excludes par 3 holes', () => {
    const round = [
      { par: 3, fir: null },   // excluded
      { par: 4, fir: true },   // hit
      { par: 5, fir: false },  // missed
      { par: 4, fir: true },   // hit
    ]
    // 2 hits from 3 eligible holes = 66.7%
    expect(calculateFIRPercent(round)).toBeCloseTo(66.7, 0)
  })

})
```

### 3. Round Save & Retrieve
```javascript
describe('Round Data Integrity', () => {

  test('saving 18-hole round stores exactly 18 hole records', async () => {
    const roundId = await saveRound(mockRound18)
    const holes = await getHolesForRound(roundId)
    expect(holes.length).toBe(18)
  })

  test('round score total matches sum of hole scores', async () => {
    const roundId = await saveRound(mockRound18)
    const round = await getRound(roundId)
    const holes = await getHolesForRound(roundId)
    const sum = holes.reduce((a, h) => a + h.score, 0)
    expect(round.score_total).toBe(sum)
  })

  test('deleting round also deletes all holes (cascade)', async () => {
    const roundId = await saveRound(mockRound18)
    await deleteRound(roundId)
    const holes = await getHolesForRound(roundId)
    expect(holes.length).toBe(0)
  })

  test('user cannot retrieve another users round', async () => {
    const round = await saveRound(mockRound18, userId: 'user-a')
    const result = await getRoundAsUser(round.id, userId: 'user-b')
    expect(result).toBeNull()
  })

})
```

### 4. API Endpoint Tests
```javascript
describe('API Security', () => {

  test('rounds endpoint requires authentication', async () => {
    const res = await fetch('/api/rounds', { headers: {} }) // no auth
    expect(res.status).toBe(401)
  })

  test('SG endpoint requires active subscription', async () => {
    const res = await fetchAsUser('/api/strokes-gained', freeUser)
    expect(res.status).toBe(403)
  })

  test('score input rejects non-numeric values', async () => {
    const res = await submitHole({ score: 'DROP TABLE' })
    expect(res.status).toBe(400)
  })

  test('par input rejects values other than 3, 4, 5', async () => {
    const res = await submitHole({ par: 7 })
    expect(res.status).toBe(400)
  })

})
```

---

## How to Run Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run just SG tests (fastest for development)
npm test -- --testPathPattern=strokes-gained

# Run in watch mode during development
npm test -- --watch
```

---

## Coverage Targets

| Module | Minimum Coverage |
|---|---|
| SG calculation engine | 95% |
| Golf rule logic | 90% |
| API endpoints | 80% |
| React components | 60% |
| Database queries | 70% |

Run `/release` — it checks these targets before clearing a release.

---

## Output Format

For each function or module tested:
1. List tests written with expected inputs and outputs
2. List any edge cases specifically covered
3. Show coverage % achieved
4. Flag any code that is difficult to test (usually means it needs refactoring)
