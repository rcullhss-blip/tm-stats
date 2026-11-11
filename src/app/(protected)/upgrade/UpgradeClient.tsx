'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Flip to 'gocardless' (Direct Debit) by setting NEXT_PUBLIC_PAYMENT_PROVIDER.
// Defaults to Stripe so nothing changes until the switch is thrown.
// Direct Debit only sells Pro. Elite is always paid by card through Stripe.
const PROVIDER = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === 'gocardless' ? 'gocardless' : 'stripe'

type Tier = 'pro' | 'elite'
type Plan = 'monthly' | 'yearly'

const TIERS: Record<Tier, {
  name: string
  headline: React.ReactNode
  blurb: string
  monthly: number
  yearly: number
  features: { label: string; sub: string }[]
}> = {
  pro: {
    name: 'TM Stats Pro',
    headline: <>Know exactly where<br />you lose shots.</>,
    blurb: 'Strokes Gained on every round and AI coaching. The tools serious golfers use to actually improve.',
    monthly: 4.99,
    yearly: 50,
    features: [
      { label: 'Unlimited rounds', sub: 'Free plan is capped at 5' },
      { label: 'Full Strokes Gained', sub: 'Off tee, approach, around green, putting' },
      { label: 'Game level', sub: 'The handicap each part of your game plays like' },
      { label: 'AI coaching feedback', sub: 'In the voice of your chosen coach' },
      { label: 'Named drills', sub: 'Specific practice plans after every round' },
      { label: 'Full stats & trends', sub: 'SG averages, scoring breakdowns, charts' },
    ],
  },
  elite: {
    name: 'TM Stats Elite',
    headline: <>See the pattern,<br />not just the number.</>,
    blurb: 'Everything in Pro, plus where every shot finishes. For golfers who want to know which way they miss and from where.',
    monthly: 8.99,
    yearly: 85,
    features: [
      { label: 'Everything in Pro', sub: 'Unlimited rounds, Strokes Gained, AI coaching' },
      { label: 'Advanced shot tracking', sub: 'One tap per shot: left or right, short or long' },
      { label: 'Shot dispersion', sub: 'Where your shots finish around the pin, by distance' },
      { label: 'Distance drill-down', sub: 'Every distance band: per round, per shot, and the trend' },
      { label: 'Putting miss patterns', sub: 'Short or long, left or right, by putt length' },
      { label: 'Coaching that reads your misses', sub: 'AI feedback built on your pattern, with an aim point' },
    ],
  },
}

