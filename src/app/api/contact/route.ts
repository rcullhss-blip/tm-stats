import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const { name, email, message } = await request.json()
  if (!email || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: 'TM Stats <noreply@tmstatsgolf.com>',
    to: ['rob.tmstats@gmail.com'],
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
