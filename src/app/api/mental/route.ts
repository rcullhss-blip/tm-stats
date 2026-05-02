import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a calm, experienced golf mentor — like a trusted playing partner who has seen it all.
You help golfers with the mental side of their game. Your tone is warm, grounded, and practical — never clinical, never preachy, never like a therapist.
You speak from experience on the course. Keep responses concise: 2-4 short paragraphs. Focus on perspective, simple cues, and next steps on the course.
Never reference real golfers, coaches, or sports psychologists by name. Never use clinical language. Never dwell on problems — always move toward solutions.`

type MentalMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your-key-here') {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('subscription_status, handicap, name')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'
  if (!isPro) return NextResponse.json({ error: 'Pro feature' }, { status: 403 })

  let body: { message?: string; sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const playerName = profile?.name?.split(' ')[0] ?? 'Golfer'
  const handicap = profile?.handicap ?? 'unknown'

  // Load or create session
  let sessionId = body.sessionId
  let existingMessages: MentalMessage[] = []

  if (sessionId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from('mental_sessions')
      .select('messages')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()
    if (session) {
      existingMessages = (session.messages as MentalMessage[]) ?? []
    }
  }

  const newUserMessage: MentalMessage = { role: 'user', content: message }
  const allMessages: MentalMessage[] = [...existingMessages, newUserMessage]

  const client = new OpenAI({ apiKey })
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\nYou are speaking with ${playerName} (handicap ${handicap}). Address them by name occasionally to keep it personal.`,
      },
      ...allMessages,
    ],
  })

  const responseText = completion.choices[0]?.message?.content ?? ''
  const assistantMessage: MentalMessage = { role: 'assistant', content: responseText }
  const updatedMessages: MentalMessage[] = [...allMessages, assistantMessage]

  // Save or update session
  if (sessionId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('mental_sessions')
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', user.id)
  } else {
    // Auto-generate a title from the first message (truncated)
    const title = message.length > 60 ? message.slice(0, 57) + '…' : message
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newSession } = await (supabase as any)
      .from('mental_sessions')
      .insert({ user_id: user.id, title, messages: updatedMessages })
      .select('id')
      .single()
    sessionId = newSession?.id ?? null
  }

  return NextResponse.json({ response: responseText, sessionId })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'
  if (!isPro) return NextResponse.json({ error: 'Pro feature' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (sessionId) {
    // Load a specific session's messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from('mental_sessions')
      .select('id, title, messages, created_at, updated_at')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()
    return NextResponse.json({ session })
  }

  // List all sessions (no messages — just metadata)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessions } = await (supabase as any)
    .from('mental_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ sessions: sessions ?? [] })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('mental_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
