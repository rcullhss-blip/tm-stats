'use client'

import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// Small vibrations on score taps inside the app. On by default; Profile has a switch.
const KEY = 'tm_haptics'

export function hapticsOn(): boolean {
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}

export function setHapticsOn(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch {}
}

/** A light tap. Does nothing on the website or when switched off. */
export function tapHaptic(strong = false) {
  try {
    if (!Capacitor.isNativePlatform() || !hapticsOn()) return
    Haptics.impact({ style: strong ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {})
  } catch {}
}
