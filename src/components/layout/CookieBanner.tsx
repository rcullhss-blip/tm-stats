'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('tm_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('tm_cookie_consent', 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4"
      style={{ backgroundColor: '#1A1D27', borderTop: '1px solid #2E3247' }}
    >
      <div className="max-w-lg mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm" style={{ color: '#9A9DB0' }}>
          We use cookies to keep you logged in and improve your experience.{' '}
          <Link href="/privacy" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={accept}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '44px' }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
