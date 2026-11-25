// Weekly "tour winner against a 5 to 9 handicap" post.
//
// Everything in the post is worked out from the winner's real hole scores and
// the course's listed pars and yardages. Nothing is written by AI, so a number
// can never be made up. The comparison uses the same Strokes Gained baseline
// as the app: what a 5 to 9 handicap would expect to score from each tee.
//
// What it cannot show is the split by off the tee, approach, short game and
// putting. That needs every shot, and only hole scores are public.

import { expectedStrokes, type SkillLevel } from './sg-engine'
import { BANDS } from './seo-stats'

const FEED = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'
const BOARD = 'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event='

const LEVEL: SkillLevel = 'h5_9'
const LEVEL_NAME = '5 to 9 handicap'

export interface CourseHole { number: number; par: number; yards: number }
export interface Course { name: string; par: number; yards: number; host: boolean; holes: CourseHole[] }

export interface RoundInput {
  round: number
  score: number
  holes: { number: number; score: number; par: number }[]
}

export interface WinnerInput {
  eventId: string
  eventName: string
  endDate: string          // ISO
  winner: string
  totalStrokes: number
  toPar: number
  playoff: boolean
  runnerUp: string | null
  runnerUpToPar: number | null
  courses: Course[]
  rounds: RoundInput[]                         // the winner, regulation rounds only
  field: { round: number; pars: number[]; score: number }[]  // every finished round by every player
}

export interface RoundLine {
  round: number
  course: string
  par: number
  score: number
  fieldAvg: number | null
  vsField: number | null
  expected: number     // what the baseline golfer would expect on these holes
  gained: number       // expected minus score
}

export interface ParTypeLine { par: 3 | 4 | 5; holes: number; avg: number; expectedAvg: number }

export interface Breakdown {
  input: WinnerInput
  rounds: RoundLine[]
  totalExpected: number
  totalGained: number
  perRoundGained: number
  vsFieldPerRound: number | null
  counts: { eagles: number; birdies: number; pars: number; bogeys: number; doubles: number; holes: number }
  parTypes: ParTypeLine[]
}

const sameSeq = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])

/** The course a round was played on, matched hole by hole on par. */
function courseFor(pars: number[], courses: Course[]): Course | null {
  const fits = courses.filter(c => sameSeq(c.holes.map(h => h.par), pars))
  return fits.find(c => c.host) ?? fits[0] ?? null
}

export function buildBreakdown(input: WinnerInput): Breakdown | null {
  if (input.rounds.length === 0) return null
  const rounds: RoundLine[] = []
  const counts = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, holes: 0 }
  const byPar = new Map<number, { holes: number; score: number; expected: number }>()

  for (const r of input.rounds) {
    const holes = [...r.holes].sort((a, b) => a.number - b.number)
    if (holes.length !== 18) return null
    const pars = holes.map(h => h.par)
    const course = courseFor(pars, input.courses)
    if (!course) return null // cannot place the round on a course: publish nothing rather than guess

    let expected = 0
    for (const h of holes) {
      const yards = course.holes.find(c => c.number === h.number)?.yards
      if (!yards) return null
      const e = expectedStrokes(yards, 'tee', LEVEL)
      expected += e
      const diff = h.score - h.par
      counts.holes++
      if (diff <= -2) counts.eagles++
      else if (diff === -1) counts.birdies++
      else if (diff === 0) counts.pars++
      else if (diff === 1) counts.bogeys++
      else counts.doubles++
      const t = byPar.get(h.par) ?? { holes: 0, score: 0, expected: 0 }
      t.holes++; t.score += h.score; t.expected += e
      byPar.set(h.par, t)
    }

    const same = input.field.filter(f => f.round === r.round && sameSeq(f.pars, pars))
    const fieldAvg = same.length >= 10 ? same.reduce((s, f) => s + f.score, 0) / same.length : null
    rounds.push({
      round: r.round,
      course: course.name,
      par: pars.reduce((s, p) => s + p, 0),
      score: r.score,
      fieldAvg,
      vsField: fieldAvg === null ? null : fieldAvg - r.score,
      expected,
      gained: expected - r.score,
    })
  }

  const totalExpected = rounds.reduce((s, r) => s + r.expected, 0)
  const totalScore = rounds.reduce((s, r) => s + r.score, 0)
  const withField = rounds.filter(r => r.vsField !== null)
  const parTypes = ([3, 4, 5] as const)
    .filter(p => byPar.has(p))
    .map(p => {
      const t = byPar.get(p)!
      return { par: p, holes: t.holes, avg: t.score / t.holes, expectedAvg: t.expected / t.holes }
    })

  return {
    input,
    rounds,
    totalExpected,
    totalGained: totalExpected - totalScore,
    perRoundGained: (totalExpected - totalScore) / rounds.length,
    vsFieldPerRound: withField.length === rounds.length
      ? withField.reduce((s, r) => s + (r.vsField as number), 0) / rounds.length
      : null,
    counts,
    parTypes,
  }
}

