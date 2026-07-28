import { NextResponse } from 'next/server'
import { EMAIL_FROM } from '@/lib/email-from'
import { Resend } from 'resend'
import { generateInstagramCaption } from '@/lib/marketing-ai'

export const maxDuration = 60

// Twice-weekly social post (Mon + Thu). Five rotating content styles, each
// with its own visual theme, so the feed stays varied:
//   STAT OF THE WEEK (red)  · DRILL (green)   · MINDSET (slate)
//   MYTH BUSTED (light)     · FROM THE APP (dark)
// Headlines are hand-written so every image reads well; the AI writes the
// caption around the same hook. 10 topics = a 5-week cycle before any repeat.

interface Post {
  style: string
  kicker: string
  theme: 'dark' | 'red' | 'light' | 'green' | 'slate'
  type: 'stat' | 'educational' | 'feature'
  topic: string
  headline: string
  sub: string
}

const POSTS: Post[] = [
  // ── Cycle A ──────────────────────────────────────────────────────────────
  {
    style: 'stat', kicker: 'STAT OF THE WEEK', theme: 'red', type: 'stat',
    topic: 'Mid-handicap golfers lose more shots from inside 100 yards than off the tee — short game practice pays back twice as fast as range sessions. Write it as a punchy stat-led post with one actionable takeaway.',
    headline: 'You lose more shots inside 100 yards than off the tee',
    sub: 'Short game practice pays back twice as fast as range time',
  },
  {
    style: 'drill', kicker: 'DRILL OF THE WEEK', theme: 'green', type: 'educational',
    topic: 'The gate drill for putts inside 6 feet: two tees just wider than the putter head, 20 putts through the gate before you leave the green. Explain why short putts are the highest-value practice in golf and give the drill steps.',
    headline: 'The 6-foot gate drill: 20 putts, every session',
    sub: 'Short putts are the highest-value practice in golf',
  },
  {
    style: 'mindset', kicker: 'MENTAL GAME', theme: 'slate', type: 'educational',
    topic: 'Commitment over outcome: a bad shot you fully committed to is a good process. Rate your round on commitment percentage, not score. Explain how tracking your pre-shot process changes how you play under pressure.',
    headline: 'A bad shot with full commitment is still a win',
    sub: 'Rate your rounds on process, not outcome',
  },
  {
    style: 'myth', kicker: 'MYTH BUSTED', theme: 'light', type: 'stat',
    topic: 'Myth: you should play to your handicap most rounds. Truth: handicaps measure your best 8 of 20 rounds, so an average day is 3-5 shots above it by design. Bust the myth with the maths and the mindset relief it brings.',
    headline: 'You are not supposed to play to your handicap',
    sub: 'It measures your best rounds — not your average day',
  },
  {
    style: 'app', kicker: 'FROM THE APP', theme: 'dark', type: 'feature',
    topic: 'Your first full-tracking round on TM Stats includes a free Strokes Gained breakdown — the same analysis used on tour, run on your own game. Explain what the golfer sees and why it changes what they practise.',
    headline: 'Your first Strokes Gained round is free',
    sub: 'See exactly where you gained and lost shots — on your own game',
  },
  // ── Cycle B ──────────────────────────────────────────────────────────────
  {
    style: 'stat', kicker: 'STAT OF THE WEEK', theme: 'red', type: 'stat',
    topic: 'Three putts cost the average 15-handicapper more shots per round than bunkers and penalties combined. Lag putting from 25-40 feet is the most underrated practice block in golf. Punchy stat post with one takeaway.',
    headline: 'Three putts cost more than bunkers and penalties combined',
    sub: 'Lag putting is the most underrated practice in golf',
  },
  {
    style: 'drill', kicker: 'DRILL OF THE WEEK', theme: 'green', type: 'educational',
    topic: 'The one-more-club drill: most missed greens at amateur level finish short. For one round, take one more club than instinct says on every approach and aim centre of green. Explain why it works and how to measure the difference.',
    headline: 'Take one more club. Every approach. One round.',
    sub: 'Most missed greens finish short — prove it to yourself',
  },
  {
    style: 'mindset', kicker: 'MENTAL GAME', theme: 'slate', type: 'educational',
    topic: 'The 10-second reset after a bad hole: accept, breathe, pick one clear target on the next tee. Doubles come in pairs when golfers carry the last hole to the next tee. Practical mental routine post.',
    headline: 'Doubles come in pairs — unless you reset',
    sub: 'A 10-second routine for the tee after a bad hole',
  },
  {
    style: 'myth', kicker: 'MYTH BUSTED', theme: 'light', type: 'stat',
    topic: 'Myth: driving accuracy is what separates good golfers. Truth: greens in regulation predicts score far better than fairways hit — a miss in light rough at 280 beats short and straight. Bust it with the data.',
    headline: 'Fairways hit is not the stat you think it is',
    sub: 'Greens in regulation predicts your score far better',
  },
  {
    style: 'app', kicker: 'FROM THE APP', theme: 'dark', type: 'feature',
    topic: 'Mental process tracking on TM Stats: mark every shot Yes/No on whether you fully committed. Get a process percentage per round and see what committing is worth in shots. The first real baseline for the mental game.',
    headline: 'Did you commit to that shot? Now you can track it',
    sub: 'Process percentage per round — commitment, not outcome',
  },
]

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Resend not configured' }, { status: 503 })

  // Two posts a week: Monday run picks an even slot, Thursday run the next one.
  // The visual layout rotates weekly (1→5 then recycles) so the feed mixes:
  // week 1 = layout 1, week 2 = layout 2 … week 6 = layout 1 again.
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const secondOfWeek = new Date().getUTCDay() >= 4 ? 1 : 0
  const pick = POSTS[(week * 2 + secondOfWeek) % POSTS.length]
  const layout = (week % 5) + 1

  try {
    const result = await generateInstagramCaption({ type: pick.type, topic: pick.topic })
    const caption = result.caption ?? JSON.stringify(result)

    // Render the matching themed image and attach it
    const origin = new URL(request.url).origin
    const imageUrl = `${origin}/api/social-image?h=${encodeURIComponent(pick.headline)}&s=${encodeURIComponent(pick.sub)}&k=${encodeURIComponent(pick.kicker)}&theme=${pick.theme}&layout=${layout}`
    let attachment: { filename: string; content: string } | null = null
    try {
      const imgRes = await fetch(imageUrl)
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer())
        attachment = { filename: 'tm-stats-post.png', content: buf.toString('base64') }
      }
    } catch {
      // image generation failed — caption still goes out
    }

    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: EMAIL_FROM,
      to: ['rcullhss@gmail.com'],
      subject: `Instagram post (${pick.kicker.toLowerCase()}) — image attached, caption below`,
      text: `POST THE ATTACHED IMAGE with this caption:\n\n----------------------------------------\n\n${caption}\n\n----------------------------------------\n\nStyle: ${pick.kicker} · Theme: ${pick.theme} · Layout: ${layout} of 5\nImage headline: "${pick.headline}"\nRegenerate or tweak the image any time:\n${imageUrl}`,
      ...(attachment ? { attachments: [attachment] } : {}),
    })

    return NextResponse.json({ ok: true, style: pick.style, theme: pick.theme, topic: pick.headline, imageAttached: !!attachment })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
