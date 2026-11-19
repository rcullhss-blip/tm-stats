import { createHmac } from 'crypto'
import { EMAIL_FROM } from '@/lib/email-from'
import { teamNudgeKey } from '@/lib/team-nudge'

export { teamNudgeKey }

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

// ─── Team reminders ───────────────────────────────────────────────────────────
// Sent to players on a coach's team who have not logged a round for a week.
// Not in LIFECYCLE_EMAILS because it repeats (weekly, with a cap) and names the team.

export const TEAM_NUDGE_SUBJECT = 'Played this week?'

export function teamNudgeHtml(userId: string, firstName: string, teamName: string, everLogged: boolean): string {
  const body = everLogged
    ? para(`No rounds from you on ${teamName} in the last week. If you have played, it takes a couple of minutes to put the round in while you still remember the shots.`) +
      para('Your coach sees who has logged and who has not, and your Strokes Gained only gets useful with rounds in it.')
    : para(`You are on ${teamName} in TM Stats but have not logged a round yet. If you have played this week, put it in while you still remember the shots. Quick mode is score, fairways, greens and putts.`) +
      para('Your coach sees who has logged and who has not.')
  return personalNote({
    userId,
    greeting: `Hi ${firstName},`,
    bodyHtml: body,
    linkLabel: 'Log a round',
    linkUrl: `${SITE}/rounds/new`,
    afterLinkHtml: para('If you have not played, ignore this one.'),
    footerReason: `You are getting this because you are on ${teamName} in TM Stats.`,
  })
}

// ─── "Your scores are in" ─────────────────────────────────────────────────────
// Sent when a coach finishes a qualifying round or uploads a tournament result:
// the golfer's round is already in their account with pars and scores filled in.

export function statsReadySubject(eventName: string): string {
  return `${eventName}: your scores are in, add your stats`
}

export function statsReadyHtml(opts: {
  userId: string; firstName: string; eventName: string; courseName: string; score: number; toPar: string; roundId: string; teamName: string
  // For a player whose account has not been opened yet: a one-tap sign-in link.
  // They choose a password, then the round is waiting on their dashboard.
  claimLink?: string
  // Only the round total came in (no hole-by-hole card): the golfer adds hole scores too
  totalOnly?: boolean
}): string {
  return personalNote({
    userId: opts.userId,
    greeting: `Hi ${opts.firstName},`,
    bodyHtml:
      (opts.totalOnly
        ? para(`Your ${opts.eventName} round at ${opts.courseName} is in TM Stats: <strong>${opts.score} (${opts.toPar})</strong>. The results only had your total, so the next step is your hole scores: snap your scorecard or type them in, and the app checks they add up.`) +
          para('Then add your stats. Quick mode is fairways, greens and putts, about two minutes.')
        : para(`Your ${opts.eventName} round at ${opts.courseName} is already in TM Stats: <strong>${opts.score} (${opts.toPar})</strong>, with every hole's par and score filled in.`) +
          para('All that is left is your stats. Quick mode is fairways, greens and putts, about two minutes. Full tracking is each shot, and gives you Strokes Gained for the round.')) +
      para('Do it while you still remember the shots.'),
    linkLabel: opts.claimLink ? 'Open your account and add your stats' : 'Add your stats',
    linkUrl: opts.claimLink ?? `${SITE}/rounds/${opts.roundId}/finish`,
    afterLinkHtml: opts.claimLink
      ? para('Your coach set this account up for you. The link signs you straight in and asks you to choose a password. Your round is waiting on the first screen.')
      : undefined,
    footerReason: `You are getting this because you are on ${opts.teamName} in TM Stats.`,
  })
}

// ─── "Your scores are still waiting" ──────────────────────────────────────────
// One reminder per round, three days after a qualifying or tournament round
// landed in the golfer's account, if they still have not added their stats.

/** email_log key for the reminder about one round (fits the 40 character column). */
export function statsWaitingKey(roundId: string): string {
  return `stats_wait_${roundId.replace(/-/g, '').slice(0, 28)}`
}

export const STATS_WAITING_SUBJECT = 'Your round is still waiting for its stats'

export function statsWaitingHtml(opts: { userId: string; firstName: string; eventName: string; courseName: string; score: number | null; roundId: string }): string {
  return personalNote({
    userId: opts.userId,
    greeting: `Hi ${opts.firstName},`,
    bodyHtml:
      para(`Your ${opts.eventName} round at ${opts.courseName}${opts.score ? ` (${opts.score})` : ''} is in TM Stats with every hole's par and score filled in, but it has no stats yet.`) +
      para('Quick mode is fairways, greens and putts, about two minutes. Your coach can see who has done theirs.'),
    linkLabel: 'Add your stats',
    linkUrl: `${SITE}/rounds/${opts.roundId}/finish`,
    afterLinkHtml: para('This is the only reminder you will get about this round.'),
  })
}
