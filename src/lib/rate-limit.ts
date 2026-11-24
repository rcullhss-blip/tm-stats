import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

/** The caller's address, hashed so no raw IP is stored. */
export function callerKey(request: Request): string {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 24)
}

/**
 * Daily limit for things anyone can call without signing in (contact form,
 * newsletter signup, watch pairing). Returns false once the limit is passed.
 * If the counter is not installed yet the call is allowed.
 */
export async function withinDailyLimit(request: Request, what: string, limit: number): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (createServiceClient() as any).rpc('bump_rate', {
      p_key: `${what}:${callerKey(request)}`,
      p_limit: limit,
    })
    if (error) return true
    return data !== false
  } catch {
    return true
  }
}
