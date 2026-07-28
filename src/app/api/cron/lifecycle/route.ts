import { NextResponse } from 'next/server'
import { EMAIL_FROM } from '@/lib/email-from'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { LIFECYCLE_EMAILS } from '@/lib/lifecycle-emails'

export const maxDuration = 60

interface UserLite {
  id: string
  email: string
  name: string | null
  subscription_status: string
  stripe_customer_id: string | null
  email_opt_out: boolean | null
  created_at: string
}

// Daily lifecycle email run. Each email type sends at most once per user
// (enforced by the email_log UNIQUE constraint) and respects email_opt_out.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Resend not configured' }, { status: 503 })

  const resend = new Resend(apiKey)
  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: usersRaw } = await sb
    .from('users')
    .select('id, email, name, subscription_status, stripe_customer_id, email_opt_out, created_at')
  const users: UserLite[] = (usersRaw ?? []).filter((u: UserLite) => u.email && !u.email_opt_out)

  const { data: logRaw } = await sb.from('email_log').select('user_id, email_type')
  const alreadySent = new Set((logRaw ?? []).map((l: { user_id: string; email_type: string }) => `${l.user_id}:${l.email_type}`))

  const { data: roundsRaw } = await sb
    .from('rounds')
    .select('user_id, date, input_mode')
    .order('date', { ascending: false })
  const rounds: { user_id: string; date: string; input_mode: string }[] = roundsRaw ?? []

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const sent: string[] = []
  let failures = 0

  for (const user of users) {
    const userRounds = rounds.filter(r => r.user_id === user.id)
    const fullRounds = userRounds.filter(r => r.input_mode === 'full')
    const lastRoundAge = userRounds.length > 0 ? now - new Date(userRounds[0].date).getTime() : null
    const accountAge = now - new Date(user.created_at).getTime()
    const isPro = user.subscription_status === 'pro' || user.subscription_status === 'team'

    // All emails the user currently qualifies for, in priority order —
    // send the first one they haven't had yet (one email per user per run)
    const candidates: string[] = []
    if (userRounds.length === 0 && accountAge >= 3 * day && accountAge <= 30 * day) candidates.push('welcome_nudge')
    if (fullRounds.length >= 1 && !isPro) candidates.push('sg_explainer')
    if (!isPro && userRounds.length >= 4) candidates.push('upgrade_push')
    if (lastRoundAge !== null && lastRoundAge >= 30 * day && lastRoundAge <= 90 * day) candidates.push('winback')

    const emailType = candidates.find(c => !alreadySent.has(`${user.id}:${c}`))
    if (!emailType) continue

    const template = LIFECYCLE_EMAILS[emailType]
    if (!template) continue

    const firstName = user.name?.split(' ')[0] || 'golfer'
    const { error: sendError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [user.email],
      subject: template.subject,
      html: template.html(user.id, firstName),
    })

    if (sendError) {
      failures++
      continue
    }

    await sb.from('email_log').insert({ user_id: user.id, email_type: emailType })
    sent.push(`${emailType}:${user.email}`)
    if (sent.length >= 50) break // safety cap per run
  }

  return NextResponse.json({ ok: true, sent: sent.length, failures, ts: new Date().toISOString() })
}
