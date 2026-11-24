import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GOLF_ONLY_RULES } from '@/lib/ai-guard'

// AI coaching runs on Claude Sonnet 5.5 (Rob chose it on 20 Nov 2026 after a
// side-by-side test with Haiku 5.5 and gpt-4o-mini). If Claude fails or no key
// is set, fall back to gpt-4o-mini so the golfer still gets feedback.
export const COACH_MODEL = 'claude-sonnet-5-5'

export function coachAiConfigured(): boolean {
  const a = process.env.ANTHROPIC_API_KEY
  const o = process.env.OPENAI_API_KEY
  return !!((a && a !== 'your-key-here') || (o && o !== 'your-key-here'))
}

export async function coachComplete(systemPrompt: string, user: string, maxTokens: number): Promise<string> {
  const system = systemPrompt + GOLF_ONLY_RULES
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey && anthropicKey !== 'your-key-here') {
    try {
      const client = new Anthropic({ apiKey: anthropicKey })
      const msg = await client.messages.create({
        model: COACH_MODEL,
        // Headroom over the word limit so a reply is never cut off mid-drill
        max_tokens: Math.max(maxTokens * 2, 600),
        system,
        messages: [{ role: 'user', content: user }],
      })
      const text = msg.content
        .map(b => (b.type === 'text' ? b.text : ''))
        .join('')
        .trim()
      if (text) return text
    } catch (err) {
      console.error('[coach-ai] Claude failed, falling back to OpenAI', err)
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey || openaiKey === 'your-key-here') throw new Error('AI coaching not configured')
  const client = new OpenAI({ apiKey: openaiKey })
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  return completion.choices[0]?.message?.content ?? ''
}
