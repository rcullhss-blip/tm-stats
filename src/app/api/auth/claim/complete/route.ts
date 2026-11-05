import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Called by the claim page once the player has chosen a password. Saves their
// name and switches off the one-tap link for good.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''

  const service = createServiceClient()
  if (user.app_metadata?.needs_claim === true) {
    const { error } = await service.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, needs_claim: false, claimed_at: new Date().toISOString() },
    })
    if (error) return NextResponse.json({ error: 'Could not finish setting up your account' }, { status: 500 })
  }
  if (name) {
    await service.from('users').update({ name }).eq('id', user.id)
  }
  return NextResponse.json({ ok: true })
}
