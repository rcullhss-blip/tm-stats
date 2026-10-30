import { NextResponse } from 'next/server'
import { EMAIL_FROM } from '@/lib/email-from'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe'
import { getSummary, isConfigured as searchConsoleConfigured, type ScSummary } from '@/lib/search-console'

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

const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—')

// "12 (up 4)" style comparison against the previous week.
function vsLastWeek(now: number, before: number): string {
  if (now === before) return `${now} (same as last week)`
  return `${now} (${now > before ? 'up' : 'down'} ${Math.abs(now - before)})`
}

function shortPath(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?tmstatsgolf\.com/, '') || '/'
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

    const { data: newUserRows } = await sb
      .from('users')
      .select('id, name, email, subscription_status, created_at')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: true })
    const { data: newTeamRows } = await sb.from('team_members').select('user_id').gte('joined_at', weekAgo)
    const joinedTeam = new Set((newTeamRows ?? []).map((r: { user_id: string }) => r.user_id))
    const signupRows: [string, string | number][] = (newUserRows ?? []).map(
      (u: { id: string; name: string | null; email: string; subscription_status: string; created_at: string }) => [
        `${u.name || u.email.split('@')[0]} <span style="color:#888;font-size:12.5px;">${new Date(u.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}${joinedTeam.has(u.id) ? ', joined a coach team' : ''}</span>`,
        u.subscription_status,
      ] as [string, string],
    )

    // ── Funnel: who is actually using it ────────────────────────────────────
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: roundRows } = await sb.from('rounds').select('user_id, created_at')
    const usersWithRounds = new Set((roundRows ?? []).map((r: { user_id: string }) => r.user_id))
    const activeSince = (since: string) => new Set(
      (roundRows ?? []).filter((r: { created_at: string }) => r.created_at >= since).map((r: { user_id: string }) => r.user_id)
    ).size
    const activeWeek = activeSince(weekAgo)
    const activeMonth = activeSince(monthAgo)
    const neverLogged = totalUsers - usersWithRounds.size

    // Paying = Stripe sub that is active AND whose period hasn't lapsed
    // (subs stuck since the June block still show "active").
    let paying = 0
    let mrrPence = 0
    try {
      const subs = await getStripe().subscriptions.list({ status: 'active', limit: 100 })
      const now = Date.now() / 1000
      for (const s of subs.data) {
        const item = s.items.data[0]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const periodEnd = (s as any).current_period_end ?? (item as any)?.current_period_end ?? 0
        const amount = item?.price?.unit_amount ?? 0
        if (periodEnd > now && amount > 0) {
          paying++
          mrrPence += item.price.recurring?.interval === 'year' ? Math.round(amount / 12) : amount
        }
      }
    } catch { /* Stripe unavailable: report 0 rather than fail the email */ }

    // ── Teams: coaches sign up, but do their players join? ─────────────────
    const teamsTotal = await count('teams')
    const teamPlayers = await count('team_members')

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
    const replyRate = pct(replied, contactedTotal)

    // Per-campaign breakdown of this week's first touches (Brevo tracks delivery and opens).
    const { data: weekContacts } = await sb
      .from('marketing_contacts')
      .select('campaign, status, delivered, opened')
      .gte('contacted_at', weekAgo)
    const campaigns: Record<string, { sent: number; delivered: number; opened: number; bounced: number; replied: number }> = {}
    for (const c of weekContacts ?? []) {
      const k = c.campaign || 'No campaign'
      campaigns[k] ??= { sent: 0, delivered: 0, opened: 0, bounced: 0, replied: 0 }
      campaigns[k].sent++
      if (c.delivered) campaigns[k].delivered++
      if (c.opened) campaigns[k].opened++
      if (c.status === 'bounced') campaigns[k].bounced++
      if (c.status === 'replied') campaigns[k].replied++
    }
    const weekTotals = Object.values(campaigns).reduce(
      (t, c) => ({ delivered: t.delivered + c.delivered, opened: t.opened + c.opened, bounced: t.bounced + c.bounced }),
      { delivered: 0, opened: 0, bounced: 0 },
    )
    const campaignRows: [string, string | number][] = Object.entries(campaigns)
      .sort((a, b) => b[1].sent - a[1].sent)
      .map(([name, c]) => [
        name,
        `${c.sent} sent, ${c.opened} opened (${pct(c.opened, c.delivered)})${c.bounced ? `, ${c.bounced} bounced` : ''}${c.replied ? `, ${c.replied} replied` : ''}`,
      ] as [string, string])

    // ── Website: Google Search Console, this week against the week before ──
    let sc: ScSummary | null = null
    let scError = ''
    if (searchConsoleConfigured()) {
      try { sc = await getSummary(7) } catch (e) { scError = String(e).slice(0, 200) }
    }
    const websiteRows: [string, string | number][] = sc
      ? [
          ['Clicks from Google', vsLastWeek(sc.totals.clicks, sc.previous.clicks)],
          ['Times shown in Google results', vsLastWeek(sc.totals.impressions, sc.previous.impressions)],
          ['Click-through rate', `${(sc.totals.ctr * 100).toFixed(1)}% (last week ${(sc.previous.ctr * 100).toFixed(1)}%)`],
          ['Average position', sc.totals.position ? `${sc.totals.position.toFixed(1)} (last week ${sc.previous.position ? sc.previous.position.toFixed(1) : '—'})` : '—'],
        ]
      : [[scError ? `Search Console error: ${scError}` : 'Search Console not connected', '—']]
    const queryRows: [string, string | number][] = sc && sc.queries.length > 0
      ? sc.queries.slice(0, 8).map(r => [`"${r.keys[0]}"`, `${r.impressions} shown, ${r.clicks} clicks, pos ${r.position.toFixed(1)}`] as [string, string])
      : [['No search terms recorded yet', '—']]
    const pageRows: [string, string | number][] = sc && sc.pages.length > 0
      ? sc.pages.slice(0, 8).map(r => [shortPath(r.keys[0]), `${r.impressions} shown, ${r.clicks} clicks`] as [string, string])
      : [['No pages recorded yet', '—']]
    const targetRows: [string, string | number][] = sc
      ? sc.targets.map(t => [`"${t.query}"`, t.position == null ? 'not ranking yet' : `pos ${t.position.toFixed(1)}, ${t.impressions} shown, ${t.clicks} clicks`] as [string, string])
      : []

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

          ${signupRows.length > 0 ? section('Who signed up this week', signupRows) : ''}

          ${section('Funnel', [
            ['Paying customers (Stripe, not lapsed)', paying],
            ['Monthly recurring revenue', `£${(mrrPence / 100).toFixed(2)}`],
            ['Golfers who logged a round this week', activeWeek],
            ['Golfers who logged a round in 30 days', activeMonth],
            ['Members who have never logged a round', neverLogged],
            ['Coach teams / players joined', `${teamsTotal} / ${teamPlayers}`],
          ])}

          ${section(`Website: Google search, ${sc ? `${sc.range.start} to ${sc.range.end}` : 'last 7 days'}`, websiteRows)}
          ${sc ? section('Top search terms', queryRows) : ''}
          ${sc ? section('Top pages in Google', pageRows) : ''}
          ${targetRows.length > 0 ? section('Target keywords', targetRows) : ''}

          ${section('Outreach this week (Outreach Engine)', [
            ['First-touch emails sent', contactedWeek],
            ['Delivered', weekTotals.delivered],
            ['Opened', `${weekTotals.opened} (${pct(weekTotals.opened, weekTotals.delivered)} of delivered)`],
            ['Bounced', weekTotals.bounced],
            ['Follow-ups sent', followedWeek],
            ['New contacts found', contactsFoundWeek],
          ])}
          ${campaignRows.length > 0 ? section('By campaign this week', campaignRows) : ''}

          ${section('Outreach all-time', [
            ['Contacts emailed', contactedTotal + bounced],
            ['Replies', replied],
            ['Reply rate', replyRate],
            ['Bounced', bounced],
            ['Verified, waiting to be emailed', verified],
            ['Crawl queue remaining', queuePending],
          ])}
          <p style="font-family:${FONT};font-size:12.5px;color:#888;margin:8px 0 0;">Club emails sent from info@ by the Mac outreach script are not counted here; it sends its own Friday summary.</p>

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
