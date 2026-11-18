export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { hasElite } from '@/lib/plan'
import FinishStatsClient from './FinishStatsClient'

interface PageProps { params: Promise<{ id: string }> }

// "Add your stats": the round's pars and scores are already in (qualifying or
// an uploaded result). The golfer only fills in what happened on each hole.
export default async function FinishStatsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: round } = await sb.from('rounds').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!round) return notFound()
  if (!round.stats_pending) redirect(`/rounds/${id}`)

  const { data: holes } = await sb.from('holes').select('hole_number, par, score').eq('round_id', id).order('hole_number')
  if (!holes || holes.length === 0) return notFound()

  const { data: profile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()

  return (
    <FinishStatsClient
      roundId={id}
      courseName={round.course_name}
      eventName={round.notes ?? null}
      date={round.date}
      roundType={round.round_type}
      holes={holes.map((h: { hole_number: number; par: 3 | 4 | 5; score: number }) => ({ holeNumber: h.hole_number, par: h.par, score: h.score }))}
      advancedEnabled={hasElite(profile?.subscription_status)}
    />
  )
}
