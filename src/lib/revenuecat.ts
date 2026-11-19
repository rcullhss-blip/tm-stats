import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe'

/**
 * Apple in-app subscriptions through RevenueCat. The RevenueCat app user id is
 * the TM Stats user id. Entitlements 'elite' and 'pro' map to the plans.
 */

export type IapPlan = 'elite' | 'pro' | null

export function planFromEntitlements(active: string[]): IapPlan {
  if (active.includes('elite')) return 'elite'
  if (active.includes('pro')) return 'pro'
  return null
}

/** Does this golfer still pay by card (Stripe)? Then losing Apple access must not downgrade them. */
async function stripeActive(customerId: string | null): Promise<boolean> {
  if (!customerId || !process.env.STRIPE_SECRET_KEY) return false
  try {
    const subs = await getStripe().subscriptions.list({ customer: customerId, status: 'active', limit: 3 })
    return subs.data.length > 0
  } catch { return true } // unsure: do not downgrade
}

/**
 * Set a golfer's plan from their Apple subscription. Never touches coach
 * accounts; never takes away a plan paid by card or a team year of Pro.
 */
export async function applyIapPlan(userId: string, plan: IapPlan): Promise<'updated' | 'unchanged' | 'kept'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any
  const { data: me } = await sb.from('users').select('subscription_status, promo_expires_at, stripe_customer_id').eq('id', userId).maybeSingle()
  if (!me) return 'unchanged'
  const status = me.subscription_status ?? 'free'
  if (status === 'team') return 'kept'
  if (plan) {
    if (status === plan && !me.promo_expires_at) return 'unchanged'
    // Elite always wins; Pro does not replace Elite paid another way
    if (status === 'elite' && plan === 'pro' && (await stripeActive(me.stripe_customer_id))) return 'kept'
    await sb.from('users').update({ subscription_status: plan, promo_expires_at: null }).eq('id', userId)
    return 'updated'
  }
  // Apple subscription ended
  if (status === 'free') return 'unchanged'
  if (me.promo_expires_at && new Date(me.promo_expires_at) > new Date()) return 'kept'  // team year or promo still running
  if (await stripeActive(me.stripe_customer_id)) return 'kept'
  await sb.from('users').update({ subscription_status: 'free' }).eq('id', userId)
  return 'updated'
}

/** Ask RevenueCat what this golfer has right now. Null when RevenueCat is not set up or unreachable. */
export async function fetchIapPlan(userId: string): Promise<{ plan: IapPlan } | null> {
  const key = process.env.REVENUECAT_SECRET_KEY
  if (!key) return null
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const ents = data?.subscriber?.entitlements ?? {}
    const now = Date.now()
    const active = Object.entries(ents as Record<string, { expires_date: string | null }>)
      .filter(([, e]) => e.expires_date === null || new Date(e.expires_date).getTime() > now)
      .map(([k]) => k)
    return { plan: planFromEntitlements(active) }
  } catch { return null }
}
