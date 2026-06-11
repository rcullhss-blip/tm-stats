import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/brevo'

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const { subject, content, listIds } = await request.json()

  if (!subject || !content) {
    return NextResponse.json({ error: 'subject and content required' }, { status: 400 })
  }

  // Send to Rob's address first as a test, or to a Brevo list if listIds provided
  // For now sends to the admin email as confirmation — extend later with Brevo campaign API
  try {
    await sendEmail({
      to: [{ email: 'rcullhss@gmail.com', name: 'Rob Cull' }],
      subject,
      htmlContent: content,
      tags: ['newsletter'],
    })

    return NextResponse.json({ ok: true, sent: 1 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
