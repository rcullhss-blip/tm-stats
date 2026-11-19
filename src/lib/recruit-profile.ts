/**
 * Recruiting profile: one link a golfer sends to college coaches. It shows
 * scoring, recent rounds and the handicap each part of their game plays like.
 * Off until the golfer switches it on.
 */

export interface ProfileInfo {
  gradYear: number | null     // year they would start college
  homeClub: string | null
  bio: string | null
  contact: string | null      // how a coach should get in touch (agency, coach, email)
  showPractice: boolean       // include practice rounds (on unless the golfer turns it off)
  hiddenRounds: string[]      // round ids the golfer has chosen to leave off the page
}

export function parseProfileInfo(raw: unknown): ProfileInfo {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
  const year = typeof r.gradYear === 'number' && Number.isInteger(r.gradYear) && r.gradYear >= 2024 && r.gradYear <= 2040 ? r.gradYear : null
  const hidden = Array.isArray(r.hiddenRounds) ? r.hiddenRounds.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 200) : []
  return { gradYear: year, homeClub: text(r.homeClub, 80), bio: text(r.bio, 400), contact: text(r.contact, 120), showPractice: r.showPractice !== false, hiddenRounds: [...new Set(hidden)] }
}

/** Should this round appear on the golfer's recruiting page? */
export function roundShown(info: Pick<ProfileInfo, 'showPractice' | 'hiddenRounds'>, round: { id: string; round_type: string }): boolean {
  if (info.hiddenRounds.includes(round.id)) return false
  if (!info.showPractice && round.round_type === 'practice') return false
  return true
}

/** "Sam O'Neil-Jones" -> "sam-oneil-jones". Empty for a name with no letters. */
export function slugBase(name: string | null | undefined): string {
  return (name ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** A profile address: the name plus four characters, so two Sam Joneses do not clash and it cannot be guessed. */
export function makeSlug(name: string | null | undefined, random: () => number = Math.random): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let tail = ''
  for (let i = 0; i < 4; i++) tail += chars[Math.floor(random() * chars.length)]
  const base = slugBase(name) || 'golfer'
  return `${base}-${tail}`
}

export interface ProfileRound {
  date: string
  course: string
  holes: number
  score: number
  toPar: number
  type: string
  teamScored: boolean   // entered hole by hole during team qualifying, not typed in afterwards by the golfer
}

export interface ScoringSummary {
  rounds: number
  avgScore: number | null
  avgToPar: number | null
  best: { score: number; toPar: number; course: string; date: string } | null
  competitionRounds: number
  competitionAvgToPar: number | null
}

/** Scoring over the golfer's last 10 complete 18 hole rounds. */
export function scoringSummary(rounds: ProfileRound[]): ScoringSummary {
  const full = rounds.filter(r => r.holes === 18).slice(0, 10)
  const avg = (list: ProfileRound[], pick: (r: ProfileRound) => number) =>
    list.length > 0 ? Math.round((list.reduce((s, r) => s + pick(r), 0) / list.length) * 10) / 10 : null
  const comp = full.filter(r => r.type === 'competition' || r.type === 'tournament')
  const bestRound = [...full].sort((a, b) => a.toPar - b.toPar || a.score - b.score)[0]
  return {
    rounds: full.length,
    avgScore: avg(full, r => r.score),
    avgToPar: avg(full, r => r.toPar),
    best: bestRound ? { score: bestRound.score, toPar: bestRound.toPar, course: bestRound.course, date: bestRound.date } : null,
    competitionRounds: comp.length,
    competitionAvgToPar: avg(comp, r => r.toPar),
  }
}
