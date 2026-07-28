export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { HoleRow, ShotEntry } from '@/lib/types'
import { calculateRoundSG, handicapToSkillLevel, normalizeSkillLevel, type SkillLevel } from '@/lib/sg-engine'
import ShareCard, { type ShareData } from '@/components/rounds/ShareCard'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ShareRoundPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('name, handicap, sg_baseline, subscription_status')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'
  if (!isPro) redirect(`/upgrade?reason=share`)

  const { data: round } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!round) notFound()

  const { data: holes } = await supabase
    .from('holes')
    .select('*')
    .eq('round_id', id)
    .order('hole_number')

  const holeList: HoleRow[] = holes ?? []
  const totalPar = round.par_total ?? holeList.reduce((s, h) => s + h.par, 0)
  const totalScore = round.score_total ?? holeList.reduce((s, h) => s + h.score, 0)

  const firHoles = holeList.filter(h => h.par !== 3)
  const firHit = firHoles.filter(h => h.fir === true).length
  const girHit = holeList.filter(h => h.gir === true).length
  const putts = holeList.reduce((s, h) => s + (h.putts ?? 0), 0)
  const birdies = holeList.filter(h => h.score <= h.par - 1).length

  const skillLevel: SkillLevel = normalizeSkillLevel(profile?.sg_baseline) ?? handicapToSkillLevel(profile?.handicap ?? null)
  const sg = round.input_mode === 'full'
    ? calculateRoundSG(
        holeList.map(h => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots as ShotEntry[] | null })),
        skillLevel
      )
    : null

  const procShots = holeList
    .flatMap(h => (Array.isArray(h.shots) ? (h.shots as unknown as ShotEntry[]) : []))
    .filter(s => typeof s.process === 'boolean')

  const data: ShareData = {
    courseName: round.course_name,
    date: round.date,
    holes: round.holes,
    score: totalScore,
    toPar: totalScore - totalPar,
    par: totalPar,
    firPct: firHoles.length > 0 ? Math.round((firHit / firHoles.length) * 100) : null,
    girPct: holeList.length > 0 ? Math.round((girHit / holeList.length) * 100) : null,
    putts: putts > 0 ? putts : null,
    birdies,
    sgTotal: sg?.sgTotal ?? null,
    sgOffTee: sg?.sgOffTee ?? null,
    sgApproach: sg?.sgApproach ?? null,
    sgAroundGreen: sg?.sgAroundGreen ?? null,
    sgPutt: sg?.sgPutt ?? null,
    processPct: procShots.length > 0 ? Math.round((procShots.filter(s => s.process).length / procShots.length) * 100) : null,
    playerName: profile?.name?.split(' ')[0] ?? null,
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/rounds/${id}`} className="flex items-center gap-1 text-sm" style={{ color: '#9A9DB0', minHeight: '44px' }}>
          ← Back to round
        </Link>
      </div>
      <ShareCard data={data} />
    </div>
  )
}
