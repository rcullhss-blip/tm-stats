import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withinDailyLimit } from '@/lib/rate-limit'

// Public newsletter signup — homepage/blog footer
export async function POST(request: Request) {
  let email = ''
  let source = 'site'
  try {
    const body = await request.json()
    if (body.website) return NextResponse.json({ ok: true }) // hidden bot trap
    email = String(body.email ?? '').trim().toLowerCase()
    source = String(body.source ?? 'site').slice(0, 40)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
  }

  if (!(await withinDailyLimit(request, 'subscribe', 10))) {
    return NextResponse.json({ error: 'Too many sign-ups from here today' }, { status: 429 })
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('subscribers')
    .upsert({ email, source }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: 'Could not subscribe — try again' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
