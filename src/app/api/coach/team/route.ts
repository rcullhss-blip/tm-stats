import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()
  if (profile?.subscription_status !== 'team') {
    return NextResponse.json({ error: 'Coach account required' }, { status: 403 })
  }

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Team name required' }, { status: 400 })

  const service = createServiceClient()

  // Check they don't already have a team
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (service as any).from('teams').select('id').eq('coach_user_id', user.id).single()
  if (existing) return NextResponse.json({ error: 'You already have a team' }, { status: 400 })

  // Generate unique join code
  let joinCode = generateJoinCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (service as any).from('teams').select('id').eq('join_code', joinCode).single()
    if (!existing) break
    joinCode = generateJoinCode()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any).from('teams').insert({
    name: name.trim(),
    coach_user_id: user.id,
    join_code: joinCode,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, joinCode })
}
