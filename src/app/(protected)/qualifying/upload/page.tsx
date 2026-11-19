export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { currentUserId, teamFor } from '@/lib/qualifying-server'
import UploadResultClient from '@/components/qualifying/UploadResultClient'

// Coach brings in a tournament result so the players' scores are already in.
export default async function UploadResultPage() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')
  const team = await teamFor(userId)
  if (!team || team.role !== 'coach') return notFound()
  return <UploadResultClient teamName={team.teamName} />
}