const money = (n: number) => (Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`)

export default function UpgradeClient({ eliteOpen = false }: { eliteOpen?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roundLimitHit = searchParams.get('reason') === 'round_limit'
  // ?switch=1 lets an existing Pro member re-confirm on a new payment method
  // (e.g. moving from Stripe card to GoCardless Direct Debit) without being
  // bounced to the dashboard. Their Pro access is untouched during the switch.
  const switching = searchParams.get('switch') === '1'
  const [tier, setTier] = useState<Tier>(eliteOpen && searchParams.get('tier') === 'elite' ? 'elite' : 'pro')
  const [plan, setPlan] = useState<Plan>('yearly')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null)
  const [comingSoon, setComingSoon] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('users').select('subscription_status').single().then(({ data }) => {
      const s = data?.subscription_status ?? 'free'
      setStatus(s)
      if (switching) return
      // Elite and coach accounts already have everything
      if (s === 'elite' || s === 'team') router.replace('/dashboard')
      // A Pro member can only be here for Elite
      if (s === 'pro') setTier('elite')
      // ...and if Elite is not on sale yet there is nothing for them to buy
      if (s === 'pro' && !eliteOpen) setComingSoon(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isProMember = status === 'pro' && !switching
  const activeTier: Tier = switching ? 'pro' : tier
  const t = TIERS[activeTier]

  async function handleUpgrade(confirmUpgrade = false) {
    setLoading(true)
    setError(null)
    try {
      const endpoint = PROVIDER === 'gocardless' && activeTier === 'pro' ? '/api/gocardless/checkout' : '/api/stripe/checkout'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, tier: activeTier, switch: switching, confirmUpgrade }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      if (data.needsConfirm) {
        setConfirmMessage(data.message)
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start checkout')
      setLoading(false)
    }
  }

  const saving = Math.round(100 - (t.yearly / (t.monthly * 12)) * 100)
  const priceLabel = plan === 'yearly' ? `${money(t.yearly)}/year` : `${money(t.monthly)}/month`
  const action = switching ? 'Set up Direct Debit' : activeTier === 'elite' ? 'Go Elite' : 'Go Pro'
  const cardPayment = PROVIDER !== 'gocardless' || activeTier === 'elite'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Link href="/dashboard" className="text-sm mb-6 inline-block" style={{ color: '#9A9DB0' }}>
        ← Back
      </Link>

      {roundLimitHit && (
        <div className="p-3 rounded-xl mb-6 text-sm font-medium" style={{ backgroundColor: '#CC222220', color: '#F0F0F0', border: '1px solid #CC222240' }}>
          You&apos;ve reached the 5-round free plan limit. Upgrade to keep tracking.
        </div>
      )}

      {switching && (
        <div className="p-3 rounded-xl mb-6 text-sm" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3350' }}>
          <p className="font-semibold mb-1">Moving your Pro subscription to Direct Debit</p>
          <p style={{ color: '#9A9DB0' }}>Your Pro access stays on throughout. Set up the Direct Debit below and we&apos;ll cancel your old card payment so you&apos;re never charged twice.</p>
        </div>
      )}

      {isProMember && (
        <div className="p-3 rounded-xl mb-6 text-sm" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3350' }}>
          <p className="font-semibold mb-1">You&apos;re on Pro</p>
          <p style={{ color: '#9A9DB0' }}>Nothing changes unless you choose to. Elite adds the detail below on top of what you already have.</p>
        </div>
      )}

      {/* Tier picker: free accounts choose between Pro and Elite */}
      {!switching && !isProMember && eliteOpen && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['pro', 'elite'] as Tier[]).map(k => {
            const selected = tier === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => { setTier(k); setConfirmMessage(null); setError(null) }}
                className="p-3 rounded-xl text-left"
                style={{
                  backgroundColor: '#1A1D27',
                  border: `2px solid ${selected ? '#CC2222' : '#2E3247'}`,
                  minHeight: '72px',
                }}
              >
                <p className="text-sm font-bold" style={{ color: '#F0F0F0', fontFamily: 'var(--font-dm-sans)' }}>
                  {k === 'pro' ? 'Pro' : 'Elite'}
                </p>
                <p className="text-xs" style={{ color: '#9A9DB0' }}>
                  from <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{money(TIERS[k].monthly)}</span> a month
                </p>
                <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>
                  {k === 'pro' ? 'Where you lose shots' : 'Pro plus where every shot finishes'}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Hero */}
      <div className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>
          {t.name}
        </p>
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          {t.headline}
        </h1>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>{t.blurb}</p>
      </div>

      {/* Features */}
      <div className="space-y-3 mb-8">
        {t.features.map(({ label, sub }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
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
          <span className="text-xs font-normal">{money(t.monthly)} / month</span>
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
          <span className="text-xs font-normal">{money(t.yearly)} / year</span>
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
              {money(t.yearly)}<span className="text-lg font-normal" style={{ color: '#9A9DB0' }}>/year</span>
            </p>
            <p className="text-sm mt-1" style={{ color: '#9A9DB0' }}>
              That&apos;s £{(t.yearly / 12).toFixed(2)}/month{activeTier === 'pro' ? ', less than a sleeve of balls' : ''}
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
              {money(t.monthly)}<span className="text-lg font-normal" style={{ color: '#9A9DB0' }}>/month</span>
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

      {comingSoon && (
        <div className="p-4 rounded-xl text-sm text-center" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3350' }}>
          <p className="font-semibold mb-1">Elite opens soon</p>
          <p style={{ color: '#9A9DB0' }}>You don&apos;t need to do anything. Your Pro plan carries on as it is, and you&apos;ll be able to move up from this page.</p>
        </div>
      )}

      {confirmMessage && (
        <div className="p-3 rounded-xl mb-4 text-sm" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3350' }}>
          {confirmMessage}
        </div>
      )}

      {!comingSoon && <button
        type="button"
        onClick={() => handleUpgrade(!!confirmMessage)}
        disabled={loading}
        className="w-full py-4 rounded-xl font-bold text-base"
        style={{
          backgroundColor: loading ? '#7a1414' : '#CC2222',
          color: '#F0F0F0',
          minHeight: '56px',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Loading…' : confirmMessage ? `Confirm: move to Elite at ${priceLabel}` : `${action}: ${priceLabel}`}
      </button>}

      <p className="text-center text-xs mt-4" style={{ color: '#4A4D60' }}>
        {cardPayment ? 'Secure payment via Stripe. Cancel any time.' : 'Secure Direct Debit via GoCardless. Cancel any time.'}
      </p>
    </div>
  )
}
