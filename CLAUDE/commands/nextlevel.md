# /nextlevel — Take TM Stats Further

When Rob runs /nextlevel [area], think like a product director and senior engineer combined. The goal is not just to build the feature — it's to make TM Stats the product serious golfers choose over everything else.

## Your Role
You are the senior advisor Rob never had. Your job is to look at what's been built and ask: "Is this genuinely better than what exists? Would a scratch golfer use this over Clippd? Would a college coach pay for this?"

Be honest. If something is mediocre, say so. If there's a better way, show it.

---

## The Next Level Framework

Run through each lens and give a concrete recommendation.

### Lens 1 — The Insight Gap
Most golf apps show you data. The best ones show you what the data means.

Ask: After using this feature, does the golfer know something they didn't know before AND know what to do about it?

Good: "Your SG: Putting from 10–20 feet is -0.6 vs scratch. That's costing you roughly 0.6 shots per round. If you got that to 0, you'd be playing to a 3 handicap instead of 6."

Not good enough: "SG Putting: -0.6"

For every stat we display, add a "so what" layer — plain English translation of what the number means in terms of handicap, shots per round, or what to work on.

### Lens 2 — The Retention Hook
What brings the golfer back after round 2, 5, 10?

- Trend lines: "Your approach SG has improved by 0.4 over the last 8 rounds — you're trending in the right direction"
- Personal bests: "Best SG: Putting round was 15 April — Bromborough, +1.2"
- Streaks: "You've hit 60%+ GIR in 4 consecutive rounds"
- Progress towards goals: "You set a goal to reach scratch by December. At your current improvement rate, you'll get there in 14 months."

These are the things that make a golfer open the app between rounds.

### Lens 3 — The Coach Angle
If TM Stats is ever going to be adopted by England Golf or college teams, it needs to be useful to coaches, not just players.

Ask: If a coach has 12 players using TM Stats, what would make them pay £50/month for the team account?

- Squad dashboard: all 12 players ranked by SG category — instantly see who needs help with what
- Weakest link analysis: "Your team is losing an average of 1.8 shots per round on Approach. Focus your next training session there."
- Player comparison: "Player A vs Player B — where are the differences?"
- Practice session planner: AI generates a team practice plan based on squad SG data
- Tournament preparation: "In your last 5 tournament rounds, your SG: Putting drops by 0.4 vs practice. Mental game or green reading?"

### Lens 4 — The Data Moat
The more data TM Stats has, the harder it is to compete with.

Ask: What data are we collecting that no one else has for this level of golfer?

- Amateur benchmark data: if 10,000 golfers use TM Stats, we build the most accurate amateur SG baseline ever created — better than anything DECADE Golf has for this handicap range
- Course difficulty index: aggregate data across all TM Stats users shows which courses play hardest for each handicap bracket
- Practice vs tournament delta: we can show a golfer how their stats change under pressure — this is unique
- Seasonal trends: "Your SG drops in winter — is this equipment, course conditions, or mental?"

When we have enough data, publish it. "TM Stats Insights: The stats behind amateur golf in the UK." That becomes a marketing asset and an England Golf conversation starter.

### Lens 5 — The AI Feedback Quality
The AI feedback must be genuinely useful — not generic coaching advice with the golfer's name pasted in.

Bad AI feedback: "Focus on your putting. Try to hole more putts from short range."

Good AI feedback: "Over your last 6 rounds, you're losing 1.4 shots per round from 15–25 feet. Your conversion rate from that range is 18% vs scratch's 28%. The fastest fix here is green reading, not stroke mechanics. Before your next round, spend 20 minutes on a practice green reading the break from that distance without hitting — just look and predict. Then check. Do this for 3 sessions and re-measure."

To get there, the Claude API prompt needs to include:
- Exact SG numbers by category and by distance band
- Comparison to baseline
- Round type (practice vs competition — different feedback for each)
- Trend direction (improving or declining)
- Time of year and how many rounds played

### Lens 6 — The Pricing Architecture
£4.99/month is fine to start. But once SG and AI are live, the pricing should reflect the value.

Consider:
- **Free tier:** 5 rounds, basic stats only, no SG, no AI — enough to get hooked
- **Player tier (£4.99/month):** Unlimited rounds, full SG, AI feedback after each round, trend analysis
- **Serious tier (£9.99/month):** Everything + AI practice plans, goal tracking, detailed distance band breakdowns
- **Team/Coach tier (£39.99/month):** 15 player seats, squad dashboard, coach analytics, team practice planner

The coach tier is where the real revenue is. 10 college teams = £400/month. 50 teams = £2,000/month. That's before England Golf.

---

## Output Format

For each lens, give:
1. **Current state:** Where TM Stats is right now on this
2. **Next level move:** The specific thing to build or change
3. **Effort to implement:** Low / Medium / High
4. **Impact on retention/revenue:** Low / Medium / High

End with: **The single highest-leverage thing Rob should prioritise next.**
