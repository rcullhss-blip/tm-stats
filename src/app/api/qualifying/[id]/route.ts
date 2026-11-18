import { NextResponse } from 'next/server'
import { currentUserId, qualifierFor, qualifierState } from '@/lib/qualifying-server'

// Live state for the qualifying page (polled every few seconds).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await qualifierFor(userId, id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const state = await qualifierState(access.service, access.qualifier, access.role)
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } })
}

// Coach removes a qualifier. Rounds already handed to players stay in their accounts.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await qualifierFor(userId, id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (access.role !== 'coach') return NextResponse.json({ error: 'Only the coach can remove a qualifier' }, { status: 403 })
  const { error } = await access.service.from('qualifiers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