// ─── Words ───────────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const one = (n: number) => n.toFixed(1)
const two = (n: number) => n.toFixed(2)
const signed = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}`

export function toParWords(toPar: number): string {
  if (toPar === 0) return 'level par'
  return `${Math.abs(toPar)} ${toPar < 0 ? 'under' : 'over'} par`
}

function list(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

export function slugFor(input: WinnerInput): string {
  const year = new Date(input.endDate).getUTCFullYear()
  const name = input.eventName.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^the-/, '')
  return `${name}-${year}-winner-against-a-5-handicap`.slice(0, 90)
}

const TABLE = 'width:100%;border-collapse:collapse;margin:0 0 1.5rem;font-size:0.875rem;'
const TH = 'text-align:left;padding:8px 6px;border-bottom:1px solid #2E3247;color:#9A9DB0;font-weight:600;'
const TD = 'padding:8px 6px;border-bottom:1px solid #22263A;color:#F0F0F0;font-family:var(--font-dm-mono);'
const GOOD = 'color:#22C55E;'

export function renderPost(b: Breakdown): { title: string; slug: string; content: string; excerpt: string; metaTitle: string; metaDesc: string } {
  const i = b.input
  const year = new Date(i.endDate).getUTCFullYear()
  const event = esc(i.eventName.replace(/^The /, 'the '))
  const who = esc(i.winner)
  const last = esc(i.winner.trim().split(/\s+/).slice(-1)[0])
  const n = b.rounds.length
  const host = i.courses.find(c => c.host) ?? i.courses[0]
  const scores = list(b.rounds.map(r => String(r.score)))
  const typical = BANDS.find(x => x.level === LEVEL)?.avgScore18 ?? 82
  const c = b.counts
  const dropped = c.bogeys + c.doubles
  const under = c.eagles + c.birdies

  const intro =
    `<p>${who} won ${event} at ${esc(host.name)} on ${toParWords(i.toPar)} (${i.totalStrokes})${i.playoff ? ', after a playoff' : ''}, with rounds of ${scores}. ` +
    `Measured against our ${LEVEL_NAME} baseline, that is <strong>${one(b.perRoundGained)} shots a round</strong> better than a good club golfer would expect from the same tees, and ${one(b.totalGained)} shots over the ${n} rounds.</p>`

  const fieldTable = b.rounds.every(r => r.fieldAvg !== null)
    ? `<h2>Round by round against the field</h2>
<p>This is the tour's own measure, Strokes Gained total: the field's average score that day, minus his.${b.vsFieldPerRound !== null ? ` Over the week he beat the field by ${one(b.vsFieldPerRound)} shots a round.` : ''}</p>
<table style="${TABLE}"><thead><tr><th style="${TH}">Round</th><th style="${TH}">Score</th><th style="${TH}">Field average</th><th style="${TH}">Gained</th></tr></thead><tbody>
${b.rounds.map(r => `<tr><td style="${TD}">${r.round}</td><td style="${TD}">${r.score}</td><td style="${TD}">${one(r.fieldAvg as number)}</td><td style="${TD}${(r.vsField as number) >= 0 ? GOOD : 'color:#EF4444;'}">${signed(r.vsField as number)}</td></tr>`).join('\n')}
</tbody></table>`
    : ''

  const levelTable = `<h2>Round by round against a ${LEVEL_NAME}</h2>
