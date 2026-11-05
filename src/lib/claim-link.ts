import { createHmac, timingSafeEqual } from 'crypto'
import { personalNote, para } from '@/lib/lifecycle-emails'

// "Claim your account" links for players whose account we created from a
// coach's roster. The link signs the player straight in, with no password, and
// the claim page then asks them to choose their own.
//
// Safety bounds:
//  - the link is signed with a server secret, so it cannot be forged or edited
//  - it only works for accounts flagged needs_claim (set by us, server side)
//  - it stops working the moment the player sets a password, and after 30 days

const SITE = 'https://www.tmstatsgolf.com'
export const CLAIM_LINK_DAYS = 30

function sign(userId: string, exp: number): string {
  return createHmac('sha256', process.env.CRON_SECRET ?? 'tmstats')
    .update(`claim:${userId}:${exp}`)
    .digest('hex')
    .slice(0, 32)
}

export function claimUrl(userId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + CLAIM_LINK_DAYS * 24 * 60 * 60
  return `${SITE}/api/auth/claim?id=${userId}&exp=${exp}&sig=${sign(userId, exp)}`
}

export function verifyClaim(userId: string | null, exp: string | null, sig: string | null): boolean {
  if (!userId || !exp || !sig) return false
  const expNum = Number(exp)
  if (!Number.isFinite(expNum) || expNum * 1000 < Date.now()) return false
  const expected = Buffer.from(sign(userId, expNum))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

// "Will Brewer" -> "Coach Brewer". Falls back to "Your coach".
export function coachLabel(coachName: string | null | undefined): string {
  const parts = (coachName ?? '').trim().split(/\s+/).filter(Boolean)
  return parts.length > 0 ? `Coach ${parts[parts.length - 1]}` : 'Your coach'
}

export function claimEmail(opts: {
  userId: string
  firstName: string | null
  coachName: string | null
  teamName: string
  freeUntil: string | null // ISO date the free access runs to, if any
  linkUrl?: string
}): { subject: string; html: string } {
  const coach = coachLabel(opts.coachName)
  const coachLower = coach === 'Your coach' ? 'your coach' : coach
  const until = opts.freeUntil
    ? ` It is free for you until ${new Date(opts.freeUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
    : ''
  const html = personalNote({
    userId: opts.userId,
    greeting: opts.firstName ? `Hi ${opts.firstName},` : 'Hi,',
    bodyHtml:
      para(`Rob here from TM Stats. ${coach} has set up a Strokes Gained account for you as part of ${opts.teamName}.${until}`) +
      para('Tap the link below and you are straight in. There is no password to remember, you pick your own once you are in.'),
    linkLabel: 'Open my TM Stats account',
    linkUrl: opts.linkUrl ?? claimUrl(opts.userId),
    afterLinkHtml:
      para(`After your next round, log it from your phone. Full Tracking takes a few minutes and shows you exactly where your shots went: off the tee, approach, around the green and putting. ${coachLower.charAt(0).toUpperCase() + coachLower.slice(1)} sees the same numbers on the coach dashboard.`) +
      para(`The link is personal to you and works for ${CLAIM_LINK_DAYS} days. Any problems, just reply to this email and I will sort it.`),
    footerReason: 'You are getting this because your coach added you to their team on TM Stats.',
  })
  return { subject: `${coach} has set you up on TM Stats`, html }
}
