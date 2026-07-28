import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 300

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
