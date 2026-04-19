import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single()
  return profile?.email === 'rcullhss@gmail.com' || user.email === 'rcullhss@gmail.com'
  void userId
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const isAdmin = await assertAdmin(supabase, '')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, plan } = await request.json()
  if (!userId || !plan) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!['free', 'pro', 'team'].includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any)
    .from('users')
    .update({ subscription_status: plan, ...(plan !== 'pro' ? { promo_expires_at: null } : {}) })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
