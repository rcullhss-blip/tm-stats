import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single()
  const ok = profile?.email === 'rcullhss@gmail.com' || user.email === 'rcullhss@gmail.com'
  return ok ? user : null
}

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { code, duration_months, max_uses } = await request.json()
  if (!code?.trim() || !duration_months) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (code.trim().length > 20) return NextResponse.json({ error: 'Code too long' }, { status: 400 })
  if (duration_months < 1 || duration_months > 36) return NextResponse.json({ error: 'Duration must be 1–36 months' }, { status: 400 })
  if (max_uses !== undefined && max_uses !== null && max_uses < 1) return NextResponse.json({ error: 'Max uses must be at least 1' }, { status: 400 })

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any).from('promo_codes').insert({
    code: code.toUpperCase(),
    duration_months,
    max_uses: max_uses ?? null,
    use_count: 0,
    active: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, active } = await request.json()
  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any).from('promo_codes').update({ active }).eq('id', id)
  return NextResponse.json({ ok: true })
}
