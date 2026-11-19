// Weekly team reminder key. On its own so it can be tested without the email templates.

/** email_log key for a team nudge: one per ISO week, e.g. team_nudge_2026w47. */
export function teamNudgeKey(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `team_nudge_${t.getUTCFullYear()}w${String(week).padStart(2, '0')}`
}
