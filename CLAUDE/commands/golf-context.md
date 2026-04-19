# golf-context.md — Golf World Context for TM Stats

This file gives Claude Code deep understanding of golf culture, the market, player psychology, and why TM Stats exists. Read alongside CLAUDE.md. Understanding the golfer's world is as important as understanding the code.

---

## Why This App Exists — The Founding Story

Rob Cull played county golf for Cheshire and NCAA Division 2 golf at Newberry College, South Carolina (academic honours, season low of 70, top-10 finishes). As a serious competitive golfer and student, he wanted proper stats tracking — the kind serious players use — but everything available was either too expensive, required hardware, or too basic to be useful.

He built TM Stats himself with no coding background. That origin matters: this product was built by a real golfer who felt the gap in the market personally. TM Stats is not a product built by developers who think they understand golf. It is built by someone who played it at a high level and knows what serious golfers actually need.

---

## The Golf Market — Why Now Is the Right Time

### Participation is at record highs

England Golf reported 11.83 million scores submitted through the World Handicap System in 2025 — a 16% increase on 2024 and the highest total since the system's introduction. Nine-hole golf saw particularly strong growth, with submissions rising 28%.

England Golf membership climbed from 730,602 in 2024 to 750,071 in 2025, a year-on-year increase of 2.66%, with nearly 20,000 more golfers attached to clubs across the country.

Rounds played in Great Britain in 2025 were up 15% compared to 2024, with year-to-date figures representing the highest average number of rounds played over the last five years.

### Digital golf is exploding

Among Core golfers — those who play eight or more rounds a year — more than 75% have at least one golf-specific app on their phone. The most meaningful gains in app usage compared to 2020 include stat tracking and scorekeeping, which is up 13%.

According to research by the National Golf Foundation, approximately 40% of regular golfers use a golf app, and that percentage is likely to grow along with the market value of global sport technology, expected to reach $41 billion by 2027.

The golf software market stood at USD 500 million in 2024 and is forecast to reach USD 1.2 billion by 2033, registering a 10.2% CAGR — driven by demand for performance analytics and mobile-first experiences.

### iGolf — the digital participation opportunity

iGolf, England Golf's independent golfer programme, rose by more than 34% to 72,921 users in 2025, including a 34% rise in female sign-ups. Since launch, over 24,000 iGolf subscribers have moved into club membership — including 9,600 in 2025 alone.

This is the pathway TM Stats is targeting. iGolf users have a handicap, play regularly, and engage digitally — but don't have club membership. They are exactly the profile of a TM Stats user: serious enough to track stats, not yet connected to a club's infrastructure.

---

## The Golfer's Psychology — Why They're Obsessed With Improvement

Golf is uniquely addictive because of something called the "improvement gap." Unlike most sports, golf gives you a number — your handicap — that precisely measures your performance against a universal standard. Every golfer knows their number. Every golfer wants it lower.

This creates a mindset unlike any other sport:

**The obsession with marginal gains.** A golfer who goes from 12 handicap to 10 has gained 2 shots per round. That is visible, measurable, and deeply satisfying. Every piece of technology they use is evaluated through the lens of: "Will this help me lower my number?"

**The post-round analysis habit.** Most serious golfers replay the round in their head on the drive home. They know the holes that cost them shots. They remember the three-putt on 14. They wonder if they should have laid up on 17. They are already doing mental analytics — TM Stats just formalises and improves that process.

**The practice guilt.** Every golfer who hasn't practiced recently feels it. TM Stats with AI feedback converts this into directed motivation: instead of vague guilt, the app tells you exactly what to work on and why.

**The comparison instinct.** Golfers constantly compare themselves to peers. "My playing partner shot 72 and hits it 20 yards shorter than me — where is he getting those shots?" Strokes Gained answers this precisely.

---

## The Competitive Golfer's View of Stats

### What basic stats tell you (and what they don't)

Traditional stats — GIR %, FIR %, putts per round — are directional but misleading:

