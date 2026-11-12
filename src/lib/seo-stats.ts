// Programmatic SEO data: benchmark stats by handicap band × stat type.
// Each combination generates a static page at /golf-stats/[slug] answering
// the exact question golfers search for.

import type { SkillLevel } from './sg-engine'

export interface Band {
  slug: string
  // The Strokes Gained baseline level this band is. Benchmarks and Strokes
  // Gained use the same bands, so a golfer is always compared with one group.
  level: SkillLevel
  label: string
  range: string
  fir: number          // fairways hit %
  gir: number          // greens in regulation %
  puttsPerHole: number
  puttsPerRound: number
  upDown: number       // scramble %
  sandSave: number     // sand save %
  avgScore18: number   // typical 18-hole score on a par 72
}

// Same bands as the Strokes Gained baselines in sg-engine.ts. The typical score
// follows the same model the engine uses: about 3 + 0.95 x handicap over par.
// The other figures are guide values for a typical golfer in the band.
export const BANDS: Band[] = [
  { slug: 'scratch',          level: 'scratch', label: 'Scratch golfer',  range: 'scratch', fir: 58, gir: 61, puttsPerHole: 1.69, puttsPerRound: 30.5, upDown: 52, sandSave: 42, avgScore18: 75 },
  { slug: '1-4-handicap',     level: 'h1_4',    label: '1–4 handicap',    range: '1–4',     fir: 56, gir: 56, puttsPerHole: 1.72, puttsPerRound: 31,   upDown: 48, sandSave: 38, avgScore18: 77 },
  { slug: '5-9-handicap',     level: 'h5_9',    label: '5–9 handicap',    range: '5–9',     fir: 53, gir: 49, puttsPerHole: 1.78, puttsPerRound: 32,   upDown: 42, sandSave: 32, avgScore18: 82 },
  { slug: '10-14-handicap',   level: 'h10_14',  label: '10–14 handicap',  range: '10–14',   fir: 48, gir: 41, puttsPerHole: 1.83, puttsPerRound: 33,   upDown: 35, sandSave: 25, avgScore18: 86 },
  { slug: '15-19-handicap',   level: 'h15_19',  label: '15–19 handicap',  range: '15–19',   fir: 43, gir: 33, puttsPerHole: 1.89, puttsPerRound: 34,   upDown: 28, sandSave: 18, avgScore18: 91 },
  { slug: '20-28-handicap',   level: 'h20_28',  label: '20–28 handicap',  range: '20–28',   fir: 36, gir: 23, puttsPerHole: 1.97, puttsPerRound: 35.5, upDown: 20, sandSave: 11, avgScore18: 98 },
  { slug: '29-plus-handicap', level: 'h29',     label: '29+ handicap',    range: '29+',     fir: 28, gir: 14, puttsPerHole: 2.06, puttsPerRound: 37,   upDown: 13, sandSave: 7,  avgScore18: 105 },
]

// Tour level, for golfers who set their Strokes Gained baseline to PGA Tour.
// Not a public benchmark page: comparing a club golfer with the tour is rarely useful.
export const TOUR_BAND: Band = {
  slug: 'pga-tour', level: 'tour', label: 'PGA Tour', range: 'PGA Tour',
  fir: 60, gir: 66, puttsPerHole: 1.61, puttsPerRound: 29, upDown: 58, sandSave: 50, avgScore18: 70,
}

/** The benchmark band for a Strokes Gained baseline level. */
export function bandForLevel(level: SkillLevel): Band {
  if (level === 'tour') return TOUR_BAND
  return BANDS.find(b => b.level === level) ?? BANDS[2]
}

// Benchmark pages published before the bands were matched to Strokes Gained.
// Old addresses move to the band that now covers that handicap.
const LEGACY_BAND_SLUGS: Record<string, string> = {
  '10-handicap': '10-14-handicap',
  '15-handicap': '15-19-handicap',
  '20-handicap': '20-28-handicap',
  '25-handicap': '20-28-handicap',
}

/** New address for an old benchmark page, or null if the slug is not an old one. */
export function legacySeoRedirect(slug: string): string | null {
  for (const stat of STATS) {
    for (const [oldBand, newBand] of Object.entries(LEGACY_BAND_SLUGS)) {
      if (slug === `${stat.slug}-${oldBand}`) return `${stat.slug}-${newBand}`
    }
  }
  return null
}

export interface StatDef {
  slug: string
  name: string
  question: (band: Band) => string  // page H1
  answer: (band: Band) => string    // direct answer paragraph
  value: (band: Band) => string     // the headline number
  explainer: string                 // what this stat is and why it matters
  improve: string                   // how to improve it
  tableValue: (band: Band) => string
}

