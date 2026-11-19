import { NextResponse } from 'next/server'
import { currentUserId, finishQualifierRound, qualifierFor } from '@/lib/qualifying-server'

export const maxDuration = 60

// Coach finishes a qualifying round. Every player with a full card gets the
// round in their own account (pars and scores in, stats to add) and an email
// with a link straight to it. Safe to press twice: a card that already has a
// round is skipped, so a player who was missing a hole can be added later.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await qualifierFor(userId, id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (access.role !== 'coach') return NextResponse.json({ error: 'Only the coach can finish a round' }, { status: 403 })
  const { qualifier, service } = access

  const body = await request.json().catch(() => ({}))
  const roundNo = Number(body.roundNo)
  if (!Number.isInteger(roundNo) || roundNo < 1 || roundNo > qualifier.round_count) return NextResponse.json({ error: 'Unknown round' }, { status: 400 })
  // Rounds are finished in order
  if (roundNo > qualifier.rounds_finished + 1) return NextResponse.json({ error: `Finish round ${qualifier.rounds_finished + 1} first` }, { status: 400 })

  const result = await finishQualifierRound(service, qualifier, roundNo)
  return NextResponse.json({ ok: true, ...result })
}
