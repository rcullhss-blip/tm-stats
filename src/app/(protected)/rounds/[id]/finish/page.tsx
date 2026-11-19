export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { hasElite } from '@/lib/plan'
import { createServiceClient } from '@/lib/supabase/service'
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

  let { data: holes } = await sb.from('holes').select('hole_number, par, score').eq('round_id', id).order('hole_number')
  // A round from a results sheet that only had totals has no holes yet: the
  // golfer adds the hole scores first. Pars come from the event.
  let totalOnly = false
  if (!holes || holes.length === 0) {
    if (!round.qualifier_id || !round.score_total) return notFound()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: q } = await (createServiceClient() as any).from('qualifiers').select('pars, holes').eq('id', round.qualifier_id).maybeSingle()
    const count = round.holes === 9 ? 9 : 18
    const pars: (3 | 4 | 5)[] = Array.from({ length: count }, (_, i) => {
      const p = Array.isArray(q?.pars) ? q.pars[i] : 4
      return p === 3 || p === 5 ? p : 4
    })
    holes = pars.map((par, i) => ({ hole_number: i + 1, par, score: 0 }))
    totalOnly = true
  }

  const { data: profile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()

  // Tee yardages: from this golfer's last shot-by-shot round at the course, or
  // else from a teammate who has already added full stats in the same event.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let yardages: (number | null)[] | undefined
  const sources: string[] = []
  const { data: mine } = await sb.from('rounds').select('id').eq('user_id', user.id).eq('input_mode', 'full').ilike('course_name', round.course_name).neq('id', id).order('date', { ascending: false }).limit(1)
  if (mine?.[0]) sources.push(mine[0].id)
  if (round.qualifier_id) {
    const { data: mates } = await service.from('rounds').select('id').eq('qualifier_id', round.qualifier_id).eq('input_mode', 'full').eq('stats_pending', false).limit(3)
    for (const m of mates ?? []) sources.push(m.id)
  }
  for (const rid of sources) {
    const { data: hs } = await service.from('holes').select('hole_number, shots').eq('round_id', rid).order('hole_number')
    if (!hs || hs.length !== holes!.length) continue
    const ys = hs.map((h: { shots: unknown }) => {
      const first = Array.isArray(h.shots) ? (h.shots[0] as { lieType?: string; distanceToPin?: number } | undefined) : undefined
      return first?.lieType === 'tee' && typeof first.distanceToPin === 'number' ? first.distanceToPin : null
    })
    if (ys.some((y: number | null) => y !== null)) { yardages = ys; break }
  }

  return (
    <FinishStatsClient
      roundId={id}
      courseName={round.course_name}
      eventName={round.notes ?? null}
      date={round.date}
      roundType={round.round_type}
      totalOnly={totalOnly}
      total={round.score_total ?? null}
      holes={holes!.map((h: { hole_number: number; par: 3 | 4 | 5; score: number }) => ({ holeNumber: h.hole_number, par: h.par, score: h.score }))}
      advancedEnabled={hasElite(profile?.subscription_status)}
      yardages={yardages}
    />
  )
}
