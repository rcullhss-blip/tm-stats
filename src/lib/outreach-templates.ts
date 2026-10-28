// Cold outreach templates for the automated drip. Clean, professional,
// letter-style layout in Calibri. Kept light on imagery — simple HTML lands
// in inboxes far more reliably than heavily designed emails.

interface Template {
  subject: string
  html: (org: string, promoCode: string, name?: string) => string
}

const FONT = "Calibri, 'Segoe UI', -apple-system, Helvetica, Arial, sans-serif"

function letter(bodyHtml: string): string {
  return `
  <div style="background:#f4f4f4;padding:24px 12px;">
    <div style="font-family:${FONT};max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e2e2;border-radius:8px;overflow:hidden;">
      <div style="background:#14161d;padding:20px 36px;border-bottom:3px solid #CC2222;">
        <span style="color:#ffffff;font-size:17px;font-weight:bold;letter-spacing:3px;font-family:${FONT};">TM STATS</span>
        <span style="color:#9A9DB0;font-size:11px;letter-spacing:2px;font-family:${FONT};float:right;margin-top:4px;">TRACK TO IMPROVE</span>
      </div>
      <div style="padding:32px 36px;color:#222222;font-size:15.5px;line-height:1.65;">
        ${bodyHtml}
        <p style="margin:26px 0 2px;">Kind regards,</p>
        <p style="margin:0 0 0;"><strong>Rob Cull</strong></p>
        <p style="margin:0;color:#555555;font-size:13.5px;">Founder, TM Stats Golf<br>
        <a href="https://tmstatsgolf.com" style="color:#CC2222;text-decoration:none;">tmstatsgolf.com</a></p>
      </div>
      <div style="padding:14px 36px;background:#fafafa;border-top:1px solid #eeeeee;">
        <p style="margin:0;color:#999999;font-size:11.5px;font-family:${FONT};">
          One person, one email — not a mailing list. If you'd rather not hear from me, simply reply "no thanks" and I won't email again.
        </p>
      </div>
    </div>
  </div>`
}

function offerBox(title: string, line: string): string {
  return `
  <div style="background:#f8f8f8;border-left:3px solid #CC2222;padding:14px 18px;margin:22px 0;">
    <p style="font-weight:bold;margin:0 0 6px;">${title}</p>
    <p style="margin:0;">${line}</p>
  </div>`
}

