'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Turnstile from '@/components/auth/Turnstile'

const REF_KEY = 'tmstats_ref'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handicap, setHandicap] = useState('')
  const [company, setCompany] = useState('') // honeypot — real users never fill this
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0) // bump to reset the captcha after an error
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Capture a referral code from the share link (?ref=REF-XXXXXX)
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref) localStorage.setItem(REF_KEY, ref.toUpperCase())
    } catch {}
  }, [])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {

    // Honeypot: bots auto-fill every field, including this hidden one. Real
    // users can't see it, so anything here is a bot — quietly stop.
    if (company) {
      setNotice('Almost there — check your email for a confirmation link, then log in.')
      setLoading(false)
      return
    }

    if (!name.trim()) {
      setError('Please enter your name.')
      setLoading(false)
      return
    }

    // Reject obvious junk names (URLs, code, absurd length) — real names don't
    // contain http, angle brackets, or run past 60 characters.
    const cleanName = name.trim()
    if (cleanName.length > 60 || /https?:|<|>|\{|\}|\[|\]/i.test(cleanName)) {
      setError('Please enter a valid name.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    // Name + handicap go in the auth metadata so they survive the
    // email-confirmation flow (the profile row is created on first sign-in).
    // captchaToken is verified by Supabase when captcha protection is enabled;
    // it is ignored while protection is off, so this is safe to always send.
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: cleanName, handicap: handicap ? parseFloat(handicap) : null },
        captchaToken: captchaToken || undefined,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setCaptchaToken('')
      setCaptchaKey(k => k + 1) // captcha tokens are single-use — get a fresh one
      setLoading(false)
      return
    }

    // If email confirmation required
    if (!data.session) {
      setNotice('Almost there — check your email for a confirmation link, then log in.')
      setLoading(false)
      return
    }

    // Create the user profile row
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email,
        name: name || null,
        handicap: handicap ? parseFloat(handicap) : null,
        subscription_status: 'free',
      }, { onConflict: 'id' })
    }

    // signUp already returned a session (checked above), and the client has
    // stored it. Do not sign in again here: the captcha token is single-use
    // and a second auth call would be rejected once captcha protection is on.
    const { data: sessionCheck } = await supabase.auth.getSession()
    if (!sessionCheck.session) {
      setError('Account created — please log in.')
      setLoading(false)
      return
    }

    // Auto-redeem a captured referral code — friend gets their free month immediately
    try {
      const ref = localStorage.getItem(REF_KEY)
      if (ref) {
        await fetch('/api/promo/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: ref }),
        })
        localStorage.removeItem(REF_KEY)
      }
    } catch {}

    window.location.href = '/dashboard'

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError('Network error — check connection: ' + msg)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}
        >
          Start tracking
        </h1>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>
          Free forever — no card needed
        </p>
      </div>

      <form onSubmit={handleSignup} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={60}
            autoComplete="name"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2E3247',
              color: '#F0F0F0',
            }}
            placeholder="Your name"
          />
        </div>

        {/* Honeypot — hidden from real users, catches form-filling bots. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', height: 0, width: 0, overflow: 'hidden' }}>
          <label>
            Company
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2E3247',
              color: '#F0F0F0',
            }}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2E3247',
              color: '#F0F0F0',
            }}
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#9A9DB0' }}>
            Handicap index{' '}
            <span className="font-normal" style={{ color: '#9A9DB0' }}>(optional)</span>
          </label>
          <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>
            Used to set your Strokes Gained baseline. Plus handicap? Enter it with a minus — e.g. -2 for +2.
          </p>
          <input
            type="number"
            value={handicap}
            onChange={e => setHandicap(e.target.value)}
            min={-10}
            max={54}
            step={0.1}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2E3247',
              color: '#F0F0F0',
              fontFamily: 'var(--font-dm-mono)',
            }}
            placeholder="e.g. 12.4"
          />
        </div>

        {error && (
          <div className="w-full p-4 rounded-xl text-sm font-medium text-center" style={{ backgroundColor: '#EF444420', border: '2px solid #EF4444', color: '#EF4444' }}>
            {error}
          </div>
        )}

        {notice && (
          <div className="w-full p-4 rounded-xl text-sm font-medium text-center" style={{ backgroundColor: '#22C55E20', border: '2px solid #22C55E', color: '#22C55E' }}>
            {notice}
          </div>
        )}

        <Turnstile key={captchaKey} onToken={setCaptchaToken} />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-xs text-center" style={{ color: '#9A9DB0' }}>
          By signing up you agree to our terms of service.
        </p>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#9A9DB0' }}>
        Already have an account?{' '}
        <Link href="/login" className="font-medium" style={{ color: '#F0F0F0' }}>
          Log in
        </Link>
      </p>
    </div>
  )
}
