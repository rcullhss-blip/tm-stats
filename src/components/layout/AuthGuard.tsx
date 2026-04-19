'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setChecking(false)
      } else {
        window.location.href = '/login'
      }
    })
  }, [])

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
