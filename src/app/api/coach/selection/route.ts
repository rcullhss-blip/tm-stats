import { NextResponse } from 'next/server'
import { currentUserId, teamFor } from '@/lib/qualifying-server'
import { parseSaved } from '@/lib/selection'

// Coach saves their selection picks: rounds left out, travel squad, notes.
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const team = await teamFor(userId)
  if (!team || team.role !== 'coach') return NextResponse.json({ error: 'Only the coach can save a selection' }, { status: 403 })
  const saved = parseSaved(await request.json().catch(() => ({})))
  // Only players on this team can be in the squad or have notes
  const { data: members } = await team.service.from('team_members').select('user_id').eq('team_id', team.teamId)
  const onTeam = new Set<string>((members ?? []).map((m: { user_id: string }) => m.user_id))
  const clean = {
    excluded: saved.excluded,
    squad: saved.squad.filter(id => onTeam.has(id)),
    notes: Object.fromEntries(Object.entries(saved.notes).filter(([id]) => onTeam.has(id))),
    savedAt: new Date().toISOString(),
  }
  const { error } = await team.service.from('teams').update({ selection: clean }).eq('id', team.teamId)
  if (error) return NextResponse.json({ error: /selection/.test(error.message) ? 'Saving picks needs a one-off database update first.' : 'Could not save. Try again.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
