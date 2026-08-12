import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/brevo'
import { DRIP_TEMPLATES, FOLLOW_UP } from '@/lib/outreach-templates'

export const maxDuration = 300

// Daily outreach drip (weekdays). Sends to verified contacts with an automatic
// warmup ramp, follows up once after 5 days of silence, and never contacts
// anyone twice beyond that. Volume ramp protects deliverability:
// week 1 = 50/day, week 2 = 100, week 3 = 150, week 4+ = 200.
const WARMUP = [50, 100, 150, 200]

// The ramp is anchored to this date, NOT the first send ever — so uploading a
// fresh list restarts the warmup from 50/day instead of jumping to the max.
// Bump OUTREACH_RAMP_START in Vercel env if you ever want to reset the ramp.
const RAMP_START = new Date(process.env.OUTREACH_RAMP_START || '2026-07-31T00:00:00Z')

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

  // Warmup week: measured from the ramp-start date above.
  const week = Math.max(0, Math.floor((Date.now() - RAMP_START.getTime()) / (7 * 24 * 60 * 60 * 1000)))
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
      .limit(Math.min(budget, 80))

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
      await new Promise(r => setTimeout(r, 250))
    }
  }

  // 2) First touches — split the remaining budget EVENLY across active campaigns
  // so 4 uploaded lists each get roughly their share of the day's limit, rather
  // than one campaign finishing before the next begins.
  interface Contact {
    id: string
    email: string
    name?: string
    organisation?: string
    type: string
    campaign?: string | null
  }
  const perCampaignSent: Record<string, number> = {}

  const sendFirstTouch = async (contact: Contact): Promise<void> => {
    const template = DRIP_TEMPLATES[contact.type] ?? DRIP_TEMPLATES.GOLF_CLUB
    const campTag = contact.campaign ? [String(contact.campaign).toLowerCase().replace(/\s+/g, '-')] : []
    try {
      await sendEmail({
        to: [{ email: contact.email, name: contact.name || contact.organisation || '' }],
        subject: template.subject,
        htmlContent: template.html(contact.organisation ?? '', promoCode),
        tags: ['outreach', String(contact.type).toLowerCase(), ...campTag],
      })
      await sb
        .from('marketing_contacts')
        .update({ status: 'contacted', contacted_at: new Date().toISOString() })
        .eq('id', contact.id)
      firstTouches++
      const key = contact.campaign ?? 'General'
      perCampaignSent[key] = (perCampaignSent[key] ?? 0) + 1
    } catch {
      await sb.from('marketing_contacts').update({ status: 'bounced' }).eq('id', contact.id)
    }
  }

  if (budget > 0) {
    // Which campaigns still have verified contacts waiting?
    const campaignSet = new Set<string>()
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from('marketing_contacts')
        .select('campaign')
        .eq('status', 'verified')
        .range(from, from + 999)
      if (error || !data || data.length === 0) break
      for (const r of data) campaignSet.add(r.campaign ?? '__none__')
      if (data.length < 1000) break
    }
    const campaigns = [...campaignSet]

    if (campaigns.length > 0) {
      const perCampaign = Math.max(1, Math.floor(budget / campaigns.length))

      // Pass 1: each campaign gets its even share (oldest contacts first).
      for (const camp of campaigns) {
        if (budget <= 0) break
        const take = Math.min(perCampaign, budget)
        let q = sb
          .from('marketing_contacts')
          .select('*')
          .eq('status', 'verified')
          .order('created_at', { ascending: true })
          .limit(take)
        q = camp === '__none__' ? q.is('campaign', null) : q.eq('campaign', camp)
        const { data: batch } = await q
        for (const contact of batch ?? []) {
          if (budget <= 0) break
          await sendFirstTouch(contact as Contact)
          budget--
          await new Promise(r => setTimeout(r, 250))
        }
      }

      // Pass 2: mop up any leftover budget (campaigns smaller than their share).
      if (budget > 0) {
        const { data: rest } = await sb
          .from('marketing_contacts')
          .select('*')
          .eq('status', 'verified')
          .order('created_at', { ascending: true })
          .limit(budget)
        for (const contact of rest ?? []) {
          if (budget <= 0) break
          await sendFirstTouch(contact as Contact)
          budget--
          await new Promise(r => setTimeout(r, 250))
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    warmupWeek: week,
    dailyLimit,
    firstTouches,
    followUps,
    perCampaignSent,
    ts: new Date().toISOString(),
  })
}
