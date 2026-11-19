/**
 * Uploaded tournament results: what comes back from reading the file, matching
 * the names in it to the squad, and checking it before anything is created.
 * Plain data in, plain data out.
 */

import type { Par } from './qualifying'

export interface ParsedPlayer {
  name: string
  team: string
  // One entry per round the player has in the result
  rounds: { round_no: number; scores: number[]; total: number }[]
}

export interface ParsedResult {
  event_name: string
  course_name: string
  holes: number                 // 9 or 18
  pars: number[]                // one per hole, or empty when the file does not show them
  round_count: number
  dates: string[]               // YYYY-MM-DD per round, '' when the file does not show one
  players: ParsedPlayer[]
  notes: string
}

// The shape the model must return. Kept flat and strict.
export const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    event_name: { type: 'string', description: 'Tournament or event name as printed' },
    course_name: { type: 'string', description: 'Course name as printed, empty if not shown' },
    holes: { type: 'integer', description: '18, or 9 for a nine hole event' },
    pars: { type: 'array', items: { type: 'integer' }, description: 'Par of each hole in order. Empty if the file has no hole-by-hole pars.' },
    round_count: { type: 'integer', description: 'How many rounds the event had' },
    dates: { type: 'array', items: { type: 'string' }, description: 'Date of each round as YYYY-MM-DD, empty string where not shown' },
    players: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Player name as "First Last"' },
          team: { type: 'string', description: 'School or team, empty if not shown' },
          rounds: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                round_no: { type: 'integer' },
                scores: { type: 'array', items: { type: 'integer' }, description: 'Score on each hole in order. Empty if only a round total is shown.' },
                total: { type: 'integer', description: 'Round total as printed, 0 if not shown' },
              },
              required: ['round_no', 'scores', 'total'],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'team', 'rounds'],
        additionalProperties: false,
      },
    },
    notes: { type: 'string', description: 'Anything the coach should know: unreadable parts, players without hole scores, withdrawals.' },
  },
  required: ['event_name', 'course_name', 'holes', 'pars', 'round_count', 'dates', 'players', 'notes'],
  additionalProperties: false,
} as const

/** Tidy whatever came back into something safe to show and act on. */
export function cleanParsed(raw: unknown): ParsedResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const holes = r.holes === 9 ? 9 : 18
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const ints = (v: unknown) => (Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isInteger(n)) : [])
  const pars = ints(r.pars)
  const roundCount = typeof r.round_count === 'number' && r.round_count >= 1 && r.round_count <= 6 ? Math.floor(r.round_count) : 1
  const players: ParsedPlayer[] = (Array.isArray(r.players) ? r.players : []).map(p => {
    const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>
    return {
      name: str(o.name, 80),
      team: str(o.team, 80),
      rounds: (Array.isArray(o.rounds) ? o.rounds : []).map(rd => {
        const q = (rd && typeof rd === 'object' ? rd : {}) as Record<string, unknown>
        return { round_no: typeof q.round_no === 'number' ? Math.floor(q.round_no) : 0, scores: ints(q.scores), total: typeof q.total === 'number' ? Math.floor(q.total) : 0 }
      }).filter(rd => rd.round_no >= 1 && rd.round_no <= roundCount),
    }
  }).filter(p => p.name)
  return {
    event_name: str(r.event_name, 80),
    course_name: str(r.course_name, 120),
    holes,
    pars: pars.length === holes && pars.every(p => p === 3 || p === 4 || p === 5) ? pars : [],
    round_count: roundCount,
    dates: Array.from({ length: roundCount }, (_, i) => {
      const d = Array.isArray(r.dates) ? r.dates[i] : ''
      return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ''
    }),
    players,
    notes: str(r.notes, 600),
  }
}

/** A round can be turned into a player's round only with a full, believable hole-by-hole card. */
export function usableCard(scores: number[], holes: number): boolean {
  return scores.length === holes && scores.every(s => Number.isInteger(s) && s >= 1 && s <= 15)
}

function nameTokens(name: string): string[] {
  // "Murphy, Cole T." and "Cole Murphy" should meet in the middle
  return name
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z\s,'-]/g, ' ').replace(/[,'-]/g, ' ')
    .split(/\s+/).filter(t => t.length > 1)
}

