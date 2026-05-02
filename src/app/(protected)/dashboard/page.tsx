export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { RoundRow, HoleRow } from '@/lib/types'
import type { ShotEntry } from '@/lib/types'
import { calculateRoundSG, handicapToSkillLevel } from '@/lib/sg-engine'
import PreRoundPlanWidget from '@/components/dashboard/PreRoundPlanWidget'
import PatternFinderWidget from '@/components/dashboard/PatternFinderWidget'
import DashboardGuide from '@/components/dashboard/DashboardGuide'

function scoreToPar(score: number | null, par: number | null): string {
  if (!score || !par) return '—'
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function scoreColor(score: number | null, par: number | null): string {
  if (!score || !par) return '#9A9DB0'
  const diff = score - par
  if (diff < 0) return '#22C55E'
  if (diff === 0) return '#F0F0F0'
  if (diff <= 2) return '#9A9DB0'
  return '#EF4444'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function roundTypeLabel(type: string): string {
  if (type === 'competition') return 'Comp'
  if (type === 'tournament') return 'Tourn'
  return 'Practice'
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Load user profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('name, handicap, subscription_status, player_context')
    .eq('id', user.id)
    .single()

  // Load last 10 rounds
  const { data: rounds } = await supabase
    .from('rounds')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(10)

  const name = profile?.name?.split(' ')[0] || 'Golfer'
  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'
  const roundCount = rounds?.length ?? 0

  // Quick stats from last 5 rounds
  const recentRounds = (rounds ?? []).slice(0, 5)
  const roundsWithScores = recentRounds.filter(r => r.score_total && r.par_total)
  const avgScore = roundsWithScores.length > 0
    ? Math.round((roundsWithScores.reduce((sum, r) => sum + (r.score_total! - r.par_total!), 0) / roundsWithScores.length) * 10) / 10
    : null

  // Training focus — weakest SG category across last 5 full-tracking rounds
  const skillLevel = handicapToSkillLevel(profile?.handicap ?? null)
  const fullTrackingRounds = recentRounds.filter(r => r.input_mode === 'full')
  let trainingFocus: { label: string; value: string; category: string } | null = null

  if (isPro && fullTrackingRounds.length >= 2) {
    const roundIds = fullTrackingRounds.map(r => r.id)
    const { data: allHoles } = await supabase
      .from('holes')
      .select('*')
      .in('round_id', roundIds)

    if (allHoles && allHoles.length > 0) {
      const sgTotals = { offTee: 0, approach: 0, aroundGreen: 0, putt: 0 }
      let sgRoundCount = 0
      for (const round of fullTrackingRounds) {
        const holes = (allHoles as HoleRow[]).filter(h => h.round_id === round.id)
        if (holes.length === 0) continue
        const sg = calculateRoundSG(
          holes.map(h => ({ holeNumber: h.hole_number, par: h.par as 3|4|5, shots: h.shots as ShotEntry[]|null })),
          skillLevel
        )
        if (!sg) continue
        sgTotals.offTee += sg.sgOffTee
        sgTotals.approach += sg.sgApproach
        sgTotals.aroundGreen += sg.sgAroundGreen
        sgTotals.putt += sg.sgPutt
        sgRoundCount++
      }
      if (sgRoundCount > 0) {
        const avgs = {
          offTee: sgTotals.offTee / sgRoundCount,
          approach: sgTotals.approach / sgRoundCount,
          aroundGreen: sgTotals.aroundGreen / sgRoundCount,
          putt: sgTotals.putt / sgRoundCount,
        }
        const worst = Object.entries(avgs).sort((a, b) => a[1] - b[1])[0]
        const labels: Record<string, string> = {
          offTee: 'Driving', approach: 'Approach play', aroundGreen: 'Short game', putt: 'Putting'
        }
        trainingFocus = {
          category: worst[0],
          label: labels[worst[0]],
          value: worst[1].toFixed(2),
        }
      }
    }
  }

  // One Shot Fix — rule-based from trainingFocus category
  const oneShotFix: Record<string, string> = {
    offTee: 'Pick a specific target line before every tee shot — commit to it and swing without hesitation.',
    approach: 'Take one more club than you think — most missed greens go short of the flag.',
    aroundGreen: 'Pick a landing spot 3 feet onto the green on every chip — land it there, let it roll.',
    putt: 'Slow your backstroke on putts inside 6 feet — smooth tempo is everything at short range.',
  }
  const oneShotFixText = trainingFocus ? oneShotFix[trainingFocus.category] ?? null : null

  // Data for Pattern Finder
  const patternsData = (rounds ?? [])
    .filter(r => r.score_total != null && r.par_total != null)
    .map(r => ({
      date: r.date,
      scoreToPar: r.score_total! - r.par_total!,
      roundType: r.round_type,
    }))

  // Stats for Pre-Round Plan
  const preRoundStats = {
    handicap: profile?.handicap ?? null,
    avgScore: avgScore,
    roundCount,
    weakestCategoryLabel: trainingFocus?.label ?? null,
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <DashboardGuide />
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Hey {name} 👋
        </h1>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>
          {roundCount === 0
            ? 'Log your first round to get started'
            : `${roundCount} round${roundCount !== 1 ? 's' : ''} logged`}
        </p>
      </div>

      {/* Training focus + One Shot Fix */}
      {trainingFocus && (
        <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222240' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>
            Your #1 focus this week
          </p>
          <p className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            {trainingFocus.label}
          </p>
          <p className="text-sm mb-0" style={{ color: '#9A9DB0' }}>
            Averaging{' '}
            <span style={{ color: '#EF4444', fontFamily: 'var(--font-dm-mono)' }}>
              {trainingFocus.value}
            </span>{' '}
            SG per round — your weakest category across your last rounds.
          </p>
          {oneShotFixText && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #2E3247' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9A9DB0' }}>
                One shot fix
              </p>
              <p className="text-sm" style={{ color: '#F0F0F0' }}>{oneShotFixText}</p>
            </div>
          )}
        </div>
      )}

      {/* Player context nudge — shown to pro users who haven't filled it in */}
      {isPro && !profile?.player_context && (
        <Link
          href="/profile"
          className="mb-4 p-4 rounded-xl flex items-start gap-3"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', display: 'flex' }}
        >
          <span className="text-xl mt-0.5">🎯</span>
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: '#F0F0F0' }}>Personalise your AI coach</p>
            <p className="text-xs" style={{ color: '#9A9DB0' }}>Tell your coach about your game — what you&apos;re working on, your tendencies, your goals. It makes every coaching response specific to you.</p>
            <p className="text-xs mt-2 font-medium" style={{ color: '#CC2222' }}>Add your game context in Settings →</p>
          </div>
        </Link>
      )}

      {/* Pre-Round Plan */}
      <PreRoundPlanWidget
        handicap={preRoundStats.handicap}
        avgScore={preRoundStats.avgScore}
        roundCount={preRoundStats.roundCount}
        weakestCategoryLabel={preRoundStats.weakestCategoryLabel}
        isPro={isPro}
      />

      {/* Pattern Finder */}
      <PatternFinderWidget rounds={patternsData} isPro={isPro} />

      {/* Summary cards */}
      {roundCount > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
            <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Avg score (last 5)</p>
            <p
              className="text-2xl font-medium"
              style={{
                fontFamily: 'var(--font-dm-mono)',
                color: avgScore !== null
                  ? avgScore <= 0 ? '#22C55E' : avgScore <= 5 ? '#F0F0F0' : '#EF4444'
                  : '#9A9DB0'
              }}
            >
              {avgScore !== null ? (avgScore >= 0 ? `+${avgScore}` : `${avgScore}`) : '—'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>vs par</p>
          </div>

          <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
            <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Rounds logged</p>
            <p className="text-2xl font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
              {roundCount}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>total</p>
          </div>
        </div>
      )}

      {/* Pro upsell — SG teaser */}
      {!isPro && roundCount >= 1 && (
        <div
          className="mb-6 p-4 rounded-xl"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">📊</span>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>
                Unlock Strokes Gained
              </p>
              <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
                See exactly where you&apos;re losing shots vs scratch — approach, putting, off the tee, around the green.
              </p>
              <Link
                href="/upgrade"
                className="inline-block px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
              >
                Go Pro — £4.99/mo
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {roundCount === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⛳</div>
          <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            Log your first round
          </h2>
          <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: '#9A9DB0' }}>
            Enter a round hole by hole and we&apos;ll show you exactly where your shots went.
          </p>
          <Link
            href="/rounds/new"
            className="inline-block px-6 py-4 rounded-xl font-semibold mb-3"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
          >
            + Log a round
          </Link>
          <br />
          <Link
            href="/player-guide"
            className="inline-block px-5 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247' }}
          >
            📖 Player guide
          </Link>
        </div>
      )}

      {/* Recent rounds list */}
      {roundCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
              Recent rounds
            </h2>
            <div className="flex items-center gap-3">
              <Link href="/player-guide" className="text-sm" style={{ color: '#9A9DB0' }}>
                📖 Guide
              </Link>
              <Link href="/rounds" className="text-sm" style={{ color: '#9A9DB0' }}>
                See all
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {(rounds ?? []).map((round: RoundRow) => (
              <Link
                key={round.id}
                href={`/rounds/${round.id}`}
                className="block p-4 rounded-xl transition-colors active:opacity-80"
                style={{ backgroundColor: '#1A1D27' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: '#F0F0F0' }}>
                    {round.course_name}
                  </span>
                  <span
                    className="text-lg font-medium"
                    style={{
                      fontFamily: 'var(--font-dm-mono)',
                      color: scoreColor(round.score_total, round.par_total),
                    }}
                  >
                    {round.score_total ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#9A9DB0' }}>
                      {formatDate(round.date)}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                      {round.holes}H
                    </span>
                    <span className="text-xs" style={{ color: '#9A9DB0' }}>
                      {roundTypeLabel(round.round_type)}
                    </span>
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{
                      fontFamily: 'var(--font-dm-mono)',
                      color: scoreColor(round.score_total, round.par_total),
                    }}
                  >
                    {scoreToPar(round.score_total, round.par_total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Free tier limit warning */}
      {!isPro && roundCount >= 4 && (
        <div
          className="mt-6 p-4 rounded-xl text-center"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #CC2222' }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: '#F0F0F0' }}>
            {roundCount >= 5 ? 'Round limit reached' : '1 free round remaining'}
          </p>
          <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
            Free accounts include 5 rounds. Upgrade for unlimited rounds, Strokes Gained, and AI coaching.
          </p>
          <Link
            href="/upgrade"
            className="inline-block px-5 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
          >
            Upgrade to Pro
          </Link>
        </div>
      )}
    </div>
  )
}
