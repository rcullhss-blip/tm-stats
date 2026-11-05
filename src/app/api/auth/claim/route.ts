import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyClaim } from '@/lib/claim-link'

// One-tap sign in from a "claim your account" email. See src/lib/claim-link.ts
// for what the link is allowed to do.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const id = searchParams.get('id')
  const to = (state: string) => NextResponse.redirect(`${origin}/claim?state=${state}`)

  if (!verifyClaim(id, searchParams.get('exp'), searchParams.get('sig'))) return to('invalid')

  const service = createServiceClient()
  const { data: found } = await service.auth.admin.getUserById(id!)
  const authUser = found?.user
  if (!authUser?.email) return to('invalid')
  // Already claimed (they chose a password) — from here on they log in normally.
  if (authUser.app_metadata?.needs_claim !== true) return to('done')

  // Mint a fresh single-use sign-in token now, at click time, and redeem it
  // straight away so the session cookie is set on this response.
  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.email,
  })
  const tokenHash = link?.properties?.hashed_token
  if (linkError || !tokenHash) return to('error')

  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
  if (verifyError) return to('error')

  return NextResponse.redirect(`${origin}/claim`)
}