- A golfer can hit 11 GIR and shoot 75 if their approach shots leave 40-foot putts
- A golfer can hit 6 GIR and shoot 70 if their misses leave easy up-and-downs
- Total putts is almost meaningless without knowing whether putts were from 6 feet or 30 feet
- FIR % misses the point entirely for long hitters who can play from the rough

This is the core problem TM Stats V2 is solving. Traditional stats tell you *what happened*. Strokes Gained tells you *what it cost you*.

### What Strokes Gained reveals that nothing else does

The clearest trend from SG data is that approach shots are where golfers lose the most strokes, and the gap widens as handicaps get higher. Tee shots take second place. The difference isn't as extreme as approach shots but is still very significant.

When looking at Strokes Gained per shot, golfers lose the most ground from 176 to 200 yards. This is long-iron or hybrid territory, where contact, launch, and direction become more difficult to control. Across every handicap level, this range represents the steepest drop-off in performance compared to scratch golfers.

Scratch golfers hit on average only 4% more fairways than 20 and 25 handicaps. Approach play is where the biggest difference between high and low handicaps lies.

**The practical implication:** Most high-handicap golfers practice putting. Most should be practicing their 150-yard approach shots. TM Stats will show them this — and that insight alone is worth the subscription.

### The benchmark problem

A 15-handicapper comparing themselves to the PGA Tour is demotivating and useless. Comparing to scratch is aspirational but distant. Comparing to a 10-handicapper — the golfer they could realistically become in one focused season — is actionable.

TM Stats solves this by offering multiple baselines. This is the product decision that makes SG accessible to all levels, not just elite amateurs.

---

## Golf Culture — What the System Needs to Understand

### The round is sacred

A round of golf takes 4–5 hours. It involves travel, preparation, and significant cost (green fees, equipment, lessons). Golfers take it seriously. A bad round is genuinely upsetting. A good round is genuinely euphoric. The app must treat round data with this level of respect — it is not just data points, it represents real experiences.

**Implication:** If TM Stats loses a golfer's round data due to a bug, that golfer is gone forever. Data integrity is not a technical concern — it is an emotional one.

### The 90-second rule

Between shots on a golf course, there are approximately 60–90 seconds. That is the window available to enter data. The round entry UX must work within this constraint — one hand, phone in pocket the rest of the time, minimum taps, no searching for tiny buttons.

**Implication:** The mobile UX is not a nice-to-have. It is the core product requirement.

### Golf is played alone and with others simultaneously

Unlike most team sports, golfers play as individuals but almost always in groups. They compare scores with playing partners in real time. They discuss how others are playing. The social aspect of golf is inseparable from the competitive aspect.

**Implication:** The "compare" feature and team/squad analytics are not add-ons — they tap into the fundamental social nature of the game.

### Handicap culture

The World Handicap System (WHS) was introduced globally in 2020. Every registered golfer now has a single, universal handicap index that is calculated from their best 8 of their last 20 qualifying rounds. This has made amateur golfers significantly more stats-aware — they understand that their handicap is calculated from data, and they are increasingly curious about what that data means.

**Implication:** TM Stats users already understand that their game produces data. The question is whether they can access insights from it. We give them that access.

### 9-hole golf is growing fast

Nine-hole scores and general play scores continue to surge, suggesting that more casual formats are becoming a preferred way people want to engage with the game.

Many golfers can only commit to 9 holes during weekdays. TM Stats must treat 9-hole rounds as a first-class feature — not an afterthought. SG calculations for 9 holes must be displayed correctly (not halved from 18-hole values — each hole is independent).

---

## The Coaching and College Team Context

### How coaches use stats

A golf coach working with a player has traditionally relied on range observation and gut feel. The best coaches in the world now use SG data to direct practice. The question they ask is: "Where is this player losing shots relative to where they want to be?"

For a college coach with 12 players, TM Stats provides something that Clippd charges significantly more for: a squad dashboard showing every player's SG by category, making it immediately obvious who needs help with what.

**Practical example:** If 8 of 12 players are negative in SG: Approach, the coach runs an iron play session. Without this data, coaches either guess or spend time individually reviewing each player's stats. TM Stats collapses this into a 30-second overview.

