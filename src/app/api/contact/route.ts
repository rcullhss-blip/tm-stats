import { NextResponse } from 'next/server'
import { EMAIL_FROM } from '@/lib/email-from'
import { Resend } from 'resend'
import { withinDailyLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  // "website" is a hidden box real people never see or fill in. Bots do.
  // Pretend it worked so they do not learn to skip it.
  if (body.website) return NextResponse.json({ success: true })
  const name = String(body.name ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 100)
  const email = String(body.email ?? '').trim().slice(0, 200)
  const message = String(body.message ?? '').trim().slice(0, 5000)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!(await withinDailyLimit(request, 'contact', 5))) {
    return NextResponse.json({ error: 'Too many messages today. Email info@tmstatsgolf.com instead.' }, { status: 429 })
  }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [process.env.CONTACT_FORM_TO || 'info@tmstatsgolf.com'],
    replyTo: email,
    subject: `Contact form: ${name || email}`,
    text: `From: ${name || 'Unknown'} <${email}>\n\n${message}`,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
