import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { gc, GC_PRICES } from '@/lib/gocardless'

// Where GoCardless sends the customer back after they authorise the Direct
// Debit. We finalise the mandate, start the recurring subscription, and grant
// Pro. The webhook handles everything afterwards (failures, cancellations).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const brId = searchParams.get('br')
  const plan = searchParams.get('plan') === 'yearly' ? 'yearly' : 'monthly'
  const isSwitch = searchParams.get('switch') === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !brId) return NextResponse.redirect(`${origin}/upgrade?error=1`)

  try {
    // The flow auto-fulfils the billing request, creating customer + mandate.
    const br = await gc(`/billing_requests/${brId}`)
    const data = br.billing_requests
    const mandateId: string | undefined = data.mandate_request?.links?.mandate ?? data.links?.mandate_request_mandate
    const customerId: string | undefined = data.links?.customer
    if (!mandateId) return NextResponse.redirect(`${origin}/upgrade?error=mandate`)

    // Tag the customer so webhook events can be mapped back to this user.
    if (customerId) {
      await gc(`/customers/${customerId}`, {
        method: 'PUT',
        body: { customers: { metadata: { supabase_user_id: user.id } } },
      })
    }

    // Recurring subscription on the mandate.
    const price = GC_PRICES[plan]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub: any = {
      amount: price.amount,
      currency: 'GBP',
      interval_unit: price.interval_unit,
      name: price.name,
      links: { mandate: mandateId },
      metadata: { supabase_user_id: user.id },
    }
    if (isSwitch) {
      // Migrating from an existing (Stripe) subscription: delay the first Direct
      // Debit by a month so the member isn't charged twice for a period they've
      // already paid for. New (non-switch) signups still collect right away.
      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      sub.start_date = d.toISOString().slice(0, 10)
    }
    await gc('/subscriptions', {
      method: 'POST',
      idempotencyKey: `sub-${brId}`,
      body: { subscriptions: sub },
    })

    // Mandate authorised — grant Pro now (first collection follows in a few days).
    const service = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).from('users').update({ subscription_status: 'pro' }).eq('id', user.id)

    return NextResponse.redirect(`${origin}/dashboard?upgraded=1`)
  } catch (e) {
    console.error('GoCardless complete error:', e)
    return NextResponse.redirect(`${origin}/upgrade?error=setup`)
  }
}