<p>For every hole we take what a ${LEVEL_NAME} would expect to score from that tee at that length, using the same baseline TM Stats uses for your own rounds, and add them up. From the tour tees that comes to about ${Math.round(b.totalExpected / n)} a round here.</p>
<table style="${TABLE}"><thead><tr><th style="${TH}">Round</th><th style="${TH}">Par</th><th style="${TH}">His score</th><th style="${TH}">${LEVEL_NAME} expects</th><th style="${TH}">Gained</th></tr></thead><tbody>
${b.rounds.map(r => `<tr><td style="${TD}">${r.round}</td><td style="${TD}">${r.par}</td><td style="${TD}">${r.score}</td><td style="${TD}">${one(r.expected)}</td><td style="${TD}${GOOD}">${signed(r.gained)}</td></tr>`).join('\n')}
</tbody></table>`

  const countParts = [
    c.eagles > 0 ? `${c.eagles} ${c.eagles === 1 ? 'eagle' : 'eagles'}` : '',
    `${c.birdies} ${c.birdies === 1 ? 'birdie' : 'birdies'}`,
    `${c.pars} ${c.pars === 1 ? 'par' : 'pars'}`,
    `${c.bogeys} ${c.bogeys === 1 ? 'bogey' : 'bogeys'}`,
    c.doubles > 0 ? `${c.doubles} ${c.doubles === 1 ? 'double bogey or worse' : 'double bogeys or worse'}` : 'nothing worse than a bogey',
  ].filter(Boolean)

  const widest = [...b.parTypes].sort((x, y) => (y.expectedAvg - y.avg) - (x.expectedAvg - x.avg))[0]

  const scoring = `<h2>Where the scoring came from</h2>
<p>Over ${c.holes} holes ${last} made ${list(countParts)}.</p>
<table style="${TABLE}"><thead><tr><th style="${TH}">Holes</th><th style="${TH}">His average</th><th style="${TH}">${LEVEL_NAME} expects</th><th style="${TH}">Gap a hole</th></tr></thead><tbody>
${b.parTypes.map(p => `<tr><td style="${TD}font-family:inherit;">Par ${p.par}s (${p.holes})</td><td style="${TD}">${two(p.avg)}</td><td style="${TD}">${two(p.expectedAvg)}</td><td style="${TD}${GOOD}">${two(p.expectedAvg - p.avg)}</td></tr>`).join('\n')}
</tbody></table>`

  const lessons = `<h2>What a single figure golfer can take from it</h2>
<ul>
<li><strong>The gap is dropped shots, not birdies.</strong> He went over par on ${dropped} of ${c.holes} holes and under par on ${under}. A ${LEVEL_NAME} typically shoots around ${typical} on a par 72, and nearly all of those extra shots are bogeys and doubles. Cutting those out is worth more than chasing birdies.</li>
${widest ? `<li><strong>The biggest gap per hole is on the par ${widest.par}s,</strong> at ${two(widest.expectedAvg - widest.avg)} shots a hole. Longer holes ask for more full shots, and the long game is where tour players are furthest ahead of club golfers.</li>` : ''}
<li><strong>You cannot see the reason from a scorecard.</strong> These numbers come from hole scores, so they show how much better he was, not which shots did it. To see that for your own game you need each shot, which is what Strokes Gained does.</li>
</ul>`

  const method = `<h2>How this is worked out</h2>
<p>The scores are the official hole by hole results for the ${n} regulation rounds${i.playoff ? ' (playoff holes are left out)' : ''}. The ${LEVEL_NAME} figure is our Strokes Gained baseline from the tee of each hole at its listed yardage, so it changes with the course. The split into off the tee, approach, around the green and putting is not shown, because that needs every shot and only hole scores are public.</p>
<p>Want the same picture of your own golf? The <a href="/quiz">where are you losing shots quiz</a> takes a minute and needs no account, and the <a href="/strokes-gained-calculator">Strokes Gained calculator</a> will score a single hole for you.</p>`

  const title = `${i.winner} won ${i.eventName.replace(/^The /, 'the ')}. Here is that against a 5 to 9 handicap`
  const shortEvent = i.eventName.replace(/^The /, '')
  const metaTitle = `${shortEvent} ${year} winner vs a 5 handicap`.slice(0, 60)
  const excerpt = `${i.winner} won ${i.eventName.replace(/^The /, 'the ')} on ${toParWords(i.toPar)}. His rounds against the field and against a ${LEVEL_NAME}, worked out from every hole score.`

  return {
    title,
    slug: slugFor(i),
    content: [intro, fieldTable, levelTable, scoring, lessons, method].filter(Boolean).join('\n'),
    excerpt,
    metaTitle,
    metaDesc: excerpt,
  }
}

// ─── Feed ────────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Results feed returned ${res.status}`)
  return res.json()
}

const SKIP_EVENT = /q-school|qualifying|pro-am|zurich classic|presidents cup|ryder cup/i

/**
 * The most recent finished stroke play event from the last `withinDays` days,
 * or null when there is none (off season, or the event has not finished).
 */
