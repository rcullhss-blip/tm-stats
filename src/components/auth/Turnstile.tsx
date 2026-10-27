'use client'

import { useEffect, useRef } from 'react'

// Cloudflare Turnstile — invisible-to-humans bot check on auth forms.
// Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the app
// keeps working normally before the captcha is switched on. Once the key is
// present AND Supabase "Enable Captcha protection" is turned on, every signup
// must carry a valid token — including bots that hit Supabase's API directly.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    turnstile?: any
  }
}

export default function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    function render() {
      if (cancelled || !ref.current || !window.turnstile || widgetId.current) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: (token: string) => onToken(token),
        'error-callback': () => onToken(''),
        'expired-callback': () => onToken(''),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      const existing = document.getElementById('cf-turnstile-script')
      if (existing) {
        existing.addEventListener('load', render)
      } else {
        const s = document.createElement('script')
        s.id = 'cf-turnstile-script'
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        s.async = true
        s.defer = true
        s.onload = render
        document.head.appendChild(s)
      }
    }

    return () => {
      cancelled = true
      try {
        if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      } catch {}
      widgetId.current = null
    }
  }, [onToken])

  if (!SITE_KEY) return null
  return <div ref={ref} className="flex justify-center mt-1" />
}
