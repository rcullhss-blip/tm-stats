import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { LIFECYCLE_EMAILS, PERSONAL_FROM, REPLY_TO, TEAM_NUDGE_SUBJECT, teamNudgeHtml, teamNudgeKey } from '@/lib/lifecycle-emails'
import { hasPro } from '@/lib/plan'

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

  // Daily sweep: downgrade any promo access that has lapsed. The per-user check
  // in the protected layout only fires when that user opens the app, so inactive
  // users would otherwise stay "pro" in the database forever.
  await sb
    .from('users')
    .update({ subscription_status: 'free', promo_expires_at: null })
    .eq('subscription_status', 'pro')
    .lt('promo_expires_at', new Date().toISOString())

  const { data: usersRaw } = await sb
    .from('users')
    .select('id, email, name, subscription_status, stripe_customer_id, email_opt_out, created_at')

  // Only email accounts that have confirmed their address. Bot/junk signups
  // almost never confirm, so this keeps welcome emails off fake addresses and
  // protects sending reputation. If the auth lookup fails, fall back to the
  // old behaviour (send to all) rather than silently emailing no one.
  const confirmed = new Set<string>()
  // Accounts we created on a player's behalf (a coach sent a roster) are flagged
  // needs_claim until the player opens their claim link and sets a password.
  // They cannot log in yet, so "log a round" nudges would land on a login page
  // they have no password for. They get the claim email instead (admin page).
  const awaitingClaim = new Set<string>()
  try {
    for (let page = 1; page <= 100; page++) {
      const { data: authList, error } = await sb.auth.admin.listUsers({ page, perPage: 200 })
      const list = authList?.users ?? []
      if (error || list.length === 0) break
      for (const u of list) {
        if (u.email_confirmed_at || u.confirmed_at) confirmed.add(u.id)
        if (u.app_metadata?.needs_claim === true) awaitingClaim.add(u.id)
      }
      if (list.length < 200) break
    }
  } catch {}

  const users: UserLite[] = (usersRaw ?? [])
    .filter((u: UserLite) => u.email && !u.email_opt_out)
    .filter((u: UserLite) => confirmed.size === 0 || confirmed.has(u.id))
    .filter((u: UserLite) => !awaitingClaim.has(u.id))

  const { data: logRaw } = await sb.from('email_log').select('user_id, email_type, sent_at')
  const sentAt = new Map<string, number>()
  for (const l of (logRaw ?? []) as { user_id: string; email_type: string; sent_at: string }[]) {
    sentAt.set(`${l.user_id}:${l.email_type}`, new Date(l.sent_at).getTime())
  }
  const alreadySent = { has: (key: string) => sentAt.has(key) }

  const { data: roundsRaw } = await sb
    .from('rounds')
    .select('user_id, date, input_mode')
    .order('date', { ascending: false })
  const rounds: { user_id: string; date: string; input_mode: string }[] = roundsRaw ?? []

  // Team memberships, for the weekly "played this week?" reminder
  const { data: memberRaw } = await sb.from('team_members').select('user_id, joined_at, teams(name)')
  const membership = new Map<string, { teamName: string; joinedAt: number }>()
  for (const m of (memberRaw ?? []) as { user_id: string; joined_at: string; teams: { name: string } | null }[]) {
    if (!membership.has(m.user_id)) {
      membership.set(m.user_id, { teamName: m.teams?.name ?? 'your team', joinedAt: new Date(m.joined_at).getTime() })
    }
  }
  const nudgeKey = teamNudgeKey()

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const sent: string[] = []
  let failures = 0

  for (const user of users) {
    const userRounds = rounds.filter(r => r.user_id === user.id)
    const fullRounds = userRounds.filter(r => r.input_mode === 'full')
    const lastRoundAge = userRounds.length > 0 ? now - new Date(userRounds[0].date).getTime() : null
    const accountAge = now - new Date(user.created_at).getTime()
    const isPro = hasPro(user.subscription_status)

    // All emails the user currently qualifies for, in priority order —
    // send the first one they haven't had yet (one email per user per run)
    const candidates: string[] = []
    if (userRounds.length === 0 && accountAge >= 3 * day && accountAge <= 30 * day) candidates.push('welcome_nudge')
    // Second touch around day 10: a different ask (a one-line "what stopped you?")
    // rather than the same nudge again. Only once the first nudge is at least
    // five days old, so nobody gets two emails back to back.
    const firstNudgeAt = sentAt.get(`${user.id}:welcome_nudge`)
    if (
      userRounds.length === 0 && accountAge >= 10 * day && accountAge <= 30 * day &&
      firstNudgeAt !== undefined && now - firstNudgeAt >= 5 * day
    ) candidates.push('welcome_nudge_2')
    // welcome_nudge only covers the first 30 days — without this, anyone who signs up
    // and never logs a round ages out of that window and never hears from us again.
    if (userRounds.length === 0 && accountAge > 30 * day) candidates.push('lapsed_never_started')
    if (fullRounds.length >= 1 && !isPro) candidates.push('sg_explainer')
    if (!isPro && userRounds.length >= 4) candidates.push('upgrade_push')
    if (lastRoundAge !== null && lastRoundAge >= 30 * day && lastRoundAge <= 90 * day) candidates.push('winback')

    // Team players: a weekly reminder when a week has gone by with no round.
    // It stops after three reminders in a row with no round logged, so a player
    // who has left the game alone is not chased for ever.
    const team = membership.get(user.id)
    let teamNudge = false
    // Only players who are still around: joined the team or logged a round in
    // the last 90 days. Someone who joined in spring and went quiet is left alone.
    const recentlyActive = (team ? now - team.joinedAt <= 90 * day : false) || (lastRoundAge !== null && lastRoundAge <= 90 * day)
    if (team && recentlyActive && now - team.joinedAt >= 7 * day && (lastRoundAge === null || lastRoundAge >= 7 * day)) {
      const lastRoundAt = userRounds.length > 0 ? new Date(userRounds[0].date).getTime() : 0
      const nudgeTimes: number[] = []
      for (const [key, at] of sentAt) {
        if (key.startsWith(`${user.id}:team_nudge_`)) nudgeTimes.push(at)
      }
      const sinceLastRound = nudgeTimes.filter(at => at > lastRoundAt).length
      const lastNudge = nudgeTimes.length > 0 ? Math.max(...nudgeTimes) : 0
      teamNudge = sinceLastRound < 3 && now - lastNudge >= 7 * day
    }

    const emailType = candidates.find(c => !alreadySent.has(`${user.id}:${c}`))
      ?? (teamNudge && !alreadySent.has(`${user.id}:${nudgeKey}`) ? nudgeKey : undefined)
    if (!emailType) continue

    if (emailType === nudgeKey && team) {
      const { error: nudgeError } = await resend.emails.send({
        from: PERSONAL_FROM,
        replyTo: REPLY_TO,
        to: [user.email],
        subject: TEAM_NUDGE_SUBJECT,
        html: teamNudgeHtml(user.id, user.name?.split(' ')[0] || 'golfer', team.teamName, userRounds.length > 0),
      })
      if (nudgeError) { failures++; continue }
      await sb.from('email_log').insert({ user_id: user.id, email_type: nudgeKey })
      sent.push(`${nudgeKey}:${user.email}`)
      if (sent.length >= 50) break
      continue
    }

    const template = LIFECYCLE_EMAILS[emailType]
    if (!template) continue

    const firstName = user.name?.split(' ')[0] || 'golfer'
    const { error: sendError } = await resend.emails.send({
      from: PERSONAL_FROM,
      replyTo: REPLY_TO,
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
