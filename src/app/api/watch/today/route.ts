import { NextResponse } from 'next/server'
import { currentUserId, teamFor } from '@/lib/qualifying-server'
import { isFinished } from '@/lib/qualifying'
import { createServiceClient } from '@/lib/supabase/service'

// The watch's home screen: who is signed in, and the team's open qualifying or tournaments.
export async function GET() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const team = await teamFor(userId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: me } = await (createServiceClient() as any).from('users').select('name').eq('id', userId).maybeSingle()
  if (!team) return NextResponse.json({ userId, name: me?.name ?? null, team: null, events: [] })
  const { data: quals } = await team.service.from('qualifiers').select('id, name, kind, course_name, holes, round_count, rounds_finished, round_dates').eq('team_id', team.teamId).order('created_at', { ascending: false }).limit(20)
  const events = (quals ?? []).filter((q: { round_count: number; rounds_finished: number }) => !isFinished(q)).map((q: { id: string; name: string; kind: string; course_name: string; holes: number; round_count: number; rounds_finished: number }) => ({
    id: q.id, name: q.name, kind: q.kind, course: q.course_name, holes: q.holes, round: Math.min(q.rounds_finished + 1, q.round_count), rounds: q.round_count,
  }))
  return NextResponse.json({ userId, name: me?.name ?? null, team: team.teamName, events }, { headers: { 'Cache-Control': 'no-store' } })
}
