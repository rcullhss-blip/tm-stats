/**
 * A golfer's goal: get one part of the game (or the whole game) playing like a
 * chosen handicap by a chosen date. Uses the same "plays like" levels as the
 * Stats page, so the goal and the numbers on screen are always the same thing.
 */

export type GoalMetric = 'total' | 'offTee' | 'approach' | 'aroundGreen' | 'putting'

export const GOAL_LABEL: Record<GoalMetric, string> = {
  total: 'Whole game',
  offTee: 'Driving',
  approach: 'Approach',
  aroundGreen: 'Short game',
  putting: 'Putting',
}

export interface Goal {
  metric: GoalMetric
  target: number          // handicap level to reach (lower is better; negative is a plus handicap)
  by: string              // YYYY-MM-DD
  start: number | null    // level when the goal was set, if there was one
  setAt: string           // YYYY-MM-DD
}

export function parseGoal(raw: unknown): Goal | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Record<string, unknown>
  if (typeof g.metric !== 'string' || !(g.metric in GOAL_LABEL)) return null
  if (typeof g.target !== 'number' || !Number.isFinite(g.target)) return null
  if (typeof g.by !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(g.by)) return null
  return {
    metric: g.metric as GoalMetric,
    target: g.target,
    by: g.by,
    start: typeof g.start === 'number' && Number.isFinite(g.start) ? g.start : null,
    setAt: typeof g.setAt === 'string' ? g.setAt : g.by,
  }
}

/** Check a goal being set. Returns a message, or null when it is fine. */
export function validateGoal(input: { metric?: unknown; target?: unknown; by?: unknown }, today: string): string | null {
  if (typeof input.metric !== 'string' || !(input.metric in GOAL_LABEL)) return 'Pick which part of your game the goal is for'
  if (typeof input.target !== 'number' || !Number.isFinite(input.target) || input.target < -6 || input.target > 36) return 'The target must be a handicap between +6 and 36'
  if (typeof input.by !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.by)) return 'Pick a date'
  if (input.by <= today) return 'Pick a date in the future'
  const max = new Date(`${today}T00:00:00Z`)
  max.setUTCFullYear(max.getUTCFullYear() + 2)
  if (input.by > max.toISOString().slice(0, 10)) return 'Pick a date within the next two years'
  return null
}

export interface GoalProgress {
  status: 'reached' | 'on_track' | 'behind' | 'no_data' | 'expired'
  // 0 to 1: how much of the gap from the starting level to the target is closed
  fraction: number | null
  daysLeft: number
  // Levels still to find, e.g. 2.4 (0 when reached)
  toGo: number | null
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000)
}

/**
 * Where the golfer is against the goal. "On track" means the share of the gap
 * closed is at least the share of the time used.
 */
export function goalProgress(goal: Goal, current: number | null, today: string): GoalProgress {
  const daysLeft = daysBetween(today, goal.by)
  if (current === null) return { status: daysLeft < 0 ? 'expired' : 'no_data', fraction: null, daysLeft, toGo: null }
  if (current <= goal.target) return { status: 'reached', fraction: 1, daysLeft, toGo: 0 }
  const toGo = Math.round((current - goal.target) * 10) / 10
  if (daysLeft < 0) return { status: 'expired', fraction: null, daysLeft, toGo }
  if (goal.start === null || goal.start <= goal.target) return { status: 'behind', fraction: 0, daysLeft, toGo }
  const fraction = Math.max(0, Math.min(1, (goal.start - current) / (goal.start - goal.target)))
  const total = Math.max(1, daysBetween(goal.setAt, goal.by))
  const timeUsed = Math.max(0, Math.min(1, (total - daysLeft) / total))
  return { status: fraction >= timeUsed ? 'on_track' : 'behind', fraction, daysLeft, toGo }
}
