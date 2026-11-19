'use client'

import { useEffect } from 'react'

/** Registers the small offline helper (public/sw.js). Does nothing on browsers without service workers. */
export default function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    if (location.hostname === 'localhost') return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
