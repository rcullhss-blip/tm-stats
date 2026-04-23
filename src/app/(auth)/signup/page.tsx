'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handicap, setHandicap] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // If email confirmation required
    if (!data.session) {
      setError('Check your email for a confirmation link, then log in.')
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

    // Sign in explicitly to guarantee a fresh session before navigating
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError('Account created — please log in.')
      setLoading(false)
      return
    }

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
            Used to set your Strokes Gained baseline
          </p>
          <input
            type="number"
            value={handicap}
            onChange={e => setHandicap(e.target.value)}
            min={0}
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