export const STATS: StatDef[] = [
  {
    slug: 'gir-percentage',
    name: 'Greens in regulation (GIR)',
    question: b => `What is a good GIR percentage for a ${b.label.toLowerCase()}?`,
    answer: b => `A ${b.label.toLowerCase()} typically hits around ${b.gir}% of greens in regulation — roughly ${Math.round((b.gir / 100) * 18)} greens per 18 holes. If you're above that, your ball striking is ahead of your handicap; below it, approach play is likely where your shots are going.`,
    value: b => `${b.gir}%`,
    explainer: 'A green in regulation means your ball is on the putting surface in par minus two strokes — on in 1 on a par 3, in 2 on a par 4, in 3 on a par 5. GIR is the single stat most strongly correlated with scoring: more greens means more birdie putts and fewer scrambling situations.',
    improve: 'The fastest GIR gain for most amateurs is club selection: the majority of missed greens finish short. Take one more club than instinct says, and aim for the middle of the green rather than the flag. Strokes Gained approach data will show you exactly which distances cost you the most.',
    tableValue: b => `${b.gir}%`,
  },
  {
    slug: 'fairways-hit',
    name: 'Fairways in regulation (FIR)',
    question: b => `What is a good fairways-hit percentage for a ${b.label.toLowerCase()}?`,
    answer: b => `A ${b.label.toLowerCase()} typically finds about ${b.fir}% of fairways — around ${Math.round((b.fir / 100) * 14)} of 14 driving holes. Accuracy matters less than most golfers think: distance with a playable miss usually beats short and straight.`,
    value: b => `${b.fir}%`,
    explainer: 'Fairways in regulation counts the tee shots on par 4s and par 5s that finish in the fairway. It tells you about your driving accuracy — but on its own it can mislead: a miss in light rough 280 yards out is a far better result than a fairway hit at 200 yards.',
    improve: 'Pick a specific target line on every tee shot and commit to it. If you track shot-by-shot data, your Strokes Gained off-the-tee number will tell you whether driving is genuinely costing you shots or whether the real damage is elsewhere.',
    tableValue: b => `${b.fir}%`,
  },
  {
    slug: 'putts-per-round',
    name: 'Putts per round',
    question: b => `How many putts per round is good for a ${b.label.toLowerCase()}?`,
    answer: b => `A ${b.label.toLowerCase()} averages roughly ${b.puttsPerRound} putts per 18 holes (about ${b.puttsPerHole} per hole). Fewer than that and your putting is a strength; more, and the greens are where your scores are leaking.`,
    value: b => `${b.puttsPerRound}`,
    explainer: 'Total putts is a useful headline, but it hides context: a player who misses greens and chips close will record fewer putts than a player who hits 12 greens. That is why Strokes Gained putting — which accounts for the length of every putt — is the truer measure.',
    improve: 'Three-putt avoidance beats holing more mid-rangers. Practise lag putting from 25–40 feet until your second putt is inside three feet, and make short putts (inside 6 feet) a non-negotiable practice block every session.',
    tableValue: b => `${b.puttsPerRound}`,
  },
  {
    slug: 'scoring-average',
    name: 'Scoring average',
    question: b => `What does a ${b.label.toLowerCase()} typically score?`,
    answer: b => `On a par-72 course, a ${b.label.toLowerCase()} typically shoots around ${b.avgScore18}. Handicaps are based on your best rounds, not your average — so scoring above your handicap most days is completely normal.`,
    value: b => `~${b.avgScore18}`,
    explainer: 'Your handicap index reflects your demonstrated potential (roughly your best 8 of 20 rounds), not your expected score. Most golfers shoot 3–5 shots above their handicap on an average day — feeling like you "never play to your handicap" is mathematically built in.',
    improve: 'Scoring average drops fastest by eliminating disasters, not by making more birdies. Track where your double bogeys come from — penalty shots, short-game duffs, three putts — and fix the biggest leak first.',
    tableValue: b => `~${b.avgScore18}`,
  },
  {
    slug: 'up-and-down',
    name: 'Up & down (scrambling)',
    question: b => `What is a good up-and-down percentage for a ${b.label.toLowerCase()}?`,
    answer: b => `A ${b.label.toLowerCase()} gets up and down around ${b.upDown}% of the time when they miss a green. Short game is the cheapest place in golf to gain shots — no swing change required.`,
    value: b => `${b.upDown}%`,
    explainer: 'An up and down means holing out in two shots from off the green after missing it — one chip or pitch, one putt. Since most amateurs miss more greens than they hit, scrambling skill has an outsized effect on score.',
    improve: 'Pick a landing spot about three feet onto the green and let the ball release to the hole. One simple shot played well beats three fancy ones played occasionally. Track your up-and-down rate to see whether the chip or the putt is the weak link.',
    tableValue: b => `${b.upDown}%`,
  },
  {
    slug: 'sand-saves',
    name: 'Sand saves',
    question: b => `What is a good sand save percentage for a ${b.label.toLowerCase()}?`,
    answer: b => `From greenside bunkers, a ${b.label.toLowerCase()} saves par roughly ${b.sandSave}% of the time. Bunker play is the most technique-dependent short game skill — and the one where amateurs are furthest behind better players.`,
    value: b => `${b.sandSave}%`,
    explainer: 'A sand save means getting up and down from a greenside bunker — out in one, then one putt. The gap between handicap bands is bigger in sand than anywhere else around the green, because bunker technique has to be learned deliberately.',
    improve: 'The goal from sand is not to get close — it is to get out, on the green, every single time. Eliminating the doubled bunker shot is worth more than the occasional one that finishes stiff.',
    tableValue: b => `${b.sandSave}%`,
  },
]

export interface SeoPage {
  slug: string
  band: Band
  stat: StatDef
}

export function allSeoPages(): SeoPage[] {
  const pages: SeoPage[] = []
  for (const stat of STATS) {
    for (const band of BANDS) {
      pages.push({ slug: `${stat.slug}-${band.slug}`, band, stat })
    }
  }
  return pages
}

export function findSeoPage(slug: string): SeoPage | null {
  return allSeoPages().find(p => p.slug === slug) ?? null
}
