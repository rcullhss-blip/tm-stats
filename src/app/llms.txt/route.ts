import { BANDS, STATS } from '@/lib/seo-stats'
import { COMPETITORS } from '@/lib/compare'

// /llms.txt: a short plain summary of the site for AI assistants, in the
// llmstxt.org layout (a title, a one line summary, then lists of links).
const SITE = 'https://www.tmstatsgolf.com'

export const revalidate = 86400

export function GET() {
  const body = `# TM Stats

> TM Stats is a golf statistics web app for serious amateur golfers. Golfers log rounds on their phone and get Strokes Gained, compared with golfers at their own handicap, plus AI coaching feedback on what to practise. Built by Rob Cull, a former Cheshire county golfer and NCAA Division 2 player.

Key facts:
- Free for the first five rounds, including one round of Strokes Gained. Pro is £4.99 a month or £50 a year. Elite is £6.99 a month or £70 a year.
- No sensors or hardware. Rounds are entered on a phone, either Quick (score, fairways, greens, putts) or Full Tracking (each shot, which gives Strokes Gained).
- Strokes Gained baselines run from scratch to 29 and over handicap, plus PGA Tour and US college divisions.
- AI coaching reads the golfer's own numbers, not generic tips. Details are in the AI coaching section below.
- Coaches can run a whole squad from one dashboard, including qualifying, live scoring and travel team selection. Details are in the teams and college golf sections below.

## AI coaching
After a round, TM Stats writes coaching feedback from that golfer's own data. It is included in Pro and Elite.
- What it reads: Strokes Gained by category for the round, the basic stats, the golfer's recent rounds, their notes on the round, the conditions, whether it was practice or competition, and what they have said they are working on.
- What it gives back: where the shots went in that round, the one area to work on first, and a practice plan with named drills.
- Seven coaching styles to choose from: club professional, fundamentals, technical, short game specialist, ball flight, encourager and straight talker. They are general coaching styles, not real coaches.
- Three depths: simple, intermediate and advanced, so a newer golfer and a scratch player each get feedback at their level.
- Mental game coach: a chat for the thinking side of golf, such as nerves, routines and bouncing back from a bad hole.
- Elite adds coaching built on miss patterns: which way the golfer misses, from which distances, with an aim point.
- For teams, a real coach can add what the stats cannot show (an injury, a swing change in progress) and the feedback is rewritten with that in mind.
- It stays on golf. It will not act as a general chatbot, and it points a golfer to proper support if they seem to be struggling.

## For coaches and teams
One coach account runs a whole squad: college teams, county and junior squads, academies and club teams.
- Squad dashboard: every player's rounds, stats and Strokes Gained in one place, with each player's biggest leaks (the distances and shot types costing them most).
- Getting players on: a join code, a join link and a QR code. A coach can also set accounts up for the squad, and each player gets a one tap link to open theirs.
- Qualifying and live scoring: the coach sets up a qualifier (course, players, rounds, groups and tee times), and scores go in hole by hole from any phone on the team, with a live leaderboard. Several groups can score at once.
- Scores land in the player's account: when a round is finished, every player's card is already in their own account with pars and scores filled in. They only add their stats, in about two minutes.
- Tournament results upload: the coach uploads a results PDF, photo or pasted text, and the hole scores are read into each player's account for the coach to check.
- Travel team selection: every qualifying and tournament round ranked in one table, with date and event filters, rounds left out, best X of Y, a picked travel team and a spreadsheet download.
- Practice tests: scored drills with personal bests, suggested from each player's weakest area, with a squad table for the coach.
- Keeping players logging: a weekly reminder to players who have not logged a round, and a Monday email to the coach when the squad has gone quiet.
- Squad leaderboard that players can see, if the coach switches it on.
- Coach and AI together: the coach can add what the numbers cannot show, and the AI feedback for that player is rewritten with it.
- Players who join a team get Pro free for the team's first year. Coaches request a team and TM Stats approves each one.

## For college golf
- Strokes Gained baselines for US college golf: NCAA Division 1, 2 and 3, men and women, built from published scoring averages. A college player is measured against their own division, not against tour players or club handicaps.
- Qualifying is the centre of it: run team qualifying with live scoring, and the scores are already in each player's account afterwards.
- Selection built the way a college coach picks a travel team, from qualifying and tournament rounds together.
- College team leaderboards, shown once enough teams are on them to mean something.
- Recruiting profile for juniors: one link a golfer can send to college coaches, showing scoring, recent rounds and the handicap each part of their game plays like. It is off until the golfer switches it on, and they choose which rounds show.

## Free tools (no account needed)
- [Where are you losing shots? quiz](${SITE}/quiz): five questions, shows which part of your game costs most for your handicap
- [Strokes Gained calculator](${SITE}/strokes-gained-calculator): enter a hole shot by shot and see Strokes Gained for each shot
- [Golf stats benchmarks by handicap](${SITE}/golf-stats): typical greens in regulation, fairways hit, putts per round, scoring average, up and downs and sand saves (${STATS.length} stats) for ${BANDS.length} handicap bands

## Guides
- [What is Strokes Gained?](${SITE}/strokes-gained): plain English explainer with worked examples
- [Blog](${SITE}/blog): golf stats, Strokes Gained and practice advice
- [PGA Tour winner breakdowns](${SITE}/blog): each week's winner measured against a single figure handicap, published on the blog

## Comparisons
- [Golf stats apps compared](${SITE}/compare)
${COMPETITORS.map(c => `- [TM Stats vs ${c.name}](${SITE}/compare/${c.slug})`).join('\n')}

## About
- [About TM Stats and Rob Cull](${SITE}/about)
- [Contact](${SITE}/contact)
`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
