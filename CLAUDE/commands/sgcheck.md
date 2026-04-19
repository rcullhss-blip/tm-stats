---
effort: high
description: Validates the Strokes Gained engine against known correct results. Run before any SG-related release.
---

# /sgcheck — Strokes Gained Validator

When Rob runs /sgcheck, validate the entire SG calculation engine against known correct results. If the numbers are wrong, serious golfers will know and they will leave. This skill runs the SG engine through known test cases before it touches any real user data.

---

## The SG Formula (Source of Truth)

```
SG for one shot = expected_strokes_before - expected_strokes_after - 1
```

- **Positive** = gained shots on baseline (better than average)
- **Negative** = lost shots on baseline (worse than average)
- Sum of all shots in a category = category SG for the round
- Total SG = sum of all four categories

---

## Known Test Cases — Run All of These

### Test 1 — Scratch Golfer vs Scratch Baseline = ~0
A scratch golfer playing to their handicap should have total SG ≈ 0 vs scratch baseline.
Allow ±0.3 variance per category due to rounding.

### Test 2 — Simple Putting Case
- Golfer has 5-foot putt. Expected strokes from 5 feet for scratch = 1.15
- Golfer holes it (0 strokes remaining after)
- SG Putting for this putt = 1.15 - 0 - 1 = **+0.15**
- Confirm the engine returns +0.15 ✓

### Test 3 — Missed Short Putt
- Golfer has 3-foot putt. Expected from 3 feet for scratch = 1.05
- Golfer misses. Now has 2-foot putt. Expected from 2 feet = 1.01
- SG for the missed putt = 1.05 - 1.01 - 1 = **-0.96**
- Confirm the engine returns -0.96 ✓

### Test 4 — Good Approach Shot
- Golfer hits approach from 150 yards, fairway. Expected strokes = 2.8 (vs scratch)
- Ball finishes 8 feet from hole. Expected from 8 feet = 1.3
- SG Approach = 2.8 - 1.3 - 1 = **+0.5**
- Confirm the engine returns +0.5 ✓

### Test 5 — Poor Tee Shot
- Par 4, 400 yards. Expected strokes from tee = 4.0 vs scratch
- Tee shot ends in rough, 210 yards out. Expected from rough at 210 yards = 3.2
- SG Off the Tee = 4.0 - 3.2 - 1 = **-0.2**
- Confirm the engine returns -0.2 ✓

### Test 6 — Nine Hole Round
- Ensure SG works correctly for 9-hole rounds
- Total SG should reflect only 9 holes, not be halved from 18-hole values
- Each hole is calculated independently — no round-length adjustment needed

### Test 7 — Missing Distance Data (Simplified Mode)
- User has not entered distance to pin
- App falls back to simplified SG estimation
- Confirm it does NOT crash — returns either estimated value or null, never undefined error

### Test 8 — Chip-in (0 Putts)
- Golfer chips in from off the green — score = par, putts = 0
- Around the green SG should be calculated based on the chip, not a putt
- Putting SG for this hole = 0 (no putts taken)
- Confirm the engine doesn't divide by zero or produce NaN

---

## Baseline Data Checks

- Confirm the expected_strokes table covers all required distances:
  - Putting: 1ft, 2ft, 3ft, 4ft, 5ft, 6ft, 7ft, 8ft, 9ft, 10ft, 12ft, 15ft, 20ft, 25ft, 30ft, 40ft, 50ft, 60ft+
  - Approach: 50yd, 75yd, 100yd, 125yd, 150yd, 175yd, 200yd, 225yd, 250yd+
  - Around Green: 5yd, 10yd, 15yd, 20yd, 25yd, 30yd (by surface: fairway, rough, bunker, fringe)
  - Off Tee: by hole length bands (300yd, 325yd, 350yd, 375yd, 400yd, 425yd, 450yd+)
- Confirm all 7 baselines exist: PGA Tour, European Tour, Scratch, 5hcp, 10hcp, 18hcp, 28hcp
- Confirm the data source is documented (DECADE Golf tables, version/date)

---

## Output Format

### Test Results
For each test: ✅ PASS (expected: X, got: X) or ❌ FAIL (expected: X, got: Y)

### 🔴 Calculation Errors
If any test fails, stop. Do not ship SG until all tests pass. Show exact fix.

### ✅ SG Engine Validated
All 8 tests passed. Baseline data complete. Safe to ship.

### 📋 SG Engine Confidence
[X/8 tests passed] — VALIDATED / ISSUES FOUND / DO NOT SHIP
