import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const ROB_VOICE_CONTEXT = `You are writing on behalf of Rob Cull, founder of TM Stats Golf (tmstatsgolf.com).

About Rob:
- Former NCAA Division II golfer at Newberry College, South Carolina (academic honours)
- County golfer for Cheshire
- Member at Bromborough Golf Club on the Wirral
- Built TM Stats because he couldn't find a stats platform that actually helped him improve

Rob's writing voice:
- Direct and confident but not arrogant
- Knowledgeable about golf and data without being academic or dry
- Speaks as a golfer first, a tech person second
- Brief, punchy sentences. Not overly formal
- Genuine enthusiasm for Strokes Gained as a concept
- UK English spelling (organisation, colour, recognise, etc.)`

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
  return block.type === 'text' ? block.text.replace(/^```(?:html)?\s*|```\s*$/g, '').trim() : ''
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
  return JSON.parse(block.text) as T
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

export async function generateBlogPost(params: {
  keyword: string; newsContext?: string; angle?: string
}): Promise<{ title: string; slug: string; content: string; excerpt: string; metaTitle: string; metaDesc: string }> {
  const prompt = `Write a blog post for tmstatsgolf.com.
Target SEO keyword: "${params.keyword}"
${params.newsContext ? `Golf news context: ${params.newsContext}` : ''}
${params.angle ? `Angle: ${params.angle}` : ''}

Requirements: 600-900 words, Rob's voice, keyword 3-5 times naturally, practical advice, subtle TM Stats CTA at end, UK English.

Return ONLY the article body as HTML using p, h2, h3, ul and li tags. No title, no code fences, no commentary.`

  const content = await callClaudeText(prompt)
  if (content.replace(/<[^>]+>/g, ' ').split(/\s+/).length < 300) {
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
