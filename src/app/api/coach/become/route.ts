import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe'
import { EMAIL_FROM } from '@/lib/email-from'
import { approvalLink } from '@/lib/coach-approval'

// A coach asks for a team: the team is made straight away, but the account only
// becomes a coach account once Rob approves it from the email he is sent.
// Until then /coach says it is being checked.
const KINDS = ['College', 'High school', 'Club', 'Academy', 'Other'] as const

function joinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const teamName = typeof body.teamName === 'string' ? body.teamName.trim().slice(0, 80) : ''
  const kind = KINDS.includes(body.kind) ? body.kind as string : 'Other'
  const organisation = typeof body.organisation === 'string' ? body.organisation.trim().slice(0, 120) : ''
  if (teamName.length < 2) return NextResponse.json({ error: 'Give your team a name' }, { status: 400 })
  if (body.confirm !== true) return NextResponse.json({ error: 'Tick the box to confirm you coach this team' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: me } = await service.from('users').select('name, email, subscription_status, stripe_customer_id').eq('id', user.id).maybeSingle()
  if (me?.subscription_status === 'team') return NextResponse.json({ error: 'You already have a coach account' }, { status: 409 })
  const { data: pendingTeam } = await service.from('teams').select('id').eq('coach_user_id', user.id).maybeSingle()
  if (pendingTeam) return NextResponse.json({ error: 'Your team is already waiting for approval' }, { status: 409 })

  // A golfer paying for Pro or Elite by card would keep being charged: sort that by hand
  if (me?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const subs = await getStripe().subscriptions.list({ customer: me.stripe_customer_id, status: 'active', limit: 5 })
      if (subs.data.length > 0) return NextResponse.json({ error: 'You have a paid plan on this account. Email info@tmstatsgolf.com and we will switch it to a coach account without charging you twice.' }, { status: 409 })
    } catch {}
  }

  const { data: owned } = await service.from('teams').select('id').eq('coach_user_id', user.id).maybeSingle()
  let code = ''
  if (!owned) {
    for (let attempt = 0; attempt < 6 && !code; attempt++) {
      const candidate = joinCode()
      const { error } = await service.from('teams').insert({ name: teamName, coach_user_id: user.id, join_code: candidate })
      if (!error) code = candidate
    }
    if (!code) return NextResponse.json({ error: 'Could not create the team. Try again.' }, { status: 500 })
  }
  // Let Rob know (fire and forget)
  if (process.env.RESEND_API_KEY) {
    new Resend(process.env.RESEND_API_KEY).emails.send({
      from: EMAIL_FROM,
      to: [process.env.CONTACT_FORM_TO || 'info@tmstatsgolf.com'],
      subject: `Approve new coach? ${teamName}`,
      text: `${me?.name ?? 'A coach'} (${me?.email ?? user.email}) wants to set up a team.\n\nTeam: ${teamName}\nType: ${kind}\nSchool or club: ${organisation || 'not given'}\n\nApprove or decline here (one tap, then confirm):\n${approvalLink(user.id)}\n\nThey get coach access, with Elite, as soon as you approve, and an email to say so.`,
    }).catch(() => {})
  }
  return NextResponse.json({ ok: true, pending: true })
}
