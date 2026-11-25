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
- Coaches can run a team, see every player's stats and Strokes Gained, and run qualifying rounds.

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
