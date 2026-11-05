import { createHmac } from 'crypto'
import { EMAIL_FROM } from '@/lib/email-from'

const SITE = 'https://tmstatsgolf.com'

// Lifecycle emails read as a personal note from Rob, and replies land in the
// info@ inbox so a golfer can just hit reply.
export const REPLY_TO = 'info@tmstatsgolf.com'

// Same sending address as every other Resend email, shown as coming from Rob.
export const PERSONAL_FROM = (() => {
  const match = EMAIL_FROM.match(/<([^>]+)>/)
  const address = match ? match[1] : EMAIL_FROM
  return `Rob at TM Stats <${address}>`
})()

export function unsubscribeSig(userId: string): string {
  return createHmac('sha256', process.env.CRON_SECRET ?? 'tmstats').update(userId).digest('hex').slice(0, 24)
}

export function unsubscribeUrl(userId: string): string {
  return `${SITE}/api/email/unsubscribe?id=${userId}&sig=${unsubscribeSig(userId)}`
}

const P = 'margin: 0 0 16px; line-height: 1.6;'

export function para(text: string): string {
  return `<p style="${P}">${text}</p>`
}

// Plain note layout: no banner, no button, just text and one link, signed by Rob.
// greeting is the full opening line, e.g. "Hi Sam," or "Hi,".
export function personalNote(opts: {
  userId: string
  greeting: string
  bodyHtml: string
  linkLabel: string
  linkUrl: string
  afterLinkHtml?: string
  footerReason?: string
}): string {
  const reason = opts.footerReason ?? 'You are getting this because you have a TM Stats account.'
  return `
  <div style="font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0; padding: 8px 4px; color: #1A1D27; font-size: 15px;">
    <p style="${P}">${opts.greeting}</p>
    ${opts.bodyHtml}
    <p style="${P}"><a href="${opts.linkUrl}" style="color: #CC2222; font-weight: 600;">${opts.linkLabel}</a></p>
    ${opts.afterLinkHtml ?? ''}
    <p style="margin: 0 0 4px; line-height: 1.6;">Rob</p>
    <p style="margin: 0 0 24px; line-height: 1.6; color: #5A5D70; font-size: 13px;">Rob Cull, TM Stats</p>
    <p style="margin: 0; color: #9A9DB0; font-size: 11px; line-height: 1.5;">
      ${reason}
      <a href="${unsubscribeUrl(opts.userId)}" style="color: #9A9DB0;">Unsubscribe from these emails</a>
    </p>
  </div>`
}

function note(userId: string, firstName: string, bodyHtml: string, linkLabel: string, linkUrl: string, afterLinkHtml?: string): string {
  return personalNote({ userId, greeting: `Hi ${firstName},`, bodyHtml, linkLabel, linkUrl, afterLinkHtml })
}

const REPLY_LINE = para('If anything put you off or did not make sense, just reply to this email. It comes straight to me.')

export interface LifecycleEmail {
  type: string
  subject: string
  html: (userId: string, firstName: string) => string
}

export const LIFECYCLE_EMAILS: Record<string, LifecycleEmail> = {
  welcome_nudge: {
    type: 'welcome_nudge',
    subject: 'Got a scorecard from your last round?',
    html: (id, name) => note(id, name,
      para('Rob here. I built TM Stats. I noticed you have not logged a round yet, so your account is empty at the minute.') +
      para('If you have a card from your last round, it takes about two minutes to put in using Quick mode: score, fairways, greens and putts for each hole.') +
      para('If you want the full picture, use <strong>Full Tracking</strong>. Your first one comes with a free Strokes Gained breakdown, the same analysis the tour players get, run on your own game.'),
      'Log your first round', `${SITE}/rounds/new`, REPLY_LINE),
  },
  welcome_nudge_2: {
    type: 'welcome_nudge_2',
    subject: 'Quick question',
    html: (id, name) => note(id, name,
      para('Quick question, and an honest answer helps me more than a polite one.') +
      para('You signed up to TM Stats but have not logged a round. Which of these is closest?') +
      para('1. I have not played since I signed up<br>2. It looked like too much to enter<br>3. Something did not work<br>4. Something else') +
      para('Just reply with the number. If it is 3 or 4, tell me what happened and I will sort it.') +
      para('And if it is 1, this is the link for when you next play:'),
      'Log a round', `${SITE}/rounds/new`),
  },
  sg_explainer: {
    type: 'sg_explainer',
    subject: 'What your Strokes Gained numbers actually mean',
    html: (id, name) => note(id, name,
      para('You have logged a Full Tracking round, so you have seen your Strokes Gained breakdown. Here is the 30 second version of how to read it.') +
      para('<strong>The most negative category is where your shots are going.</strong> Not where you think they are going, where the numbers say. Most golfers blame the driver. The data usually points at approach play or putting.') +
      para('Practise the worst category for two weeks, keep logging your rounds, and watch the number move.'),
      'See your round', `${SITE}/rounds`, para('If any of the numbers look wrong to you, reply and tell me. I read every one.')),
  },
  upgrade_push: {
    type: 'upgrade_push',
    subject: 'You are almost at your round limit',
    html: (id, name) => note(id, name,
      para('You are clearly using TM Stats properly, and you are nearly at the 5 round free limit.') +
      para('Pro is £4.99 a month (or £50 a year). That gets you unlimited rounds, <strong>Strokes Gained on every round</strong>, trends over time and AI coaching that reads your actual numbers. Other platforms charge several times that for Strokes Gained alone.'),
      'Go Pro', `${SITE}/upgrade`, para('Any questions before you decide, just reply.')),
  },
  lapsed_never_started: {
    type: 'lapsed_never_started',
    subject: 'Still want to see where your shots go?',
    html: (id, name) => note(id, name,
      para('Rob here from TM Stats. You signed up a while back but never logged a round, so there is nothing in your account yet. No pressure, just a nudge.') +
      para('It takes about two minutes in Quick mode. Use Full Tracking on your first one and you get a free Strokes Gained breakdown straight away.'),
      'Log your first round', `${SITE}/rounds/new`, REPLY_LINE),
  },
  winback: {
    type: 'winback',
    subject: 'Your stats are still here',
    html: (id, name) => note(id, name,
      para('It has been a while since your last round. Everything you logged is still in your account: your history, your trends and your Strokes Gained numbers.') +
      para('One round is all it takes to pick the thread back up.'),
      'Log a round', `${SITE}/rounds/new`, para('If something about the app made you stop, I would like to know. Just reply.')),
  },
}
