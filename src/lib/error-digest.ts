import { Resend } from 'resend'
import { EMAIL_FROM } from '@/lib/email-from'
import { ADMIN_EMAIL } from '@/lib/admin-email'
import { createServiceClient } from '@/lib/supabase/service'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Morning error email. Looks at what broke on the site in the last 24 hours,
 * groups repeats together, and emails Rob only if there is something to see.
 * Returns how many errors were found (0 means no email was sent).
 */
export async function sendErrorDigest(): Promise<number> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: rows, error } = await sb
    .from('error_log')
    .select('message, route, path, method, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error || !rows?.length) return 0

  const groups = new Map<string, { route: string; message: string; count: number; last: string; example: string }>()
  for (const r of rows as { message: string; route: string; path: string; method: string; created_at: string }[]) {
    const k = `${r.route}|${r.message}`
    const g = groups.get(k)
    if (g) g.count++
    else groups.set(k, { route: r.route || r.path, message: r.message, count: 1, last: r.created_at, example: `${r.method} ${r.path}` })
  }
  const list = [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 20)
  const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const html = `
  <div style="font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; color: #1A1D27; font-size: 14px;">
    <p style="margin: 0 0 12px;"><strong>${rows.length} error${rows.length === 1 ? '' : 's'} on tmstatsgolf.com in the last 24 hours</strong>, ${list.length} different kind${list.length === 1 ? '' : 's'}.</p>
    <p style="margin: 0 0 16px; color: #555;">Forward this to Claude and ask for a fix. Nothing here means a golfer lost data, only that a page or action failed for someone.</p>
    ${list.map(g => `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; margin: 0 0 10px;">
        <p style="margin: 0 0 4px;"><strong>${g.count}×</strong> ${esc(g.route)}</p>
        <p style="margin: 0 0 4px; font-family: Menlo, monospace; font-size: 12px; color: #B00020;">${esc(g.message)}</p>
        <p style="margin: 0; font-size: 12px; color: #777;">Last seen ${when(g.last)} · ${esc(g.example)}</p>
      </div>`).join('')}
  </div>`

  await new Resend(apiKey).emails.send({
    from: EMAIL_FROM,
    to: [process.env.ERROR_ALERT_TO || ADMIN_EMAIL],
    subject: `TM Stats: ${rows.length} site error${rows.length === 1 ? '' : 's'} in the last 24 hours`,
    html,
  })

  // Keep a month of history, no more
  await sb.from('error_log').delete().lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  return rows.length
}
