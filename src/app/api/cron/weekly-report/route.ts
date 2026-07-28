import { NextResponse } from 'next/server'
import { EMAIL_FROM } from '@/lib/email-from'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 60

// Friday 9am operations report: everything the automation did this week,
// plus the business numbers that matter — in one email to Rob.

const FONT = "Calibri, 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif"

function section(title: string, rows: [string, string | number][]): string {
  return `
  <h3 style="margin:26px 0 8px;font-size:15px;color:#CC2222;letter-spacing:1px;text-transform:uppercase;font-family:${FONT};">${title}</h3>
  <table style="border-collapse:collapse;width:100%;font-family:${FONT};font-size:14.5px;color:#222;">
    ${rows.map(([label, value]) => `
      <tr>
        <td style="padding:7px 0;border-bottom:1px solid #eee;">${label}</td>
        <td style="padding:7px 0;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${value}</td>
      </tr>`).join('')}
  </table>`
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Resend not configured' }, { status: 503 })

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const weekAgoDate = weekAgo.split('T')[0]

  const count = async (table: string, mod?: (q: unknown) => unknown): Promise<number> => {
    let q = sb.from(table).select('id', { count: 'exact', head: true })
    if (mod) q = mod(q)
    const { count: c } = await q
    return c ?? 0
  }

  try {
    // ── Business ────────────────────────────────────────────────────────────
    const totalUsers = await count('users')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newUsers = await count('users', (q: any) => q.gte('created_at', weekAgo))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proUsers = await count('users', (q: any) => q.in('subscription_status', ['pro', 'team']))
    const totalRounds = await count('rounds')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newRounds = await count('rounds', (q: any) => q.gte('date', weekAgoDate))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscribers = await count('subscribers', (q: any) => q.eq('unsubscribed', false))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newSubscribers = await count('subscribers', (q: any) => q.eq('unsubscribed', false).gte('created_at', weekAgo))

    // ── Outreach pipeline ───────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contactsFoundWeek = await count('marketing_contacts', (q: any) => q.gte('created_at', weekAgo))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verified = await count('marketing_contacts', (q: any) => q.eq('status', 'verified'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contactedWeek = await count('marketing_contacts', (q: any) => q.gte('contacted_at', weekAgo))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const followedWeek = await count('marketing_contacts', (q: any) => q.gte('followed_up_at', weekAgo))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contactedTotal = await count('marketing_contacts', (q: any) => q.in('status', ['contacted', 'followed_up', 'replied']))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const replied = await count('marketing_contacts', (q: any) => q.eq('status', 'replied'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bounced = await count('marketing_contacts', (q: any) => q.eq('status', 'bounced'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queuePending = await count('crawl_queue', (q: any) => q.eq('status', 'pending'))
    const replyRate = contactedTotal > 0 ? `${Math.round((replied / contactedTotal) * 100)}%` : '—'

    // ── Lifecycle emails this week ──────────────────────────────────────────
    const { data: lifecycleRaw } = await sb.from('email_log').select('email_type, sent_at').gte('sent_at', weekAgo)
    const lifecycleCounts: Record<string, number> = {}
    for (const row of lifecycleRaw ?? []) {
      lifecycleCounts[row.email_type] = (lifecycleCounts[row.email_type] ?? 0) + 1
    }
    const lifecycleRows: [string, string | number][] = Object.keys(lifecycleCounts).length > 0
      ? Object.entries(lifecycleCounts).map(([k, v]) => [k.replace(/_/g, ' '), v] as [string, number])
      : [['No lifecycle emails sent this week', '—']]

    // ── Content ─────────────────────────────────────────────────────────────
    const { data: newPosts } = await sb
      .from('blog_posts')
      .select('title, slug')
      .gte('published_at', weekAgo)
      .order('published_at', { ascending: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keywordsLeft = await count('blog_keywords', (q: any) => q.eq('used', false))
    const blogRows: [string, string | number][] = (newPosts ?? []).length > 0
      ? (newPosts ?? []).map((p: { title: string; slug: string }) => [`"${p.title}"`, 'published'] as [string, string])
      : [['No posts published this week', '—']]
    blogRows.push(['Keywords left in the queue', keywordsLeft])

    const html = `
    <div style="background:#f4f4f4;padding:24px 12px;">
      <div style="font-family:${FONT};max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e2e2;border-radius:8px;overflow:hidden;">
        <div style="background:#14161d;padding:20px 36px;border-bottom:3px solid #CC2222;">
          <span style="color:#ffffff;font-size:17px;font-weight:bold;letter-spacing:3px;">TM STATS</span>
          <span style="color:#9A9DB0;font-size:11px;letter-spacing:2px;float:right;margin-top:4px;">WEEKLY OPERATIONS REPORT</span>
        </div>
        <div style="padding:28px 36px;">
          <p style="font-family:${FONT};font-size:15px;color:#222;margin:0 0 4px;">Week ending ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="font-family:${FONT};font-size:13px;color:#888;margin:0;">Everything below happened automatically.</p>

          ${section('Business', [
            ['New sign-ups this week', newUsers],
            ['Total members', totalUsers],
            ['Pro / Team members', proUsers],
            ['Rounds logged this week', newRounds],
            ['Rounds all-time', totalRounds],
            ['Newsletter subscribers (+this week)', `${subscribers} (+${newSubscribers})`],
          ])}

          ${section('Outreach pipeline', [
            ['New contacts found this week', contactsFoundWeek],
            ['Verified, ready to email', verified],
            ['First-touch emails sent this week', contactedWeek],
            ['Follow-ups sent this week', followedWeek],
            ['Replies (all-time)', replied],
            ['Reply rate', replyRate],
            ['Bounced', bounced],
            ['Crawl queue remaining', queuePending],
          ])}

          ${section('Member emails sent this week', lifecycleRows)}

          ${section('Content', blogRows)}

          <p style="font-family:${FONT};font-size:13.5px;color:#555;margin:28px 0 0;">
            Full pipeline detail: <a href="https://tmstatsgolf.com/admin/marketing/scraper" style="color:#CC2222;">tmstatsgolf.com/admin/marketing/scraper</a><br>
            Mark replies there to keep the reply rate accurate.
          </p>
        </div>
      </div>
    </div>`

    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: EMAIL_FROM,
      to: ['rcullhss@gmail.com'],
      subject: `Weekly report: ${newUsers} sign-ups, ${newRounds} rounds, ${contactedWeek + followedWeek} outreach emails`,
      html,
    })

    return NextResponse.json({ ok: true, newUsers, newRounds, contactedWeek })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
