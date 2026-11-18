import { NextResponse } from 'next/server'
import { currentUserId, teamFor } from '@/lib/qualifying-server'
import { blankCard, validateSetup } from '@/lib/qualifying'

// Coach sets up a qualifier.
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const team = await teamFor(userId)
  if (!team || team.role !== 'coach') return NextResponse.json({ error: 'Only the coach can set up qualifying' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const problem = validateSetup(body)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  // Players must be on this coach's team
  const { data: members } = await team.service.from('team_members').select('user_id').eq('team_id', team.teamId)
  const onTeam = new Set<string>((members ?? []).map((m: { user_id: string }) => m.user_id))
  const playerIds: string[] = [...new Set<string>(body.playerIds as string[])].filter(id => onTeam.has(id))
  if (playerIds.length === 0) return NextResponse.json({ error: 'Pick at least one player from your team' }, { status: 400 })

  const { data: created, error } = await team.service.from('qualifiers').insert({
    team_id: team.teamId,
    kind: 'qualifying',
    name: String(body.name).trim().slice(0, 80),
    course_name: String(body.courseName).trim().slice(0, 120),
    holes: body.holes,
    pars: body.pars,
    round_count: body.roundCount,
    round_dates: body.dates,
    created_by: userId,
  }).select('id').single()
  if (error || !created) return NextResponse.json({ error: error?.message ?? 'Could not create the qualifier' }, { status: 500 })

  // One blank card per player per round, so the leaderboard shows everyone from the start
  const cards = playerIds.flatMap(id =>
    Array.from({ length: body.roundCount }, (_, i) => ({ qualifier_id: created.id, round_no: i + 1, user_id: id, scores: blankCard(body.holes) }))
  )
  const { error: cardError } = await team.service.from('qualifier_scores').insert(cards)
  if (cardError) {
    await team.service.from('qualifiers').delete().eq('id', created.id)
    return NextResponse.json({ error: cardError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: created.id })
}
