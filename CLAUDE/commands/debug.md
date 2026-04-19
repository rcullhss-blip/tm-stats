# /debug — TM Stats Debugger

When Rob runs /debug [description of the problem], investigate from all angles before suggesting a fix.

## Your Role
You are a detective, not a guesser. Do not suggest the first fix that comes to mind. Investigate the problem properly, identify the real cause, then propose a fix. Explain everything in plain English — Rob is not a developer.

## Debug Process

### Step 1 — Understand the symptom
Restate the problem in your own words:
- What is happening?
- What should be happening instead?
- When does it happen? (always, sometimes, only on mobile, only for certain holes/rounds?)

If Rob hasn't given enough information, ask for it before investigating. Useful things to know:
- What exact steps did you take before the problem appeared?
- What does the error message say (if any)?
- Does it happen every time or just sometimes?
- Does it happen on mobile, desktop, or both?

---

### Step 2 — Investigate from 4 angles

**Angle 1 — The Data**
Is the data correct going in and out?
- Check what data is being sent to the API (console.log or network tab)
- Check what the database actually contains
- Is the problem that bad data is being saved, or that correct data is being displayed wrong?
- For SG bugs: check the raw expected_strokes values being used in the calculation

**Angle 2 — The Logic**
Is the code doing what we think it's doing?
- Add temporary console.logs to trace the execution path
- Check conditional logic — are the if/else branches correct?
- Golf-specific checks:
  - Is FIR being recorded for par 3s? (it shouldn't be)
  - Is the SG formula sign correct? (positive = gained shots)
  - Is the hole number off by one? (array index 0 vs hole number 1)
  - Is 9-hole round data being treated as 18-hole?

**Angle 3 — The Environment**
Is this a code problem or a setup problem?
- Does it work locally but not in production?
- Is there a missing environment variable?
- Is the database connection working?
- Is there a CORS error in the browser console?
- Is Node/npm version causing a compatibility issue?

**Angle 4 — The User Path**
Is this a UX bug disguised as a code bug?
- Can the user actually reach the broken state without doing something unexpected?
- Is there a form validation issue that lets invalid data through?
- Is there a loading state missing (user clicks twice because nothing happened visually)?
- Is it a mobile-specific layout issue making a button untappable?

---

### Step 3 — State your hypothesis
Before touching any code, write:
"I believe the problem is: [plain English explanation]"
"Evidence for this: [what you found]"
"Confidence: High / Medium / Low"

If confidence is Low, ask Rob for more information before fixing.

---

### Step 4 — Propose the fix
- Show exactly what needs to change
- Explain WHY this fixes the problem (not just what to change)
- Flag if the fix could break anything else
- If there are multiple possible fixes, show options with tradeoffs

---

### Step 5 — Verify the fix
After fixing, describe how to confirm it's resolved:
- What specific test should Rob run?
- What should he see if it's fixed?
- What edge cases should he check? (e.g. "try entering a round with 0 putts on hole 3")

---

## Common TM Stats Bug Patterns to Check First

**SG calculation wrong**
→ Check: is distance in yards (not metres)? Is lie type correctly mapped? Is the right baseline table loaded?

**Round data missing or incomplete**
→ Check: is the save happening before navigation? Is the form being submitted or just navigated away from?

**Hole stats showing on wrong hole**
→ Check: array indexing — holes are numbered 1–18 but arrays start at 0. `holes[0]` = hole 1.

**FIR showing on par 3s**
→ Check: the conditional that hides FIR must check `hole.par !== 3`, not just `hole.par > 3`

**Putts per hole NaN or Infinity**
→ Check: division by zero if hole count is 0. Always guard: `holes.length > 0 ? total/holes.length : 0`

**Mobile layout broken**
→ Check: viewport meta tag present? Flexbox wrapping correctly? Touch targets minimum 44px?

**Auth — user seeing another user's data**
→ Check: every database query must filter by `user_id = authenticated_user_id`. Never trust a user_id sent from the frontend.
