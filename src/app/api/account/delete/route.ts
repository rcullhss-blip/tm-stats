import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe'

// A golfer deletes their own account (App Store and Google Play require this
// in the app). Any card subscription is cancelled first so they are never
// charged again, then the sign-in account is deleted, which removes every
// row that belongs to them (rounds, holes, teams they coach, and so on).
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (typeof body.confirm !== 'string' || body.confirm.trim().toUpperCase() !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: me } = await service.from('users').select('stripe_customer_id').eq('id', user.id).maybeSingle()

  if (me?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe()
      const subs = await stripe.subscriptions.list({ customer: me.stripe_customer_id, status: 'all', limit: 20 })
      for (const s of subs.data) {
        if (['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(s.status)) await stripe.subscriptions.cancel(s.id)
      }
    } catch {
      // Do not delete an account whose subscription might keep charging
      return NextResponse.json({ error: 'Your subscription could not be cancelled just now, so nothing has been deleted. Try again in a few minutes, or email info@tmstatsgolf.com.' }, { status: 502 })
    }
  }

  const { error } = await service.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: 'Your account could not be deleted just now. Try again, or email info@tmstatsgolf.com.' }, { status: 500 })
  // Belt and braces: the profile row normally goes with the sign-in account
  await service.from('users').delete().eq('id', user.id)
  await supabase.auth.signOut().catch(() => {})
  return NextResponse.json({ ok: true })
}
