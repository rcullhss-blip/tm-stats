import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { claimEmail } from '@/lib/claim-link'
import { PERSONAL_FROM, REPLY_TO } from '@/lib/lifecycle-emails'

export const maxDuration = 60

const LOG_TYPE = 'team_claim'

interface Pending {
  id: string
  email: string
  name: string | null
  promo_expires_at: string | null
}

// Players on each team whose account we created and who have not yet opened it
// (still flagged needs_claim), split by whether the claim email has gone out.
async function loadTeams() {
  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = service as any

  const needsClaim = new Set<string>()
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 })
    const list = data?.users ?? []
    if (error || list.length === 0) break
    for (const u of list) if (u.app_metadata?.needs_claim === true) needsClaim.add(u.id)
    if (list.length < 200) break
  }

  const [{ data: teams }, { data: members }, { data: users }, { data: log }] = await Promise.all([
    sb.from('teams').select('id, name, coach_user_id'),
    sb.from('team_members').select('team_id, user_id'),
    sb.from('users').select('id, email, name, promo_expires_at, email_opt_out'),
    sb.from('email_log').select('user_id').eq('email_type', LOG_TYPE),
  ])
  const userById = new Map<string, Pending & { email_opt_out: boolean | null }>((users ?? []).map((u: Pending) => [u.id, u]))
  const emailed = new Set<string>((log ?? []).map((l: { user_id: string }) => l.user_id))

  return (teams ?? []).map((t: { id: string; name: string; coach_user_id: string }) => {
    const waiting = (members ?? [])
      .filter((m: { team_id: string; user_id: string }) => m.team_id === t.id && needsClaim.has(m.user_id))
      .map((m: { user_id: string }) => userById.get(m.user_id))
      .filter((u: (Pending & { email_opt_out: boolean | null }) | undefined) => u && u.email && !u.email_opt_out) as Pending[]
    return {
      id: t.id,
      name: t.name,
      coachName: userById.get(t.coach_user_id)?.name ?? null,
      toSend: waiting.filter(u => !emailed.has(u.id)),
      alreadySent: waiting.filter(u => emailed.has(u.id)).length,
    }
  })
}

export async function GET() {
  if (!(await assertAdmin())) return forbidden()
  const teams = await loadTeams()
  return NextResponse.json({
    teams: teams
      .filter((t: { toSend: Pending[]; alreadySent: number }) => t.toSend.length > 0 || t.alreadySent > 0)
      .map((t: { id: string; name: string; toSend: Pending[]; alreadySent: number }) => ({
        id: t.id, name: t.name, toSend: t.toSend.length, alreadySent: t.alreadySent,
      })),
  })
}

// action "preview": returns the email exactly as a player would see it (with a
// dead link) plus who it would go to. Sends nothing.
// action "send": emails every waiting player on the team who has not had it.
export async function POST(request: Request) {
  if (!(await assertAdmin())) return forbidden()
  const body = await request.json().catch(() => ({}))
  const team = (await loadTeams()).find((t: { id: string }) => t.id === body?.teamId)
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  if (body.action === 'preview') {
    const sample: Pending = team.toSend[0] ?? { id: 'preview', email: '', name: null, promo_expires_at: null }
    const { subject, html } = claimEmail({
      userId: sample.id,
      firstName: sample.name?.split(' ')[0] ?? null,
      coachName: team.coachName,
      teamName: team.name,
      freeUntil: sample.promo_expires_at,
      linkUrl: '#',
    })
    return NextResponse.json({ subject, html, recipients: team.toSend.map((u: Pending) => u.email) })
  }

  if (body.action !== 'send') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Resend not configured' }, { status: 503 })
  const resend = new Resend(apiKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any

  let sent = 0
  const failed: string[] = []
  for (const u of team.toSend as Pending[]) {
    const { subject, html } = claimEmail({
      userId: u.id,
      firstName: u.name?.split(' ')[0] ?? null,
      coachName: team.coachName,
      teamName: team.name,
      freeUntil: u.promo_expires_at,
    })
    const { error } = await resend.emails.send({ from: PERSONAL_FROM, replyTo: REPLY_TO, to: [u.email], subject, html })
    if (error) { failed.push(u.email); continue }
    await sb.from('email_log').insert({ user_id: u.id, email_type: LOG_TYPE })
    sent++
    await new Promise(r => setTimeout(r, 600))
  }
  return NextResponse.json({ ok: true, sent, failed })
}
