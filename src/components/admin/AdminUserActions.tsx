'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  currentPlan: string
}

const PLANS = ['free', 'pro', 'team']

export default function AdminUserActions({ userId, currentPlan }: Props) {
  const [plan, setPlan] = useState(currentPlan)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function changePlan(newPlan: string) {
    if (newPlan === plan) return
    setSaving(true)
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: newPlan }),
      })
      setPlan(newPlan)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex gap-1 shrink-0">
      {PLANS.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => changePlan(p)}
          disabled={saving}
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: plan === p ? (p === 'free' ? '#22263A' : '#22C55E20') : '#22263A',
            color: plan === p ? (p === 'free' ? '#9A9DB0' : '#22C55E') : '#4A4D60',
            border: `1px solid ${plan === p ? (p === 'free' ? '#2E3247' : '#22C55E40') : '#2E3247'}`,
            opacity: saving ? 0.5 : 1,
          }}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