export const DRIP_TEMPLATES: Record<string, Template> = {
  GOLF_CLUB: {
    subject: 'Complimentary 3-month member access — TM Stats Golf',
    html: (org, code) => letter(`
      <p style="margin:0 0 14px;">Dear Club Manager / Secretary,</p>
      <p style="margin:0 0 14px;">I hope you're well — I'll keep this brief.</p>
      <p style="margin:0 0 14px;">My name is Rob Cull: county golfer for Cheshire, former NCAA Division II player, and a member at Bromborough. I'm the founder of <strong>TM Stats</strong> — a performance platform that shows golfers exactly where they lose shots using Strokes Gained, with clear feedback on what to practise.</p>
      <p style="margin:0 0 14px;">I'd like to offer ${org || 'your club'}'s members <strong>three months of full access at no cost</strong>. From a coaching point of view it's particularly useful — members arrive at lessons already understanding where their shots go.</p>
      ${offerBox('Complimentary 3-Month Access', `For your members · No card required · Promo code: <strong>${code}</strong> at tmstatsgolf.com`)}
      <p style="margin:0 0 14px;">If this would be of interest, just reply and I'll send a simple sign-up link you can share with members.</p>
    `),
  },
  NCAA_D1: {
    subject: 'Strokes Gained tracking for your program — complimentary access',
    html: (org, code) => letter(`
      <p style="margin:0 0 14px;">Coach,</p>
      <p style="margin:0 0 14px;">My name is Rob Cull — I played NCAA Division II golf at Newberry College, and I've since built <strong>TM Stats</strong>, a Strokes Gained performance platform for competitive golfers.</p>
      <p style="margin:0 0 14px;">I'd like to offer ${org || 'your program'} <strong>three months of full access at no cost</strong> — unlimited athletes, nothing required from your budget. Your players get Strokes Gained breakdowns across driving, approach, short game and putting, season-long trend tracking, and a mental-game commitment metric that coaches are finding genuinely useful.</p>
      ${offerBox('Complimentary 3-Month Program Access', `Unlimited athletes · No card required · Promo code: <strong>${code}</strong>`)}
      <p style="margin:0 0 14px;">Happy to send the link directly or jump on a ten-minute call — whichever is easier.</p>
    `),
  },
  UK_COLLEGE: {
    subject: 'Performance tracking for your university golf team — complimentary access',
    html: (org, code) => letter(`
      <p style="margin:0 0 14px;">Hello,</p>
      <p style="margin:0 0 14px;">I'm Rob Cull — county golfer for Cheshire and a former NCAA Division II player — and I've built <strong>TM Stats</strong>, a Strokes Gained platform for competitive amateur golfers.</p>
      <p style="margin:0 0 14px;">I'm offering UK university golf programmes <strong>three months of completely free access</strong> for ${org || 'your squad'} — unlimited players. Your team track their rounds, the system shows exactly where each player is losing shots, and they improve faster.</p>
      ${offerBox('Complimentary 3-Month Team Access', `Unlimited players · No card required · Promo code: <strong>${code}</strong>`)}
      <p style="margin:0 0 14px;">If it would help your programme, reply and I'll send the sign-up link straight over.</p>
    `),
  },
  CREATOR: {
    subject: 'Complimentary Pro access for you and your students — TM Stats',
    html: (org, code) => letter(`
      <p style="margin:0 0 14px;">Hello,</p>
      <p style="margin:0 0 14px;">I'm Rob Cull — county golfer, former NCAA Division II player, and founder of <strong>TM Stats</strong>: a Strokes Gained and AI coaching platform built for amateur golfers.</p>
      <p style="margin:0 0 14px;">I follow ${org || 'your content'} and think your audience is exactly who this was built for. I'd like to set you up with <strong>complimentary Pro access</strong>, plus a code your students and audience can use for three months free.</p>
      ${offerBox('For You and Your Audience', `Free Pro for you · 3 months free for your audience · Code: <strong>${code}</strong>`)}
      <p style="margin:0 0 14px;">If it earns a mention, brilliant — and if not, no hard feelings; I'd genuinely value your feedback either way. Reply and I'll have you set up in two minutes.</p>
    `),
  },
}

DRIP_TEMPLATES.NCAA_D2 = DRIP_TEMPLATES.NCAA_D1
DRIP_TEMPLATES.NCAA_D3 = DRIP_TEMPLATES.NCAA_D1
DRIP_TEMPLATES.NAIA = DRIP_TEMPLATES.NCAA_D1
DRIP_TEMPLATES.PGA_PRO = DRIP_TEMPLATES.GOLF_CLUB

export const FOLLOW_UP: Template = {
  subject: 'TM Stats — a quick follow-up',
  html: (org, code) => letter(`
    <p style="margin:0 0 14px;">Hello,</p>
    <p style="margin:0 0 14px;">Just floating my previous note back to the top of your inbox in case it got buried.</p>
    <p style="margin:0 0 14px;">The short version: <strong>three months of complimentary access to TM Stats</strong> (Strokes Gained tracking and coaching feedback) for ${org || 'your golfers'} — promo code <strong>${code}</strong>. One reply and I'll send the sign-up link over.</p>
    <p style="margin:0 0 14px;">If it's not for you, no problem at all — this is the last you'll hear from me.</p>
  `),
}


// ─── October 2026 press, podcast and coach campaigns ─────────────────────────
// Copy approved by Rob on 28 Oct 2026. Branded like the test emails: light
// background, logo header, icon signature. Greeting uses the contact's first
// name when we have one. Every link is a full https address.

const SITE = 'https://www.tmstatsgolf.com'
const SANS = "Helvetica, Arial, sans-serif"

function greet(name?: string): string {
  const first = (name ?? '').trim().split(/\s+/)[0]
  return first ? `Hi ${first},` : 'Hello,'
}

