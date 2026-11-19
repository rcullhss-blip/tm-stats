'use client'

import { useEffect } from 'react'
import { refreshPushIfAllowed } from '@/lib/native-push'

/** In the iPhone/Android app: keep this phone's push address fresh and handle taps. Nothing on the website. */
export default function NativePushBoot() {
  useEffect(() => { refreshPushIfAllowed().catch(() => {}) }, [])
  return null
}
