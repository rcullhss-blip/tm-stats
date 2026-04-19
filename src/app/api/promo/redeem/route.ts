import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await request.json()
  if (!code?.trim()) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const service = createServiceClient()
  const sbAny = service as unknown as Record<string, (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { eq: (col2: string, val2: boolean) => { single: () => Promise<{ data: unknown; error: unknown }> } } } }>

  // Look up the code
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: promo, error: promoErr } = await (service as any)
    .from('promo_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('active', true)
    .single()
  void sbAny

  if (promoErr || !promo) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })

  // Check max uses
  if (promo.max_uses !== null && promo.use_count >= promo.max_uses) {
    return NextResponse.json({ error: 'This code has reached its maximum uses' }, { status: 400 })
  }

  // Check if user already used it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (service as any)
    .from('promo_redemptions')
    .select('id')
    .eq('code_id', promo.id)
    .eq('user_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'You have already used this code' }, { status: 400 })

  // Calculate expiry
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + promo.duration_months)

  // Apply to user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any)
    .from('users')
    .update({ subscription_status: 'pro', promo_expires_at: expiresAt.toISOString() })
    .eq('id', user.id)

  // Record redemption
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any).from('promo_redemptions').insert({
    code_id: promo.id,
    user_id: user.id,
    expires_at: expiresAt.toISOString(),
  })

  // Increment use count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any)
    .from('promo_codes')
    .update({ use_count: promo.use_count + 1 })
    .eq('id', promo.id)

  return NextResponse.json({
    ok: true,
    message: `Pro access activated for ${promo.duration_months} month${promo.duration_months !== 1 ? 's' : ''}`,
    expiresAt: expiresAt.toISOString(),
  })
}
