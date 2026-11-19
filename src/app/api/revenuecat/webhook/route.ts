import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { applyIapPlan, fetchIapPlan } from '@/lib/revenuecat'

// RevenueCat tells us about Apple subscription changes (bought, renewed, upgraded,
// expired). The Authorization header must match REVENUECAT_WEBHOOK_SECRET.
// Rather than trust the event's details, we ask RevenueCat for the golfer's
// current entitlements, so events arriving out of order never matter.
export async function POST(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  const got = request.headers.get('authorization') ?? ''
  if (!secret || got.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const event = body?.event
  const userId: string = event?.app_user_id ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ ok: true, skipped: 'not a TM Stats user id' })
  if (event?.type === 'TEST') return NextResponse.json({ ok: true })
  const found = await fetchIapPlan(userId)
  if (!found) return NextResponse.json({ error: 'Could not reach RevenueCat' }, { status: 503 })  // RevenueCat retries
  const result = await applyIapPlan(userId, found.plan)
  return NextResponse.json({ ok: true, plan: found.plan, result })
}
