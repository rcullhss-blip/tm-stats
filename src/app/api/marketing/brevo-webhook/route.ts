import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 30

// Brevo delivery webhook. Brevo POSTs one event per email (delivered, opened,
// hard_bounce, etc.); we match it to marketing_contacts by email and record the
// real delivery status. Protected by ?key=CRON_SECRET in the URL, since Brevo
// transactional webhooks aren't signed.
//
// Webhook URL to register in Brevo:
//   https://www.tmstatsgolf.com/api/marketing/brevo-webhook?key=<CRON_SECRET>
export async function POST(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: true })
  const events = Array.isArray(body) ? body : [body]

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  let applied = 0
  for (const ev of events) {
    const email = String(ev?.email ?? '').toLowerCase().trim()
    const type = String(ev?.event ?? '').toLowerCase().replace(/\s+/g, '_')
    if (!email) continue
    const when = ev?.date ? new Date(ev.date).toISOString() : new Date().toISOString()

    const update: Record<string, unknown> = {}
    if (type === 'delivered') {
      update.delivered = true
      update.delivered_at = when
    } else if (type === 'opened' || type === 'unique_opened' || type === 'click') {
      // An open or click implies it was delivered.
      update.opened = true
      update.opened_at = when
      update.delivered = true
    } else if (type === 'hard_bounce' || type === 'blocked' || type === 'spam' || type === 'invalid_email') {
      update.status = 'bounced'
      update.delivered = false
    }
    // soft_bounce / deferred are transient — ignore.

    if (Object.keys(update).length === 0) continue
    await sb.from('marketing_contacts').update(update).eq('email', email)
    applied++
  }

  return NextResponse.json({ ok: true, applied })
}
