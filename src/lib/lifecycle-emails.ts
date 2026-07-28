import { createHmac } from 'crypto'

const SITE = 'https://tmstatsgolf.com'

export function unsubscribeSig(userId: string): string {
  return createHmac('sha256', process.env.CRON_SECRET ?? 'tmstats').update(userId).digest('hex').slice(0, 24)
}

export function unsubscribeUrl(userId: string): string {
  return `${SITE}/api/email/unsubscribe?id=${userId}&sig=${unsubscribeSig(userId)}`
}

function wrap(userId: string, firstName: string, bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0F1117; color: #F0F0F0; border-radius: 12px; overflow: hidden;">
    <div style="padding: 24px 32px; border-bottom: 3px solid #CC2222;">
      <span style="color: #fff; font-size: 18px; font-weight: bold; letter-spacing: 2px;">TM STATS</span>
    </div>
    <div style="padding: 28px 32px;">
      <p style="margin: 0 0 14px;">Hi ${firstName},</p>
      ${bodyHtml}
      <a href="${ctaUrl}" style="display: inline-block; background: #CC2222; color: #fff; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: 600; margin-top: 8px;">${ctaLabel}</a>
      <p style="margin: 24px 0 0; color: #9A9DB0; font-size: 13px;">— Rob, TM Stats · Track to Improve</p>
    </div>
    <div style="padding: 14px 32px; border-top: 1px solid #2E3247;">
      <p style="margin: 0; color: #4A4D60; font-size: 11px;">
        You're receiving this because you have a TM Stats account.
        <a href="${unsubscribeUrl(userId)}" style="color: #4A4D60;">Unsubscribe from these emails</a>
      </p>
    </div>
  </div>`
}

export interface LifecycleEmail {
  type: string
  subject: string
  html: (userId: string, firstName: string) => string
}

export const LIFECYCLE_EMAILS: Record<string, LifecycleEmail> = {
  welcome_nudge: {
    type: 'welcome_nudge',
    subject: 'Your first round is the one that matters',
    html: (id, name) => wrap(id, name, `
      <p style="margin: 0 0 14px; line-height: 1.6;">You signed up to find out where your shots really go — but there's no data in your account yet.</p>
      <p style="margin: 0 0 14px; line-height: 1.6;">Logging a round takes a couple of minutes in Quick mode. Your first <strong>Full Tracking</strong> round includes a free Strokes Gained breakdown — the same analysis used on tour, run on your own game.</p>
    `, 'Log your first round', `${SITE}/rounds/new`),
  },
  sg_explainer: {
    type: 'sg_explainer',
    subject: 'What your Strokes Gained numbers actually mean',
    html: (id, name) => wrap(id, name, `
      <p style="margin: 0 0 14px; line-height: 1.6;">You've logged a Full Tracking round — so you've seen your Strokes Gained breakdown. Here's the 30-second version of how to read it:</p>
      <p style="margin: 0 0 14px; line-height: 1.6;"><strong>The most negative category is where your shots are going.</strong> Not where you <em>think</em> they're going — where the data says. Most golfers blame the driver; the data usually points at approach play or putting.</p>
      <p style="margin: 0 0 14px; line-height: 1.6;">Practise the worst category for two weeks, log your rounds, and watch the number move.</p>
    `, 'See your round', `${SITE}/rounds`),
  },
  upgrade_push: {
    type: 'upgrade_push',
    subject: "You're almost at your round limit",
    html: (id, name) => wrap(id, name, `
      <p style="margin: 0 0 14px; line-height: 1.6;">You're clearly using TM Stats properly — you're nearly at the 5-round free limit.</p>
      <p style="margin: 0 0 14px; line-height: 1.6;">Pro is £4.99/month (or £50/year) and unlocks unlimited rounds, <strong>Strokes Gained on every round</strong>, SG trends, and AI coaching that reads your actual numbers. Other platforms charge several times that for SG alone.</p>
    `, 'Go Pro', `${SITE}/upgrade`),
  },
  winback: {
    type: 'winback',
    subject: 'Your stats are still here',
    html: (id, name) => wrap(id, name, `
      <p style="margin: 0 0 14px; line-height: 1.6;">It's been a while since your last round. Every round you logged is still in your account — your history, trends, and Strokes Gained data are all waiting.</p>
      <p style="margin: 0 0 14px; line-height: 1.6;">One round is all it takes to pick the thread back up.</p>
    `, 'Log a round', `${SITE}/rounds/new`),
  },
}
