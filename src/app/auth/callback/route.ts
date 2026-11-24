import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only ever send people to a page on this site. Anything that is not a plain
  // local path (e.g. "@evil.com", "//evil.com") falls back to the dashboard.
  const requested = searchParams.get('next') ?? '/dashboard'
  const next = /^\/(?![\/\\])/.test(requested) ? requested : '/dashboard'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
