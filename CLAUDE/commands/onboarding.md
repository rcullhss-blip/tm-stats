---
effort: high
description: Review and optimise the new user onboarding flow. The first 5 minutes determines if someone subscribes.
---

# /onboarding — First Impression Review

When Rob runs /onboarding, review and optimise the new user experience from sign-up to first completed round. This is the highest-leverage part of the product — if someone doesn't get value in their first session, they never come back.

## The Brutal Truth About Onboarding
Most users who churn do so within the first 3 sessions. If a golfer signs up, enters one round, doesn't understand what the SG numbers mean, and closes the app — they're gone. This skill exists to prevent that.

---

## The 5-Step Onboarding Flow TM Stats Should Have

### Step 1 — Sign Up (Target: 60 seconds)
- Email + password only. No phone number. No birthday. No card on sign-up.
- Or: "Sign in with Google" as the primary option — one tap.
- After sign up: go directly to the app, not to an email verification wall.
- Email verification should happen in the background — don't block the first session.

**Check:** How many clicks from the landing page to being inside the app?
Target: 3 clicks or fewer.

### Step 2 — Handicap Setup (Target: 30 seconds)
- Ask one question: "What's your current handicap?"
- Options: Scratch or better / 1–5 / 6–12 / 13–18 / 19–28 / I don't have one
- This sets the default SG baseline — they can change it later.
- Skip option must be visible and prominent — don't force it.

**Why this matters:** Without knowing their level, the SG comparisons are meaningless.

### Step 3 — Enter First Round (Target: 8 minutes max)
- Immediate clear call to action: big "Enter Your Last Round" button — not buried.
- Brief contextual tip on first hole entry: "Tip: FIR = did your tee shot land in the fairway?"
- Tips auto-dismiss after 3 seconds — don't block the UI.
- After saving: immediate reward. Don't take them to a blank dashboard.

### Step 4 — The Aha Moment (Target: Within 30 seconds of first round save)
- Show ONE insight immediately after the first round saves.
- Not a dashboard full of empty states — one specific, personal insight.

Good example:
> "Your putting cost you 1.8 shots this round vs a 10 handicap golfer.
> That's your biggest opportunity. Here's what that means in practice →"

Bad example:
> "Round saved! View your dashboard."

**This is the moment someone decides to subscribe or not. Get it right.**

### Step 5 — The Trial-to-Paid Nudge (Days 5–7)
- Don't show a paywall on day 1 — let them get value first.
- Show the premium teaser after round 2: "SG trend available with Pro — see how you're improving"
- Trial expiry reminder: specific, benefit-led: "Your free trial ends in 2 days. You'll lose access to Strokes Gained analysis for all future rounds."
- Never just "Upgrade now" — always say what they'd lose.

---

## Onboarding Review Checklist

### Flow Checks
- [ ] Can a new user complete sign-up in under 60 seconds?
- [ ] Is there a clear, single action to take after signing up?
- [ ] Is the first round entry explained enough for a non-technical golfer?
- [ ] Is there an immediate, specific insight after round 1 saves?
- [ ] Are empty states designed (not blank) with clear next actions?
- [ ] Is the free/paid boundary clear without being aggressive?

### Content Checks
- [ ] Is every golf term (FIR, GIR, SG) explained in plain English on first encounter?
- [ ] Is the first SG number accompanied by a plain English translation?
- [ ] Are error messages helpful? ("Something went wrong" is not helpful)
- [ ] Is there a way to get help if stuck? (FAQ, email, chat)

### Technical Checks
- [ ] Does the app work on first load without any prior setup?
- [ ] Does it handle the case where a user has 0 rounds gracefully?
- [ ] Is the sign-up form mobile-friendly? (no zooming required, large inputs)
- [ ] Does "Sign in with Google" work on mobile?

---

## The Empty State Problem
Every screen must have a designed empty state. Never show a blank page.

| Screen | Empty State Should Show |
|---|---|
| Dashboard (no rounds) | "Enter your first round to see your stats" + big Enter Round button |
| SG tab (no data) | "Strokes Gained needs 1 round to calculate. Enter a round now →" |
| Trend chart (1 round) | "Enter 3+ rounds to see your trend" + progress indicator |
| Compare (no opponent) | "Compare yourself to scratch, 5hcp, or another player" + setup flow |

---

## Output Format

### 🔴 Onboarding Blockers
Friction points that will directly cause churn in the first session.

### 🟡 Improvement Opportunities
Things that reduce the quality of the first impression.

### ✅ Working Well
What's good about the current onboarding.

### 📊 Key Metrics to Track
- Sign-up to first round entered: target < 15 minutes
- First round to dashboard view: target < 2 minutes
- Day 7 retention: target > 40%
- Free to paid conversion: target > 15%

### 🎯 The One Change
If you could only improve one thing in the onboarding flow, what would it be?
