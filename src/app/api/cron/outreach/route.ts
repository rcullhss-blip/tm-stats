import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/brevo'
import { DRIP_TEMPLATES, FOLLOW_UP } from '@/lib/outreach-templates'

export const maxDuration = 300

// Daily outreach drip (weekdays). Sends to verified contacts with an automatic
// warmup ramp, follows up once after 5 days of silence, and never contacts
// anyone twice beyond that. Volume ramp protects deliverability:
// week 1 = 10/day, week 2 = 25, week 3 = 50, week 4+ = 100.
const WARMUP = [10, 25, 50, 100]

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.BREVO_API_KEY) {
    return NextResponse.json({ error: 'BREVO_API_KEY not set — outreach paused' }, { status: 503 })
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const promoCode = process.env.MARKETING_PROMO_CODE || 'TMSTATS3FREE'

  // Warmup week: based on the very first send ever made
  const { data: firstSend } = await sb
    .from('marketing_contacts')
    .select('contacted_at')
    .not('contacted_at', 'is', null)
    .order('contacted_at', { ascending: true })
    .limit(1)
    .single()
  const week = firstSend?.contacted_at
    ? Math.floor((Date.now() - new Date(firstSend.contacted_at).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0
  const dailyLimit = WARMUP[Math.min(week, WARMUP.length - 1)]

  // How many already sent today (cron retries / manual runs stay safe)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: sentToday } = await sb
    .from('marketing_contacts')
    .select('id', { count: 'exact', head: true })
    .or(`contacted_at.gte.${todayStart.toISOString()},followed_up_at.gte.${todayStart.toISOString()}`)

  let budget = Math.max(0, dailyLimit - (sentToday ?? 0))
  let followUps = 0
  let firstTouches = 0

  // 1) Follow-ups first: contacted 5+ days ago, no reply recorded
  if (budget > 0) {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const { data: due } = await sb
      .from('marketing_contacts')
      .select('*')
      .eq('status', 'contacted')
      .lt('contacted_at', fiveDaysAgo)
      .order('contacted_at', { ascending: true })
      .limit(Math.min(budget, 30))

    for (const contact of due ?? []) {
      try {
        await sendEmail({
          to: [{ email: contact.email, name: contact.name || contact.organisation || '' }],
          subject: FOLLOW_UP.subject,
          htmlContent: FOLLOW_UP.html(contact.organisation ?? '', promoCode),
          tags: ['outreach-followup', String(contact.type).toLowerCase()],
        })
        await sb
          .from('marketing_contacts')
          .update({ status: 'followed_up', followed_up_at: new Date().toISOString() })
          .eq('id', contact.id)
        followUps++
        budget--
      } catch {
        // leave as contacted; retried next run
      }
      if (budget <= 0) break
      await new Promise(r => setTimeout(r, 800))
    }
  }

  // 2) First touches to verified contacts
  if (budget > 0) {
    const { data: fresh } = await sb
      .from('marketing_contacts')
      .select('*')
      .eq('status', 'verified')
      .order('created_at', { ascending: true })
      .limit(budget)

    for (const contact of fresh ?? []) {
      const template = DRIP_TEMPLATES[contact.type] ?? DRIP_TEMPLATES.GOLF_CLUB
      try {
        await sendEmail({
          to: [{ email: contact.email, name: contact.name || contact.organisation || '' }],
          subject: template.subject,
          htmlContent: template.html(contact.organisation ?? '', promoCode),
          tags: ['outreach', String(contact.type).toLowerCase()],
        })
        await sb
          .from('marketing_contacts')
          .update({ status: 'contacted', contacted_at: new Date().toISOString() })
          .eq('id', contact.id)
        firstTouches++
      } catch {
        await sb.from('marketing_contacts').update({ status: 'bounced' }).eq('id', contact.id)
      }
      await new Promise(r => setTimeout(r, 800))
    }
  }

  return NextResponse.json({
    ok: true,
    warmupWeek: week,
    dailyLimit,
    firstTouches,
    followUps,
    ts: new Date().toISOString(),
  })
}
