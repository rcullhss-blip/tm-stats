import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Profile: list connected watches, and disconnect one.
async function me() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const userId = await me()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createServiceClient() as any).from('device_tokens').select('id, name, created_at, last_used_at').eq('user_id', userId).order('created_at', { ascending: false })
  return NextResponse.json({ devices: data ?? [] })
}

export async function DELETE(request: Request) {
  const userId = await me()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(request.url).searchParams.get('id') ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createServiceClient() as any).from('device_tokens').delete().eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
