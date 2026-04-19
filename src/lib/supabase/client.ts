import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

declare global {
  interface Window { _supabase?: SupabaseClient }
}

export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    if (!window._supabase) {
      window._supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookieOptions: {
            secure: false,
            sameSite: 'lax',
          },
        }
      )
    }
    return window._supabase
  }
  // SSR path — no singleton needed
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
