/**
 * Travel team selection: every qualifying and tournament round for a squad,
 * filtered and ranked the way a college coach picks a travel team.
 * Plain data in, plain data out.
 */

export interface SelectionRound {
  key: string            // `${qualifierId}:${roundNo}:${userId}`, the id used to leave a round out
  userId: string
  qualifierId: string
  event: string
  kind: 'qualifying' | 'tournament'
  roundNo: number
  date: string           // YYYY-MM-DD
  course: string
  par: number
  score: number
  toPar: number
  sg: number | null      // Strokes Gained v scratch, when the player added full stats
}

export interface SelectionFilters {
  from: string | null
  to: string | null
  kind: 'all' | 'qualifying' | 'tournament'
  events: string[] | null          // qualifier ids to include; null = all
  bestOf: { best: number; of: number } | null   // e.g. best 4 of the last 6
}

export interface SelectionSaved {
  excluded: string[]
  squad: string[]
  notes: Record<string, string>
}

export interface PlayerStanding {
  userId: string
  name: string
  counted: SelectionRound[]        // the rounds that make up the average
  available: number                // rounds that passed the filters before best-of
  avgToPar: number | null
  avgScore: number | null
  best: number | null              // best to par among counted
  worst: number | null
  sgAvg: number | null             // average SG v scratch over counted rounds that have it
  sgRounds: number
  position: number | null
}

export function parseSaved(raw: unknown): SelectionSaved {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 5000) : [])
  const notes: Record<string, string> = {}
  if (r.notes && typeof r.notes === 'object') {
    for (const [k, v] of Object.entries(r.notes as Record<string, unknown>)) if (typeof v === 'string' && v.trim()) notes[k] = v.slice(0, 300)
  }
  return { excluded: strs(r.excluded), squad: strs(r.squad), notes }
}

export function passesFilters(r: SelectionRound, f: SelectionFilters): boolean {
  if (f.from && r.date < f.from) return false
  if (f.to && r.date > f.to) return false
  if (f.kind !== 'all' && r.kind !== f.kind) return false
  if (f.events && !f.events.includes(r.qualifierId)) return false
  return true
}

const avg = (xs: number[]) => (xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
const r1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10)

/**
 * Rank the squad. Rounds left out by the coach never count. With a best-of
 * rule, each player's most recent `of` rounds are taken and the `best` lowest
 * of those count. Players with no counted rounds go to the bottom.
 */
export function rankSquad(
  players: { id: string; name: string }[],
  rounds: SelectionRound[],
  filters: SelectionFilters,
  excluded: Set<string>,
): PlayerStanding[] {
  const out: PlayerStanding[] = players.map(p => {
    const mine = rounds
      .filter(r => r.userId === p.id && !excluded.has(r.key) && passesFilters(r, filters))
      .sort((a, b) => b.date.localeCompare(a.date) || b.roundNo - a.roundNo)
    let counted = mine
    if (filters.bestOf && filters.bestOf.best > 0 && filters.bestOf.of > 0) {
      counted = [...mine.slice(0, filters.bestOf.of)].sort((a, b) => a.toPar - b.toPar).slice(0, filters.bestOf.best)
    }
    const sgs = counted.map(r => r.sg).filter((x): x is number => x !== null)
    return {
      userId: p.id,
      name: p.name,
      counted,
      available: mine.length,
      avgToPar: r1(avg(counted.map(r => r.toPar))),
      avgScore: r1(avg(counted.map(r => r.score))),
      best: counted.length ? Math.min(...counted.map(r => r.toPar)) : null,
      worst: counted.length ? Math.max(...counted.map(r => r.toPar)) : null,
      sgAvg: r1(avg(sgs)),
      sgRounds: sgs.length,
      position: null,
    }
  })
  out.sort((a, b) => {
    if (a.avgToPar === null && b.avgToPar === null) return a.name.localeCompare(b.name)
    if (a.avgToPar === null) return 1
    if (b.avgToPar === null) return -1
    return a.avgToPar - b.avgToPar || b.counted.length - a.counted.length || a.name.localeCompare(b.name)
  })
  let pos = 0
  out.forEach((s, i) => {
    if (s.avgToPar === null) return
    if (i === 0 || s.avgToPar !== out[i - 1].avgToPar) pos = i + 1
    s.position = pos
  })
  return out
}

/** The ranked table as a spreadsheet file (CSV), one row per player. */
export function standingsCsv(standings: PlayerStanding[], squad: Set<string>, notes: Record<string, string>): string {
  const esc = (v: string | number | null) => {
    const t = v === null ? '' : String(v)
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const lines = [['Position', 'Player', 'Travel squad', 'Rounds counted', 'Average score', 'Average to par', 'Best to par', 'Worst to par', 'SG v scratch', 'Rounds', 'Note'].join(',')]
  for (const s of standings) {
    lines.push([
      s.position, s.name, squad.has(s.userId) ? 'Yes' : '', s.counted.length, s.avgScore, s.avgToPar, s.best, s.worst, s.sgAvg,
      s.counted.map(r => `${r.event}${r.roundNo > 1 ? ` R${r.roundNo}` : ''} ${r.date}: ${r.score}`).join('; '),
      notes[s.userId] ?? '',
    ].map(esc).join(','))
  }
  return lines.join('\n') + '\n'
}
