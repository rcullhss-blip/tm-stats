export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { HoleRow } from '@/lib/types'
import type { ShotEntry } from '@/lib/types'
import { calculateRoundSG, fmtSG, sgColor, handicapToSkillLevel, SKILL_LEVEL_LABELS, type SkillLevel } from '@/lib/sg-engine'
import AICoachingPanel from '@/components/rounds/AICoachingPanel'
import BadRoundWidget from '@/components/rounds/BadRoundWidget'
import DeleteRoundButton from '@/components/rounds/DeleteRoundButton'

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
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function roundTypeLabel(type: string): string {
  if (type === 'competition') return 'Competition'
  if (type === 'tournament') return 'Tournament'
  return 'Practice'
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RoundDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('handicap, sg_baseline, subscription_status, coach_persona')
    .eq('id', user.id)
    .single()

  const skillLevel: SkillLevel = (profile?.sg_baseline as SkillLevel | null) ?? handicapToSkillLevel(profile?.handicap ?? null)

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
  const totalDiff = totalScore - totalPar

  // For full tracking rounds, derive FIR from the shots JSONB (same source as SG engine)
  // so the hole-by-hole table matches what SG sees. Fall back to h.fir for quick mode rounds.
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
  const totalPutts = holeList.reduce((s, h) => s + (h.putts ?? 0), 0)
  const upDownAttempts = holeList.filter(h => h.gir === false).length
  const upDowns = holeList.filter(h => h.gir === false && h.up_and_down === true).length
  const sandSaves = holeList.filter(h => h.sand_save === true).length
  const sandAttempts = holeList.filter(h => h.sand_save !== null).length

  const eagles = holeList.filter(h => h.score <= h.par - 2).length
  const birdies = holeList.filter(h => h.score === h.par - 1).length
  const pars = holeList.filter(h => h.score === h.par).length
  const bogeys = holeList.filter(h => h.score === h.par + 1).length
  const doubles = holeList.filter(h => h.score >= h.par + 2).length

  // SG calculations (full tracking rounds only)
  const isFullTracking = round.input_mode === 'full'
  const sgData = isFullTracking
    ? calculateRoundSG(
        holeList.map(h => ({
          holeNumber: h.hole_number,
          par: h.par as 3 | 4 | 5,
          shots: h.shots as ShotEntry[] | null,
        })),
        skillLevel
      )
    : null

  // Front 9 / Back 9
  const has9s = round.holes === 18 && holeList.length === 18
  function calc9(hs: HoleRow[]) {
    const score = hs.reduce((s, h) => s + h.score, 0)
    const par = hs.reduce((s, h) => s + h.par, 0)
    const firTotal = hs.filter(h => h.par !== 3).length
    const firHit = hs.filter(h => holeFIR(h) === true).length
    const gir = hs.filter(h => h.gir === true).length
    const putts = hs.reduce((s, h) => s + (h.putts ?? 0), 0)
    return { score, par, firHit, firTotal, gir, putts }
  }
  const f9 = has9s ? calc9(holeList.filter(h => h.hole_number <= 9)) : null
  const b9 = has9s ? calc9(holeList.filter(h => h.hole_number >= 10)) : null

  // Coach challenge feedback for this round
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: coachChallenge } = await (supabase as any)
    .from('coach_ai_challenges')
    .select('revised_ai_feedback, created_at')
    .eq('round_id', id)
    .eq('player_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  const revisedCoachFeedback = coachChallenge?.revised_ai_feedback ?? null

  // Bad round detection: score significantly above handicap, or 3+ doubles
  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'
  const scoreDiff = totalDiff - (profile?.handicap ?? totalDiff)
  const isBadRound = isPro && (scoreDiff >= 8 || doubles >= 3)
  // Derive weakest stat for bad round recovery
  const girPct = holeList.length > 0 ? girs / holeList.length : 0
  const puttsPerHole = holeList.length > 0 ? totalPutts / holeList.length : 0
  const udPct = upDownAttempts > 0 ? upDowns / upDownAttempts : null
  let weakestStat = 'GIR (approach play)'
  if (puttsPerHole > 2.0 && girPct > 0.4) weakestStat = 'Putting'
  else if (udPct !== null && udPct < 0.3 && girPct < 0.5) weakestStat = 'Short game'
  else if (girPct < 0.3) weakestStat = 'GIR (approach play)'
  else if (fairwaysTotal > 0 && fairwaysHit / fairwaysTotal < 0.4) weakestStat = 'Driving accuracy'

  // Par breakdown
  const parBreakdown = ([3, 4, 5] as const).map(par => {
    const ph = holeList.filter(h => h.par === par)
    if (ph.length === 0) return null
    const scored = ph.reduce((s, h) => s + h.score, 0)
    const avgToPar = scored / ph.length - par
    const birdie = ph.filter(h => h.score <= h.par - 1).length
    const parCount = ph.filter(h => h.score === h.par).length
    const bogeyPlus = ph.filter(h => h.score >= h.par + 1).length
    return { par, count: ph.length, avgToPar, birdie, parCount, bogeyPlus }
  }).filter((p): p is NonNullable<typeof p> => p !== null)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/rounds"
          className="flex items-center gap-1 text-sm"
          style={{ color: '#9A9DB0', minHeight: '44px' }}
        >
          ← Rounds
        </Link>
        <Link
          href={`/rounds/${id}/edit`}
          className="text-sm px-3 py-2 rounded-lg"
          style={{ backgroundColor: '#22263A', color: '#9A9DB0', border: '1px solid #2E3247' }}
        >
          Edit
        </Link>
      </div>

      {/* Round header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            {round.course_name}
          </h1>
          {isFullTracking && (
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor: '#22C55E20', color: '#22C55E' }}
            >
              SG
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>
          {formatDate(round.date)} · {round.holes} holes · {roundTypeLabel(round.round_type)}
        </p>
      </div>

      {/* Score hero */}
      <div
        className="text-center p-6 rounded-2xl mb-6"
        style={{ backgroundColor: '#1A1D27' }}
      >
        <p className="text-sm mb-2" style={{ color: '#9A9DB0' }}>Total score</p>
        <p
          className="text-6xl font-bold"
          style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(totalDiff) }}
        >
          {totalScore}
        </p>
        <p
          className="text-2xl font-medium mt-1"
          style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(totalDiff) }}
        >
          {scoreToPar(totalScore, totalPar)}
        </p>
        <p className="text-sm mt-1" style={{ color: '#9A9DB0' }}>Par {totalPar}</p>
      </div>

      {/* Strokes Gained breakdown — full tracking rounds */}
      {sgData && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>
              Strokes Gained
            </h2>
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
              vs {SKILL_LEVEL_LABELS[skillLevel]}
            </span>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
            {/* Total */}
            <div
              className="flex items-center justify-between pb-3 mb-3"
              style={{ borderBottom: '1px solid #2E3247' }}
            >
              <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Total SG</span>
              <span
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(sgData.sgTotal) }}
              >
                {fmtSG(sgData.sgTotal)}
              </span>
            </div>

            {/* Categories */}
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
                    <span
                      className="text-sm font-medium"
                      style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(value) }}
                    >
                      {fmtSG(value)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 h-2">
                    {/* Negative bar (left of centre) */}
                    <div className="flex-1 flex justify-end">
                      <div
                        className="h-full rounded-l"
                        style={{
                          width: value < 0 ? `${barWidth}%` : '0%',
                          backgroundColor: '#EF4444',
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    {/* Centre line */}
                    <div className="w-px h-3" style={{ backgroundColor: '#2E3247', flexShrink: 0 }} />
                    {/* Positive bar (right of centre) */}
                    <div className="flex-1">
                      <div
                        className="h-full rounded-r"
                        style={{
                          width: value > 0 ? `${barWidth}%` : '0%',
                          backgroundColor: '#22C55E',
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bad round recovery */}
      {isBadRound && (
        <BadRoundWidget
          scoreToPar={totalDiff}
          handicap={profile?.handicap ?? null}
          doubles={doubles}
          weakestStat={weakestStat}
        />
      )}

      {/* AI Coaching */}
      <AICoachingPanel
        roundId={id}
        isPro={isPro}
        coachPersona={profile?.coach_persona ?? 'club_pro'}
      />

      {/* Coach's revised feedback */}
      {revisedCoachFeedback && (
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #22C55E30' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#22C55E' }}>
            Your coach&apos;s feedback
          </p>
          {revisedCoachFeedback.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => (
            <p key={i} className="text-sm leading-relaxed mb-2 last:mb-0" style={{ color: '#F0F0F0' }}>{line}</p>
          ))}
        </div>
      )}

      {/* Stats */}
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

      {/* Scoring distribution — only show types that occurred */}
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
            <span />
            <span className="text-xs font-semibold text-center" style={{ color: '#9A9DB0' }}>Front 9</span>
            <span className="text-xs font-semibold text-center" style={{ color: '#9A9DB0' }}>Back 9</span>
          </div>
          {[
            {
              label: 'Score',
              fVal: `${f9.score} (${scoreToPar(f9.score, f9.par)})`,
              fColor: scoreColor(f9.score - f9.par),
              bVal: `${b9.score} (${scoreToPar(b9.score, b9.par)})`,
              bColor: scoreColor(b9.score - b9.par),
            },
            {
              label: 'FIR',
              fVal: f9.firTotal > 0 ? `${f9.firHit}/${f9.firTotal}` : '—',
              fColor: '#F0F0F0' as string,
              bVal: b9.firTotal > 0 ? `${b9.firHit}/${b9.firTotal}` : '—',
              bColor: '#F0F0F0' as string,
            },
            { label: 'GIR',   fVal: `${f9.gir}/9`,          fColor: '#F0F0F0' as string, bVal: `${b9.gir}/9`,          bColor: '#F0F0F0' as string },
            { label: 'Putts', fVal: `${f9.putts || '—'}`,   fColor: '#F0F0F0' as string, bVal: `${b9.putts || '—'}`,   bColor: '#F0F0F0' as string },
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
              <span className="text-sm" style={{ color: '#F0F0F0' }}>
                Par {p.par} <span className="text-xs" style={{ color: '#4A4D60' }}>×{p.count}</span>
              </span>
              <span className="text-sm font-medium text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor(p.avgToPar) }}>
                {p.avgToPar > 0 ? '+' : ''}{p.avgToPar.toFixed(2)}
              </span>
              <span className="text-sm font-medium text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: p.birdie > 0 ? '#22C55E' : '#9A9DB0' }}>
                {p.birdie}
              </span>
              <span className="text-sm font-medium text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: p.bogeyPlus > 0 ? '#EF4444' : '#9A9DB0' }}>
                {p.bogeyPlus}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {(round.notes || round.mood || round.conditions || round.energy_level) && (
        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#F0F0F0' }}>Round notes</p>
          {(round.mood || round.conditions || round.energy_level) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {round.mood && (
                <span className="px-2 py-1 rounded text-xs capitalize" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                  {round.mood}
                </span>
              )}
              {round.conditions && round.conditions.split(',').map(c => (
                <span key={c} className="px-2 py-1 rounded text-xs capitalize" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                  {c}
                </span>
              ))}
              {round.energy_level && (
                <span className="px-2 py-1 rounded text-xs capitalize" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                  {round.energy_level}
                </span>
              )}
            </div>
          )}
          {round.notes && (
            <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
              {round.notes}
            </p>
          )}
        </div>
      )}

      {/* Hole by hole */}
      {holeList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            Hole by hole
          </h2>
          {/* Scrollable wrapper for wide table */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="rounded-xl overflow-hidden min-w-max" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
              {/* Header */}
              <div
                className="grid text-xs font-medium py-2 px-3"
                style={{ color: '#9A9DB0', gridTemplateColumns: isFullTracking ? '28px 28px 44px 36px 36px 40px 36px 36px 48px' : '28px 28px 44px 36px 36px 40px 36px 36px', borderBottom: '1px solid #2E3247' }}
              >
                <span>#</span><span>Par</span><span>Score</span>
                <span>FIR</span><span>GIR</span><span>Putts</span>
                <span>U&D</span><span>Sand</span>
                {isFullTracking && <span style={{ color: '#22C55E80' }}>SG</span>}
              </div>

              {holeList.map((h, i) => {
                const diff = h.score - h.par
                const holeSG = sgData?.holes.find(x => x.holeNumber === h.hole_number)
                return (
                  <div
                    key={h.id}
                    className="grid items-center py-2.5 px-3"
                    style={{ gridTemplateColumns: isFullTracking ? '28px 28px 44px 36px 36px 40px 36px 36px 48px' : '28px 28px 44px 36px 36px 40px 36px 36px', borderBottom: i < holeList.length - 1 ? '1px solid #2E3247' : 'none' }}
                  >
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

              {/* Totals */}
              <div
                className="grid items-center py-2.5 px-3"
                style={{ gridTemplateColumns: isFullTracking ? '28px 28px 44px 36px 36px 40px 36px 36px 48px' : '28px 28px 44px 36px 36px 40px 36px 36px', borderTop: '2px solid #2E3247' }}
              >
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

      {/* Shot-by-shot breakdown — full tracking only */}
      {isFullTracking && holeList.some(h => Array.isArray(h.shots) && (h.shots as unknown as ShotEntry[]).length > 0) && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            Shot breakdown
          </h2>
          <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>Where you gained and lost shots vs {SKILL_LEVEL_LABELS[skillLevel]}</p>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
              <div className="grid text-xs font-medium py-2 px-3" style={{ color: '#9A9DB0', gridTemplateColumns: '24px 28px 1fr 52px 44px 48px', borderBottom: '1px solid #2E3247' }}>
                <span>H</span><span>#</span><span>Lie</span><span>Dist</span><span>Cat</span><span>SG</span>
              </div>
              {holeList.flatMap((h, hIdx) => {
                const rawShots = (h.shots as unknown as ShotEntry[] | null) ?? []
                if (rawShots.length === 0) return []

                const catLabel: Record<string, string> = { offTee: 'Tee', approach: 'App', aroundGreen: 'A/G', putting: 'Putt' }
                const holeSGData = sgData?.holes.find(x => x.holeNumber === h.hole_number)
                const sgByShot = new Map(holeSGData?.shots.map(s => [s.shotNumber, s]) ?? [])
                const holeSGTotal = holeSGData?.sgTotal ?? null

                return [
                  // Hole header row
                  <div
                    key={`header-${h.hole_number}`}
                    className="grid items-center py-1.5 px-3"
                    style={{ gridTemplateColumns: '24px 28px 1fr 52px 44px 48px', backgroundColor: '#22263A', borderBottom: '1px solid #2E3247', borderTop: hIdx > 0 ? '2px solid #2E3247' : 'none' }}
                  >
                    <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>H{h.hole_number}</span>
                    <span className="text-xs" style={{ color: '#9A9DB0' }}>P{h.par}</span>
                    <span />
                    <span />
                    <span className="text-xs" style={{ color: '#9A9DB0' }}>Hole</span>
                    <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-dm-mono)', color: holeSGTotal !== null ? sgColor(holeSGTotal) : '#4A4D60' }}>
                      {holeSGTotal !== null ? fmtSG(holeSGTotal) : '—'}
                    </span>
                  </div>,
                  // All raw shots from DB
                  ...rawShots.map((shot, si) => {
                    const isHoleOut = shot.distanceToPin === 0
                    const sgShot = sgByShot.get(shot.shotNumber)
                    const distLabel = isHoleOut
                      ? 'Holed'
                      : shot.lieType === 'green'
                        ? `${Math.round(shot.distanceToPin * 3)}ft`
                        : `${shot.distanceToPin}y`
                    return (
                      <div
                        key={`${h.hole_number}-${si}`}
                        className="grid items-center py-2 px-3"
                        style={{ gridTemplateColumns: '24px 28px 1fr 52px 44px 48px', borderBottom: '1px solid #2E324730', opacity: isHoleOut ? 0.5 : 1 }}
                      >
                        <span />
                        <span className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{shot.shotNumber}</span>
                        <span className="text-xs capitalize" style={{ color: isHoleOut ? '#4A4D60' : '#9A9DB0' }}>
                          {isHoleOut ? 'holed' : shot.lieType}
                        </span>
                        <span className="text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: isHoleOut ? '#4A4D60' : '#9A9DB0' }}>{distLabel}</span>
                        <span className="text-xs" style={{ color: '#9A9DB0' }}>{sgShot ? (catLabel[sgShot.category] ?? sgShot.category) : '—'}</span>
                        <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-dm-mono)', color: sgShot ? sgColor(sgShot.sg) : '#4A4D60' }}>
                          {sgShot ? fmtSG(sgShot.sg) : '—'}
                        </span>
                      </div>
                    )
                  }),
                ]
              })}
            </div>
        </div>
      )}

      {/* Advanced Performance Breakdown — full tracking only */}
      {isFullTracking && sgData && (() => {
        interface Band { label: string; category: 'putting' | 'around_green' | 'approach' | 'off_tee'; minY: number; maxY: number; sgSum: number; count: number }
        const bands: Band[] = [
          // Putting in feet (stored as yards: 1yd = 3ft)
          { label: '0–3ft',    category: 'putting',      minY: 0,       maxY: 1.0,      sgSum: 0, count: 0 },
          { label: '3–5ft',    category: 'putting',      minY: 1.001,   maxY: 1.666,    sgSum: 0, count: 0 },
          { label: '5–8ft',    category: 'putting',      minY: 1.667,   maxY: 2.666,    sgSum: 0, count: 0 },
          { label: '8–12ft',   category: 'putting',      minY: 2.667,   maxY: 3.999,    sgSum: 0, count: 0 },
          { label: '12–20ft',  category: 'putting',      minY: 4.0,     maxY: 6.666,    sgSum: 0, count: 0 },
          { label: '20–30ft',  category: 'putting',      minY: 6.667,   maxY: 9.999,    sgSum: 0, count: 0 },
          { label: '30–40ft',  category: 'putting',      minY: 10.0,    maxY: 13.332,   sgSum: 0, count: 0 },
          { label: '40ft+',    category: 'putting',      minY: 13.333,  maxY: Infinity, sgSum: 0, count: 0 },
          // Around green
          { label: '0–10y',    category: 'around_green', minY: 0,      maxY: 9.9,      sgSum: 0, count: 0 },
          { label: '10–20y',   category: 'around_green', minY: 10,     maxY: 19.9,     sgSum: 0, count: 0 },
          { label: '20–30y',   category: 'around_green', minY: 20,     maxY: 29.9,     sgSum: 0, count: 0 },
          // Approach & off tee
          { label: '30–50y',   category: 'approach',     minY: 30,     maxY: 49.9,     sgSum: 0, count: 0 },
          { label: '50–75y',   category: 'approach',     minY: 50,     maxY: 74.9,     sgSum: 0, count: 0 },
          { label: '75–100y',  category: 'approach',     minY: 75,     maxY: 99.9,     sgSum: 0, count: 0 },
          { label: '100–125y', category: 'approach',     minY: 100,    maxY: 124.9,    sgSum: 0, count: 0 },
          { label: '125–150y', category: 'approach',     minY: 125,    maxY: 149.9,    sgSum: 0, count: 0 },
          { label: '150–175y', category: 'approach',     minY: 150,    maxY: 174.9,    sgSum: 0, count: 0 },
          { label: '175–200y', category: 'approach',     minY: 175,    maxY: 199.9,    sgSum: 0, count: 0 },
          { label: '175–200y', category: 'off_tee',      minY: 175,    maxY: 199.9,    sgSum: 0, count: 0 },
          { label: '200–225y', category: 'off_tee',      minY: 200,    maxY: 224.9,    sgSum: 0, count: 0 },
          { label: '225–250y', category: 'off_tee',      minY: 225,    maxY: 249.9,    sgSum: 0, count: 0 },
          { label: '250–275y', category: 'off_tee',      minY: 250,    maxY: 274.9,    sgSum: 0, count: 0 },
          { label: '275–300y', category: 'off_tee',      minY: 275,    maxY: 299.9,    sgSum: 0, count: 0 },
          { label: '300y+',    category: 'off_tee',      minY: 300,    maxY: Infinity, sgSum: 0, count: 0 },
        ]
        for (const holeResult of sgData.holes) {
          for (const sgShot of holeResult.shots) {
            if (sgShot.distBefore === 0) continue
            const isPutt = sgShot.lie === 'green'
            const isAG   = !isPutt && sgShot.distBefore < 30
            const isOT   = !isPutt && !isAG && sgShot.lie === 'tee' && holeResult.par !== 3
            const distForBand = isOT ? (sgShot.distBefore - sgShot.distAfter) : sgShot.distBefore
            const band = bands.find(b => {
              if (isPutt && b.category !== 'putting') return false
              if (isAG   && b.category !== 'around_green') return false
              if (isOT   && b.category !== 'off_tee') return false
              if (!isPutt && !isAG && !isOT && b.category !== 'approach') return false
              return distForBand >= b.minY && distForBand <= b.maxY
            })
            if (band) { band.sgSum += sgShot.sg; band.count++ }
          }
        }
        const SCALE = 0.4
        const hasBandData = bands.some(b => b.count > 0)
        if (!hasBandData) return null

        function BandRow({ label, sgSum, count, alwaysShow = false }: { label: string; sgSum: number; count: number; alwaysShow?: boolean }) {
          if (count === 0 && !alwaysShow) return null
          const v = count > 0 ? sgSum / count : null
          const barW = v !== null ? Math.min(Math.abs(v) / SCALE * 100, 100) : 0
          const pos = v !== null && v >= 0
          return (
            <div className="py-2.5" style={{ borderTop: '1px solid #2E3247' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm" style={{ color: count === 0 ? '#4A4D60' : '#9A9DB0' }}>{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#4A4D60' }}>{count > 0 ? `${count} shots` : 'no data'}</span>
                  <span className="text-sm font-bold w-14 text-right" style={{ fontFamily: 'var(--font-dm-mono)', color: v !== null ? sgColor(v) : '#4A4D60' }}>{v !== null ? fmtSG(v) : '—'}</span>
                </div>
              </div>
              <div className="flex items-center h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#22263A' }}>
                <div style={{ width: `${barW}%`, height: '100%', backgroundColor: pos ? '#22C55E' : '#EF4444', marginLeft: pos ? '50%' : `${50 - barW}%`, borderRadius: '2px' }} />
              </div>
            </div>
          )
        }

        function AreaCard({ title, sub, cat, alwaysShowBands = false }: { title: string; sub: string; cat: 'putting' | 'around_green' | 'approach' | 'off_tee'; alwaysShowBands?: boolean }) {
          const rows = bands.filter(b => b.category === cat)
          const hasData = rows.some(b => b.count > 0)
          return (
            <div className="p-4 rounded-xl mb-3" style={{ backgroundColor: '#22263A' }}>
              <p className="text-sm font-semibold mb-0.5" style={{ color: '#F0F0F0' }}>{title}</p>
              <p className="text-xs mb-3" style={{ color: '#4A4D60' }}>{sub}</p>
              {(hasData || alwaysShowBands)
                ? rows.map(b => <BandRow key={b.label} label={b.label} sgSum={b.sgSum} count={b.count} alwaysShow={alwaysShowBands} />)
                : <p className="text-xs py-1" style={{ color: '#4A4D60' }}>No shots recorded</p>
              }
            </div>
          )
        }

        return (
          <details className="mb-6 group">
            <summary className="flex items-center justify-between cursor-pointer py-2 list-none" style={{ userSelect: 'none' }}>
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Advanced breakdown</h2>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>SG by distance ▾</span>
            </summary>
            <div className="mt-3">
              <p className="text-xs mb-3" style={{ color: '#4A4D60' }}>SG per shot by distance. Green = gaining shots vs your baseline, red = losing shots.</p>
              <AreaCard title="Putting" sub="Distance from hole in feet" cat="putting" />
              <AreaCard title="Around the green" sub="Chips, pitches & bunker shots inside 30y" cat="around_green" alwaysShowBands />
              <AreaCard title="Approach" sub="Irons & wedges from 30–200y (non-tee shots)" cat="approach" />
              <AreaCard title="Off the tee" sub="Tee shots on par 4s & par 5s" cat="off_tee" />
            </div>
          </details>
        )
      })()}

      {/* Delete */}
      <div className="mt-8">
        <DeleteRoundButton roundId={id} courseName={round.course_name} />
      </div>
    </div>
  )
}
