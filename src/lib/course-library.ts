// Course library: a shared, crowd-sourced list of courses and tees, built up
// from the rounds golfers save. Pure helpers only (no imports) so they can be
// unit tested with node --test and used on both the phone and the server.
//
// IMPORTANT: courseNameKey must stay in step with public.course_name_key() in
// PASTE_INTO_SUPABASE_course_library.sql, which the one-off seed uses.

export const MAX_HOLES = 18

// Words dropped from the END of a course name before matching, so
// "Macclesfield Golf Club", "Macclesfield GC" and "Macclesfield" all match.
const SUFFIX = /( (golf|club|gc|course|cc|country|and))+$/

/** Lower case, "&" to "and", dots and apostrophes dropped, other punctuation to spaces. */
function cleanName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.'’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** The matching key for a course name: "The Royal Liverpool G.C." → "royal liverpool". */
export function courseNameKey(name: string): string {
  const cleaned = cleanName(name)
  // The leading space lets a name made only of suffix words ("Golf Club") strip to nothing and fall back
  const stripped = (' ' + cleaned.replace(/^the /, '')).replace(SUFFIX, '').trim()
  return stripped || cleaned
}

/** The matching key for a tee: "White tees" → "white". Blank means "tee not given". */
export function teeKey(tee: string | null | undefined): string {
  return cleanName(tee ?? '').replace(/ tees?$/, '').replace(/^tees?$/, '').trim()
}

/** A tidy label for a tee the golfer typed: "  white tees " → "White". */
export function teeLabel(tee: string | null | undefined): string {
  const key = teeKey(tee)
  return key.replace(/\b[a-z]/g, c => c.toUpperCase())
}

export type HoleValues = (number | null)[]

function at(values: HoleValues | null | undefined, i: number): number | null {
  const v = values?.[i]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * Merge what a golfer just entered into what the library already holds.
 * A new value fills a gap or replaces an old one (most recent wins); a blank
 * never wipes out a value that is already there. Always 18 slots long.
 */
export function mergeHoleValues(existing: HoleValues | null | undefined, incoming: HoleValues | null | undefined): HoleValues {
  return Array.from({ length: MAX_HOLES }, (_, i) => at(incoming, i) ?? at(existing, i))
}

/** Votes per hole for a par that differs from the stored one, e.g. [{ "5": 2 }, {}, ...]. */
export type ParVotes = Record<string, number>[]

/** How many rounds must report the same different par before a stored par changes. */
export const PAR_CHANGE_VOTES = 3

/**
 * Pars use a stricter rule than yardages: a blank hole takes the first par anyone
 * gives, but a par already on the card only changes once PAR_CHANGE_VOTES rounds
 * have reported the same different value. One mistyped scorecard can't spoil it.
 */
export function mergePars(
  existing: HoleValues | null | undefined,
  votes: ParVotes | null | undefined,
  incoming: HoleValues | null | undefined,
): { pars: HoleValues; votes: ParVotes } {
  const pars: HoleValues = []
  const outVotes: ParVotes = []
  for (let i = 0; i < MAX_HOLES; i++) {
    const cur = at(existing, i)
    const inc = at(incoming, i)
    const v: Record<string, number> = { ...((Array.isArray(votes) && votes[i] && typeof votes[i] === 'object') ? votes[i] : {}) }
    let par = cur
    if (inc !== null) {
      if (cur === null) { par = inc; for (const k of Object.keys(v)) delete v[k] }
      else if (inc !== cur) {
        v[String(inc)] = (v[String(inc)] ?? 0) + 1
        if (v[String(inc)] >= PAR_CHANGE_VOTES) { par = inc; for (const k of Object.keys(v)) delete v[k] }
      }
    }
    pars.push(par)
    outVotes.push(v)
  }
  return { pars, votes: outVotes }
}

/** True when merging would change nothing, so the save can be skipped. */
export function sameHoleValues(a: HoleValues | null | undefined, b: HoleValues | null | undefined): boolean {
  for (let i = 0; i < MAX_HOLES; i++) if (at(a, i) !== at(b, i)) return false
  return true
}

/** A sensible par (3, 4 or 5), or null. */
export function validPar(v: unknown): 3 | 4 | 5 | null {
  return v === 3 || v === 4 || v === 5 ? v : null
}

/** A sensible tee-shot yardage, or null. */
export function validYards(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 50 && v <= 700 ? Math.round(v) : null
}

/** A stroke index between 1 and 18, or null. */
export function validStrokeIndex(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 18 ? v : null
}

/** The hole's yardage from shot-by-shot data: the first shot, if it was played from the tee. */
export function yardsFromShots(shots: unknown): number | null {
  if (!Array.isArray(shots) || shots.length === 0) return null
  const first = shots[0] as { lieType?: unknown; distanceToPin?: unknown } | null
  return first && first.lieType === 'tee' ? validYards(first.distanceToPin) : null
}

export interface LibraryTee {
  tee: string
  pars: HoleValues | null
  yards: HoleValues | null
  stroke_index: HoleValues | null
}

export interface Prefill {
  pars?: (3 | 4 | 5)[]
  yards?: (number | null)[]
  strokeIndex?: (number | null)[]
}

/**
 * Work out what to pre-fill for each hole, best source first:
 *  1. the library card for the tee the golfer picked
 *  2. the golfer's own last round at this course
 *  3. pars only, from any other tee in the library
 * Holes with no known par fall back to 4, as today. Returns nothing at all
 * when no source knows anything, so a brand new course works exactly as before.
 */
export function buildPrefill(
  holes: number,
  chosen: LibraryTee | null,
  otherTees: LibraryTee[],
  ownPars?: (number | null)[],
  ownYards?: (number | null)[],
): Prefill {
  const n = Math.min(holes, MAX_HOLES)
  const pars: (3 | 4 | 5 | null)[] = []
  const yards: (number | null)[] = []
  const si: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    let par = validPar(chosen?.pars?.[i]) ?? validPar(ownPars?.[i])
    if (par === null) for (const t of otherTees) { par = validPar(t.pars?.[i]); if (par !== null) break }
    pars.push(par)
    yards.push(validYards(chosen?.yards?.[i]) ?? validYards(ownYards?.[i]))
    si.push(validStrokeIndex(chosen?.stroke_index?.[i]))
  }
  const out: Prefill = {}
  if (pars.some(p => p !== null)) out.pars = pars.map(p => p ?? 4)
  if (yards.some(y => y !== null)) out.yards = yards
  if (si.some(s => s !== null)) out.strokeIndex = si
  return out
}
