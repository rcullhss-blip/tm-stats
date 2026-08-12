import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 300

// Minimal CSV parser — handles quoted fields, escaped quotes ("") and commas or
// newlines inside quotes. Returns an array of rows, each an array of cell strings.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field); field = ''
      if (row.some(c => c.trim() !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some(c => c.trim() !== '')) rows.push(row)
  return rows
}

// Download every scraped contact as a CSV (opens/saves in a spreadsheet).
// Used by the "Export CSV" button on the scraper page.
export async function GET() {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const cols = ['organisation', 'email', 'website', 'type', 'region', 'status', 'created_at', 'contacted_at']
  // Pull every row in pages (Supabase caps a single select at 1000).
  const rows: Record<string, unknown>[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from('marketing_contacts')
      .select(cols.join(','))
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error || !data || data.length === 0) break
    rows.push(...data)
    if (data.length < pageSize) break
  }

  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n'

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tmstats-contacts-${date}.csv"`,
    },
  })
}

// Admin control panel for the contact pipeline. The heavy lifting lives in
// /api/cron/scrape (runs nightly); this route lets Rob trigger a batch on
// demand, paste known URLs straight into the queue, and see pipeline status.
export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const body = await request.json().catch(() => ({}))
  const action = body.action ?? 'status'

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  if (action === 'add_urls') {
    const urls: string[] = (body.urls ?? []).filter((u: string) => /^https?:\/\//.test(u))
    const type = body.type ?? 'GOLF_CLUB'
    let added = 0
    for (const url of urls.slice(0, 200)) {
      const { error } = await sb.from('crawl_queue').upsert(
        { url: url.trim(), kind: 'club_site', type, organisation: null },
        { onConflict: 'url', ignoreDuplicates: true }
      )
      if (!error) added++
    }
    return NextResponse.json({ ok: true, added })
  }

  if (action === 'import_contacts') {
    const csv = String(body.csv ?? '')
    const type = String(body.type ?? 'NCAA_D1')
    const region = body.region ? String(body.region) : null
    if (!csv.trim()) return NextResponse.json({ error: 'No CSV text provided' }, { status: 400 })

    const rows = parseCsv(csv)
    if (rows.length === 0) return NextResponse.json({ ok: true, imported: 0, skipped: 0, found: 0 })

    // Work out which column holds the organisation / school name (best effort).
    const header = rows[0].map(h => h.trim().toLowerCase())
    const looksLikeHeader = header.some(h => /school|college|university|team|club|name|coach|email|program|institution/.test(h))
    const orgIdx = header.findIndex(h =>
      /organisation|organization|institution|school|college|university|club|team|program|^name$/.test(h)
    )
    const dataRows = looksLikeHeader ? rows.slice(1) : rows

    // Scan EVERY cell of each row for email addresses. This deliberately grabs
    // both the men's-coach and women's-coach columns (and any other email
    // column) without needing to know the exact header names — each address
    // found becomes its own contact, carrying that row's organisation.
    const emailRe = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi
    const contacts = new Map<string, { email: string; organisation: string | null }>()
    for (const row of dataRows) {
      const org = orgIdx >= 0 && row[orgIdx] ? row[orgIdx].trim() : ''
      for (const cell of row) {
        const matches = (cell || '').match(emailRe)
        if (!matches) continue
        for (const raw of matches) {
          const email = raw.toLowerCase().trim()
          if (!contacts.has(email)) contacts.set(email, { email, organisation: org || null })
        }
      }
    }

    const all = [...contacts.values()]
    if (all.length === 0) return NextResponse.json({ ok: true, imported: 0, skipped: 0, found: 0, message: 'No email addresses found in that CSV' })

    // Insert as verified so they drop straight into the drip. The unique index
    // on email + ignoreDuplicates means anyone already in the pipeline (or a
    // repeated upload) is skipped automatically — nobody gets emailed twice.
    let imported = 0
    for (let i = 0; i < all.length; i += 500) {
      const batch = all.slice(i, i + 500).map(c => ({
        email: c.email,
        organisation: c.organisation,
        type,
        region,
        status: 'verified',
      }))
      const { data, error } = await sb
        .from('marketing_contacts')
        .upsert(batch, { onConflict: 'email', ignoreDuplicates: true })
        .select('email')
      if (!error && data) imported += data.length
    }

    return NextResponse.json({ ok: true, found: all.length, imported, skipped: all.length - imported })
  }

  if (action === 'enqueue_contacts') {
    // Accepts already-parsed rows [{ email, organisation, type, region }] from
    // the Outreach Engine upload and drops them into the drip as verified,
    // tagged with the campaign name so sending can be split + tracked per campaign.
    const incoming = Array.isArray(body.contacts) ? body.contacts : []
    const campaign = body.campaign ? String(body.campaign).trim().slice(0, 120) : null
    const map = new Map<string, { email: string; organisation: string | null; type: string; region: string | null; status: string; campaign: string | null }>()
    for (const c of incoming) {
      const email = String(c?.email ?? '').toLowerCase().trim()
      if (!email || !email.includes('@')) continue
      if (!map.has(email)) {
        map.set(email, {
          email,
          organisation: c?.organisation ? String(c.organisation) : null,
          type: c?.type ? String(c.type) : 'GOLF_CLUB',
          region: c?.region ? String(c.region) : null,
          status: 'verified',
          campaign,
        })
      }
    }
    const all = [...map.values()]
    if (all.length === 0) return NextResponse.json({ ok: true, found: 0, imported: 0, skipped: 0 })

    let imported = 0
    for (let i = 0; i < all.length; i += 500) {
      const { data, error } = await sb
        .from('marketing_contacts')
        .upsert(all.slice(i, i + 500), { onConflict: 'email', ignoreDuplicates: true })
        .select('email')
      if (!error && data) imported += data.length
    }
    return NextResponse.json({ ok: true, found: all.length, imported, skipped: all.length - imported })
  }

  if (action === 'campaign_stats') {
    // Per-campaign breakdown for the outreach page. Pulls the light columns and
    // aggregates in JS (one pass) so we get queued/sent/replied + sent
    // today/this month per campaign without a query per campaign.
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

    type Agg = { campaign: string; queued: number; sent: number; delivered: number; opened: number; replied: number; bounced: number; sentToday: number; sentMonth: number }
    const byCampaign = new Map<string, Agg>()
    const get = (name: string) => {
      const key = name || 'General'
      if (!byCampaign.has(key)) byCampaign.set(key, { campaign: key, queued: 0, sent: 0, delivered: 0, opened: 0, replied: 0, bounced: 0, sentToday: 0, sentMonth: 0 })
      return byCampaign.get(key)!
    }

    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await sb
        .from('marketing_contacts')
        .select('campaign, status, contacted_at, followed_up_at, delivered, opened')
        .range(from, from + pageSize - 1)
      if (error || !data || data.length === 0) break
      for (const r of data) {
        const a = get(r.campaign ?? 'General')
        if (r.status === 'verified') a.queued++
        else if (r.status === 'contacted' || r.status === 'followed_up') a.sent++
        else if (r.status === 'replied') { a.sent++; a.replied++ }
        else if (r.status === 'bounced') a.bounced++
        if (r.delivered) a.delivered++
        if (r.opened) a.opened++
        const last = r.followed_up_at || r.contacted_at
        if (last) {
          const t = new Date(last).getTime()
          if (t >= todayStart.getTime()) a.sentToday++
          if (t >= monthStart.getTime()) a.sentMonth++
        }
      }
      if (data.length < pageSize) break
    }

    const campaigns = [...byCampaign.values()].sort((x, y) => (y.sent + y.queued) - (x.sent + x.queued))
    return NextResponse.json({ ok: true, campaigns })
  }

  if (action === 'campaign_contacts') {
    // Drill-down: every contact in one campaign with their real delivery status.
    const campaign = body.campaign ? String(body.campaign) : null
    let q = sb
      .from('marketing_contacts')
      .select('email, organisation, status, contacted_at, delivered, opened')
      .order('contacted_at', { ascending: false, nullsFirst: false })
      .limit(2000)
    q = (!campaign || campaign === 'General') ? q.is('campaign', null) : q.eq('campaign', campaign)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, campaign: campaign ?? 'General', contacts: data ?? [] })
  }

  if (action === 'run_outreach') {
    // Manually fire one outreach batch now (same logic + daily ramp as the cron)
    // so sending doesn't depend on the Vercel cron actually triggering.
    const origin = new URL(request.url).origin
    const res = await fetch(`${origin}/api/cron/outreach`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const result = await res.json().catch(() => ({}))
    return NextResponse.json({ ok: res.ok, ...result })
  }

  if (action === 'search_contacts') {
    // Find any contact by email or organisation — used by the "mark a reply"
    // search box on the outreach page, so replies can be logged from anywhere
    // (not just the 25 newest rows on the scraper page).
    const query = String(body.query ?? '').trim()
    if (query.length < 2) return NextResponse.json({ ok: true, contacts: [] })
    // Escape the characters Postgres ILIKE treats as wildcards / list separators.
    const safe = query.replace(/[%_,()]/g, ' ')
    const { data, error } = await sb
      .from('marketing_contacts')
      .select('email, organisation, status, campaign')
      .or(`email.ilike.%${safe}%,organisation.ilike.%${safe}%`)
      .order('created_at', { ascending: false })
      .limit(25)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, contacts: data ?? [] })
  }

  if (action === 'set_status') {
    const email = String(body.email ?? '')
    const status = String(body.status ?? '')
    if (!email || !['replied', 'bounced', 'unsubscribed', 'verified'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status update' }, { status: 400 })
    }
    await sb.from('marketing_contacts').update({ status }).eq('email', email)
    return NextResponse.json({ ok: true })
  }

  if (action === 'crawl') {
    // Run one crawl batch now by invoking the cron route with its secret
    const origin = new URL(request.url).origin
    const res = await fetch(`${origin}/api/cron/scrape`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const result = await res.json().catch(() => ({}))
    return NextResponse.json({ ok: res.ok, ...result })
  }

  // Default: pipeline status
  const counts: Record<string, number> = {}
  for (const status of ['pending', 'done', 'failed']) {
    const { count } = await sb
      .from('crawl_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', status)
    counts[`queue_${status}`] = count ?? 0
  }
  for (const status of ['found', 'verified', 'contacted', 'followed_up', 'replied', 'bounced']) {
    const { count } = await sb
      .from('marketing_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('status', status)
    counts[`contacts_${status}`] = count ?? 0
  }

  // Outreach activity this week (first touches + follow-ups)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: sentThisWeek } = await sb
    .from('marketing_contacts')
    .select('id', { count: 'exact', head: true })
    .or(`contacted_at.gte.${weekAgo},followed_up_at.gte.${weekAgo}`)
  counts.sent_this_week = sentThisWeek ?? 0

  const { data: recent } = await sb
    .from('marketing_contacts')
    .select('email, organisation, type, region, status, created_at, contacted_at')
    .order('created_at', { ascending: false })
    .limit(25)

  return NextResponse.json({ ok: true, counts, recent: recent ?? [] })
}
