---
effort: medium
description: Write and review all text in the app — labels, error messages, SG explanations, onboarding copy. Run on any screen before it ships.
---

# /copy — Content & Copy Review

When Rob runs /copy [screen or feature], write or review all the text on it. The words in TM Stats are as important as the design. A golfer who doesn't understand what a number means won't trust it — and they won't subscribe.

## TM Stats Copy Principles

### 1. Speak Like a Knowledgeable Playing Partner, Not a Textbook
Good: "Your putting is costing you 1.4 shots a round — that's the most expensive part of your game right now."
Bad: "SG: Putting value is -1.4, indicating negative strokes gained versus baseline."

### 2. Always Say What a Number Means in Practice
Never show a stat without context. A -1.4 SG Putting means nothing to most golfers.
Always follow it with: "That's costing you roughly 1 shot per 9 holes" or "At this level, scratch golfers average +0.2 from this range."

### 3. Golf Terms Need First-Use Explanations
On the first time a user sees FIR, GIR, SG — explain it inline. Not in a help doc they'll never read.

Tooltip/inline style:
- "FIR (Fairway in Regulation) — did your tee shot land in the fairway?"
- "GIR (Green in Regulation) — did you reach the green in the right number of shots? Par 4 = on in 2."
- "SG (Strokes Gained) — how many shots you gained or lost vs a scratch golfer on each type of shot."

### 4. Error Messages Should Help, Not Confuse
Bad: "An error occurred. Please try again."
Good: "We couldn't save your round. Check your connection and tap Save again — your data is still here."

Bad: "Invalid input"
Good: "Score must be a number between 1 and 15."

### 5. Empty States Are Opportunities
Bad: blank screen with nothing
Good: "No rounds yet — enter your first round to see your stats. It takes about 8 minutes." + [Enter Round button]

---

## TM Stats Standard Copy Bank

### SG Explanations (Use These Consistently)
```
Off the Tee:        "How your drives compare to [baseline] — positive means longer/straighter"
Approach:           "How your iron shots set up putting opportunities vs [baseline]"
Around the Green:   "Your chipping and bunker play vs [baseline]"
Putting:            "How your putting compares to [baseline] from the same distances"
Total SG:           "Your overall game vs [baseline] — every shot combined"
```

### SG Number Labels (Always Include Both the Number and the Plain English)
```
+0.8  "Gaining 0.8 shots per round with your driver vs scratch"
-1.4  "Losing 1.4 shots per round on approach shots vs scratch"
 0.0  "Level with scratch on putting — right on the baseline"
```

### Dashboard Metric Labels
```
Scoring Average          → "Average Score"
GIR %                   → "Greens Hit %" with tooltip: "Reached green in regulation"
FIR %                   → "Fairways Hit %" with tooltip: "Tee shot in fairway (par 4s & 5s only)"
Putts per Hole          → "Putts per Hole" — no abbreviation
Up & Down %             → "Scrambling %" with tooltip: "Getting up and down when missing the green"
Sand Save %             → "Bunker Saves %" — clearer than "Sand Saves"
```

### Button Labels
```
Primary actions:         "Save Round" not "Submit", "Enter Round" not "Start"
Navigation:              "Next Hole →" and "← Previous Hole"
Destructive:             "Delete Round" with confirmation: "Delete this round? This can't be undone."
Upgrade:                 "Unlock Strokes Gained — £4.99/month" not just "Upgrade"
```

### Subscription Copy
```
Free tier limit:    "You've entered 5 rounds on the free plan. Upgrade to track unlimited rounds and unlock Strokes Gained analysis."
Trial ending:       "Your free trial ends in 3 days. After that, Strokes Gained will be locked. Keep access for £4.99/month."
After upgrade:      "You're on Pro. All features unlocked — including Strokes Gained and AI practice recommendations."
```

### Error Messages
```
Save failed:        "Couldn't save your round — your data is safe. Check your connection and try again."
Load failed:        "Couldn't load your rounds. Pull to refresh or check your connection."
Auth error:         "You've been signed out. Sign in again to continue — your rounds are saved."
SG unavailable:     "Strokes Gained requires an active subscription. Upgrade to see your SG data."
```

---

## Copy Review Checklist

When reviewing a screen:
- [ ] Is every golf term explained on first use?
- [ ] Does every SG number have a plain English translation?
- [ ] Are all error messages specific and actionable?
- [ ] Are empty states designed with a clear next action?
- [ ] Are button labels verbs that describe the action ("Save Round" not "OK")?
- [ ] Is the tone consistent — like a knowledgeable playing partner throughout?
- [ ] Are there any walls of text that should be simplified?
- [ ] Are numbers formatted correctly? (1.4 not 1.400000, 67% not 66.666%)

---

## Output Format

When writing copy for a new screen:
- List every piece of text on the screen (labels, buttons, tooltips, empty states, errors)
- Write the copy for each following the principles above
- Flag any golf terms that need tooltips on first use

When reviewing existing copy:
- Rate each piece: ✅ Good / 🟡 Could be clearer / 🔴 Confusing or missing
- Rewrite anything rated 🟡 or 🔴
