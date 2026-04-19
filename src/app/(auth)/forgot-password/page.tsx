'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError('Something went wrong. Check the email address and try again.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}
        >
          Reset password
        </h1>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      {sent ? (
        <div
          className="p-4 rounded-xl text-center"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #22C55E40' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: '#22C55E' }}>Email sent</p>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>
            Check your inbox for a password reset link.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

          {error && (
            <p className="text-sm text-center py-2" style={{ color: '#EF4444' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="text-center text-sm mt-6" style={{ color: '#9A9DB0' }}>
        <Link href="/login" className="font-medium" style={{ color: '#F0F0F0' }}>
          Back to login
        </Link>
      </p>
    </div>
  )
}
