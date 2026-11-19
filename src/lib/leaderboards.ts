/**
 * Leaderboards beyond the squad: college teams against each other, and golfers
 * in the same place. Plain data in, plain data out.
 *
 * A board only shows once it has enough on it to mean something. An empty or
 * three-name "worldwide" board would make the app look deserted and would put
 * a golfer's name on show to no purpose.
 */

export const MIN_TEAMS_FOR_COLLEGE_BOARD = 3
export const MIN_PLAYERS_PER_TEAM = 3
export const MIN_GOLFERS_FOR_AREA_BOARD = 20

export interface TeamStanding {
  teamId: string
  name: string
  players: number          // players with a scored round in the window
  avgToPar: number         // average of each counted player's scoring average
  rounds: number
}

export interface PlayerForm {
  userId: string
  teamId: string
  avgToPar: number | null  // last 5 scored 18-hole rounds in the window
  rounds: number
}

/**
 * Teams ranked by scoring. A team counts once three of its players have a
 * scored round in the window; its number is the average of its best four
 * players' scoring averages (the way a college team counts four cards), or
 * all of them when it has fewer than four.
 */
export function collegeStandings(teams: { id: string; name: string }[], players: PlayerForm[]): TeamStanding[] {
  const out: TeamStanding[] = []
  for (const t of teams) {
    const scored = players.filter(p => p.teamId === t.id && p.avgToPar !== null).sort((a, b) => a.avgToPar! - b.avgToPar!)
    if (scored.length < MIN_PLAYERS_PER_TEAM) continue
    const counting = scored.slice(0, 4)
    out.push({
      teamId: t.id,
      name: t.name,
      players: scored.length,
      avgToPar: Math.round((counting.reduce((s, p) => s + p.avgToPar!, 0) / counting.length) * 10) / 10,
      rounds: scored.reduce((s, p) => s + p.rounds, 0),
    })
  }
  return out.sort((a, b) => a.avgToPar - b.avgToPar || a.name.localeCompare(b.name))
}

export interface AreaGolfer {
  userId: string
  name: string
  level: number            // handicap their recent full tracking rounds played like
  rounds: number
}

/** "Sam J." — a first name and an initial is enough on a public board. */
export function boardName(name: string | null | undefined, fallback = 'Golfer'): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

/** Two places typed slightly differently are the same place: "cheshire " and "Cheshire". */
export function placeKey(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function tidyPlace(s: string | null | undefined): string | null {
  const t = (s ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)
  if (!t) return null
  return t.split(' ').map(w => (w.length > 2 || w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')
}

/** Best first. Lower handicap level is better. */
export function rankArea(golfers: AreaGolfer[]): (AreaGolfer & { position: number })[] {
  return [...golfers]
    .sort((a, b) => a.level - b.level || b.rounds - a.rounds || a.name.localeCompare(b.name))
    .map((g, i) => ({ ...g, position: i + 1 }))
}
