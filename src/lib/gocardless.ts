// Minimal GoCardless REST client (Direct Debit). Bank-rail payments — used as
// the fallback collection method that isn't affected by card-network listings.
// Flip the app to this provider with NEXT_PUBLIC_PAYMENT_PROVIDER=gocardless.

const GC_VERSION = '2015-07-06'

function gcBase(): string {
  return process.env.GOCARDLESS_ENVIRONMENT === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function gc(path: string, opts: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<any> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN
  if (!token) throw new Error('GOCARDLESS_ACCESS_TOKEN not configured')

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'GoCardless-Version': GC_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey

  const res = await fetch(`${gcBase()}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`GoCardless ${path} failed: ${JSON.stringify(json)}`)
  return json
}

// Prices in pence — must match the Stripe plans (£4.99/mo, £50/yr).
export const GC_PRICES = {
  monthly: { amount: 499, interval_unit: 'monthly', name: 'TM Stats Pro (Monthly)' },
  yearly: { amount: 5000, interval_unit: 'yearly', name: 'TM Stats Pro (Yearly)' },
} as const
