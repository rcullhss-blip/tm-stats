import { NextResponse } from 'next/server'
import { currentUserId, qualifierFor } from '@/lib/qualifying-server'
import { cleanCard, missingHoles } from '@/lib/qualifying'

// A group hands in its cards at the end of a round, after checking every hole.
// Submitted cards lock for players; the coach can still change them, or reopen one.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await qualifierFor(userId, id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { qualifier, service, role } = access

  const body = await request.json().catch(() => ({}))
  const roundNo = Number(body.roundNo)
  if (!Number.isInteger(roundNo) || roundNo < 1 || roundNo > qualifier.round_count) return NextResponse.json({ error: 'Unknown round' }, { status: 400 })
  const ids = Array.isArray(body.userIds) ? [...new Set(body.userIds.map(String))] as string[] : []
  if (ids.length === 0 || ids.length > 6) return NextResponse.json({ error: 'Pick the players in your group' }, { status: 400 })

  const { data: cards } = await service.from('qualifier_scores')
    .select('id, user_id, scores, round_id, submitted_at')
    .eq('qualifier_id', qualifier.id).eq('round_no', roundNo).in('user_id', ids)
  if (!cards || cards.length !== ids.length) return NextResponse.json({ error: 'A player in your group is not in this qualifier' }, { status: 400 })

  // Coach reopens a card so the group can fix it
  if (body.reopen === true) {
    if (role !== 'coach') return NextResponse.json({ error: 'Only the coach can reopen a card' }, { status: 403 })
    if (cards.some((c: { round_id: string | null }) => c.round_id)) return NextResponse.json({ error: 'That round is already in the player\'s account' }, { status: 409 })
    await service.from('qualifier_scores').update({ submitted_at: null, submitted_by: null }).in('id', cards.map((c: { id: string }) => c.id))
    return NextResponse.json({ ok: true, reopened: cards.length })
  }

  // Every hole must be in before a card can be handed in
  const { data: players } = await service.from('users').select('id, name').in('id', ids)
  const nameOf = (uid: string) => (players ?? []).find((p: { id: string; name: string }) => p.id === uid)?.name ?? 'A player'
  const gaps = cards
    .map((c: { user_id: string; scores: unknown }) => ({ name: nameOf(c.user_id), holes: missingHoles(cleanCard(c.scores, qualifier.holes)) }))
    .filter((g: { holes: number[] }) => g.holes.length > 0)
  if (gaps.length > 0) {
    return NextResponse.json({ error: `Not every hole is in: ${gaps.map((g: { name: string; holes: number[] }) => `${g.name} hole${g.holes.length > 1 ? 's' : ''} ${g.holes.join(', ')}`).join('; ')}`, gaps }, { status: 400 })
  }

  const open = cards.filter((c: { submitted_at: string | null; round_id: string | null }) => !c.submitted_at && !c.round_id)
  if (open.length > 0) {
    await service.from('qualifier_scores').update({ submitted_at: new Date().toISOString(), submitted_by: userId }).in('id', open.map((c: { id: string }) => c.id))
  }
  return NextResponse.json({ ok: true, submitted: open.length })
}
