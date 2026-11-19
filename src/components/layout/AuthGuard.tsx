'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthGuard({ children, sessionGone = false }: { children: React.ReactNode; sessionGone?: boolean }) {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (sessionGone) {
      // The server no longer accepts this sign-in: clear it on this device too
      createClient().auth.signOut({ scope: 'local' }).finally(() => { window.location.href = '/login' })
      return
    }
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setChecking(false)
      } else {
        window.location.href = '/login'
      }
    })
  }, [sessionGone])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F1117' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#CC2222', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#9A9DB0' }}>Loading…</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
