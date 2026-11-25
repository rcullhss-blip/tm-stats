import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const ROB_VOICE_CONTEXT = `You are writing on behalf of Rob Cull, founder of TM Stats Golf (tmstatsgolf.com).

About Rob:
- Former NCAA Division II golfer at Newberry College, South Carolina (academic honours)
- County golfer for Cheshire
- Member at Bromborough Golf Club on the Wirral
- Built TM Stats because he couldn't find a stats platform that actually helped him improve
- Plays off scratch-ish; his own rounds are typically 70 to 78

How Rob writes. Follow all of this:
- Like a golfer talking to a mate in the clubhouse. Plain words, contractions, first person.
- Short sentences mostly, with the odd longer one. Vary the rhythm. Never three short punchy fragments in a row.
- Never use an em dash or an en dash. Not once. Use a comma, a full stop or brackets instead.
- Never use these words or patterns: game-changer, dive in, unlock, elevate, journey, leverage, robust, seamless, "in today's", "whether you're a ... or a ...", "it's not about X, it's about Y", "here's the thing", "let's be honest", "the truth is", "at the end of the day", "final thoughts", "in conclusion", "ultimately".
- No stacked rhetorical questions. One question in a whole post is plenty.
- No motivational padding. Every paragraph should tell the reader something they can use.
- Be specific. Prefer a real-feeling example from Rob's own golf over a generalisation: a round of 74 where he lost 2.1 strokes on approach, a week of practice that fixed one thing. Scores between 70 and 80, Strokes Gained numbers small and believable (within about plus or minus 3 per round).
- Do not name specific holes, yardages or courses other than Bromborough in passing. Do not invent statistics about other golfers or quote studies.
- Have an opinion. Say what the stats can't tell you as well as what they can.
- Headings are plain and descriptive, not clever. No heading called Introduction, Conclusion or Final Thoughts.
- UK English spelling: organisation, colour, recognise, practise (verb).
- Mention TM Stats once near the end, lightly, as what Rob built to do this. Never a hard sell.`

// Safety net for the dash rule above. Models still slip em and en dashes in,
// so strip them from anything that reaches a reader.
function stripDashes(text: string): string {
  return text
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[\u2014\u2013]\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/([.!?])\s*,\s*/g, '$1 ')
}

// Plain text reply. Use this for anything long (article bodies, newsletters):
// a JSON string field is a bad home for prose, because a straight double
// quote in the text can end the field early under schema-constrained output.
async function callClaudeText(prompt: string, maxTokens = 4096, systemPrompt?: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt || ROB_VOICE_CONTEXT,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = message.content[0]
  return block.type === 'text' ? stripDashes(block.text.replace(/^```(?:html)?\s*|```\s*$/g, '').trim()) : ''
}

// Ask Claude for JSON that matches a schema. Structured outputs guarantee the
// reply parses, so long article bodies with quotes and newlines can no longer
// break JSON.parse (which is what silently killed the auto-blog cron).
function jsonSchema(properties: Record<string, { type: 'string'; description: string }>) {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  }
}

async function callClaudeJSON<T>(
  prompt: string,
  schema: ReturnType<typeof jsonSchema>,
  systemPrompt?: string,
): Promise<T> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt || ROB_VOICE_CONTEXT,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema } },
  })
  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Claude returned no text block')
  const parsed = JSON.parse(block.text) as Record<string, unknown>
  for (const k of Object.keys(parsed)) {
    if (typeof parsed[k] === 'string') parsed[k] = stripDashes(parsed[k] as string)
  }
  return parsed as T
}

export async function personaliseOutreachEmail(
  template: string,
  contact: { name: string; organisation: string; type: string; region?: string }
): Promise<{ subject: string; body: string }> {
  const prompt = `Personalise this TM Stats Golf outreach email for:
- Name: ${contact.name}
- Organisation: ${contact.organisation}
- Type: ${contact.type}
- Region: ${contact.region || 'not specified'}

Template:
${template}

Rules: Only change the opening 1-2 sentences. Keep everything else identical.\nDo not use the straight double-quote character anywhere in your answer.`

  try {
    return await callClaudeJSON<{ subject: string; body: string }>(prompt, jsonSchema({
      subject: { type: 'string', description: 'Email subject line' },
      body: { type: 'string', description: 'Full HTML email body' },
    }))
  } catch {
    return { subject: 'Free 3-Month Access – TM Stats Golf', body: template }
  }
}

// Searches from someone ready to pick a tool or try one ("golf stats app for a
// 10 handicap", "strokes gained calculator"), as opposed to someone after general
// advice. These get a shorter, more direct post that ends on a free tool.
const INTENT_PATTERN = /\b(apps?|trackers?|software|calculators?|tools?|spreadsheets?|templates?|track(ing)? (your |my )?(golf )?(stats|strokes gained))\b/i

export function isIntentKeyword(keyword: string): boolean {
  return INTENT_PATTERN.test(keyword)
}

// The only things an article may say about the product. Keep in step with the
// pricing page and compare.ts.
const PRODUCT_FACTS = `Facts about TM Stats (say nothing about the product beyond these):
- A web app used on a phone. No sensors, tags, watch or other hardware needed.
- Two ways to log a round. Quick mode: score, fairways, greens and putts per hole, about two minutes a round. Full Tracking: each shot's distance and lie, about a minute a hole, which gives Strokes Gained.
- Strokes Gained compares every shot with golfers at your own handicap (bands from scratch to 29 and over, plus PGA Tour and US college divisions), split into off the tee, approach, around the green and putting.
- AI coaching feedback that reads your own numbers and says what to practise.
- Coaches can set up a team, see every player's stats and Strokes Gained, and run qualifying rounds.
- Free for the first five rounds, including one round of Strokes Gained. Pro is £4.99 a month or £50 a year for unlimited rounds.
- Free tools on the site that need no account: the "where are you losing shots" quiz at /quiz (five questions, one minute), the Strokes Gained calculator at /strokes-gained-calculator, and the golf stats benchmarks by handicap at /golf-stats.`

