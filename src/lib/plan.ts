/**
 * Plan helpers. One place to answer "what does this account get?".
 *
 * subscription_status values: 'free' | 'pro' | 'elite' | 'team'
 *   pro   – unlimited rounds, Strokes Gained on every round, AI coaching
 *   elite – everything in Pro plus advanced shot input and the deep breakdown
 *   team  – coach accounts; they see everything
 */

export type Plan = 'free' | 'pro' | 'elite' | 'team'

export function planOf(status: string | null | undefined): Plan {
  if (status === 'pro' || status === 'elite' || status === 'team') return status
  return 'free'
}

/** Pro features: true for Pro, Elite and coach accounts. */
export function hasPro(status: string | null | undefined): boolean {
  return planOf(status) !== 'free'
}

/** Elite features: true for Elite and coach accounts. */
export function hasElite(status: string | null | undefined): boolean {
  const plan = planOf(status)
  return plan === 'elite' || plan === 'team'
}

export const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  elite: 'Elite',
  team: 'Coach',
}

export const PRICES = {
  pro: { monthly: '£4.99', yearly: '£50' },
  elite: { monthly: '£8.99', yearly: '£85' },
} as const
