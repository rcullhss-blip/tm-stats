'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor'
import { createClient } from '@/lib/supabase/client'

// In the iPhone app, Pro and Elite are bought through Apple (App Store rules).
// Prices come from the App Store, in the golfer's own currency.
const API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? ''

const FEATURES: Record<'pro' | 'elite', string[]> = {
  pro: ['Unlimited rounds', 'Strokes Gained on every round', 'Biggest leaks and the handicap each part of your game plays like', 'AI coaching and the mental game coach', 'Goals and trends'],
  elite: ['Everything in Pro', 'Advanced shot input: where every miss finished', 'Coaching built on which way you miss', 'The deep breakdown by distance'],
}

function tierOf(p: PurchasesPackage): 'pro' | 'elite' { return /elite/i.test(p.product.identifier) ? 'elite' : 'pro' }
function yearly(p: PurchasesPackage) { return /year|annual/i.test(p.product.identifier) || p.packageType === 'ANNUAL' }

export default function AppleUpgrade({ reason }: { reason: string | null }) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([])
  const [tier, setTier] = useState<'pro' | 'elite'>('pro')
  const [state, setState] = useState<'loading' | 'ready' | 'busy' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        if (!session?.user) { window.location.href = '/login'; return }
        await Purchases.configure({ apiKey: API_KEY, appUserID: session.user.id })
        const offerings = await Purchases.getOfferings()
        setPackages(offerings.current?.availablePackages ?? [])
        setState('ready')
      } catch {
        setState('error'); setMessage('Plans could not load. Check your signal and try again.')
      }
    })()
  }, [])

  async function unlock() {
    const res = await fetch('/api/revenuecat/sync', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Could not unlock just now')
    return data.plan as 'pro' | 'elite' | null
  }

  async function buy(p: PurchasesPackage) {
    setState('busy'); setMessage(null)
    try {
      await Purchases.purchasePackage({ aPackage: p })
      await unlock()
      setState('done'); setMessage(`You're on ${tierOf(p) === 'elite' ? 'Elite' : 'Pro'}. Everything is unlocked.`)
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string }
      setState('ready')
      if (!err?.userCancelled) setMessage(err?.message ?? 'The purchase did not go through.')
    }
  }

  async function restore() {
    setState('busy'); setMessage(null)
    try {
      await Purchases.restorePurchases()
      const plan = await unlock()
      setState(plan ? 'done' : 'ready')
      setMessage(plan ? `Restored: you're on ${plan === 'elite' ? 'Elite' : 'Pro'}.` : 'No App Store subscription found for this Apple ID.')
    } catch {
      setState('ready'); setMessage('Could not restore just now. Try again.')
    }
  }

  const shown = packages.filter(p => tierOf(p) === tier).sort((a, b) => Number(yearly(b)) - Number(yearly(a)))
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Link href="/dashboard" className="text-sm mb-6 inline-block" style={{ color: '#9A9DB0' }}>← Back</Link>
      {reason === 'round_limit' && (
        <div className="p-3 rounded-xl mb-5 text-sm" style={{ backgroundColor: '#CC222220', color: '#F0F0F0', border: '1px solid #CC222240' }}>You&apos;ve used the 5 free rounds. Go Pro to keep tracking.</div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
        {(['pro', 'elite'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTier(t)} className="rounded-lg text-sm font-semibold" style={{ backgroundColor: tier === t ? '#CC2222' : 'transparent', color: tier === t ? '#F0F0F0' : '#9A9DB0', minHeight: '44px' }}>{t === 'pro' ? 'Pro' : 'Elite'}</button>
        ))}
      </div>
      <ul className="mb-5 space-y-2">
        {FEATURES[tier].map(f => <li key={f} className="text-sm flex gap-2" style={{ color: '#F0F0F0' }}><span style={{ color: '#22C55E' }}>✓</span>{f}</li>)}
      </ul>
      {state === 'loading' && <p className="text-sm" style={{ color: '#9A9DB0' }}>Loading plans…</p>}
      {state === 'done' ? (
        <Link href="/dashboard" className="block w-full text-center py-4 rounded-xl font-semibold" style={{ backgroundColor: '#22C55E', color: '#0F1117' }}>Done</Link>
      ) : (
        <div className="space-y-3">
          {shown.map(p => (
            <button key={p.identifier} type="button" onClick={() => buy(p)} disabled={state === 'busy'} className="w-full p-4 rounded-xl text-left flex items-center justify-between" style={{ backgroundColor: yearly(p) ? '#CC2222' : '#1A1D27', color: '#F0F0F0', border: yearly(p) ? 'none' : '1px solid #2E3247', opacity: state === 'busy' ? 0.6 : 1 }}>
              <span>
                <span className="text-sm font-semibold block">{tier === 'elite' ? 'Elite' : 'Pro'} {yearly(p) ? 'yearly' : 'monthly'}</span>
                <span className="text-xs" style={{ opacity: 0.8 }}>Renews {yearly(p) ? 'every year' : 'every month'} until you cancel</span>
              </span>
              <span className="text-base font-bold" style={{ fontFamily: 'var(--font-dm-mono)' }}>{p.product.priceString}</span>
            </button>
          ))}
          {state === 'ready' && shown.length === 0 && <p className="text-sm" style={{ color: '#9A9DB0' }}>Plans are not available just now.</p>}
        </div>
      )}
      {message && <p className="text-sm mt-4" style={{ color: state === 'done' ? '#22C55E' : '#F59E0B' }}>{message}</p>}
      <button type="button" onClick={restore} disabled={state === 'busy'} className="text-sm mt-5" style={{ color: '#9A9DB0', minHeight: '44px' }}>Restore purchases</button>
      <p className="text-xs mt-4" style={{ color: '#4A4D60', lineHeight: 1.6 }}>
        Payment is taken by your Apple ID when you confirm. The subscription renews automatically unless you turn it off at least 24 hours before the end of the period, in your Apple ID settings (Settings, your name, Subscriptions).{' '}
        <Link href="/terms" style={{ color: '#9A9DB0', textDecoration: 'underline' }}>Terms of use</Link> · <Link href="/privacy" style={{ color: '#9A9DB0', textDecoration: 'underline' }}>Privacy policy</Link>
      </p>
    </div>
  )
}
