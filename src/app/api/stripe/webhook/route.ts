import { NextResponse } from 'next/server'
import { getStripe, tierForPrices } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import type Stripe from 'stripe'

// Stripe requires the raw body for signature verification
export const config = { api: { bodyParser: false } }

async function updateSubscription(
  supabaseUserId: string,
  status: 'pro' | 'elite' | 'free',
  customerId?: string,
) {
  // Service-role client: a Stripe webhook has no logged-in user, so the
  // cookie-based client would be blocked by row-level security.
  const supabase = createServiceClient()
  if (customerId) {
    await supabase.from('users').update({ subscription_status: status, stripe_customer_id: customerId }).eq('id', supabaseUserId)
  } else {
    await supabase.from('users').update({ subscription_status: status }).eq('id', supabaseUserId)
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || webhookSecret.startsWith('replace_')) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const getUserId = (obj: Stripe.Subscription | Stripe.Checkout.Session): string | null =>
    (obj.metadata?.supabase_user_id) ?? null

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = getUserId(session)
      if (userId) {
        await updateSubscription(userId, session.metadata?.tier === 'elite' ? 'elite' : 'pro', session.customer as string)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = getUserId(sub)
      if (userId) {
        const active = ['active', 'trialing'].includes(sub.status)
        // The tier follows the price on the subscription, so a Pro member who
        // moves up to Elite (or back down) is picked up here.
        const tier = tierForPrices(sub.items.data.map(i => i.price.id))
        await updateSubscription(userId, active ? tier : 'free')
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = getUserId(sub)
      if (userId) await updateSubscription(userId, 'free')
      break
    }

    case 'invoice.payment_failed': {
      // Payment failed — subscription will be handled by customer.subscription.deleted event
      break
    }
  }

  return NextResponse.json({ received: true })
}
