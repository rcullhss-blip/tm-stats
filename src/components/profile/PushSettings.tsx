'use client'

import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushPermission } from '@/lib/native-push'

/** Profile: turn notifications on for this phone. Only shown inside the app. */
export default function PushSettings() {
  const [state, setState] = useState<'granted' | 'denied' | 'prompt' | 'unsupported' | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushPermission().then(setState) }, [])
  if (state === null || state === 'unsupported') return null

  async function turnOn() {
    setBusy(true)
    try { const r = await enablePush(); setState(r === 'granted' ? 'granted' : 'denied') } finally { setBusy(false) }
  }

  return (
    <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
      <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Notifications</p>
      <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>Your group and tee time, cards to submit, and when a round is ready for your stats.</p>
      {state === 'granted' ? (
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#22C55E' }}>On for this phone</span>
          <button type="button" onClick={async () => { await disablePush(); setState('prompt') }} className="text-xs" style={{ color: '#9A9DB0', minHeight: '44px' }}>Stop on this phone</button>
        </div>
      ) : state === 'denied' ? (
        <p className="text-xs" style={{ color: '#F59E0B' }}>Notifications are off in your phone&apos;s settings. Open Settings, then TM Stats, then Notifications to allow them.</p>
      ) : (
        <button type="button" onClick={turnOn} disabled={busy} className="w-full rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px' }}>{busy ? 'Turning on…' : 'Turn on notifications'}</button>
      )}
    </div>
  )
}
