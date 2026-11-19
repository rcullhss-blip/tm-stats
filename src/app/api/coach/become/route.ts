import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe'
import { EMAIL_FROM } from '@/lib/email-from'

// A coach sets up their own team: the account becomes a coach account and the
// team is made with a join code. Rob gets an email for every new coach.
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
  const { error: upErr } = await service.from('users').update({ subscription_status: 'team', promo_expires_at: null }).eq('id', user.id)
  if (upErr) return NextResponse.json({ error: 'Could not switch your account. Try again.' }, { status: 500 })

  // Let Rob know (fire and forget)
  if (process.env.RESEND_API_KEY) {
    new Resend(process.env.RESEND_API_KEY).emails.send({
      from: EMAIL_FROM,
      to: [process.env.CONTACT_FORM_TO || 'info@tmstatsgolf.com'],
      subject: `New coach: ${teamName}`,
      text: `${me?.name ?? 'A coach'} (${me?.email ?? user.email}) set up a team.\n\nTeam: ${teamName}\nType: ${kind}\nSchool or club: ${organisation || 'not given'}\nJoin code: ${code || 'existing team'}\n\nIf this does not look like a real coach, switch the account back in the admin page.`,
    }).catch(() => {})
  }
  return NextResponse.json({ ok: true, joinCode: code || null })
}
