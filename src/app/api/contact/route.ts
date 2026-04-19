import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const name = (body.name as string) || 'Not provided'
  const email = body.email as string
  const message = body.message as string

  if (!email || !message) {
    return NextResponse.json({ error: 'Email and message are required' }, { status: 400 })
  }

  try {
    await resend.emails.send({
      from: 'TM Stats <noreply@tmstatsgolf.com>',
      to: 'info@tmstatsgolf.com',
      replyTo: email,
      subject: `TM Stats enquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