function pressLetter(bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F5F5F7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:26px 36px 10px 36px;"><img src="${SITE}/logo-black.png" width="150" alt="TM Stats" style="display:block;border:0;width:150px;height:auto;"></td></tr>
  <tr><td style="padding:14px 36px 32px 36px;font-family:${SANS};font-size:15px;line-height:1.6;color:#1A1D27;">
    ${bodyHtml}
    <p style="margin:0 0 16px 0;">Kind regards,</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid #E6E6EA;"><tr>
      <td style="padding-top:18px;vertical-align:top;padding-right:16px;"><img src="${SITE}/icon-only-logo.png" width="44" height="43" alt="TM Stats" style="display:block;border:0;"></td>
      <td style="padding-top:18px;vertical-align:top;font-family:${SANS};font-size:14px;line-height:1.5;color:#1A1D27;"><strong>Rob Cull</strong><br>Founder, TM Stats Golf<br><a href="${SITE}" style="color:#CC2222;text-decoration:none;">www.tmstatsgolf.com</a> &nbsp;|&nbsp; 07597 195645<br><span style="color:#6B6E80;">Strokes Gained analytics for serious amateur golfers. No sensors, no hardware.</span></td>
    </tr></table>
  </td></tr>
</table>
<p style="font-family:${SANS};font-size:11px;color:#8A8D9E;margin:14px 0 0 0;">TM Stats Golf, Wirral, United Kingdom &nbsp;|&nbsp; <a href="${SITE}" style="color:#8A8D9E;">tmstatsgolf.com</a></p>
</td></tr></table></body></html>`
}
const p = (t: string) => `<p style="margin:0 0 16px 0;">${t}</p>`
const ul = (items: string[]) => `<ul style="margin:0 0 16px 0;padding-left:20px;">${items.map(i => `<li style="margin:0 0 8px 0;">${i}</li>`).join('')}</ul>`
const a = (href: string, text: string) => `<a href="${href}" style="color:#CC2222;text-decoration:underline;">${text}</a>`
const BIO = 'I am Rob Cull, founder of TM Stats. I played NCAA golf at Newberry College in South Carolina on a golf scholarship and county golf for Cheshire.'

DRIP_TEMPLATES.PRESS_ROUNDUP = {
  subject: 'A UK-built Strokes Gained app for your next golf apps roundup',
  html: (_org, _code, name) => pressLetter(
    p(greet(name))
    + p('I hope you are well. I am writing because TM Stats is a good fit for your golf apps coverage and I would like to put it forward for your next update.')
    + p(BIO + ' I built TM Stats because every app that offered proper Strokes Gained analysis needed sensors or a watch, plus a yearly subscription on top.')
    + p('What it does:')
    + ul(['Strokes Gained for every shot, split into off the tee, approach, around the green and putting, measured against a baseline for your own handicap.',
          'Shots can be entered as you play or after the round, about a minute a hole. No hardware, nothing to charge.',
          'A coaching layer turns the numbers into what to practise.',
          'Free for five rounds, then £4.99 a month or £50 a year.'])
    + p(`Two free resources your readers may also find useful: a ${a(SITE + '/strokes-gained-calculator', 'Strokes Gained calculator')} and ${a(SITE + '/golf-stats', 'benchmarks by handicap')}. Neither needs an account.`)
    + p('I would be glad to set you up with full access today and create a personalised code so your readers can test the app properly. Screenshots and a short video are ready whenever you need them, and I am happy to arrange a call at a time that suits you.')),
}

DRIP_TEMPLATES.PRESS_DATA = {
  subject: 'Where club golfers really lose shots, by handicap',
  html: (_org, _code, name) => pressLetter(
    p(greet(name))
    + p('I hope you are well. I have a data-led feature idea that I think would suit your readers, and I would like to offer it to you first.')
    + p('I am Rob Cull, founder of TM Stats. I played NCAA golf at Newberry College in South Carolina and county golf for Cheshire, and I built TM Stats, a Strokes Gained app that works from shots entered on a phone rather than sensors. Because every shot has a distance and a lie, the data shows where golfers at each handicap really lose shots, and it is rarely where they think.')
    + p('Three findings from the benchmarks:')
    + ul(['The biggest gap between a 15 handicap and a scratch golfer is greens hit, roughly 35% against 65%. That is approach play, not driving.',
          'Putts per round barely changes across the handicap range, about three putts between a 25 handicap and scratch, yet putting is where most club golfers believe they lose shots.',
          'Greens in regulation hides the real problem. A green hit to 45 feet counts the same as one hit to 6 feet, so the traditional stats send golfers to the wrong part of the range.'])
    + p(`I can provide ${a(SITE + '/golf-stats', 'benchmark tables for every handicap band')}, quotes, and a worked example from my own rounds, with TM Stats credited as the source. I can also set you up with full access and a personalised reader code so you can see the numbers come out of a live round. If a 15 minute call would help, I can make time this week.`)),
}

DRIP_TEMPLATES.PRESS_LOCAL = {
  subject: 'Wirral golfer returns from US college scholarship and builds an app for club players',
  html: (_org, _code, name) => pressLetter(
    p(greet(name))
    + p('I hope you are well. I have a local story that may interest your readers.')
    + p('I am Rob Cull, a member at Bromborough Golf Club. I went to South Carolina on a golf scholarship and played NCAA golf at Newberry College, then came home, played county golf for Cheshire, and built TM Stats, an app that shows golfers exactly where they lose shots using the same Strokes Gained method the professionals use.')
    + p('It launched quietly this year. A US college golf programme has just put its whole team on it, and Bidston Golf Club is offering it free to its members this month.')
    + ul(['Built on the Wirral by one person, with no outside funding.', 'Works on a phone, with no sensors or gadgets.', 'Free to try at ' + a(SITE, 'www.tmstatsgolf.com')])
    + p('I would be happy to give a short interview, in person or by phone, and I can supply photographs the same day.')),
}

DRIP_TEMPLATES.PODCAST = {
  subject: 'Guest suggestion: former NCAA golfer who built a Strokes Gained app',
  html: (_org, _code, name) => pressLetter(
    p(greet(name))
    + p('I hope you are well. I am a regular listener and I would like to suggest myself as a guest for an episode on what the numbers say about getting better at golf.')
    + p("I am Rob Cull. I played NCAA golf at Newberry College in South Carolina and county golf for Cheshire, then built TM Stats, a Strokes Gained app that works from shots entered on a phone. Along the way I have looked at a lot of club golfers' data, and the gap between what people practise and where they actually lose shots is bigger than most would expect.")
    + p('Topics I can cover with real numbers:')
    + ul(['Why fairways, greens and putts mislead you.', 'What a 10 handicap should actually practise.', 'How a college team uses Strokes Gained week to week.', 'The honest trade-offs between an app and sensor systems such as Arccos and Shot Scope.'])
    + p('There is no need for a product pitch on air. If it sounds like a fit, I will work around your schedule, and I am happy to do a short call beforehand.')),
}

DRIP_TEMPLATES.PGA_COACH = {
  subject: 'Free coach account for your pupils, Strokes Gained without the sensors',
  html: (_org, _code, name) => pressLetter(
    p(greet(name))
    + p('I came across your coaching page while putting together a short list of PGA professionals who take performance seriously, and I would like to offer you something for your pupils.')
    + p('I am Rob Cull. I played NCAA golf at Newberry College in South Carolina and county golf for Cheshire, and I built TM Stats, a Strokes Gained app that works from shots your pupils enter on their phone. No sensors, nothing for them to buy.')
    + p('The part that may be useful to you is the coach side. You get a dashboard of every pupil who joins your team code: their Strokes Gained by category, recent rounds and the coaching notes, which you can overrule with what you know about the player. It turns "I putted badly" into "I lost 1.8 strokes on the greens from 6 to 10 feet" before they walk into the lesson.')
    + ul(['Coach accounts are free, now and later. Pupils get five rounds free, then £4.99 a month.', 'A US college programme runs its whole squad on it.', 'I can set you up in ten minutes and give your pupils a code for three months of Pro.'])
    + p(`If you would like to see it, I can do a 15 minute call this week, or come to the club if you are local to the Wirral. The free ${a(SITE + '/strokes-gained-calculator', 'Strokes Gained calculator')} shows the method in thirty seconds.`)),
}

const PRESS_FOLLOW_UP: Template = {
  subject: 'Re: TM Stats, a quick follow-up',
  html: (_org, _code, name) => pressLetter(
    p(greet(name))
    + p('I am just following up in case this was missed. I would be glad to send screenshots or set up your access today.')),
}

/** Follow-up template for a contact type: the approved one-liner for the
 *  October 2026 campaigns, the club offer follow-up for everything else. */
export function followUpFor(type: string | null | undefined): Template {
  return ['PRESS_ROUNDUP', 'PRESS_DATA', 'PRESS_LOCAL', 'PODCAST', 'PGA_COACH'].includes(String(type)) ? PRESS_FOLLOW_UP : FOLLOW_UP
}
