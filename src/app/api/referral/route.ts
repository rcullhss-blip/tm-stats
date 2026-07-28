import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no easily-confused characters
  let code = 'REF-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// Returns (creating if needed) the caller's personal referral code.
// The code grants a friend 1 month of Pro via the existing promo system.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = service as any

  let { data: promo } = await sb
    .from('promo_codes')
    .select('id, code, use_count')
    .eq('referrer_user_id', user.id)
    .limit(1)
    .single()

  if (!promo) {
    // Create the user's personal code — retry on the rare code collision
    for (let attempt = 0; attempt < 3 && !promo; attempt++) {
      const { data: created, error } = await sb
        .from('promo_codes')
        .insert({
          code: makeCode(),
          duration_months: 1,
          max_uses: null,
          active: true,
          referrer_user_id: user.id,
        })
        .select('id, code, use_count')
        .single()
      if (!error) promo = created
    }
  }

  if (!promo) return NextResponse.json({ error: 'Could not create referral code' }, { status: 500 })

  const { count } = await sb
    .from('promo_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('code_id', promo.id)

  return NextResponse.json({ code: promo.code, redemptions: count ?? 0 })
}