export async function fetchLatestWinner(now = new Date(), withinDays = 9): Promise<WinnerInput | null> {
  const board = await getJson(FEED)
  const calendar: any[] = board?.leagues?.[0]?.calendar ?? []
  const recent = calendar
    .filter(c => c?.id && c?.endDate && !SKIP_EVENT.test(c.label ?? ''))
    .map(c => ({ id: String(c.id), label: String(c.label), start: new Date(c.startDate), end: new Date(c.endDate) }))
    .filter(c => c.start <= now && now.getTime() - c.end.getTime() <= withinDays * 86400000)
    .sort((a, b) => b.end.getTime() - a.end.getTime())[0]
  if (!recent) return null

  const lb = await getJson(BOARD + recent.id)
  const event = lb?.events?.[0]
  if (!event || event?.status?.type?.name !== 'STATUS_FINAL') return null
  if (event?.tournament?.scoringSystem?.name && event.tournament.scoringSystem.name !== 'Medal') return null
  const winnerId = event?.winner?.id ? String(event.winner.id) : null
  if (!winnerId) return null
  const numRounds: number = event?.tournament?.numberOfRounds ?? 4

  const players: any[] = event?.competitions?.[0]?.competitors ?? []
  const champ = players.find(p => String(p.id) === winnerId)
  if (!champ) return null
  const totalStrokes = Number(champ?.score?.value)
  const toPar = champ?.score?.displayValue === 'E' ? 0 : Number(champ?.score?.displayValue)
  if (!Number.isFinite(totalStrokes) || !Number.isFinite(toPar)) return null
  const second = [...players].filter(p => String(p.id) !== winnerId).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))[0]
  const secondToPar = second?.score?.displayValue === 'E' ? 0 : Number(second?.score?.displayValue)

  const courses: Course[] = (event?.courses ?? []).map((c: any) => ({
    name: String(c.name),
    par: Number(c.shotsToPar),
    yards: Number(c.totalYards),
    host: !!c.host,
    holes: (c.holes ?? []).map((h: any) => ({ number: Number(h.number), par: Number(h.shotsToPar), yards: Number(h.totalYards) })),
  })).filter((c: Course) => c.holes.length === 18)
  if (courses.length === 0) return null

  // Hole by hole scores live on the daily scoreboard, asked for by a date inside the event.
  const day = new Date(recent.end.getTime() - 86400000).toISOString().slice(0, 10).replace(/-/g, '')
  const daily = await getJson(`${FEED}?dates=${day}`)
  const dayEvent = (daily?.events ?? []).find((e: any) => String(e.id) === recent.id)
  const dayPlayers: any[] = dayEvent?.competitions?.[0]?.competitors ?? []

  const roundsOf = (p: any): RoundInput[] =>
    (p?.linescores ?? [])
      .filter((r: any) => Number(r.period) >= 1 && Number(r.period) <= numRounds && Array.isArray(r.linescores) && r.linescores.length === 18)
      .map((r: any) => ({
        round: Number(r.period),
        score: Number(r.value),
        holes: r.linescores.map((h: any) => {
          const score = Number(h.value)
          const rel = h?.scoreType?.displayValue
          const diff = rel === 'E' ? 0 : Number(rel)
          return { number: Number(h.period), score, par: score - diff }
        }),
      }))
      .filter((r: RoundInput) => Number.isFinite(r.score) && r.holes.every(h => Number.isFinite(h.par) && h.par >= 3 && h.par <= 5))

  const champDaily = dayPlayers.find(p => String(p.id) === winnerId)
  const rounds = roundsOf(champDaily).sort((a, b) => a.round - b.round)
  if (rounds.length !== numRounds) return null
  // The hole scores must add up to the official total, or something is off.
  if (rounds.reduce((s, r) => s + r.score, 0) !== totalStrokes) return null
  if (rounds.some(r => r.holes.reduce((s, h) => s + h.score, 0) !== r.score)) return null

  const field = dayPlayers.flatMap(p => roundsOf(p).map(r => ({
    round: r.round,
    pars: [...r.holes].sort((a, b) => a.number - b.number).map(h => h.par),
    score: r.score,
  })))

  return {
    eventId: recent.id,
    eventName: String(event.name ?? recent.label),
    endDate: recent.end.toISOString(),
    winner: String(champ?.athlete?.displayName ?? event.winner.displayName),
    totalStrokes,
    toPar,
    playoff: !!champ?.status?.playoff,
    runnerUp: second?.athlete?.displayName ? String(second.athlete.displayName) : null,
    runnerUpToPar: Number.isFinite(secondToPar) ? secondToPar : null,
    courses,
    rounds,
    field,
  }
}
