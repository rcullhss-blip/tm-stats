'use client'

import { useEffect, useState } from 'react'
import { isNativeApp } from '@/lib/native-push'
import { hapticsOn, setHapticsOn, tapHaptic } from '@/lib/haptics'

/** Phone-only preferences (inside the app). */
export default function AppPreferences() {
  const [native, setNative] = useState(false)
  const [haptics, setHaptics] = useState(true)
  useEffect(() => { setNative(isNativeApp()); setHaptics(hapticsOn()) }, [])
  if (!native) return null
  return (
    <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
      <label className="flex items-center justify-between gap-3" style={{ minHeight: '44px' }}>
        <span>
          <span className="text-sm font-semibold block" style={{ color: '#F0F0F0' }}>Vibrate on taps</span>
          <span className="text-xs" style={{ color: '#9A9DB0' }}>A small buzz when you enter a score or a shot</span>
        </span>
        <input type="checkbox" checked={haptics} onChange={e => { setHaptics(e.target.checked); setHapticsOn(e.target.checked); if (e.target.checked) tapHaptic(true) }} style={{ width: '22px', height: '22px', accentColor: '#CC2222' }} />
      </label>
    </div>
  )
}
