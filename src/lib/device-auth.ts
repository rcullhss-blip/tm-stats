import { createHash, randomBytes, randomInt } from 'crypto'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'

// Sign-in for the Apple Watch app. A watch has no browser cookies, so it sends
// "Authorization: Bearer tmw_..." with a token it got by pairing. Only a hash
// of the token is stored, so a database leak does not leak working tokens.

export const TOKEN_PREFIX = 'tmw_'

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function newToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString('base64url')
}

export function newSecret(): string {
  return randomBytes(32).toString('base64url')
}

/** Six digits, no leading zero, easy to read off a watch. */
export function newPairCode(): string {
  return String(randomInt(100000, 1000000))
}

/** The user a watch's token belongs to, or null. */
export async function userFromDeviceToken(): Promise<string | null> {
  let auth: string | null = null
  try { auth = (await headers()).get('authorization') } catch { return null }
  const m = auth?.match(/^Bearer\s+(tmw_[A-Za-z0-9_-]{20,100})$/)
  if (!m) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data } = await service.from('device_tokens').select('id, user_id, last_used_at').eq('token_hash', hashToken(m[1])).maybeSingle()
  if (!data) return null
  // Note when it was last used, at most every 10 minutes
  if (!data.last_used_at || Date.now() - new Date(data.last_used_at).getTime() > 10 * 60 * 1000) {
    await service.from('device_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  }
  return data.user_id
}
