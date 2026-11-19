'use client'

import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

/** True inside the iPhone or Android app, false on the website. */
export function isNativeApp(): boolean {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

let listening = false

/** Listen once per app launch: save the phone's address, and open the right page when a notification is tapped. */
function listen() {
  if (listening) return
  listening = true
  PushNotifications.addListener('registration', ({ value }) => {
    fetch('/api/push/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: value, platform: Capacitor.getPlatform() }) }).catch(() => {})
    try { localStorage.setItem('tm_push_token', value) } catch {}
  })
  PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const url = (notification.data as { url?: string } | undefined)?.url
    if (url && url.startsWith('/')) window.location.href = url
  })
}

/** Current permission: 'granted', 'denied' or 'prompt'. 'unsupported' on the website. */
export async function pushPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!isNativeApp()) return 'unsupported'
  try {
    const p = await PushNotifications.checkPermissions()
    return p.receive === 'granted' ? 'granted' : p.receive === 'denied' ? 'denied' : 'prompt'
  } catch { return 'unsupported' }
}

/** Ask (shows the system prompt the first time) and register. */
export async function enablePush(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!isNativeApp()) return 'unsupported'
  listen()
  const p = await PushNotifications.requestPermissions()
  if (p.receive !== 'granted') return 'denied'
  await PushNotifications.register()
  return 'granted'
}

/** On each launch, if already allowed, refresh the address quietly. Never prompts. */
export async function refreshPushIfAllowed() {
  if ((await pushPermission()) !== 'granted') return
  listen()
  await PushNotifications.register()
}

export async function disablePush() {
  try {
    const token = localStorage.getItem('tm_push_token')
    if (token) await fetch(`/api/push/register?token=${encodeURIComponent(token)}`, { method: 'DELETE' })
    localStorage.removeItem('tm_push_token')
  } catch {}
}
