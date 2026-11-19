import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { joinTeam } from '@/lib/team-join'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { joinCode } = await request.json().catch(() => ({}))
  if (typeof joinCode !== 'string' || !joinCode.trim()) return NextResponse.json({ error: 'Join code required' }, { status: 400 })
  const r = await joinTeam(user.id, joinCode)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  if (r.already) return NextResponse.json({ error: `You are already in ${r.teamName}` }, { status: 400 })
  return NextResponse.json({ ok: true, teamName: r.teamName, proUntil: r.proUntil })
}
