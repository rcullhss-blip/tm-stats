import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// The app saves this phone's push address after the golfer allows notifications.
async function me() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function POST(request: Request) {
  const userId = await me()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const platform = body.platform === 'android' ? 'android' : body.platform === 'ios' ? 'ios' : null
  if (!platform || token.length < 20 || token.length > 400 || !/^[A-Za-z0-9:_\-]+$/.test(token)) return NextResponse.json({ error: 'Bad token' }, { status: 400 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  // A phone belongs to whoever signed in on it last
  const { error } = await service.from('push_tokens').upsert({ user_id: userId, token, platform, last_seen_at: new Date().toISOString() }, { onConflict: 'token' })
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const userId = await me()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = new URL(request.url).searchParams.get('token') ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (createServiceClient() as any).from('push_tokens').delete().eq('token', token).eq('user_id', userId)
  return NextResponse.json({ ok: true })
}
