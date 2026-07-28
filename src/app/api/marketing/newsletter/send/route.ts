import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/brevo'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 60

// Sends the newsletter. Default is a test to Rob only; pass audience: 'subscribers'
// to send to the live list captured via the site footer signup.
export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const { subject, content, audience } = await request.json()

  if (!subject || !content) {
    return NextResponse.json({ error: 'subject and content required' }, { status: 400 })
  }

  try {
    if (audience !== 'subscribers') {
      // Test send to Rob
      await sendEmail({
        to: [{ email: 'rcullhss@gmail.com', name: 'Rob Cull' }],
        subject: `[TEST] ${subject}`,
        htmlContent: content,
        tags: ['newsletter-test'],
      })
      return NextResponse.json({ ok: true, sent: 1, mode: 'test' })
    }

    const supabase = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subs } = await (supabase as any)
      .from('subscribers')
      .select('email')
      .eq('unsubscribed', false)

    const emails: string[] = (subs ?? []).map((s: { email: string }) => s.email)
    if (emails.length === 0) {
      return NextResponse.json({ error: 'No subscribers yet — the footer signup feeds this list' }, { status: 400 })
    }

    // One send per recipient so a single bad address never blocks the rest
    let sent = 0
    for (const email of emails) {
      try {
        await sendEmail({
          to: [{ email, name: email.split('@')[0] }],
          subject,
          htmlContent: content,
          tags: ['newsletter'],
        })
        sent++
      } catch {
        // skip failures, continue the run
      }
    }

    return NextResponse.json({ ok: true, sent, total: emails.length, mode: 'subscribers' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
