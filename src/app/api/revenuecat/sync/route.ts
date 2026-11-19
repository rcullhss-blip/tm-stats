import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyIapPlan, fetchIapPlan } from '@/lib/revenuecat'

// Straight after an Apple purchase or restore: check with RevenueCat and unlock now,
// rather than waiting for the webhook.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const found = await fetchIapPlan(user.id)
  if (!found) return NextResponse.json({ error: 'Could not check your purchase just now. It will show within a few minutes.' }, { status: 502 })
  const result = await applyIapPlan(user.id, found.plan)
  return NextResponse.json({ ok: true, plan: found.plan, result })
}
