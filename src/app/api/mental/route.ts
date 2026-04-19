import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your-key-here') {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, handicap')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'
  if (!isPro) return NextResponse.json({ error: 'Pro feature' }, { status: 403 })

  let body: { message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 250,
    messages: [
      {
        role: 'system',
        content: `You are a calm, experienced golf mentor — like a trusted playing partner who has seen it all.
You help golfers with the mental side of their game. Your tone is warm, grounded, and practical — never clinical, never preachy, never like a therapist.
You speak from experience on the course. Keep responses concise: 2-4 short paragraphs. Focus on perspective, simple cues, and next steps on the course.
Never reference real golfers, coaches, or sports psychologists by name. Never use clinical language. Never dwell on problems — always move toward solutions.`,
      },
      {
        role: 'user',
        content: `A golfer (handicap ${profile?.handicap ?? 'unknown'}) says: "${message}"`,
      },
    ],
  })

  const response = completion.choices[0]?.message?.content ?? ''
  return NextResponse.json({ response })
}
