export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { HoleRow, ShotEntry } from '@/lib/types'
import { calculateRoundSG, fmtSG, sgColor, handicapToSkillLevel, SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/sg-engine'

function scoreColor(diff: number): string {
  if (diff < 0) return '#22C55E'
  if (diff === 0) return '#F0F0F0'
  if (diff <= 2) return '#9A9DB0'
  return '#EF4444'
}
function scoreToPar(score: number, par: number): string {
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function roundTypeLabel(type: string): string {
  if (type === 'competition') return 'Competition'
  if (type === 'tournament') return 'Tournament'
  return 'Practice'
}

interface PageProps { params: Promise<{ id: string; roundId: string }> }

export default async function CoachRoundDetailPage({ params }: PageProps) {
  const { id: playerId, roundId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()

  // Verify coach has this player in their team
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (service as any).from('teams').select('id, name').eq('coach_user_id', user.id).single()
  if (!team) return notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (service as any).from('team_members').select('id').eq('team_id', team.id).eq('user_id', playerId).single()
  if (!membership) return notFound()

  // Fetch player profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player } = await (service as any).from('users').select('name, email, handicap, sg_baseline').eq('id', playerId).single()
  if (!player) return notFound()

  const skillLevel: SkillLevel = (player.sg_baseline as SkillLevel | null) ?? handicapToSkillLevel(player.handicap ?? null)

  // Fetch round + holes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: round }, { data: holesRaw }] = await Promise.all([
    (service as any).from('rounds').select('*').eq('id', roundId).eq('user_id', playerId).single(),
    (service as any).from('holes').select('*').eq('round_id', roundId).order('hole_number'),
  ])
  if (!round) return notFound()

  const holeList: HoleRow[] = holesRaw ?? []
  const totalPar = round.par_total ?? holeList.reduce((s: number, h: HoleRow) => s + h.par, 0)
  const totalScore = round.score_total ?? holeList.reduce((s: number, h: HoleRow) => s + h.score, 0)
  const totalDiff = totalScore - totalPar

  function holeFIR(h: HoleRow): boolean | null {
    if (h.par === 3) return null
    if (round?.input_mode === 'full' && Array.isArray(h.shots) && h.shots.length > 1) {
      const shots = h.shots as unknown as ShotEntry[]
      return shots[1]?.lieType === 'fairway'
    }
    return h.fir
  }

  const fairwaysHit = holeList.filter(h => holeFIR(h) === true).length
  const fairwaysTotal = holeList.filter(h => h.par !== 3).length
  const girs = holeList.filter(h => h.gir === true).length
  const totalPutts = holeList.reduce((s: number, h: HoleRow) => s + (h.putts ?? 0), 0)
  const upDownAttempts = holeList.filter(h => h.gir === false).length
  const upDowns = holeList.filter(h => h.gir === false && h.up_and_down === true).length
  const sandSaves = holeList.filter(h => h.sand_save === true).length
  const sandAttempts = holeList.filter(h => h.sand_save !== null).length
  const eagles = holeList.filter(h => h.score <= h.par - 2).length
  const birdies = holeList.filter(h => h.score === h.par - 1).length
  const pars = holeList.filter(h => h.score === h.par).length
  const bogeys = holeList.filter(h => h.score === h.par + 1).length
  const doubles = holeList.filter(h => h.score >= h.par + 2).length

  const isFullTracking = round.input_mode === 'full'
  const sgData = isFullTracking
    ? calculateRoundSG(
        holeList.map(h => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots as ShotEntry[] | null })),
        skillLevel
      )
    : null

  const has9s = round.holes === 18 && holeList.length === 18
  function calc9(hs: HoleRow[]) {
    return {
      score: hs.reduce((s: number, h: HoleRow) => s + h.score, 0),
      par: hs.reduce((s: number, h: HoleRow) => s + h.par, 0),
      firHit: hs.filter(h => holeFIR(h) === true).length,
      firTotal: hs.filter(h => h.par !== 3).length,
      gir: hs.filter(h => h.gir === true).length,
      putts: hs.reduce((s: number, h: HoleRow) => s + (h.putts ?? 0), 0),
    }
  }
  const f9 = has9s ? calc9(holeList.filter(h => h.hole_number <= 9)) : null
  const b9 = has9s ? calc9(holeList.filter(h => h.hole_number >= 10)) : null

  const parBreakdown = ([3, 4, 5] as const).map(par => {
    const ph = holeList.filter(h => h.par === par)
    if (ph.length === 0) return null
    const scored = ph.reduce((s: number, h: HoleRow) => s + h.score, 0)
    const avgToPar = scored / ph.length - par
    return {
      par, count: ph.length, avgToPar,
      birdie: ph.filter(h => h.score <= h.par - 1).length,
      bogeyPlus: ph.filter(h => h.score >= h.par + 1).length,
    }
  }).filter((p): p is NonNullable<typeof p> => p !== null)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/coach/players/${playerId}`} className="text-sm" style={{ color: '#9A9DB0', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
          ← {player.name ?? player.email}
        </Link>
        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>Coach view</span>
      </div>

      {/* Round header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{round.course_name}</h1>
          {isFullTracking && (
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: '#22C55E20', color: '#22C55E' }}>SG</span>
          )}
        </div>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>
          {formatDate(round.date)} · {round.holes} holes · {roundTypeLabel(round.round_type)}
        </p>
      </div>

      {/* Score hero */}
      <div className="text-center p-6 rounded-2xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-sm mb-2" style={{ color: '#9A9DB0' }}>Total score</p>
        <p className="text-6xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(totalDiff) }}>{totalScore}</p>
        <p className="text-2xl font-medium mt-1" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(totalDiff) }}>{scoreToPar(totalScore, totalPar)}</p>
        <p className="text-sm mt-1" style={{ color: '#9A9DB0' }}>Par {totalPar}</p>
      </div>

      {/* SG */}
      {sgData && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>Strokes Gained</h2>
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>vs {SKILL_LEVEL_LABELS[skillLevel]}</span>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
            <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '1px solid #2E3247' }}>
              <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Total SG</span>
              <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(sgData.sgTotal) }}>{fmtSG(sgData.sgTotal)}</span>
            </div>
            {[
              { label: 'Off the tee', value: sgData.sgOffTee },
              { label: 'Approach', value: sgData.sgApproach },
              { label: 'Around green', value: sgData.sgAroundGreen },
              { label: 'Putting', value: sgData.sgPutt },
            ].map(({ label, value }) => {
              const barWidth = Math.min(Math.abs(value) * 10, 100)
              return (
                <div key={label} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ color: '#9A9DB0' }}>{label}</span>
                    <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(value) }}>{fmtSG(value)}</span>
                  </div>
                  <div className="flex items-center gap-1 h-2">
                    <div className="flex-1 flex justify-end">
                      <div className="h-full rounded-l" style={{ width: value < 0 ? `${barWidth}%` : '0%', backgroundColor: '#EF4444', opacity: 0.7 }} />
                    </div>
                    <div className="w-px h-3" style={{ backgroundColor: '#2E3247', flexShrink: 0 }} />
                    <div className="flex-1">
                      <div className="h-full rounded-r" style={{ width: value > 0 ? `${barWidth}%` : '0%', backgroundColor: '#22C55E', opacity: 0.7 }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'FIR', value: fairwaysTotal > 0 ? `${fairwaysHit}/${fairwaysTotal}` : '—', sub: fairwaysTotal > 0 ? `${Math.round(fairwaysHit / fairwaysTotal * 100)}%` : '' },
          { label: 'GIR', value: `${girs}/${holeList.length}`, sub: `${Math.round(girs / holeList.length * 100)}%` },
          { label: 'Putts', value: totalPutts || '—', sub: holeList.length > 0 ? `${(totalPutts / holeList.length).toFixed(1)}/hole` : '' },
          ...(upDownAttempts > 0 ? [{ label: 'U&D', value: `${upDowns}/${upDownAttempts}`, sub: `${Math.round(upDowns / upDownAttempts * 100)}%` }] : []),
          ...(sandAttempts > 0 ? [{ label: 'Sand', value: `${sandSaves}/${sandAttempts}`, sub: `${Math.round(sandSaves / sandAttempts * 100)}%` }] : []),
        ].map(({ label, value, sub }) => (
          <div key={label} className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
            <p className="text-lg font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{value}</p>
            {sub && <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{sub}</p>}
            <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Scoring breakdown */}
      <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>Scoring breakdown</p>
        <div className="flex justify-around">
          {[
            { label: 'Eagle+', count: eagles, color: '#22C55E' },
            { label: 'Birdie', count: birdies, color: '#22C55E' },
            { label: 'Par', count: pars, color: '#F0F0F0' },
            { label: 'Bogey', count: bogeys, color: '#9A9DB0' },
            { label: 'Dbl+', count: doubles, color: '#EF4444' },
          ].filter(({ count }) => count > 0).map(({ label, count, color }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color }}>{count}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Front 9 vs Back 9 */}
      {f9 && b9 && (
        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>Front 9 vs Back 9</p>
          <div className="grid grid-cols-3 mb-2 px-1">
            <span /><span className="text-xs font-semibold text-center" style={{ color: '#9A9DB0' }}>Front 9</span>
            <span className="text-xs font-semibold text-center" style={{ color: '#9A9DB0' }}>Back 9</span>
          </div>
          {[
            { label: 'Score', fVal: `${f9.score} (${scoreToPar(f9.score, f9.par)})`, fColor: scoreColor(f9.score - f9.par), bVal: `${b9.score} (${scoreToPar(b9.score, b9.par)})`, bColor: scoreColor(b9.score - b9.par) },
            { label: 'FIR', fVal: f9.firTotal > 0 ? `${f9.firHit}/${f9.firTotal}` : '—', fColor: '#F0F0F0' as string, bVal: b9.firTotal > 0 ? `${b9.firHit}/${b9.firTotal}` : '—', bColor: '#F0F0F0' as string },
            { label: 'GIR', fVal: `${f9.gir}/9`, fColor: '#F0F0F0' as string, bVal: `${b9.gir}/9`, bColor: '#F0F0F0' as string },
            { label: 'Putts', fVal: `${f9.putts || '—'}`, fColor: '#F0F0F0' as string, bVal: `${b9.putts || '—'}`, bColor: '#F0F0F0' as string },
          ].map(({ label, fVal, fColor, bVal, bColor }) => (
            <div key={label} className="grid grid-cols-3 py-2 px-1" style={{ borderTop: '1px solid #2E3247' }}>
              <span className="text-xs self-center" style={{ color: '#9A9DB0' }}>{label}</span>
              <span className="text-sm font-medium text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: fColor }}>{fVal}</span>
              <span className="text-sm font-medium text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: bColor }}>{bVal}</span>
            </div>
          ))}
        </div>
      )}

      {/* Par breakdown */}
      {parBreakdown.length > 1 && (
        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#9A9DB0' }}>Par breakdown</p>
          <div className="grid grid-cols-4 mb-2 px-1">
            <span className="text-xs font-semibold" style={{ color: '#9A9DB0' }}>Par</span>
            <span className="text-xs font-semibold text-center" style={{ color: '#9A9DB0' }}>Avg</span>
            <span className="text-xs font-semibold text-center" style={{ color: '#22C55E' }}>Birdie+</span>
            <span className="text-xs font-semibold text-center" style={{ color: '#EF4444' }}>Bogey+</span>
          </div>
          {parBreakdown.map(p => (
            <div key={p.par} className="grid grid-cols-4 py-2 px-1" style={{ borderTop: '1px solid #2E3247' }}>
              <span className="text-sm" style={{ color: '#F0F0F0' }}>Par {p.par} <span className="text-xs" style={{ color: '#4A4D60' }}>×{p.count}</span></span>
              <span className="text-sm font-medium text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(p.avgToPar) }}>{p.avgToPar > 0 ? '+' : ''}{p.avgToPar.toFixed(2)}</span>
              <span className="text-sm font-medium text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: p.birdie > 0 ? '#22C55E' : '#9A9DB0' }}>{p.birdie}</span>
              <span className="text-sm font-medium text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: p.bogeyPlus > 0 ? '#EF4444' : '#9A9DB0' }}>{p.bogeyPlus}</span>
            </div>
          ))}
        </div>
      )}

      {/* Round notes */}
      {(round.notes || round.mood || round.conditions || round.energy_level) && (
        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#F0F0F0' }}>Round notes</p>
          {(round.mood || round.conditions || round.energy_level) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {round.mood && <span className="px-2 py-1 rounded text-xs capitalize" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>{round.mood}</span>}
              {round.conditions && round.conditions.split(',').map((c: string) => (
                <span key={c} className="px-2 py-1 rounded text-xs capitalize" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>{c}</span>
              ))}
              {round.energy_level && <span className="px-2 py-1 rounded text-xs capitalize" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>{round.energy_level}</span>}
            </div>
          )}
          {round.notes && <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>{round.notes}</p>}
        </div>
      )}

      {/* Hole by hole */}
      {holeList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Hole by hole</h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="rounded-xl overflow-hidden min-w-max" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
              <div className="grid text-xs font-medium py-2 px-3" style={{ color: '#9A9DB0', gridTemplateColumns: isFullTracking ? '28px 28px 44px 36px 36px 40px 36px 36px 48px' : '28px 28px 44px 36px 36px 40px 36px 36px', borderBottom: '1px solid #2E3247' }}>
                <span>#</span><span>Par</span><span>Score</span>
                <span>FIR</span><span>GIR</span><span>Putts</span>
                <span>U&D</span><span>Sand</span>
                {isFullTracking && <span style={{ color: '#22C55E80' }}>SG</span>}
              </div>
              {holeList.map((h, i) => {
                const diff = h.score - h.par
                const holeSG = sgData?.holes.find(x => x.holeNumber === h.hole_number)
                return (
                  <div key={h.id} className="grid items-center py-2.5 px-3" style={{ gridTemplateColumns: isFullTracking ? '28px 28px 44px 36px 36px 40px 36px 36px 48px' : '28px 28px 44px 36px 36px 40px 36px 36px', borderBottom: i < holeList.length - 1 ? '1px solid #2E3247' : 'none' }}>
                    <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{h.hole_number}</span>
                    <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{h.par}</span>
                    <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(diff) }}>{h.score}</span>
                    <span className="text-xs" style={{ color: h.par === 3 ? '#4A4D60' : holeFIR(h) === true ? '#22C55E' : holeFIR(h) === false ? '#EF4444' : '#4A4D60' }}>
                      {h.par === 3 ? '—' : holeFIR(h) === true ? '✓' : holeFIR(h) === false ? '✗' : '—'}
                    </span>
                    <span className="text-xs" style={{ color: h.gir === true ? '#22C55E' : h.gir === false ? '#EF4444' : '#4A4D60' }}>
                      {h.gir === true ? '✓' : h.gir === false ? '✗' : '—'}
                    </span>
                    <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{h.putts ?? '—'}</span>
                    <span className="text-xs" style={{ color: h.up_and_down === true ? '#22C55E' : h.up_and_down === false ? '#EF4444' : '#4A4D60' }}>
                      {h.gir === false ? (h.up_and_down === true ? '✓' : h.up_and_down === false ? '✗' : '—') : '—'}
                    </span>
                    <span className="text-xs" style={{ color: h.sand_save === true ? '#22C55E' : h.sand_save === false ? '#EF4444' : '#4A4D60' }}>
                      {h.sand_save === true ? '✓' : h.sand_save === false ? '✗' : '—'}
                    </span>
                    {isFullTracking && (
                      <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: holeSG ? sgColor(holeSG.sgTotal) : '#4A4D60' }}>
                        {holeSG ? fmtSG(holeSG.sgTotal) : '—'}
                      </span>
                    )}
                  </div>
                )
              })}
              <div className="grid items-center py-2.5 px-3" style={{ gridTemplateColumns: isFullTracking ? '28px 28px 44px 36px 36px 40px 36px 36px 48px' : '28px 28px 44px 36px 36px 40px 36px 36px', borderTop: '2px solid #2E3247' }}>
                <span className="text-xs font-medium col-span-2" style={{ color: '#9A9DB0' }}>Total</span>
                <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(totalDiff) }}>{totalScore}</span>
                <span className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{fairwaysTotal > 0 ? `${fairwaysHit}/${fairwaysTotal}` : '—'}</span>
                <span className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{girs}/{holeList.length}</span>
                <span className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{totalPutts}</span>
                <span className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{upDowns}/{upDownAttempts}</span>
                <span className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{sandAttempts > 0 ? `${sandSaves}/${sandAttempts}` : '—'}</span>
                {isFullTracking && sgData && (
                  <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(sgData.sgTotal) }}>{fmtSG(sgData.sgTotal)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
