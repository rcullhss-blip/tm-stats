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
- Coaches can run a team, see every player's stats and Strokes Gained, and run qualifying rounds.

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
