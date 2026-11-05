'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle = { backgroundColor: '#1A1D27', border: '1px solid #2E3247', color: '#F0F0F0' }

function Message({ title, body, linkHref, linkLabel }: { title: string; body: string; linkHref: string; linkLabel: string }) {
  return (
    <div className="w-full max-w-sm text-center">
      <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{title}</h1>
      <p className="text-sm mb-6" style={{ color: '#9A9DB0', lineHeight: 1.6 }}>{body}</p>
      <Link
        href={linkHref}
        className="block w-full py-4 rounded-xl font-semibold text-base"
        style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
      >
        {linkLabel}
      </Link>
    </div>
  )
}

function ClaimInner() {
  const router = useRouter()
  const state = useSearchParams().get('state')
  const [checking, setChecking] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user)
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (name.trim().length < 2) { setError('Please enter your name.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) { setError(pwError.message); setLoading(false); return }

    const res = await fetch('/api/auth/claim/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      setError('Your password is saved, but we could not finish the setup. Try once more.')
      setLoading(false)
      return
    }
    router.push('/rounds/new')
  }

  if (state === 'done') {
    return <Message title="You are already set up" body="This account already has a password, so just log in as normal. If you have forgotten it, use the reset link on the login page." linkHref="/login" linkLabel="Go to log in" />
  }
  if (state === 'invalid') {
    return <Message title="This link has expired" body="The link in your email is no longer valid. Email info@tmstatsgolf.com and we will send you a fresh one." linkHref="/login" linkLabel="Go to log in" />
  }
  if (state === 'error') {
    return <Message title="Something went wrong" body="We could not sign you in from that link. Try tapping it again, or email info@tmstatsgolf.com and we will sort it." linkHref="/login" linkLabel="Go to log in" />
  }
  if (checking) return null
  if (!signedIn) {
    return <Message title="Open the link from your email" body="To set up your account, tap the link in the email we sent you. If you cannot find it, email info@tmstatsgolf.com." linkHref="/login" linkLabel="Go to log in" />
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          You are in
        </h1>
        <p className="text-sm" style={{ color: '#9A9DB0', lineHeight: 1.6 }}>
          Your coach has set up your account. Add your name and choose a password, then log your first round.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="claim-name" className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Your name</label>
          <input
            id="claim-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
            className="w-full px-4 py-3 rounded-xl text-base outline-none"
            style={inputStyle}
            placeholder="First and last name"
          />
        </div>
        <div>
          <label htmlFor="claim-password" className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Choose a password</label>
          <input
            id="claim-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-xl text-base outline-none"
            style={inputStyle}
            placeholder="At least 8 characters"
          />
        </div>

        {error && <p className="text-sm text-center py-2" style={{ color: '#EF4444' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
        >
          {loading ? 'Saving…' : 'Save and log my first round'}
        </button>
      </form>
    </div>
  )
}

export default function ClaimPage() {
  return (
    <Suspense fallback={null}>
      <ClaimInner />
    </Suspense>
  )
}
