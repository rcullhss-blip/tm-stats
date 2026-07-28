// Cold outreach templates for the automated drip. Clean, professional,
// letter-style layout in Calibri. Kept light on imagery — simple HTML lands
// in inboxes far more reliably than heavily designed emails.

interface Template {
  subject: string
  html: (org: string, promoCode: string) => string
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

export const FOLLOW_UP: Template = {
  subject: 'TM Stats — a quick follow-up',
  html: (org, code) => letter(`
    <p style="margin:0 0 14px;">Hello,</p>
    <p style="margin:0 0 14px;">Just floating my previous note back to the top of your inbox in case it got buried.</p>
    <p style="margin:0 0 14px;">The short version: <strong>three months of complimentary access to TM Stats</strong> (Strokes Gained tracking and coaching feedback) for ${org || 'your golfers'} — promo code <strong>${code}</strong>. One reply and I'll send the sign-up link over.</p>
    <p style="margin:0 0 14px;">If it's not for you, no problem at all — this is the last you'll hear from me.</p>
  `),
}
