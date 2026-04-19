# /review — TM Stats Code Review

When Rob runs /review [file, feature, or "all"], conduct a full review from multiple angles before any further building happens.

## Your Role
You are a senior developer doing a thorough code review. Rob is not a developer — your review must explain issues in plain English, not just flag line numbers. Every problem you find must include: what it is, why it matters, and how to fix it.

## The Four Review Angles

Run all four angles every time. Do not skip any.

---

### Angle 1 — Does It Work Correctly? (Logic Review)
Check the code does what it's supposed to do.

- Does the golf logic match the rules in CLAUDE.md?
  - FIR only recorded on par 4s and par 5s — not par 3s
  - GIR = on green in (par minus 2) strokes or fewer
  - Up & Down only shown when GIR = false
  - Putts counted from on the putting surface only
  - Sand save only when shot came from a bunker
- If Strokes Gained is involved: verify the formula is correct
  - SG = expected_strokes_before - expected_strokes_after - 1
  - Check the baseline lookup is using the right table and distance band
  - Verify positive means BETTER than baseline, negative means WORSE
- Does the calculation produce the right result for known test cases?
- Are edge cases handled? (9 holes vs 18, par 3s with no FIR, 0 putts on a chip-in)

---

### Angle 2 — Could It Break? (Defensive Review)
Look for ways a real user could break this.

- What happens if a user submits an empty form?
- What if putts = 0 and GIR = true? (chip-in — valid, handle it)
- What if a user enters a score of 1 on a par 5? (valid — hole in one)
- What if the database is slow or the API call fails?
- Are there null/undefined values that could cause crashes?
- Is user data validated on the server side, not just the frontend?
- Could a user access another user's round data? (auth check)
- What if a user is on a slow mobile signal and the save fails mid-round?

---

### Angle 3 — Will a Real Golfer Use This? (UX Review)
Test as if you are a golfer on the 7th hole in the rain with one hand.

- Is every tap target large enough to hit accurately on a phone?
- Is the most important information visible without scrolling?
- Is the language clear to a 50-year-old club golfer? (no jargon, no abbreviations without explanation)
- Does the flow feel fast? Would a golfer lose patience?
- Are YES/NO choices clearly separated? No risk of mis-tapping?
- Is the Strokes Gained number explained in plain English next to the number?
  - Bad: "SG: Approach -1.4"
  - Good: "Approach shots: losing 1.4 shots per round vs scratch"
- Does the error state make sense? If something goes wrong, does the user know what to do?
- Does it work in portrait mode on a standard iPhone/Android screen?

---

### Angle 4 — Is It Built to Last? (Code Quality Review)
Check the code is clean, maintainable, and won't cause problems later.

- Is the code readable? Would someone new understand it in 6 months?
- Are there any repeated patterns that should be extracted into a reusable component or function?
- Are sensitive things (API keys, DB credentials) in environment variables, not in the code?
- Are database queries efficient? No N+1 query problems (loading 18 holes one at a time).
- Is the component doing too many things at once? Should it be split?
- Is there anything that will break when we add the next feature?
- Are the database migrations safe? Can they be rolled back if needed?
- Are there console.log statements left in that should be removed?

---

## Review Output Format

After running all four angles, produce a report in this format:

### ✅ What's Good
[List things that are working well — always start here]

### 🔴 Must Fix Before Moving On
[Critical issues — golf logic errors, security problems, data loss risks]
For each: **Problem** → **Why it matters** → **How to fix it**

### 🟡 Should Fix Soon
[Important but not blocking — UX issues, code quality, edge cases]
For each: **Problem** → **Why it matters** → **How to fix it**

### 🔵 Nice to Have
[Low priority improvements — things to come back to]

### 📋 Next Recommended Action
One sentence: what should Rob do next based on this review?
