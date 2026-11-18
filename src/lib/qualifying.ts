/**
 * Qualifying and live scoring.
 *
 * A coach sets up a qualifier (course, pars, players, one or more rounds).
 * Scores go in hole by hole from anyone on the team. When the coach finishes a
 * round, every player with a full card gets that round in their own account
 * with pars and scores filled in, flagged stats_pending until they add stats.
 *
 * Everything here is plain data in, plain data out, so it can be tested
 * without a database.
 */

export type Par = 3 | 4 | 5

export interface Qualifier {
  id: string
  team_id: string
  kind: 'qualifying' | 'tournament'
  name: string
  course_name: string
  holes: number
  pars: Par[]
  round_count: number
  round_dates: string[]
  rounds_finished: number
  created_by: string | null
  created_at: string
}

export interface QualifierScoreRow {
  qualifier_id: string
  round_no: number
  user_id: string
  scores: (number | null)[]
  round_id: string | null
}

export interface BoardRow {
  userId: string
  name: string
  // One entry per round of the qualifier
  rounds: {
    roundNo: number
    scores: (number | null)[]
    thru: number            // holes with a score
    strokes: number         // total of the holes played
    toPar: number           // against par for the holes played
    complete: boolean
    roundId: string | null  // the golfer's own round, once finished
  }[]
  thru: number              // holes played in the round currently open (or the last one)
  holesPlayed: number       // across all rounds
  toPar: number | null      // across all rounds; null when nothing is in yet
  strokes: number
  position: string          // "1", "T2", "-" when no score yet
}

/** A blank card for a qualifier of this many holes. */
export function blankCard(holes: number): (number | null)[] {
  return Array.from({ length: holes }, () => null)
}

/** Force a stored card to the right length and to whole strokes between 1 and 15. */
export function cleanCard(raw: unknown, holes: number): (number | null)[] {
  const list = Array.isArray(raw) ? raw : []
  return Array.from({ length: holes }, (_, i) => {
    const v = list[i]
    return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 15 ? v : null
  })
}

/** The round scores are being entered for now: the first one not yet finished. */
export function currentRound(q: Pick<Qualifier, 'round_count' | 'rounds_finished'>): number {
  return Math.min(q.rounds_finished + 1, q.round_count)
}

export function isFinished(q: Pick<Qualifier, 'round_count' | 'rounds_finished'>): boolean {
  return q.rounds_finished >= q.round_count
}

/**
 * The leaderboard: lowest to par first across every round entered. Players
 * with no score yet go to the bottom in name order.
 */
export function buildBoard(
  q: Pick<Qualifier, 'holes' | 'pars' | 'round_count' | 'rounds_finished'>,
  players: { id: string; name: string }[],
  scoreRows: QualifierScoreRow[],
): BoardRow[] {
  const open = currentRound(q)
  const rows: BoardRow[] = players.map(p => {
    const rounds = Array.from({ length: q.round_count }, (_, i) => {
      const roundNo = i + 1
      const row = scoreRows.find(s => s.user_id === p.id && s.round_no === roundNo)
      const scores = cleanCard(row?.scores, q.holes)
      let thru = 0, strokes = 0, toPar = 0
      scores.forEach((s, h) => {
        if (s === null) return
        thru++
        strokes += s
        toPar += s - (q.pars[h] ?? 4)
      })
      return { roundNo, scores, thru, strokes, toPar, complete: thru === q.holes, roundId: row?.round_id ?? null }
    })
    const holesPlayed = rounds.reduce((n, r) => n + r.thru, 0)
    return {
      userId: p.id,
      name: p.name,
      rounds,
      thru: rounds[open - 1]?.thru ?? 0,
      holesPlayed,
      toPar: holesPlayed > 0 ? rounds.reduce((n, r) => n + r.toPar, 0) : null,
      strokes: rounds.reduce((n, r) => n + r.strokes, 0),
      position: '-',
    }
  })

  rows.sort((a, b) => {
    if (a.toPar === null && b.toPar === null) return a.name.localeCompare(b.name)
    if (a.toPar === null) return 1
    if (b.toPar === null) return -1
    return a.toPar - b.toPar || b.holesPlayed - a.holesPlayed || a.name.localeCompare(b.name)
  })

  // Positions: tied players share a number with a T
  const scored = rows.filter(r => r.toPar !== null)
  scored.forEach((r, i) => {
    const firstWithScore = scored.findIndex(x => x.toPar === r.toPar)
    const tied = scored.filter(x => x.toPar === r.toPar).length > 1
    r.position = `${tied ? 'T' : ''}${firstWithScore + 1}`
    void i
  })
  return rows
}

export function fmtToPar(n: number | null): string {
  if (n === null) return '-'
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

/** Check a qualifier a coach is setting up. Returns a message, or null when it is fine. */
export function validateSetup(input: {
  name?: unknown; courseName?: unknown; holes?: unknown; pars?: unknown; roundCount?: unknown; playerIds?: unknown; dates?: unknown
}): string | null {
  if (typeof input.name !== 'string' || !input.name.trim()) return 'Give the qualifier a name'
  if (typeof input.courseName !== 'string' || !input.courseName.trim()) return 'Add the course'
  if (input.holes !== 9 && input.holes !== 18) return 'Holes must be 9 or 18'
  if (!Array.isArray(input.pars) || input.pars.length !== input.holes || input.pars.some(p => p !== 3 && p !== 4 && p !== 5)) {
    return 'Every hole needs a par of 3, 4 or 5'
  }
  if (typeof input.roundCount !== 'number' || !Number.isInteger(input.roundCount) || input.roundCount < 1 || input.roundCount > 6) {
    return 'Rounds must be between 1 and 6'
  }
  if (!Array.isArray(input.playerIds) || input.playerIds.length === 0) return 'Pick at least one player'
  if (!Array.isArray(input.dates) || input.dates.length !== input.roundCount || input.dates.some(d => typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
    return 'Every round needs a date'
  }
  return null
}
