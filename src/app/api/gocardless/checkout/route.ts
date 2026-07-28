import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gc } from '@/lib/gocardless'

// Starts a Direct Debit setup: creates a billing request + hosted authorisation
// flow, and returns the URL to send the customer to (mirrors Stripe checkout).
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.GOCARDLESS_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Direct Debit not configured' }, { status: 503 })
  }

  let body: { plan: 'monthly' | 'yearly'; switch?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const plan = body.plan === 'yearly' ? 'yearly' : 'monthly'
  const isSwitch = body.switch === true
  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  try {
    // 1) Billing request with a UK Direct Debit (Bacs) mandate
    const br = await gc('/billing_requests', {
      method: 'POST',
      body: {
        billing_requests: {
          mandate_request: { scheme: 'bacs', currency: 'GBP' },
          metadata: { supabase_user_id: user.id, plan },
        },
      },
    })
    const brId: string = br.billing_requests.id

    // 2) Hosted authorisation flow the customer completes
    const flow = await gc('/billing_request_flows', {
      method: 'POST',
      body: {
        billing_request_flows: {
          redirect_uri: `${origin}/api/gocardless/complete?br=${brId}&plan=${plan}${isSwitch ? '&switch=1' : ''}`,
          exit_uri: `${origin}/upgrade`,
          links: { billing_request: brId },
        },
      },
    })

    return NextResponse.json({ url: flow.billing_request_flows.authorisation_url })
  } catch (e) {
    console.error('GoCardless checkout error:', e)
    return NextResponse.json({ error: 'Could not start Direct Debit setup' }, { status: 500 })
  }
}
