import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const customerId = profile?.stripe_customer_id as string | undefined
  if (!customerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/profile`,
  })

  return NextResponse.json({ url: session.url })
}
