'use client'

import { useEffect } from 'react'

/** After sign-up or login from a team link, finish joining the team. */
export default function PendingJoin() {
  useEffect(() => {
    try {
      const code = localStorage.getItem('tm_pending_join')
      if (code && /^[A-Za-z0-9]{4,12}$/.test(code)) window.location.href = `/join/${code}`
    } catch {}
  }, [])
  return null
}
