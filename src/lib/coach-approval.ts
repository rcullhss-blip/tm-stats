import crypto from 'crypto'

// One-tap approval links for new coaches, sent to Rob. The link carries the
// coach's id and a signature only the server can make, so it cannot be guessed.
const SITE = 'https://www.tmstatsgolf.com'

function secret(): string {
  return process.env.COACH_APPROVE_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

export function approvalSig(userId: string): string {
  return crypto.createHmac('sha256', secret()).update(`coach-approve:${userId}`).digest('base64url').slice(0, 32)
}

export function approvalLink(userId: string): string {
  return `${SITE}/approve-coach?u=${encodeURIComponent(userId)}&s=${approvalSig(userId)}`
}

export function validApproval(userId: string, sig: string): boolean {
  if (!secret() || !/^[0-9a-f-]{36}$/i.test(userId) || typeof sig !== 'string') return false
  const want = Buffer.from(approvalSig(userId))
  const got = Buffer.from(sig)
  return want.length === got.length && crypto.timingSafeEqual(want, got)
}
