import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hashToken } from '@/lib/device-auth'

// The watch checks whether its code has been typed in. Once it has, the watch
// gets its token once, and the pairing is deleted.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const secret = typeof body.secret === 'string' ? body.secret : ''
  if (secret.length < 20) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: pairing } = await service.from('watch_pairings').select('id, token, user_id, expires_at').eq('secret_hash', hashToken(secret)).maybeSingle()
  if (!pairing) return NextResponse.json({ error: 'Code not found. Start again.' }, { status: 404 })
  if (!pairing.token) {
    if (new Date(pairing.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'The code ran out. Start again.' }, { status: 410 })
    return NextResponse.json({ pending: true })
  }
  await service.from('watch_pairings').delete().eq('id', pairing.id)
  const { data: me } = await service.from('users').select('name').eq('id', pairing.user_id).maybeSingle()
  return NextResponse.json({ token: pairing.token, name: me?.name ?? null })
}
