'use client'

import { useEffect } from 'react'

/** Keep the team code on this phone through sign-up or login; clear it once joined. */
export default function RememberJoin({ code }: { code: string }) {
  useEffect(() => {
    try { if (code) localStorage.setItem('tm_pending_join', code); else localStorage.removeItem('tm_pending_join') } catch {}
  }, [code])
  return null
}
