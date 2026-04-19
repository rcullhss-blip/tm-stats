'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const FEATURES = [
  { icon: '📊', label: 'Unlimited rounds', sub: 'Free plan is capped at 5' },
  { icon: '🎯', label: 'Full Strokes Gained', sub: 'Off tee, approach, around green, putting' },
  { icon: '🤖', label: 'AI coaching feedback', sub: 'In the voice of your chosen coach' },
  { icon: '💬', label: 'Named drills', sub: 'Specific practice plans after every round' },
  { icon: '📈', label: 'Full stats & trends', sub: 'SG averages, scoring breakdowns, charts' },
  { icon: '🎙️', label: 'All 7 coaching modes', sub: 'Club Pro, Technical Analyst, Ball Flight Coach and more' },
]

export default function UpgradeClient() {
  const router = useRouter()
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('users').select('subscription_status').single().then(({ data }) => {
      if (data?.subscription_status === 'pro') router.replace('/dashboard')
    })
  }, [])

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start checkout')
      setLoading(false)
    }
  }

  const saving = Math.round(100 - (50 / (4.99 * 12)) * 100)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Link href="/dashboard" className="text-sm mb-6 inline-block" style={{ color: '#9A9DB0' }}>
        ← Back
      </Link>

      {/* Hero */}
      <div className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>
          TM Stats Pro
        </p>
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Know exactly where<br />you lose shots.
        </h1>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>
          Strokes Gained analytics and AI coaching — the tools serious golfers use to actually improve.
        </p>
      </div>

      {/* Features */}
      <div className="space-y-3 mb-8">
        {FEATURES.map(({ icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
            <span className="text-xl w-8 text-center">{icon}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{label}</p>
              <p className="text-xs" style={{ color: '#9A9DB0' }}>{sub}</p>
            </div>
            <span className="ml-auto text-lg" style={{ color: '#22C55E' }}>✓</span>
          </div>
        ))}
      </div>

      {/* Plan toggle */}
      <div className="p-1 rounded-xl flex gap-1 mb-4" style={{ backgroundColor: '#22263A' }}>
        <button
          type="button"
          onClick={() => setPlan('monthly')}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            backgroundColor: plan === 'monthly' ? '#1A1D27' : 'transparent',
            color: plan === 'monthly' ? '#F0F0F0' : '#9A9DB0',
          }}
        >
          Monthly<br />
          <span className="text-xs font-normal">£4.99 / month</span>
        </button>
        <button
          type="button"
          onClick={() => setPlan('yearly')}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all relative"
          style={{
            backgroundColor: plan === 'yearly' ? '#1A1D27' : 'transparent',
            color: plan === 'yearly' ? '#F0F0F0' : '#9A9DB0',
          }}
        >
          Yearly<br />
          <span className="text-xs font-normal">£50 / year</span>
          <span
            className="absolute -top-2 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#22C55E', color: '#0F1117', fontSize: '10px' }}
          >
            Save {saving}%
          </span>
        </button>
      </div>

      {/* Price display */}
      <div className="text-center mb-6">
        {plan === 'yearly' ? (
          <>
            <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
              £50<span className="text-lg font-normal" style={{ color: '#9A9DB0' }}>/year</span>
            </p>
            <p className="text-sm mt-1" style={{ color: '#9A9DB0' }}>
              That&apos;s £4.17/month — less than a sleeve of balls
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
              £4.99<span className="text-lg font-normal" style={{ color: '#9A9DB0' }}>/month</span>
            </p>
            <p className="text-sm mt-1" style={{ color: '#9A9DB0' }}>
              Cancel any time
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-center mb-4" style={{ color: '#EF4444' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full py-4 rounded-xl font-bold text-base"
        style={{
          backgroundColor: loading ? '#7a1414' : '#CC2222',
          color: '#F0F0F0',
          minHeight: '56px',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Loading checkout…' : `Go Pro — ${plan === 'yearly' ? '£50/year' : '£4.99/month'}`}
      </button>

      <p className="text-center text-xs mt-4" style={{ color: '#4A4D60' }}>
        Secure payment via Stripe. Cancel any time.
      </p>
    </div>
  )
}
