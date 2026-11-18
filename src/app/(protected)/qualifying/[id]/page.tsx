export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { currentUserId, qualifierFor, qualifierState } from '@/lib/qualifying-server'
import QualifyingClient from '@/components/qualifying/QualifyingClient'

interface PageProps { params: Promise<{ id: string }> }

// Live qualifying: leaderboard, score entry and (for the coach) finishing a round.
export default async function QualifyingPage({ params }: PageProps) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) redirect('/login')
  const access = await qualifierFor(userId, id)
  if (!access) return notFound()
  const state = await qualifierState(access.service, access.qualifier, access.role)
  return <QualifyingClient initial={state} userId={userId} />
}
