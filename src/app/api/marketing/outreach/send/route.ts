import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/brevo'
import { personaliseOutreachEmail } from '@/lib/marketing-ai'

const TEMPLATES: Record<string, { subject: string; html: string }> = {
  GOLF_CLUB: {
    subject: 'Free 3-Month Access for Your Members – TM Stats Golf',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #fff; color: #1a1a1a;">
        <div style="background: #1a1a1a; padding: 24px 40px; border-bottom: 3px solid #C22431;">
          <span style="color: white; font-size: 18px; font-weight: bold; letter-spacing: 2px;">TM STATS</span>
        </div>
        <div style="padding: 36px 40px;">
          <p style="margin-bottom: 16px;">Dear Club Manager / Secretary / Head Pro,</p>
          <p style="margin-bottom: 16px;">I hope you're well — I'll keep this brief.</p>
          <p style="margin-bottom: 16px;">My name is Rob Cull. I'm a former NCAA Division II golfer at Newberry College and a county player for Cheshire, currently a member at Bromborough Golf Club.</p>
          <p style="margin-bottom: 16px;">I've built a platform called <strong>TM Stats</strong> — a golf performance system that shows players exactly where they're losing shots using <strong>Strokes Gained</strong>, and gives them clear, simple feedback on what to work on.</p>
          <p style="margin-bottom: 16px;">From a coaching perspective, it's particularly useful — members come to lessons already understanding where they're losing shots, making sessions more focused and effective.</p>
          <div style="background: #f8f8f8; border-left: 3px solid #C22431; padding: 16px 20px; margin: 24px 0;">
            <p style="font-weight: bold; margin-bottom: 8px;">Limited Offer — 3 Months Full Access</p>
            <p style="margin: 0;">For your members · Completely free · Use promo code: <strong>{{PROMO_CODE}}</strong></p>
          </div>
          <p style="margin-bottom: 16px;">If this is something you'd be open to, I'd be happy to send a simple sign-up link over.</p>
          <p style="margin-bottom: 4px;">Kind regards,</p>
          <p style="margin-bottom: 0;"><strong>Rob Cull</strong><br>Founder, TM Stats Golf<br>tmstatsgolf.com</p>
        </div>
        <div style="background: #1a1a1a; padding: 16px 40px; text-align: center;">
          <p style="color: #888; font-size: 11px; margin: 0;">One-time outreach from an independent developer. No spam.</p>
        </div>
      </div>
    `,
  },
  NCAA_D1: {
    subject: 'Data-Driven Performance Tracking for Your Program – TM Stats',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #fff; color: #1a1a1a;">
        <div style="background: #1a1a1a; padding: 24px 40px; border-bottom: 3px solid #C22431;">
          <span style="color: white; font-size: 18px; font-weight: bold; letter-spacing: 2px;">TM STATS</span>
        </div>
        <div style="padding: 36px 40px;">
          <p style="margin-bottom: 16px;">Coach,</p>
          <p style="margin-bottom: 16px;">My name is Rob Cull — I played NCAA Division II golf at Newberry College and I'm the founder of TM Stats Golf, a Strokes Gained performance platform built specifically for competitive golfers and coaching programs.</p>
          <p style="margin-bottom: 16px;">I'm reaching out to offer your program <strong>3 months of full access at no cost</strong> — genuinely no catch, I want to get real feedback from college programs and in exchange your athletes get a serious analytics tool at zero cost to your budget.</p>
          <p style="margin-bottom: 16px;"><strong>What TM Stats gives your program:</strong></p>
          <ul style="margin-bottom: 16px; padding-left: 20px; line-height: 1.8;">
            <li>Strokes Gained breakdown across driving, approach, short game, and putting</li>
            <li>Individual player profiles with trend tracking over a season</li>
            <li>Pre-round and post-round insight summaries</li>
            <li>Data your athletes can reference in recruiting conversations</li>
          </ul>
          <div style="background: #f8f8f8; border-left: 3px solid #C22431; padding: 16px 20px; margin: 24px 0;">
            <p style="font-weight: bold; margin-bottom: 8px;">3 Months Free — No Credit Card Required</p>
            <p style="margin: 0;">Unlimited athletes · Use promo code: <strong>{{PROMO_CODE}}</strong></p>
          </div>
          <p style="margin-bottom: 16px;">Happy to jump on a 10-minute call or just send the link directly — whichever is easier.</p>
          <p style="margin-bottom: 4px;">Best,</p>
          <p><strong>Rob Cull</strong><br>Founder, TM Stats Golf<br>tmstatsgolf.com</p>
        </div>
        <div style="background: #1a1a1a; padding: 16px 40px; text-align: center;">
          <p style="color: #888; font-size: 11px; margin: 0;">Outreach from an independent developer and fellow collegiate golfer.</p>
        </div>
      </div>
    `,
  },
  UK_COLLEGE: {
    subject: 'Free Performance Tracking for Your University Golf Team – TM Stats',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #fff; color: #1a1a1a;">
        <div style="background: #1a1a1a; padding: 24px 40px; border-bottom: 3px solid #C22431;">
          <span style="color: white; font-size: 18px; font-weight: bold; letter-spacing: 2px;">TM STATS</span>
        </div>
        <div style="padding: 36px 40px;">
          <p style="margin-bottom: 16px;">Hi,</p>
          <p style="margin-bottom: 16px;">My name is Rob Cull — county golfer for Cheshire, former NCAA Division II player at Newberry College in the States, and founder of TM Stats Golf.</p>
          <p style="margin-bottom: 16px;">I've built a Strokes Gained performance platform for competitive golfers and I'm offering UK university golf programmes <strong>3 months of completely free access</strong> — unlimited players, no setup required from you.</p>
          <p style="margin-bottom: 16px;">The idea is simple: your players track their rounds, the system shows them exactly where they're losing shots, and they improve faster. It's the same statistical framework the European Tour uses, made accessible for amateur players.</p>
          <div style="background: #f8f8f8; border-left: 3px solid #C22431; padding: 16px 20px; margin: 24px 0;">
            <p style="font-weight: bold; margin-bottom: 8px;">3 Months Free — Unlimited Players</p>
            <p style="margin: 0;">Promo code: <strong>{{PROMO_CODE}}</strong> · tmstatsgolf.com</p>
          </div>
          <p style="margin-bottom: 16px;">If it would help your programme, just let me know and I'll send the link straight over.</p>
          <p style="margin-bottom: 4px;">Kind regards,</p>
          <p><strong>Rob Cull</strong><br>TM Stats Golf · tmstatsgolf.com</p>
        </div>
        <div style="background: #1a1a1a; padding: 16px 40px; text-align: center;">
          <p style="color: #888; font-size: 11px; margin: 0;">One-time outreach. No spam.</p>
        </div>
      </div>
    `,
  },
}

TEMPLATES.NCAA_D2 = TEMPLATES.NCAA_D1
TEMPLATES.NCAA_D3 = TEMPLATES.NCAA_D1
TEMPLATES.NAIA = TEMPLATES.NCAA_D1
TEMPLATES.PGA_PRO = TEMPLATES.GOLF_CLUB

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const { campaignName, contacts, promoCode, dailyLimit } = await request.json()

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ error: 'No contacts provided' }, { status: 400 })
  }

  const limit = Math.min(dailyLimit || 280, 280)
  const sendingToday = Math.min(contacts.length, limit)
  const todaysBatch = contacts.slice(0, sendingToday)

  let successCount = 0
  let failCount = 0
  const errors: string[] = []

  for (const contact of todaysBatch) {
    try {
      const template = TEMPLATES[contact.type] || TEMPLATES.GOLF_CLUB
      const htmlWithPromo = template.html.replace(/\{\{PROMO_CODE\}\}/g, promoCode || 'TMSTATS3FREE')

      let finalHtml = htmlWithPromo
      let finalSubject = template.subject

      if (contact.name || contact.organisation) {
        try {
          const personalised = await personaliseOutreachEmail(htmlWithPromo, contact)
          finalHtml = personalised.body
          finalSubject = personalised.subject
        } catch {
          // Fall back to base template silently
        }
      }

      await sendEmail({
        to: [{ email: contact.email, name: contact.name || contact.organisation || '' }],
        subject: finalSubject,
        htmlContent: finalHtml,
        tags: ['outreach', contact.type?.toLowerCase(), campaignName?.toLowerCase().replace(/\s/g, '-')],
      })

      successCount++
      await new Promise(r => setTimeout(r, 400))

    } catch (err: unknown) {
      failCount++
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`${contact.email}: ${message}`)
    }
  }

  return NextResponse.json({
    ok: true,
    campaignName,
    queued: contacts.length,
    sendingToday,
    successCount,
    failCount,
    remainingForLaterDays: contacts.length - sendingToday,
    errors: errors.slice(0, 5),
  })
}
