'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isNativeApp, pushPermission } from '@/lib/native-push'

interface Step { key: string; label: string; sub: string; href: string; done: boolean }

/** First days: the few things that make TM Stats useful, ticked off as they are done. */
export default function GettingStarted({ steps }: { steps: Step[] }) {
  const [hidden, setHidden] = useState(true)
  const [pushStep, setPushStep] = useState<Step | null>(null)

  useEffect(() => {
    try { setHidden(localStorage.getItem('tm_getting_started_done') === '1') } catch { setHidden(false) }
    // Inside the app, notifications are one more step
    if (isNativeApp()) pushPermission().then(p => setPushStep({ key: 'push', label: 'Turn on notifications', sub: 'Your group, tee time and rounds ready for stats', href: '/profile', done: p === 'granted' }))
  }, [])

  const all = pushStep ? [...steps, pushStep] : steps
  const left = all.filter(s => !s.done).length
  if (hidden || left === 0) return null

  return (
    <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Get set up</p>
        <span className="text-xs" style={{ color: '#9A9DB0' }}>{all.length - left} of {all.length} done</span>
      </div>
      {all.map(s => (
        <Link key={s.key} href={s.href} className="flex items-center gap-3 py-2" style={{ borderTop: '1px solid #22263A', minHeight: '48px' }}>
          <span className="flex-shrink-0 flex items-center justify-center rounded-full text-xs" style={{ width: '22px', height: '22px', backgroundColor: s.done ? '#22C55E' : 'transparent', border: s.done ? 'none' : '1px solid #4A4D60', color: '#0F1117' }}>{s.done ? '✓' : ''}</span>
          <span className="min-w-0">
            <span className="text-sm block" style={{ color: s.done ? '#4A4D60' : '#F0F0F0', textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</span>
            {!s.done && <span className="text-xs" style={{ color: '#9A9DB0' }}>{s.sub}</span>}
          </span>
        </Link>
      ))}
      <button type="button" onClick={() => { try { localStorage.setItem('tm_getting_started_done', '1') } catch {}; setHidden(true) }} className="text-xs mt-1" style={{ color: '#4A4D60', minHeight: '40px' }}>Hide this</button>
    </div>
  )
}
