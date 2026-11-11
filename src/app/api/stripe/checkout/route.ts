import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, priceFor, type PaidTier } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { plan: 'monthly' | 'yearly'; tier?: PaidTier; confirmUpgrade?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const tier: PaidTier = body.tier === 'elite' ? 'elite' : 'pro'
  const plan = body.plan === 'yearly' ? 'yearly' : 'monthly'
  const priceId = priceFor(tier, plan)
  if (!priceId) {
    return NextResponse.json(
      { error: tier === 'elite' ? 'Elite is not open for payment just yet. It will be very soon.' : 'Payments not yet configured' },
      { status: 503 },
    )
  }

  const { data: profile } = await supabase
    .from('users')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single()

  // Re-use existing Stripe customer or create one
  let customerId = profile?.stripe_customer_id as string | undefined
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  // Already paying by card (a Pro member moving up to Elite): change the plan
  // on the subscription they have. A second checkout would bill them twice.
  if (tier === 'elite') {
    const existing = await getStripe().subscriptions.list({ customer: customerId, status: 'active', limit: 1 })
    const current = existing.data[0]
    if (current) {
      if (!body.confirmUpgrade) {
        return NextResponse.json({
          needsConfirm: true,
          message: 'You are already a Pro member. Moving to Elite changes your plan straight away, and your card is charged the difference for the rest of this billing period.',
        })
      }
      await getStripe().subscriptions.update(current.id, {
        items: [{ id: current.items.data[0].id, price: priceId }],
        proration_behavior: 'create_prorations',
        metadata: { ...current.metadata, supabase_user_id: user.id, tier },
      })
      return NextResponse.json({ url: `${origin}/dashboard?upgraded=elite` })
    }
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=${tier === 'elite' ? 'elite' : '1'}`,
    cancel_url: `${origin}/upgrade`,
    metadata: { supabase_user_id: user.id, tier },
    subscription_data: {
      metadata: { supabase_user_id: user.id, tier },
    },
  })

  return NextResponse.json({ url: session.url })
}
