import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { gc } from '@/lib/gocardless'

// GoCardless webhook. Keeps subscription_status in sync after setup:
// confirmed payment → Pro; cancelled/charged-back/failed mandate → free.
// Uses the service-role client (a webhook has no logged-in user).

async function setStatus(userId: string, status: 'pro' | 'free') {
  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any).from('users').update({ subscription_status: status }).eq('id', userId)
}

// Resolve the TM Stats user id from a GoCardless event's links.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function userIdFromLinks(links: any): Promise<string | null> {
  try {
    if (links.subscription) {
      const s = await gc(`/subscriptions/${links.subscription}`)
      const uid = s.subscriptions?.metadata?.supabase_user_id
      if (uid) return uid
    }
    let customerId: string | undefined = links.customer
    if (!customerId && links.mandate) {
      const m = await gc(`/mandates/${links.mandate}`)
      customerId = m.mandates?.links?.customer
    }
    if (customerId) {
      const c = await gc(`/customers/${customerId}`)
      return c.customers?.metadata?.supabase_user_id ?? null
    }
  } catch {
    // fall through
  }
  return null
}

export async function POST(request: Request) {
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })

  const raw = await request.text()
  const signature = request.headers.get('webhook-signature')
  const computed = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  if (!signature || signature !== computed) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 498 })
  }

  let payload: { events?: { resource_type: string; action: string; links?: Record<string, string> }[] }
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Bad body' }, { status: 400 })
  }

  for (const event of payload.events ?? []) {
    let target: 'pro' | 'free' | null = null
    if (event.resource_type === 'payments') {
      if (event.action === 'confirmed' || event.action === 'paid_out') target = 'pro'
      else if (event.action === 'charged_back' || event.action === 'cancelled') target = 'free'
    } else if (event.resource_type === 'subscriptions') {
      if (event.action === 'cancelled' || event.action === 'finished') target = 'free'
    } else if (event.resource_type === 'mandates') {
      if (event.action === 'cancelled' || event.action === 'expired' || event.action === 'failed') target = 'free'
    }
    if (!target) continue

    const userId = await userIdFromLinks(event.links ?? {})
    if (userId) await setStatus(userId, target)
  }

  return NextResponse.json({ received: true })
}
