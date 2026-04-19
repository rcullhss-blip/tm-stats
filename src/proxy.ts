import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-project-url-here') {
    return NextResponse.next({ request })
  }

  // Only job of proxy: refresh the Supabase session cookie if needed.
  // Page-level server components handle their own auth redirects.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            secure: false,   // Allow cookies over HTTP (local network dev)
            sameSite: 'lax',
          })
        )
      },
    },
  })

  // Refresh session — this is the only thing the proxy does
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-only-logo.png|logo.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
