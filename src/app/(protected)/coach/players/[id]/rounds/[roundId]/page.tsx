export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { HoleRow, ShotEntry } from '@/lib/types'
import { calculateRoundSG, fmtSG, sgColor, handicapToSkillLevel, type SkillLevel } from '@/lib/sg-engine'
import CoachAIChallenge from '@/components/coach/CoachAIChallenge'

interface PageProps {
  params: Promise<{ id: string; roundId: string }>
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function scoreColor(diff: number): string {
  if (diff < 0) return '#22C55E'
  if (diff === 0) return '#F0F0F0'
  if (diff <= 2) return '#9A9DB0'
  return '#EF4444'
}

export default async function CoachPlayerRoundPage({ params }: PageProps) {
  const { id: playerId, roundId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verify caller is a coach
  const { data: coachProfile } = await supabase.from('users').select('subscription_status').eq('id', user.id).single()
  if (coachProfile?.subscription_status !== 'team') return notFound()

  const service = createServiceClient()

  // Verify player is in coach's team
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (service as any).from('teams').select('id').eq('coach_user_id', user.id).single()
  if (!team) return notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (service as any).from('team_members').select('id').eq('team_id', team.id).eq('user_id', playerId).single()
  if (!membership) return notFound()

  // Fetch player profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player } = await (service as any).from('users').select('id, name, email, handicap, sg_baseline').eq('id', playerId).single()
  if (!player) return notFound()

  // Fetch round
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: round } = await (service as any)
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .eq('user_id', playerId)
    .single()
  if (!round) return notFound()

  // Fetch holes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: holesRaw } = await (service as any)
    .from('holes')
    .select('*')
    .eq('round_id', roundId)
    .order('hole_number')

  const holeList: HoleRow[] = holesRaw ?? []
  const totalPar = round.par_total ?? holeList.reduce((s: number, h: HoleRow) => s + h.par, 0)
  const totalScore = round.score_total ?? holeList.reduce((s: number, h: HoleRow) => s + h.score, 0)
  const totalDiff = totalScore - totalPar

  // SG calculation
  const skillLevel: SkillLevel = (player.sg_baseline as SkillLevel | null) ?? handicapToSkillLevel(player.handicap ?? null)
  const holesForSG = holeList.map((h: HoleRow) => ({
    holeNumber: h.hole_number,
    par: h.par as 3 | 4 | 5,
    shots: Array.isArray(h.shots) ? (h.shots as unknown as ShotEntry[]) : null,
  }))
  const sg = round.input_mode === 'full' ? calculateRoundSG(holesForSG, skillLevel) : null

  const playerName = player.name ?? player.email

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Back */}
      <Link href={`/coach/players/${playerId}`} className="text-sm mb-6 inline-block" style={{ color: '#9A9DB0' }}>
        ← {playerName}
      </Link>

      {/* Round header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          {round.course_name}
        </h1>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>{formatDate(round.date)}</p>
        <div className="flex items-center gap-3 mt-3">
          <span
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(totalDiff) }}
          >
            {totalDiff === 0 ? 'E' : totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`}
          </span>
          <span className="text-sm" style={{ color: '#9A9DB0' }}>
            {totalScore} ({totalPar} par)
          </span>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: '#22263A', color: '#9A9DB0', border: '1px solid #2E3247' }}
          >
            {round.input_mode === 'full' ? 'Full tracking' : 'Quick'}
          </span>
        </div>
      </div>

      {/* SG breakdown */}
      {sg && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>Strokes Gained</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { label: 'Off Tee', value: sg.sgOffTee },
              { label: 'Approach', value: sg.sgApproach },
              { label: 'Around Green', value: sg.sgAroundGreen },
              { label: 'Putting', value: sg.sgPutt },
            ] as { label: string; value: number }[]).map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
                <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>{label}</p>
                <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(value) }}>
                  {fmtSG(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hole by hole */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>Hole by Hole</p>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
          {holeList.map((h: HoleRow, i: number) => {
            const diff = h.score - h.par
            return (
              <div
                key={h.id}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: i < holeList.length - 1 ? '1px solid #2E3247' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs w-8" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60' }}>
                    H{h.hole_number}
                  </span>
                  <span className="text-xs" style={{ color: '#9A9DB0' }}>Par {h.par}</span>
                </div>
                <div className="flex items-center gap-4">
                  {h.fir !== null && (
                    <span className="text-xs" style={{ color: h.fir ? '#22C55E' : '#EF4444' }}>
                      {h.fir ? 'FIR ✓' : 'FIR ✗'}
                    </span>
                  )}
                  {h.gir !== null && (
                    <span className="text-xs" style={{ color: h.gir ? '#22C55E' : '#EF4444' }}>
                      {h.gir ? 'GIR ✓' : 'GIR ✗'}
                    </span>
                  )}
                  {h.putts !== null && (
                    <span className="text-xs" style={{ color: '#9A9DB0' }}>{h.putts}p</span>
                  )}
                  <span
                    className="text-base font-bold w-8 text-right"
                    style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(diff) }}
                  >
                    {h.score}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Round notes */}
      {round.notes && (
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>Player Notes</p>
          <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>{round.notes}</p>
        </div>
      )}

      {/* AI Challenge */}
      <CoachAIChallenge
        coachId={user.id}
        playerId={playerId}
        playerName={playerName}
        rounds={[{
          id: roundId,
          courseName: round.course_name,
          date: round.date,
          scoreToPar: totalDiff,
        }]}
      />
    </div>
  )
}