/** 0 to 1: how alike two names are, whatever order the parts are in. */
export function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a), tb = nameTokens(b)
  if (ta.length === 0 || tb.length === 0) return 0
  let hits = 0
  const used = new Set<number>()
  for (const t of ta) {
    const i = tb.findIndex((u, idx) => !used.has(idx) && (u === t || (t.length >= 3 && u.length >= 3 && (u.startsWith(t) || t.startsWith(u)))))
    if (i !== -1) { used.add(i); hits++ }
  }
  return hits / Math.max(ta.length, tb.length)
}

/**
 * Match each name in the file to a player on the squad. A squad player is used
 * at most once, best matches first, and only clear matches count: a wrong
 * match would put one golfer's scores in another's account.
 */
export function matchRoster(parsedNames: string[], roster: { id: string; name: string }[]): (string | null)[] {
  const pairs: { p: number; id: string; score: number }[] = []
  parsedNames.forEach((name, p) => {
    for (const r of roster) {
      const score = nameSimilarity(name, r.name)
      if (score >= 0.6) pairs.push({ p, id: r.id, score })
    }
  })
  pairs.sort((a, b) => b.score - a.score)
  const out: (string | null)[] = parsedNames.map(() => null)
  const taken = new Set<string>()
  for (const pair of pairs) {
    if (out[pair.p] !== null || taken.has(pair.id)) continue
    out[pair.p] = pair.id
    taken.add(pair.id)
  }
  return out
}

export interface ImportInput {
  name?: unknown
  courseName?: unknown
  holes?: unknown
  pars?: unknown
  dates?: unknown
  players?: unknown
}

// rounds: a hole-by-hole card, or null. totals: the round total where there is
// no card (the player fills in the holes later), or null.
export interface ImportPlayer { userId: string; rounds: (number[] | null)[]; totals: (number | null)[] }

/** A believable round total for this many holes. */
export function usableTotal(total: unknown, holes: number): total is number {
  return typeof total === 'number' && Number.isInteger(total) && total >= holes * 2 && total <= holes * 9
}

/** Check what the coach confirmed. Returns a message, or the cleaned import. */
export function validateImport(input: ImportInput): { error: string } | { name: string; courseName: string; holes: 9 | 18; pars: Par[]; dates: string[]; players: ImportPlayer[] } {
  if (typeof input.name !== 'string' || !input.name.trim()) return { error: 'Give the event a name' }
  if (typeof input.courseName !== 'string' || !input.courseName.trim()) return { error: 'Add the course' }
  if (input.holes !== 9 && input.holes !== 18) return { error: 'Holes must be 9 or 18' }
  const holes = input.holes
  if (!Array.isArray(input.pars) || input.pars.length !== holes || input.pars.some(p => p !== 3 && p !== 4 && p !== 5)) return { error: 'Every hole needs a par of 3, 4 or 5' }
  if (!Array.isArray(input.dates) || input.dates.length < 1 || input.dates.length > 6 || input.dates.some(d => typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d))) return { error: 'Every round needs a date' }
  const roundCount = input.dates.length
  if (!Array.isArray(input.players) || input.players.length === 0) return { error: 'Match at least one player to your squad' }

  const seen = new Set<string>()
  const players: ImportPlayer[] = []
  for (const raw of input.players) {
    const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    if (typeof p.userId !== 'string' || !p.userId) return { error: 'A player is missing who they are on your squad' }
    if (seen.has(p.userId)) return { error: 'The same squad player is matched to two names in the result' }
    seen.add(p.userId)
    const rounds = Array.from({ length: roundCount }, (_, i) => {
      const card = Array.isArray(p.rounds) ? p.rounds[i] : null
      return Array.isArray(card) && usableCard(card as number[], holes) ? (card as number[]) : null
    })
    const totals = Array.from({ length: roundCount }, (_, i) => {
      if (rounds[i]) return null
      const t = Array.isArray(p.totals) ? p.totals[i] : null
      return usableTotal(t, holes) ? t : null
    })
    if (rounds.every(r => r === null) && totals.every(t => t === null)) continue
    players.push({ userId: p.userId, rounds, totals })
  }
  if (players.length === 0) return { error: 'None of the matched players has a score to bring in' }
  return { name: input.name.trim().slice(0, 80), courseName: input.courseName.trim().slice(0, 120), holes, pars: input.pars as Par[], dates: input.dates as string[], players }
}
