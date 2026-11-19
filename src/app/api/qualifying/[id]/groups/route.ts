import { NextResponse } from 'next/server'
import { currentUserId, qualifierFor } from '@/lib/qualifying-server'
import { cleanGroups, type TeeGroup } from '@/lib/qualifying'

// The coach sets groups and tee times for a round (or every round still to play).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await qualifierFor(userId, id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { qualifier, service, role } = access
  if (role !== 'coach') return NextResponse.json({ error: 'Only the coach can set groups' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const roundNo = Number(body.roundNo)
  if (!Number.isInteger(roundNo) || roundNo < 1 || roundNo > qualifier.round_count) return NextResponse.json({ error: 'Unknown round' }, { status: 400 })
  if (roundNo <= qualifier.rounds_finished) return NextResponse.json({ error: 'That round is finished' }, { status: 409 })

  const { data: cards } = await service.from('qualifier_scores').select('user_id').eq('qualifier_id', qualifier.id).eq('round_no', roundNo)
  const playerIds = [...new Set((cards ?? []).map((c: { user_id: string }) => c.user_id))] as string[]
  const groups = cleanGroups(body.groups, playerIds)

  const { data: row } = await service.from('qualifiers').select('groups').eq('id', qualifier.id).maybeSingle()
  const all: Record<string, TeeGroup[]> = row?.groups && typeof row.groups === 'object' && !Array.isArray(row.groups) ? { ...row.groups } : {}
  const rounds = body.allRounds === true
    ? Array.from({ length: qualifier.round_count - qualifier.rounds_finished }, (_, i) => qualifier.rounds_finished + 1 + i)
    : [roundNo]
  for (const n of rounds) {
    if (groups.length > 0) all[String(n)] = groups
    else delete all[String(n)]
  }
  const { error } = await service.from('qualifiers').update({ groups: all }).eq('id', qualifier.id)
  if (error) return NextResponse.json({ error: 'Could not save the groups' }, { status: 500 })
  return NextResponse.json({ ok: true, groups, rounds })
}
