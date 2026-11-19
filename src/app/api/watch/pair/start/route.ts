import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hashToken, newPairCode, newSecret } from '@/lib/device-auth'

// The watch asks for a pairing code. It shows the code; the golfer types it in
// Profile. The secret stays on the watch and is how it collects its token.
export async function POST() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  // Tidy away old codes
  await service.from('watch_pairings').delete().lt('expires_at', new Date().toISOString())
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newPairCode()
    const secret = newSecret()
    const { error } = await service.from('watch_pairings').insert({ code, secret_hash: hashToken(secret), expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
    if (!error) return NextResponse.json({ code, secret, expiresInSeconds: 600 })
  }
  return NextResponse.json({ error: 'Could not make a code. Try again.' }, { status: 500 })
}
