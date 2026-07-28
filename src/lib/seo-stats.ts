// Programmatic SEO data: benchmark stats by handicap band × stat type.
// Each combination generates a static page at /golf-stats/[slug] answering
// the exact question golfers search for.

export interface Band {
  slug: string
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

export const BANDS: Band[] = [
  { slug: 'scratch',      label: 'Scratch (0–5 handicap)', range: '0–5',   fir: 62, gir: 65, puttsPerHole: 1.75, puttsPerRound: 31, upDown: 55, sandSave: 45, avgScore18: 74 },
  { slug: '10-handicap',  label: '10 handicap (6–12)',     range: '6–12',  fir: 52, gir: 48, puttsPerHole: 1.82, puttsPerRound: 33, upDown: 40, sandSave: 30, avgScore18: 82 },
  { slug: '15-handicap',  label: '15 handicap (13–18)',    range: '13–18', fir: 42, gir: 35, puttsPerHole: 1.88, puttsPerRound: 34, upDown: 30, sandSave: 20, avgScore18: 88 },
  { slug: '20-handicap',  label: '20 handicap (19–24)',    range: '19–24', fir: 35, gir: 22, puttsPerHole: 1.95, puttsPerRound: 35, upDown: 22, sandSave: 12, avgScore18: 94 },
  { slug: '25-handicap',  label: '25+ handicap',           range: '25+',   fir: 28, gir: 15, puttsPerHole: 2.0,  puttsPerRound: 36, upDown: 15, sandSave: 8,  avgScore18: 100 },
]

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
    answer: b => `A golfer playing off ${b.range} typically hits around ${b.gir}% of greens in regulation — roughly ${Math.round((b.gir / 100) * 18)} greens per 18 holes. If you're above that, your ball striking is ahead of your handicap; below it, approach play is likely where your shots are going.`,
    value: b => `${b.gir}%`,
    explainer: 'A green in regulation means your ball is on the putting surface in par minus two strokes — on in 1 on a par 3, in 2 on a par 4, in 3 on a par 5. GIR is the single stat most strongly correlated with scoring: more greens means more birdie putts and fewer scrambling situations.',
    improve: 'The fastest GIR gain for most amateurs is club selection: the majority of missed greens finish short. Take one more club than instinct says, and aim for the middle of the green rather than the flag. Strokes Gained approach data will show you exactly which distances cost you the most.',
    tableValue: b => `${b.gir}%`,
  },
  {
    slug: 'fairways-hit',
    name: 'Fairways in regulation (FIR)',
    question: b => `What is a good fairways-hit percentage for a ${b.label.toLowerCase()}?`,
    answer: b => `A ${b.range} handicap golfer typically finds about ${b.fir}% of fairways — around ${Math.round((b.fir / 100) * 14)} of 14 driving holes. Accuracy matters less than most golfers think: distance with a playable miss usually beats short and straight.`,
    value: b => `${b.fir}%`,
    explainer: 'Fairways in regulation counts the tee shots on par 4s and par 5s that finish in the fairway. It tells you about your driving accuracy — but on its own it can mislead: a miss in light rough 280 yards out is a far better result than a fairway hit at 200 yards.',
    improve: 'Pick a specific target line on every tee shot and commit to it. If you track shot-by-shot data, your Strokes Gained off-the-tee number will tell you whether driving is genuinely costing you shots or whether the real damage is elsewhere.',
    tableValue: b => `${b.fir}%`,
  },
  {
    slug: 'putts-per-round',
    name: 'Putts per round',
    question: b => `How many putts per round is good for a ${b.label.toLowerCase()}?`,
    answer: b => `A ${b.range} handicap golfer averages roughly ${b.puttsPerRound} putts per 18 holes (about ${b.puttsPerHole} per hole). Fewer than that and your putting is a strength; more, and the greens are where your scores are leaking.`,
    value: b => `${b.puttsPerRound}`,
    explainer: 'Total putts is a useful headline, but it hides context: a player who misses greens and chips close will record fewer putts than a player who hits 12 greens. That is why Strokes Gained putting — which accounts for the length of every putt — is the truer measure.',
    improve: 'Three-putt avoidance beats holing more mid-rangers. Practise lag putting from 25–40 feet until your second putt is inside three feet, and make short putts (inside 6 feet) a non-negotiable practice block every session.',
    tableValue: b => `${b.puttsPerRound}`,
  },
  {
    slug: 'scoring-average',
    name: 'Scoring average',
    question: b => `What does a ${b.label.toLowerCase()} typically score?`,
    answer: b => `On a par-72 course, a golfer playing off ${b.range} typically shoots around ${b.avgScore18}. Handicaps are based on your best rounds, not your average — so scoring above your handicap most days is completely normal.`,
    value: b => `~${b.avgScore18}`,
    explainer: 'Your handicap index reflects your demonstrated potential (roughly your best 8 of 20 rounds), not your expected score. Most golfers shoot 3–5 shots above their handicap on an average day — feeling like you "never play to your handicap" is mathematically built in.',
    improve: 'Scoring average drops fastest by eliminating disasters, not by making more birdies. Track where your double bogeys come from — penalty shots, short-game duffs, three putts — and fix the biggest leak first.',
    tableValue: b => `~${b.avgScore18}`,
  },
  {
    slug: 'up-and-down',
    name: 'Up & down (scrambling)',
    question: b => `What is a good up-and-down percentage for a ${b.label.toLowerCase()}?`,
    answer: b => `A ${b.range} handicap golfer gets up and down around ${b.upDown}% of the time when they miss a green. Short game is the cheapest place in golf to gain shots — no swing change required.`,
    value: b => `${b.upDown}%`,
    explainer: 'An up and down means holing out in two shots from off the green after missing it — one chip or pitch, one putt. Since most amateurs miss more greens than they hit, scrambling skill has an outsized effect on score.',
    improve: 'Pick a landing spot about three feet onto the green and let the ball release to the hole. One simple shot played well beats three fancy ones played occasionally. Track your up-and-down rate to see whether the chip or the putt is the weak link.',
    tableValue: b => `${b.upDown}%`,
  },
  {
    slug: 'sand-saves',
    name: 'Sand saves',
    question: b => `What is a good sand save percentage for a ${b.label.toLowerCase()}?`,
    answer: b => `From greenside bunkers, a ${b.range} handicap golfer saves par roughly ${b.sandSave}% of the time. Bunker play is the most technique-dependent short game skill — and the one where amateurs are furthest behind better players.`,
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
