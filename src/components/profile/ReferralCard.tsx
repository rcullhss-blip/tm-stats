'use client'

import { useState, useEffect } from 'react'

export default function ReferralCard() {
  const [code, setCode] = useState<string | null>(null)
  const [redemptions, setRedemptions] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.code) {
          setCode(data.code)
          setRedemptions(data.redemptions ?? 0)
        }
      })
      .catch(() => {})
  }, [])

  if (!code) return null

  const shareUrl = `https://tmstatsgolf.com/signup?ref=${code}`
  const shareText = `I'm using TM Stats to see exactly where I lose shots — this code gets you a month of Pro free: ${code}. ${shareUrl}`

  async function handleShare() {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ text: shareText })
        return
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
      <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Give a mate a month of Pro</p>
      <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
        Share your personal code — anyone who redeems it gets 1 month of Pro free.
        {redemptions > 0 && (
          <span style={{ color: '#22C55E' }}> {redemptions} {redemptions === 1 ? 'mate has' : 'mates have'} joined with your code.</span>
        )}
      </p>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 px-4 py-3 rounded-xl text-center font-bold tracking-widest"
          style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', fontFamily: 'var(--font-dm-mono)' }}
        >
          {code}
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px' }}
        >
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>
    </div>
  )
}
