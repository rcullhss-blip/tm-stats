import { NextResponse } from 'next/server'
import { EMAIL_FROM } from '@/lib/email-from'
import { Resend } from 'resend'
import { sendEmail } from '@/lib/brevo'
import { LIFECYCLE_EMAILS } from '@/lib/lifecycle-emails'
import { DRIP_TEMPLATES, FOLLOW_UP } from '@/lib/outreach-templates'

export const maxDuration = 120

const DEFAULT_TO = 'rcullhss@gmail.com'

// Sends a copy of every automated email to Rob so he can review them in his
// real inbox. Gated by CRON_SECRET. Usage:
//   /api/dev/test-emails?key=<CRON_SECRET>
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { email: string; via: string; ok: boolean; error?: string }[] = []
  const promoCode = process.env.MARKETING_PROMO_CODE || 'TMSTATS3FREE'
  const only = searchParams.get('only') ?? 'all'
  const TEST_TO = searchParams.get('to') ?? DEFAULT_TO
  // Until tmstatsgolf.com is verified in Resend, tests can go out via Resend's
  // built-in test sender (delivers to the account owner's email only)
  const fromAddr = searchParams.get('testSender') === '1'
    ? 'TM Stats <onboarding@resend.dev>'
    : EMAIL_FROM

  // ── Resend: lifecycle emails ────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && (only === 'all' || only === 'resend')) {
    const resend = new Resend(resendKey)
    for (const [type, template] of Object.entries(LIFECYCLE_EMAILS)) {
      try {
        const { error } = await resend.emails.send({
          from: fromAddr,
          to: [TEST_TO],
          subject: `[TEST · lifecycle/${type}] ${template.subject}`,
          html: template.html('test-user-id', 'Rob'),
        })
        results.push({ email: `lifecycle:${type}`, via: 'Resend', ok: !error, error: error?.message })
      } catch (e) {
        results.push({ email: `lifecycle:${type}`, via: 'Resend', ok: false, error: String(e) })
      }
      await new Promise(r => setTimeout(r, 600))
    }

    // Coach weekly digest sample
    try {
      const { error } = await resend.emails.send({
        from: fromAddr,
        to: [TEST_TO],
        subject: '[TEST · coach digest] Cheshire Juniors: 5 rounds logged this week',
        text: [
          'Hi Rob,',
          '',
          "Here's your Cheshire Juniors week on TM Stats:",
          '',
          'Tom H (HCP 4): 2 rounds, avg +3, best +1 — Bromborough (73), Macclesfield (77)',
          'Sam P (HCP 8.2): 2 rounds, avg +7.5, best +6 — Bromborough (78), Bromborough (81)',
          'Ella W (HCP 12): 1 round, avg +9, best +9 — Prestbury (81)',
          '',
          'No rounds logged this week: Jack T',
          '',
          'See full stats, Strokes Gained and AI feedback for every player in your coach dashboard:',
          'https://tmstatsgolf.com/coach',
          '',
          '— TM Stats · Track to Improve',
        ].join('\n'),
      })
      results.push({ email: 'coach-weekly-digest', via: 'Resend', ok: !error, error: error?.message })
    } catch (e) {
      results.push({ email: 'coach-weekly-digest', via: 'Resend', ok: false, error: String(e) })
    }
    await new Promise(r => setTimeout(r, 600))

    // Social draft sample with image attached
    try {
      const origin = new URL(request.url).origin
      const imgRes = await fetch(`${origin}/api/social-image?h=${encodeURIComponent('Most missed greens finish short')}&s=${encodeURIComponent('One more club is the cheapest improvement in golf')}`)
      const attachment = imgRes.ok
        ? [{ filename: 'tm-stats-post.png', content: Buffer.from(await imgRes.arrayBuffer()).toString('base64') }]
        : undefined
      const { error } = await resend.emails.send({
        from: fromAddr,
        to: [TEST_TO],
        subject: "[TEST · social draft] This week's Instagram post — image attached, caption below",
        text: `POST THE ATTACHED IMAGE with this caption:\n\n----------------------------------------\n\nMost amateur golfers are one club short — literally. The data shows the majority of missed greens finish short of the flag, not long.\n\nNext round: take one more club than instinct says, aim for the middle of the green, and watch your GIR climb.\n\nTrack where YOUR misses go — link in bio.\n\n#golf #golfstats #strokesgained #golftips #amateurgolf\n\n----------------------------------------\n\n(This is a sample caption — the real Thursday email writes a fresh one each week.)`,
        ...(attachment ? { attachments: attachment } : {}),
      })
      results.push({ email: 'social-draft (with image)', via: 'Resend', ok: !error, error: error?.message })
    } catch (e) {
      results.push({ email: 'social-draft (with image)', via: 'Resend', ok: false, error: String(e) })
    }
  } else if (only === 'all' || only === 'resend') {
    results.push({ email: 'all Resend emails', via: 'Resend', ok: false, error: 'RESEND_API_KEY not set' })
  }

  // ── Brevo: outreach drip emails ─────────────────────────────────────────────
  if (process.env.BREVO_API_KEY && (only === 'all' || only === 'brevo')) {
    const outreachSamples: { key: string; subject: string; html: string }[] = [
      { key: 'GOLF_CLUB', subject: DRIP_TEMPLATES.GOLF_CLUB.subject, html: DRIP_TEMPLATES.GOLF_CLUB.html('Bromborough Golf Club', promoCode) },
      { key: 'NCAA', subject: DRIP_TEMPLATES.NCAA_D1.subject, html: DRIP_TEMPLATES.NCAA_D1.html('Newberry College', promoCode) },
      { key: 'UK_COLLEGE', subject: DRIP_TEMPLATES.UK_COLLEGE.subject, html: DRIP_TEMPLATES.UK_COLLEGE.html('Loughborough University Golf', promoCode) },
      { key: 'CREATOR', subject: DRIP_TEMPLATES.CREATOR.subject, html: DRIP_TEMPLATES.CREATOR.html('your channel', promoCode) },
      { key: 'FOLLOW_UP', subject: FOLLOW_UP.subject, html: FOLLOW_UP.html('Bromborough Golf Club', promoCode) },
    ]
    for (const sample of outreachSamples) {
      try {
        // Time prefix keeps each test run out of Gmail's old conversation threads
        await sendEmail({
          to: [{ email: TEST_TO, name: 'Rob Cull' }],
          subject: `[TEST ${new Date().toISOString().slice(11, 16)} · outreach/${sample.key}] ${sample.subject}`,
          htmlContent: sample.html,
          tags: ['test'],
        })
        results.push({ email: `outreach:${sample.key}`, via: 'Brevo', ok: true })
      } catch (e) {
        results.push({ email: `outreach:${sample.key}`, via: 'Brevo', ok: false, error: String(e) })
      }
      await new Promise(r => setTimeout(r, 600))
    }
  } else {
    results.push({ email: 'all outreach emails', via: 'Brevo', ok: false, error: 'BREVO_API_KEY not set' })
  }

  const sent = results.filter(r => r.ok).length
  return NextResponse.json({ ok: true, sent, total: results.length, results })
}
