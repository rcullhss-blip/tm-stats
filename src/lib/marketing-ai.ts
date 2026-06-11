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

async function callClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt || ROB_VOICE_CONTEXT,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
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

Rules: Only change the opening 1-2 sentences. Keep everything else identical.
Return ONLY JSON: {"subject": "...", "body": "...full html..."}
No markdown code fences.`

  const result = await callClaude(prompt)
  try {
    return JSON.parse(result.replace(/```json|```/g, '').trim())
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

Return ONLY JSON:
- title: H1 title with keyword
- slug: url-friendly (hyphens, lowercase)
- content: full HTML with p/h2/h3/ul/li tags
- excerpt: 2-sentence plain text summary
- metaTitle: 50-60 chars SEO title
- metaDesc: 150-160 chars meta description
No markdown code fences.`

  const result = await callClaude(prompt)
  return JSON.parse(result.replace(/```json|```/g, '').trim())
}

export async function generateNewsletter(params: {
  golfNews: string[]; featureSpotlight: string; statOfFortnight: string
}): Promise<{ subject: string; content: string }> {
  const prompt = `Write a biweekly TM Stats Golf newsletter.

Golf news: ${params.golfNews.map((n, i) => `${i + 1}. ${n}`).join('\n')}
Feature spotlight: ${params.featureSpotlight}
Stat of the fortnight: ${params.statOfFortnight}

Structure: warm opener → 2-3 news stories with TM Stats angle → stat of fortnight explained → feature how-to → Rob sign-off.

Return ONLY JSON: {"subject": "...", "content": "...full HTML..."}
No markdown code fences.`

  const result = await callClaude(prompt)
  return JSON.parse(result.replace(/```json|```/g, '').trim())
}

export async function generateInstagramCaption(params: {
  type: 'stat' | 'news' | 'feature' | 'educational'; topic: string; newsContext?: string
}): Promise<{ caption: string; imagePrompt: string }> {
  const prompt = `Write an Instagram post for TM Stats Golf.
Type: ${params.type}
Topic: ${params.topic}
${params.newsContext ? `News context: ${params.newsContext}` : ''}

Caption: 100-150 words, hook first line, Rob's voice, 5-8 hashtags at end (#StrokesGained #GolfStats #TMStats etc), soft CTA, UK English.
imagePrompt: description of a bold graphic — dark bg (#1a1a1a), TM Stats red (#C22431) accent, white text, data viz or golf imagery, no people.

Return ONLY JSON: {"caption": "...", "imagePrompt": "..."}
No markdown code fences.`

  const result = await callClaude(prompt)
  return JSON.parse(result.replace(/```json|```/g, '').trim())
}
