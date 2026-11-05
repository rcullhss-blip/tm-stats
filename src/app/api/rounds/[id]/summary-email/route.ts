import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { loadRoundSummary, renderRoundPdf, toParText } from '@/lib/round-summary'
import { personalNote, para, PERSONAL_FROM, REPLY_TO } from '@/lib/lifecycle-emails'

export const maxDuration = 30

// Emails the golfer a branded PDF breakdown of the round they just saved, and
// copies their coach if they are on a team. Called once by the app right after
// a round is saved. Sends at most once per round (email_log), and never to
// someone who has unsubscribed.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Resend not configured' }, { status: 503 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any
  // Ownership is enforced inside loadRoundSummary (round must belong to this user).
  const summary = await loadRoundSummary(sb, id, user.id)
  if (!summary) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  if (summary.optedOut) return NextResponse.json({ ok: true, skipped: 'unsubscribed' })

  // Claim the send first: the unique (user, type) rule makes a second call for
  // the same round a no-op, so a double tap on Save cannot send two emails.
  const logType = `rs:${id}` // 39 characters, inside the column's 40 limit
  const { error: logError } = await sb.from('email_log').insert({ user_id: user.id, email_type: logType })
  if (logError) return NextResponse.json({ ok: true, skipped: 'already sent' })

  let logo: Uint8Array | null = null
  try {
    const res = await fetch(`${new URL(request.url).origin}/logo-black.png`, { signal: AbortSignal.timeout(4000) })
    if (res.ok) logo = new Uint8Array(await res.arrayBuffer())
  } catch { /* the PDF falls back to a text wordmark */ }

  const pdf = await renderRoundPdf(summary, logo)

  // Coach copy, if the golfer is on a team
  const cc: string[] = []
  const { data: memberships } = await sb.from('team_members').select('team_id').eq('user_id', user.id)
  const teamIds = (memberships ?? []).map((m: { team_id: string }) => m.team_id)
  if (teamIds.length > 0) {
    const { data: teams } = await sb.from('teams').select('coach_user_id').in('id', teamIds)
    const coachIds = (teams ?? []).map((t: { coach_user_id: string }) => t.coach_user_id).filter((c: string) => c && c !== user.id)
    if (coachIds.length > 0) {
      const { data: coaches } = await sb.from('users').select('email, email_opt_out').in('id', coachIds)
      for (const c of coaches ?? []) if (c.email && !c.email_opt_out) cc.push(c.email)
    }
  }

  const scoreLine = `${summary.score} (${toParText(summary.score, summary.par)})`
  const firstName = summary.playerName?.split(' ')[0]
  const html = personalNote({
    userId: user.id,
    greeting: firstName ? `Hi ${firstName},` : 'Hi,',
    bodyHtml:
      para(`Nice work getting that one logged. Your breakdown from ${escapeHtml(summary.courseName)} is attached as a PDF.`) +
      para(`<strong>${scoreLine}.</strong> ${escapeHtml(summary.focusText)}`),
    linkLabel: 'See the full round',
    linkUrl: `https://www.tmstatsgolf.com/rounds/${id}`,
    afterLinkHtml: para('If any of the numbers look wrong to you, reply and tell me.'),
    footerReason: 'You are getting this because you logged a round on TM Stats.',
  })

  const fileDate = String(summary.date).slice(0, 10)
  const resend = new Resend(apiKey)
  const { error: sendError } = await resend.emails.send({
    from: PERSONAL_FROM,
    replyTo: REPLY_TO,
    to: [summary.playerEmail],
    ...(cc.length > 0 ? { cc } : {}),
    subject: `Your round at ${summary.courseName}: ${scoreLine}`,
    html,
    attachments: [{ filename: `TM-Stats-round-${fileDate}.pdf`, content: Buffer.from(pdf) }],
  })

  if (sendError) {
    // Release the claim so it can be retried
    await sb.from('email_log').delete().eq('user_id', user.id).eq('email_type', logType)
    return NextResponse.json({ error: 'Could not send' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, sent: true, coachCopied: cc.length })
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