### NCAA Division 2 context (Rob's level)

At Newberry, Rob played 23 competitive rounds per season (as a freshman), averaging 76.70 per round with a season low of 70. This is the level of golf where SG analysis is genuinely used — these are serious competitive athletes, not casual golfers.

NCAA coaches are increasingly data-driven. The programmes that adopted SG analysis earliest have shown the most measurable improvement in team scoring averages. TM Stats targeting this market is well-timed.

### England Golf's registered base — the B2B prize

England Golf membership stands at 750,071 in 2025, with iGolf adding another 72,921 independent golfers.

If TM Stats can demonstrate sufficient user traction and product quality, a partnership with England Golf represents access to over 800,000 golfers in England alone — each paying £1/month through an integration deal would generate approximately £800,000/month in recurring revenue.

This is not a fantasy scenario. England Golf has a stated 2025–2030 strategy to expand digital participation. TM Stats providing SG analytics through their platform is a natural fit.

---

## What Golfers Actually Talk About at the 19th Hole

Understanding the post-round conversation is important for the AI feedback feature. After a round, golfers typically discuss:

- "I couldn't get anything going with the putter today" (often actually an approach problem — they're leaving the ball 30 feet away)
- "My driver let me down on the back nine" (usually 1–2 holes, not a pattern)
- "I made a mess of the par 3s" (par 3 stats are worth isolating — they reveal iron play quality cleanly)
- "I should have made more of my chances inside 10 feet" (short putting — highly coachable)
- "I had no short game today" (around the green SG will quantify this precisely)

The AI feedback feature must connect directly to these kinds of statements. Not "your SG: Around the Green was -0.8" but "you mentioned struggling with the short game — here's what the data says and specifically where the shots are going."

---

## Strokes Gained — Deep Technical Context

### Who invented it and why it matters

Strokes Gained was developed by Professor Mark Broadie at Columbia Business School. His book "Every Shot Counts" (2014) is the definitive reference. The PGA Tour adopted SG as an official metric in 2011, starting with putting. It is now the primary analytical tool used by Tour caddies, coaches, and analysts.

The key insight: every shot in golf can be objectively evaluated by comparing the expected number of strokes to hole out from position A versus position B. The difference, minus one, is the strokes gained on that shot. This removes the bias of course difficulty, conditions, and hole type.

### Why amateurs haven't had it until recently

The expected strokes values (the baselines) were originally derived from PGA Tour ShotLink data — millions of tracked shots by Tour professionals. These baselines don't apply cleanly to amateurs, who have very different expected values from the same positions.

DECADE Golf (Scott Fawcett) and others have now published amateur baselines — expected strokes for handicap 0, 5, 10, 18, 28 from every relevant distance and lie. This is the data TM Stats uses.

### The distance bands that matter most for amateurs

These are the distances where TM Stats users will gain the most insight:

**Putting:**
- 3–5 feet: scratch makes 95%+, 10hcp makes ~85%, 20hcp makes ~70%
- 6–10 feet: scratch makes ~75%, 10hcp makes ~55%, 20hcp makes ~40%
- 10–20 feet: scratch makes ~30%, 10hcp makes ~20%, 20hcp makes ~12%
- 20–30 feet: all levels make under 10% — it's about avoiding 3-putts

**Approach:**
- 100–125 yards: most amateurs lose significant shots here vs scratch
- 150–175 yards: the most revealing distance — where mid-handicaps separate from low handicaps
- 175–200 yards: long iron/hybrid — universally the costliest shot for amateurs

**Short game:**
- Bunkers: the biggest scrambling gap between handicap levels
- Rough around green: less consistent than fairway chips for all amateur levels

---

## The TM Stats User — Who They Are

### Primary user: the improving amateur

- Handicap: 0–18
- Plays: 1–3 times per week during season
- Motivation: wants to improve, not just record
- Relationship with technology: uses a smartphone confidently, uses apps daily
- Pain point: spends time at the range but doesn't know what to work on
- Willingness to pay: £4.99–9.99/month if the value is clear and immediate

### Secondary user: the competitive amateur

- Handicap: 0–8
- Plays county, club championship, scratch league golf
- Already aware of SG — may have heard of Arccos or Clippd
- Wants professional-level analytics without professional-level pricing
- Will engage deeply with the data if it's presented clearly

### The coach/team account user

- College golf coach or club PGA professional
- Has 8–15 players they work with regularly
- Currently uses observation, gut feel, or expensive software
- Wants aggregate squad data and individual drill recommendations
- Would pay £30–50/month for a squad tool that saves 2 hours of analysis per week

---

## Common Golfer Misconceptions TM Stats Should Address

**"I just need to putt better."**
Data consistently shows putting is the least important category for handicap improvement for mid-to-high handicaps. Approach play is almost always the bigger issue. TM Stats will show this clearly.

**"I hit the fairway, so my driving is fine."**
Fairway % is almost the same across handicap levels. What matters is distance — a shorter drive leaves longer approach shots, which produce worse SG: Approach results. FIR % alone hides this.

**"I need to practice what I'm bad at."**
True, but vague. "Bad at" is useless without knowing *which* shot type, *from what distance*, *from what lie*. TM Stats narrows this from "work on my short game" to "work on bunker shots from 20–30 yards — that's where you're losing 0.4 shots per round."

**"One good round means I've fixed it."**
Even one round of strokes gained data can be useful, but for most golfers, 3–5 rounds will give the best data on general game trends and form. TM Stats should surface trend data after 3+ rounds and communicate variance — a single round is a data point, not a conclusion.

---

## Seasonal and Weather Context (UK-Specific)

Golf in the UK is highly seasonal. The core season runs April–October. November–March is played by committed golfers only, in difficult conditions.

This creates natural patterns in TM Stats usage:
- **April–May:** Season opener — golfers checking where their game is after winter
- **June–August:** Peak season — most rounds, most data, highest engagement
- **September–October:** End of season — review mode, setting goals for next year
- **November–March:** Low usage — this is when AI-driven practice recommendations matter most (indoor practice, simulator sessions)

**Implication for TM Stats:** Seasonal summaries ("Your 2025 season: best month, biggest improvement, area to work on this winter") create a natural annual retention hook. England Golf's WHS handicap calculates annually — TM Stats can align with that cycle.

---

## Glossary — Golf Terms the System Must Know

| Term | Full Name | Meaning |
|---|---|---|
| SG | Strokes Gained | Shots gained or lost vs baseline on each shot |
| FIR | Fairway in Regulation | Tee shot landed in fairway (par 4s and 5s only) |
| GIR | Green in Regulation | On green in par minus 2 strokes |
| WHS | World Handicap System | Universal handicap calculation system (2020) |
| HI | Handicap Index | A golfer's official WHS handicap number |
| Scratch | Scratch golfer | Plays to 0 handicap — the primary SG baseline |
| Up and Down | Up and Down | Getting the ball into the hole in 2 shots from off the green |
| Sand Save | Sand Save | Up and down from a greenside bunker |
| Scrambling | Scrambling | Up and down % — also called "getting up and down" |
| 3-putt | Three-putt | Taking 3 putts on one green — always a negative event |
| Birdie | Birdie | One under par on a hole |
| Eagle | Eagle | Two under par on a hole |
| Bogey | Bogey | One over par on a hole |
| Double Bogey | Double Bogey | Two over par — a "blow-up hole" |
| Penalty stroke | Penalty | Shot added to score for out of bounds or lost ball |
| Recovery shot | Recovery | Shot from an unplayable or awkward position |
| Layup | Layup | Deliberately hitting short of a hazard |
| Club selection | Club selection | Choosing which club to hit — course management skill |
| Par 3/4/5 | Hole types | The expected number of shots to complete a hole |
| Back nine | Back nine | Holes 10–18 |
| Front nine | Front nine | Holes 1–9 |
| Out | Out | Front nine total score |
| In | In | Back nine total score |
| 19th hole | 19th hole | The clubhouse bar — where post-round analysis happens |
| Playing partner | Playing partner | The golfer(s) in your group |
| Caddie | Caddie | Person who carries clubs and advises on strategy |
| Yardage book | Yardage book | Detailed course measurements used by serious players |
| Course management | Course management | Strategic decision-making about where to aim each shot |
| Dispersion | Dispersion | The spread pattern of a golfer's shots from a given distance |
| Miss left/right | Miss direction | Directional error on a shot |
| Distance control | Distance control | Accuracy of how far the ball travels |
| Lag putt | Lag putt | A long putt aimed at getting close, not necessarily holing |
| Tap-in | Tap-in | A putt so short it is essentially unmissable (under 2 feet) |
| Green speed | Green speed | How fast the putting surface rolls — measured in Stimpmeter |
| Handicap differential | Differential | Score adjustment used in WHS handicap calculation |
| Net score | Net score | Gross score minus handicap strokes |
| Stableford | Stableford | Points-based scoring system (common in UK club golf) |
| Medal | Medal | Stroke play competition — direct scoring |
| Matchplay | Matchplay | Hole-by-hole competition vs an opponent |
| DECADE | DECADE | Golf strategy system by Scott Fawcett — major influence on SG methodology for amateurs |
| Lou Stagner | Lou Stagner | Golf data analyst — publishes widely-used amateur SG baselines |
| Mark Broadie | Mark Broadie | Columbia professor who invented Strokes Gained. Book: "Every Shot Counts" |

---

## Round Notes — Why Golfers Need This

### The gap between stats and reality

Stats capture what happened. They don't capture why. A golfer who three-putts 5 times may have had a bad putting day — or they may have played on aerated greens, or tried a new grip, or been dealing with a stiff back. The number is the same. The meaning is completely different.

Serious golfers already do this mentally. They replay the round on the drive home. They remember the wind on 12 that cost them two clubs of judgement. They know the nerves on the first tee of a medal round. TM Stats giving them a place to capture this turns mental replay into a searchable, analysable record.

### What golfers write in their notes (real patterns)

From listening to how golfers talk about their rounds, notes typically fall into these categories:

**Technique changes:** "Tried a stronger grip today — hit it much straighter but shorter", "Went back to my old putting stance", "Coach told me to keep my head still — focused on this all round"

**Mental/emotional state:** "Nervous on the first tee as usual — settled down by hole 5", "Felt very relaxed today — played with no expectations", "Frustrated after hole 4, took ages to reset"

**Physical condition:** "Back was stiff on the back nine", "Felt fresh and focused today", "Tired from travelling — hard to concentrate"

**Course and conditions:** "Wind was much stronger than forecast — everyone struggled", "Greens were very fast today — 3-putted more than usual", "Course was wet and soft — shorter than expected"

**Equipment:** "New driver felt great", "Irons were inconsistent — mishitting some left", "Switched back to my old putter"

**Specific holes:** "Always struggle on 14 — narrow with out of bounds right", "Made a mess of the par 3s again", "Back nine much better than front"

### The pattern layer that emerges over a season

After 20+ rounds with notes, patterns emerge that pure stats never reveal:
- A player notes "windy" on 8 rounds and their SG drops 2.1 shots on average in wind — coachable insight
- A player notes "tired" on 6 rounds — all show consistent SG decline in the back nine
- A player notes "nervous" before medal rounds — SG: Putting drops specifically under competition pressure
- A player notes "new technique" 3 times — SG: Approach improves each time after an initial dip

This is what a good caddie builds up over a season of working with a player. TM Stats creates it automatically.

### How notes change AI feedback

Without notes, AI feedback is based purely on numbers. With notes, it becomes genuinely contextual:

- Stats show bad putting day → note says aerated greens → AI correctly identifies as a course issue, not a technique issue
- Stats show good driving → note says "tried new tee shot routine" → AI reinforces the specific change, not just "keep driving well"
- Stats show consistent pattern → note shows correlating condition → AI surfaces the insight the golfer hadn't consciously noticed

This is the feature that makes TM Stats feel like a coach who actually knows you, rather than a stats app that just reports numbers.
