import Stripe from 'stripe'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
    _stripe = new Stripe(key)
  }
  return _stripe
}

export const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  yearly: process.env.STRIPE_PRICE_YEARLY!,
}

// Elite tier (£8.99 a month, £85 a year). Until these two price ids are set in
// the environment, Elite checkout answers "not set up yet" and nothing else changes.
export const ELITE_PRICES = {
  monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_ELITE_YEARLY,
}

export type PaidTier = 'pro' | 'elite'

const configured = (id: string | undefined): id is string => !!id && !id.startsWith('replace_')

export function priceFor(tier: PaidTier, plan: 'monthly' | 'yearly'): string | null {
  const id = tier === 'elite' ? ELITE_PRICES[plan] : PRICES[plan]
  return configured(id) ? id : null
}

/** Which tier a Stripe price belongs to. Anything that is not an Elite price is Pro. */
export function tierForPrices(priceIds: string[]): PaidTier {
  const elite = [ELITE_PRICES.monthly, ELITE_PRICES.yearly].filter(configured)
  return priceIds.some(id => elite.includes(id)) ? 'elite' : 'pro'
}