export async function generateBlogPost(params: {
  keyword: string; newsContext?: string; angle?: string
}): Promise<{ title: string; slug: string; content: string; excerpt: string; metaTitle: string; metaDesc: string }> {
  const intent = isIntentKeyword(params.keyword)
  const brief = intent
    ? `This search comes from a golfer who is ready to pick a tool or try one, so do not write a general advice article.
Requirements: 400-600 words, Rob's voice, keyword 2-4 times naturally, UK English.
- Say what someone searching this actually needs, and what to look for, in plain terms.
- Explain briefly why Rob is worth listening to on it (his background, and that he built TM Stats for this exact job), then how TM Stats does it, using only the facts below.
- Do not name, describe or compare any other app, company or product.
- Finish with one clear next step as an HTML link: the quiz (<a href="/quiz">), the calculator (<a href="/strokes-gained-calculator">) or starting free (<a href="/signup">). Pick whichever fits the search best. One link, not three.`
    : `Requirements: 500-750 words, Rob's voice, keyword 2-4 times naturally, practical advice, UK English.
- End by pointing the reader at one free next step as an HTML link: the one minute quiz (<a href="/quiz">where are you losing shots quiz</a>) or the <a href="/strokes-gained-calculator">Strokes Gained calculator</a>. Light touch, one sentence, never a hard sell.`

  const prompt = `Write a blog post for tmstatsgolf.com.
Target SEO keyword: "${params.keyword}"
${params.newsContext ? `Golf news context: ${params.newsContext}` : ''}
${params.angle ? `Angle: ${params.angle}` : ''}

${brief}

${PRODUCT_FACTS}

Structure rules (search engines and AI search skip pages that bury the answer):
- The first paragraph answers the question the keyword asks, directly, in two or three sentences, with a concrete number or rule of thumb where one exists. No story, scene-setting or warm-up before the answer.
- Then explain and give the practical advice under short h2 headings. Cut anything that repeats a point already made.
- Do not invent personal stories, rounds, scores, courses or dates. Never write things like "I shot 74 at Bromborough last Saturday". Rob's real background (Cheshire county golfer, NCAA Division 2 at Newberry College, member at Bromborough) can be mentioned in passing, nothing more specific.
- Use these phrases naturally where they genuinely fit, because the site links them to its guides: strokes gained, golf stats, greens in regulation, putts per round.

Return ONLY the article body as HTML using p, h2, h3, ul, li and a tags. No title, no code fences, no commentary.`

  const content = await callClaudeText(prompt)
  if (content.replace(/<[^>]+>/g, ' ').split(/\s+/).length < (intent ? 250 : 300)) {
    throw new Error('Generated article too short, not publishing')
  }

  const meta = await callClaudeJSON<{ title: string; slug: string; excerpt: string; metaTitle: string; metaDesc: string }>(
    `Here is a finished blog post for tmstatsgolf.com targeting the keyword "${params.keyword}":

${content}

Write its metadata. Do not use the straight double-quote character anywhere in your answer.`,
    jsonSchema({
      title: { type: 'string', description: 'H1 title containing the keyword' },
      slug: { type: 'string', description: 'URL-friendly slug: lowercase, hyphens only' },
      excerpt: { type: 'string', description: 'Two-sentence plain text summary' },
      metaTitle: { type: 'string', description: 'SEO title, 50-60 characters' },
      metaDesc: { type: 'string', description: 'Meta description, 150-160 characters' },
    }),
  )
  return { ...meta, content }
}

export async function generateNewsletter(params: {
  golfNews: string[]; featureSpotlight: string; statOfFortnight: string
}): Promise<{ subject: string; content: string }> {
  const prompt = `Write a biweekly TM Stats Golf newsletter.

Golf news: ${params.golfNews.map((n, i) => `${i + 1}. ${n}`).join('\n')}
Feature spotlight: ${params.featureSpotlight}
Stat of the fortnight: ${params.statOfFortnight}

Structure: warm opener → 2-3 news stories with TM Stats angle → stat of fortnight explained → feature how-to → Rob sign-off.

Return ONLY the newsletter body as HTML. No subject line, no code fences.`

  const content = await callClaudeText(prompt)
  const { subject } = await callClaudeJSON<{ subject: string }>(
    `Write a subject line for this TM Stats Golf newsletter. Do not use the straight double-quote character.\n\n${content}`,
    jsonSchema({ subject: { type: 'string', description: 'Email subject line, under 60 characters' } }),
  )
  return { subject, content }
}

export async function generateInstagramCaption(params: {
  type: 'stat' | 'news' | 'feature' | 'educational'; topic: string; newsContext?: string
}): Promise<{ caption: string; imagePrompt: string }> {
  const prompt = `Write an Instagram post for TM Stats Golf.
Type: ${params.type}
Topic: ${params.topic}
${params.newsContext ? `News context: ${params.newsContext}` : ''}

Caption: 100-150 words, hook first line, Rob's voice, 5-8 hashtags at end (#StrokesGained #GolfStats #TMStats etc), soft CTA, UK English.
imagePrompt: description of a bold graphic — dark bg (#1a1a1a), TM Stats red (#C22431) accent, white text, data viz or golf imagery, no people.\nDo not use the straight double-quote character anywhere in your answer.`

  return callClaudeJSON(prompt, jsonSchema({
    caption: { type: 'string', description: 'Instagram caption with hashtags at the end' },
    imagePrompt: { type: 'string', description: 'Description of the graphic to generate' },
  }))
}
