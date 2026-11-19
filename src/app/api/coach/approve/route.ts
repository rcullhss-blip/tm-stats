import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { validApproval } from '@/lib/coach-approval'
import { EMAIL_FROM } from '@/lib/email-from'

// Rob approves or declines a coach from the link in his email.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const userId = String(body.u ?? '')
  if (!validApproval(userId, String(body.s ?? ''))) return NextResponse.json({ error: 'This link is not valid' }, { status: 403 })
  const decision = body.decision === 'decline' ? 'decline' : 'approve'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: user } = await service.from('users').select('id, name, email, subscription_status').eq('id', userId).maybeSingle()
  if (!user) return NextResponse.json({ error: 'That account no longer exists' }, { status: 404 })
  const { data: team } = await service.from('teams').select('id, name, join_code').eq('coach_user_id', userId).maybeSingle()

  if (decision === 'decline') {
    if (user.subscription_status === 'team') return NextResponse.json({ error: 'Already approved. Switch them back from the admin page instead.' }, { status: 409 })
    if (team) await service.from('teams').delete().eq('id', team.id)
    return NextResponse.json({ ok: true, decision })
  }

  if (user.subscription_status === 'team') return NextResponse.json({ ok: true, decision, already: true })
  const { error } = await service.from('users').update({ subscription_status: 'team', promo_expires_at: null }).eq('id', userId)
  if (error) return NextResponse.json({ error: 'Could not approve. Try again.' }, { status: 500 })

  if (process.env.RESEND_API_KEY && user.email) {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: EMAIL_FROM,
      replyTo: 'info@tmstatsgolf.com',
      to: [user.email],
      subject: 'Your TM Stats team is ready',
      text: `Hi ${user.name?.split(' ')[0] ?? 'Coach'},\n\nYour team${team ? ` (${team.name})` : ''} is set up and ready.\n\nOpen TM Stats and tap Coach to get your join code or QR code to send to your players: https://www.tmstatsgolf.com/coach\n\nAny questions, just reply.\n\nRob\nTM Stats`,
    }).catch(() => {})
  }
  return NextResponse.json({ ok: true, decision })
}
