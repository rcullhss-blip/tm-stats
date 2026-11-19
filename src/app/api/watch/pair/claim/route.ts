import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hashToken, newToken } from '@/lib/device-auth'

// The golfer, signed in on their phone or computer, types the code their watch shows.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const code = String(body.code ?? '').replace(/\D/g, '')
  if (code.length !== 6) return NextResponse.json({ error: 'Type the 6 numbers your watch shows' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: pairing } = await service.from('watch_pairings').select('id, user_id, expires_at').eq('code', code).maybeSingle()
  if (!pairing || new Date(pairing.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'That code is not right or has run out. Check the watch, or open the app on it again for a new code.' }, { status: 400 })
  if (pairing.user_id) return NextResponse.json({ error: 'That code has already been used' }, { status: 409 })

  const token = newToken()
  const { error: tokenError } = await service.from('device_tokens').insert({ user_id: user.id, token_hash: hashToken(token), name: 'Apple Watch' })
  if (tokenError) return NextResponse.json({ error: 'Could not connect the watch. Try again.' }, { status: 500 })
  // Kept only until the watch collects it (a few seconds), then the row is deleted
  await service.from('watch_pairings').update({ user_id: user.id, token }).eq('id', pairing.id).is('user_id', null)
  return NextResponse.json({ ok: true })
}
