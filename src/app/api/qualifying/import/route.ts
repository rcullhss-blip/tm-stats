import { NextResponse } from 'next/server'
import { currentUserId, finishQualifierRound, teamFor } from '@/lib/qualifying-server'
import { blankCard, type Qualifier } from '@/lib/qualifying'
import { validateImport } from '@/lib/results-import'

export const maxDuration = 120

// Coach confirms a result they uploaded and checked. It is saved as a finished
// tournament: every matched player gets each round in their own account with
// pars and scores filled in, and an email with a link to add their stats.
export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const team = await teamFor(userId)
  if (!team || team.role !== 'coach') return NextResponse.json({ error: 'Only the coach can bring in results' }, { status: 403 })
  const { service } = team

  const checked = validateImport(await request.json().catch(() => ({})))
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: 400 })

  const { data: members } = await service.from('team_members').select('user_id').eq('team_id', team.teamId)
  const onTeam = new Set<string>((members ?? []).map((m: { user_id: string }) => m.user_id))
  const players = checked.players.filter(p => onTeam.has(p.userId))
  if (players.length === 0) return NextResponse.json({ error: 'None of those players are on your team' }, { status: 400 })

  const roundCount = checked.dates.length
  const { data: created, error } = await service.from('qualifiers').insert({
    team_id: team.teamId,
    kind: 'tournament',
    name: checked.name,
    course_name: checked.courseName,
    holes: checked.holes,
    pars: checked.pars,
    round_count: roundCount,
    round_dates: checked.dates,
    created_by: userId,
  }).select('*').single()
  if (error || !created) return NextResponse.json({ error: error?.message ?? 'Could not save the result' }, { status: 500 })

  const cards = players.flatMap(p =>
    Array.from({ length: roundCount }, (_, i) => ({ qualifier_id: created.id, round_no: i + 1, user_id: p.userId, scores: p.rounds[i] ?? blankCard(checked.holes) }))
  )
  const { error: cardError } = await service.from('qualifier_scores').insert(cards)
  if (cardError) {
    await service.from('qualifiers').delete().eq('id', created.id)
    return NextResponse.json({ error: cardError.message }, { status: 500 })
  }

  const qualifier: Qualifier = {
    id: created.id, team_id: created.team_id, kind: 'tournament', name: created.name, course_name: created.course_name,
    holes: checked.holes, pars: checked.pars, round_count: roundCount, round_dates: checked.dates,
    rounds_finished: 0, created_by: userId, created_at: created.created_at,
  }
  let roundsMade = 0, emailed = 0
  const problems: string[] = []
  for (let roundNo = 1; roundNo <= roundCount; roundNo++) {
    const result = await finishQualifierRound(service, { ...qualifier, rounds_finished: roundNo - 1 }, roundNo)
    roundsMade += result.created
    emailed += result.emailed
    problems.push(...result.incomplete)
  }

  return NextResponse.json({ ok: true, id: created.id, rounds: roundsMade, emailed, problems })
}
