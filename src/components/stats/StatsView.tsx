'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { fmtSG, sgColor } from '@/lib/sg-engine'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SGBand {
  label: string
  category: 'putting' | 'around_green' | 'approach' | 'off_tee'
  minY: number
  maxY: number
  sgSum: number
  count: number
}

export interface RoundDataPoint {
  id: string
  date: string
  courseName: string
  roundType: string
  scoreToPar: number
  par: number
  firPct: number | null       // null on par-3-only rounds
  girPct: number
  puttsPerHole: number
  udPct: number | null
  sandSavePct: number | null
  sgTotal: number | null
  sgOffTee: number | null
  sgApproach: number | null
  sgAroundGreen: number | null
  sgPutt: number | null
  sgBands: SGBand[] | null
  eagles: number
  birdies: number
  pars: number
  bogeys: number
  doubles: number
  totalHoles: number
}

export interface StatsViewProps {
  rounds: RoundDataPoint[]
  skillLevelLabel: string
  isPro: boolean
  coachPersona: string
  sgRoundCount: number
  handicapHistory: { date: string; handicap: number }[]
  handicap: number | null
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type RangeFilter = 'last5' | 'last10' | 'last20' | 'all'
type TypeFilter = 'all' | 'practice' | 'competition' | 'tournament'
type HolesFilter = 'all' | '9' | '18'

const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: 'last5',  label: 'Last 5'  },
  { value: 'last10', label: 'Last 10' },
  { value: 'last20', label: 'Last 20' },
  { value: 'all',    label: 'All'     },
]

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all',         label: 'All'         },
  { value: 'practice',    label: 'Practice'    },
  { value: 'competition', label: 'Competition' },
  { value: 'tournament',  label: 'Tournament'  },
]

const HOLES_OPTIONS: { value: HolesFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '18',  label: '18H' },
  { value: '9',   label: '9H'  },
]

// Benchmark data by handicap band
function getBenchmarks(handicap: number | null): { fir: number; gir: number; putts: number } {
  const h = handicap ?? 20
  if (h <= 5)  return { fir: 62, gir: 65, putts: 1.75 }
  if (h <= 12) return { fir: 52, gir: 48, putts: 1.82 }
  if (h <= 18) return { fir: 42, gir: 35, putts: 1.88 }
  if (h <= 24) return { fir: 35, gir: 22, putts: 1.95 }
  return { fir: 28, gir: 15, putts: 2.00 }
}

function handicapBandLabel(handicap: number | null): string {
  const h = handicap ?? 20
  if (h <= 5)  return '0–5'
  if (h <= 12) return '6–12'
  if (h <= 18) return '13–18'
  if (h <= 24) return '19–24'
  return '25+'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function fmt(n: number | null, decimals = 1): string {
  if (n === null) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}`
}

function pct(n: number | null): string {
  if (n === null) return '—'
  return `${Math.round(n)}%`
}

function scoreColor(v: number): string {
  if (v <= -1) return '#22C55E'
  if (v === 0) return '#F0F0F0'
  if (v <= 2) return '#9A9DB0'
  if (v <= 5) return '#F59E0B'
  return '#EF4444'
}

// ─── Small reusable card ──────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#F0F0F0' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
      <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>{label}</p>
      <p className="text-xl font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{sub}</p>}
    </div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit = '' }: { active?: boolean; payload?: {value: number}[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}>
      <p style={{ color: '#9A9DB0' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{unit}{typeof v === 'number' ? v.toFixed(1) : v}</p>
    </div>
  )
}

// ─── AI Coaching for stats ────────────────────────────────────────────────────

function AICoachingSection({ isPro, coachPersona, statsPayload }: { isPro: boolean; coachPersona: string; statsPayload: object }) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const COACH_LABELS: Record<string, string> = {
    club_pro: 'Club Pro', fundamentals: 'Fundamentals Coach', technical: 'Technical Analyst',
    short_game: 'Short Game Specialist', ball_flight: 'Ball Flight Coach',
    encourager: 'Encourager', straight_talker: 'Straight Talker',
    butch: 'Fundamentals Coach', leadbetter: 'Technical Analyst', pelz: 'Short Game Specialist', haney: 'Ball Flight Coach',
  }

  async function getFeedback() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'overall', stats: statsPayload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setFeedback(data.feedback)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get feedback')
    } finally {
      setLoading(false)
    }
  }

  if (!isPro) {
    return (
      <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222230' }}>
        <div className="flex items-start gap-3">
          <span className="text-xl">🎙️</span>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>AI Coaching — Pro feature</p>
            <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
              Get a personalised coaching analysis of your overall stats and trends.
            </p>
            <a href="/upgrade" className="inline-block px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
              Go Pro
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>AI Coaching — Overall</h2>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
          {COACH_LABELS[coachPersona] ?? 'Club Pro'}
        </span>
      </div>
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
        {!feedback && !loading && (
          <div className="text-center py-2">
            <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>Analyse your overall game and get coaching priorities.</p>
            <button type="button" onClick={getFeedback} className="px-6 py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px' }}>
              Analyse my game
            </button>
          </div>
        )}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-3" style={{ borderColor: '#CC2222', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: '#9A9DB0' }}>Reviewing your stats…</p>
          </div>
        )}
        {error && (
          <div className="text-center py-2">
            <p className="text-sm mb-3" style={{ color: '#EF4444' }}>{error}</p>
            <button type="button" onClick={getFeedback} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#22263A', color: '#9A9DB0', border: '1px solid #2E3247' }}>Try again</button>
          </div>
        )}
        {feedback && (
          <div>
            {feedback.split('\n').map((line, i) => {
              if (/You are trained on data up to/i.test(line)) return null
              const drillMatch = line.match(/^(DRILL \d+):\s*(.+?)\s*—\s*(.+)$/)
              if (drillMatch) {
                return (
                  <div key={i} className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#CC2222' }}>{drillMatch[1]}: {drillMatch[2]}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#9A9DB0' }}>{drillMatch[3]}</p>
                  </div>
                )
              }
              if (line.trim() === '') return null
              if (line.includes('generalised coaching styles')) return <p key={i} style={{ fontSize: '11px', color: '#5C5F72', marginTop: '12px', lineHeight: '1.5' }}>{line}</p>
              return <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: '#F0F0F0' }}>{line}</p>
            })}
            <button type="button" onClick={() => { setFeedback(null); setError(null) }} className="mt-3 text-xs" style={{ color: '#4A4D60' }}>Refresh</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StatsView({ rounds, skillLevelLabel, isPro, coachPersona, sgRoundCount, handicapHistory, handicap }: StatsViewProps) {
  const [range, setRange] = useState<RangeFilter>('last10')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [holesFilter, setHolesFilter] = useState<HolesFilter>('all')

  // Apply filters
  const filtered = useMemo(() => {
    let r = typeFilter === 'all' ? rounds : rounds.filter(x => x.roundType === typeFilter)
    if (holesFilter === '9')  r = r.filter(x => x.totalHoles <= 9)
    if (holesFilter === '18') r = r.filter(x => x.totalHoles >= 18)
    const limit = range === 'last5' ? 5 : range === 'last10' ? 10 : range === 'last20' ? 20 : Infinity
    return r.slice(0, limit)
  }, [rounds, range, typeFilter, holesFilter])

  // Aggregate stats from filtered set
  const agg = useMemo(() => {
    if (filtered.length === 0) return null
    const scores = filtered.map(r => r.scoreToPar)
    const firRounds = filtered.filter(r => r.firPct !== null)
    const girRounds = filtered.map(r => r.girPct)
    const puttRounds = filtered.map(r => r.puttsPerHole)
    const udRounds = filtered.filter(r => r.udPct !== null).map(r => r.udPct as number)
    const sandRounds = filtered.filter(r => r.sandSavePct !== null).map(r => r.sandSavePct as number)
    const sgRounds = filtered.filter(r => r.sgTotal !== null)
    const eagles = filtered.reduce((s, r) => s + r.eagles, 0)
    const birdies = filtered.reduce((s, r) => s + r.birdies, 0)
    const pars = filtered.reduce((s, r) => s + r.pars, 0)
    const bogeys = filtered.reduce((s, r) => s + r.bogeys, 0)
    const doubles = filtered.reduce((s, r) => s + r.doubles, 0)
    const totalHoles = filtered.reduce((s, r) => s + r.totalHoles, 0)

    const rounds18 = filtered.filter(r => r.totalHoles >= 18)
    const rounds9  = filtered.filter(r => r.totalHoles <= 9)
    const avgGross18 = avg(rounds18.map(r => r.scoreToPar + r.par))
    const avgPar18   = avg(rounds18.map(r => r.scoreToPar))
    const avgGross9  = avg(rounds9.map(r => r.scoreToPar + r.par))
    const avgPar9    = avg(rounds9.map(r => r.scoreToPar))

    return {
      avgScore: avg(scores),
      avgGross18, avgPar18,
      avgGross9,  avgPar9,
      bestScore: Math.min(...scores),
      worstScore: Math.max(...scores),
      avgFir: avg(firRounds.map(r => r.firPct as number)),
      avgGir: avg(girRounds),
      avgPutts: avg(puttRounds),
      avgUd: avg(udRounds),
      avgSandSave: avg(sandRounds),
      avgSgTotal: avg(sgRounds.map(r => r.sgTotal as number)),
      avgSgOffTee: avg(sgRounds.map(r => r.sgOffTee as number)),
      avgSgApproach: avg(sgRounds.map(r => r.sgApproach as number)),
      avgSgAroundGreen: avg(sgRounds.map(r => r.sgAroundGreen as number)),
      avgSgPutt: avg(sgRounds.map(r => r.sgPutt as number)),
      sgRoundsCount: sgRounds.length,
      eagles, birdies, pars, bogeys, doubles, totalHoles,
    }
  }, [filtered])

  // Aggregate SG by distance band across filtered full-tracking rounds
  const bandAgg = useMemo(() => {
    const BANDS: { label: string; category: 'putting' | 'around_green' | 'approach' | 'off_tee'; sgSum: number; count: number }[] = [
      { label: '0–3ft',    category: 'putting',      sgSum: 0, count: 0 },
      { label: '3–5ft',    category: 'putting',      sgSum: 0, count: 0 },
      { label: '5–8ft',    category: 'putting',      sgSum: 0, count: 0 },
      { label: '8–12ft',   category: 'putting',      sgSum: 0, count: 0 },
      { label: '12–20ft',  category: 'putting',      sgSum: 0, count: 0 },
      { label: '20–30ft',  category: 'putting',      sgSum: 0, count: 0 },
      { label: '30–40ft',  category: 'putting',      sgSum: 0, count: 0 },
      { label: '40ft+',    category: 'putting',      sgSum: 0, count: 0 },
      { label: '0–10y',    category: 'around_green', sgSum: 0, count: 0 },
      { label: '10–20y',   category: 'around_green', sgSum: 0, count: 0 },
      { label: '20–30y',   category: 'around_green', sgSum: 0, count: 0 },
      { label: '30–50y',   category: 'approach',     sgSum: 0, count: 0 },
      { label: '50–75y',   category: 'approach',     sgSum: 0, count: 0 },
      { label: '75–100y',  category: 'approach',     sgSum: 0, count: 0 },
      { label: '100–125y', category: 'approach',     sgSum: 0, count: 0 },
      { label: '125–150y', category: 'approach',     sgSum: 0, count: 0 },
      { label: '150–175y', category: 'approach',     sgSum: 0, count: 0 },
      { label: '175–200y', category: 'approach',     sgSum: 0, count: 0 },
      { label: '175–200y', category: 'off_tee',      sgSum: 0, count: 0 },
      { label: '200–225y', category: 'off_tee',      sgSum: 0, count: 0 },
      { label: '225–250y', category: 'off_tee',      sgSum: 0, count: 0 },
      { label: '250–275y', category: 'off_tee',      sgSum: 0, count: 0 },
      { label: '275–300y', category: 'off_tee',      sgSum: 0, count: 0 },
      { label: '300y+',    category: 'off_tee',      sgSum: 0, count: 0 },
    ]
    for (const r of filtered) {
      if (!r.sgBands) continue
      for (const b of r.sgBands) {
        const slot = BANDS.find(x => x.label === b.label && x.category === b.category)
        if (slot) { slot.sgSum += b.sgSum; slot.count += b.count }
      }
    }
    return BANDS
  }, [filtered])

  // Chart data — oldest first for trend lines
  const trendData = useMemo(() =>
    [...filtered].reverse().map((r, i) => ({
      n: i + 1,
      label: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      score: r.scoreToPar,
      gir: Math.round(r.girPct),
      fir: r.firPct !== null ? Math.round(r.firPct) : null,
      putts: parseFloat(r.puttsPerHole.toFixed(2)),
      sgOffTee: r.sgOffTee,
      sgApproach: r.sgApproach,
      sgAroundGreen: r.sgAroundGreen,
      sgPutt: r.sgPutt,
    })),
    [filtered]
  )

  const sgTrendPoints = trendData.filter(d => d.sgOffTee !== null).length

  // Personal records — all-time across unfiltered rounds
  const personalRecords = useMemo(() => {
    if (rounds.length < 3) return null
    const sgRounds = rounds.filter(r => r.sgTotal !== null)
    return {
      bestScore: Math.min(...rounds.map(r => r.scoreToPar)),
      bestSgTotal: sgRounds.length > 0 ? Math.max(...sgRounds.map(r => r.sgTotal as number)) : null,
      bestSgOffTee: sgRounds.length > 0 ? Math.max(...sgRounds.map(r => r.sgOffTee as number)) : null,
      bestSgApproach: sgRounds.length > 0 ? Math.max(...sgRounds.map(r => r.sgApproach as number)) : null,
      bestSgAroundGreen: sgRounds.length > 0 ? Math.max(...sgRounds.map(r => r.sgAroundGreen as number)) : null,
      bestSgPutt: sgRounds.length > 0 ? Math.max(...sgRounds.map(r => r.sgPutt as number)) : null,
    }
  }, [rounds])

  const sgCategoryData = agg && agg.avgSgTotal !== null ? [
    { name: 'Off Tee',  value: agg.avgSgOffTee ?? 0 },
    { name: 'Approach', value: agg.avgSgApproach ?? 0 },
    { name: 'Arnd Green', value: agg.avgSgAroundGreen ?? 0 },
    { name: 'Putting',  value: agg.avgSgPutt ?? 0 },
  ] : []

  // Stats payload for AI
  const aiStatsPayload = agg ? {
    roundCount: filtered.length,
    avgScore: fmt(agg.avgScore),
    bestRound: fmt(agg.bestScore, 0),
    worstRound: fmt(agg.worstScore, 0),
    firPct: agg.avgFir !== null ? Math.round(agg.avgFir) : null,
    girPct: agg.avgGir !== null ? Math.round(agg.avgGir) : null,
    puttsPerHole: agg.avgPutts !== null ? agg.avgPutts.toFixed(2) : null,
    udPct: agg.avgUd !== null ? Math.round(agg.avgUd) : null,
    hasSG: agg.avgSgTotal !== null,
    sgRounds: agg.sgRoundsCount,
    sgTotal: agg.avgSgTotal !== null ? agg.avgSgTotal.toFixed(2) : null,
    sgOffTee: agg.avgSgOffTee !== null ? agg.avgSgOffTee.toFixed(2) : null,
    sgApproach: agg.avgSgApproach !== null ? agg.avgSgApproach.toFixed(2) : null,
    sgAroundGreen: agg.avgSgAroundGreen !== null ? agg.avgSgAroundGreen.toFixed(2) : null,
    sgPutt: agg.avgSgPutt !== null ? agg.avgSgPutt.toFixed(2) : null,
    eagles: agg.eagles, birdies: agg.birdies, pars: agg.pars, bogeys: agg.bogeys, doubles: agg.doubles,
  } : {}

  if (rounds.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: '#F0F0F0' }}>No data yet</h2>
        <p className="text-sm" style={{ color: '#9A9DB0' }}>Log a few rounds and your stats will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Range */}
        <div className="flex gap-2">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRange(opt.value)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: range === opt.value ? '#CC222220' : '#1A1D27',
                color: range === opt.value ? '#CC2222' : '#9A9DB0',
                border: `1px solid ${range === opt.value ? '#CC222240' : '#2E3247'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Type + Holes filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTypeFilter(opt.value)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: typeFilter === opt.value ? '#22263A' : '#1A1D27',
                color: typeFilter === opt.value ? '#F0F0F0' : '#9A9DB0',
                border: `1px solid ${typeFilter === opt.value ? '#F0F0F020' : '#2E3247'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
          <div className="w-px shrink-0 self-stretch" style={{ backgroundColor: '#2E3247' }} />
          {HOLES_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHolesFilter(opt.value)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: holesFilter === opt.value ? '#22263A' : '#1A1D27',
                color: holesFilter === opt.value ? '#F0F0F0' : '#9A9DB0',
                border: `1px solid ${holesFilter === opt.value ? '#F0F0F020' : '#2E3247'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: '#4A4D60' }}>
          {filtered.length} round{filtered.length !== 1 ? 's' : ''} shown
        </p>
      </div>

      {!agg && (
        <p className="text-sm text-center py-8" style={{ color: '#9A9DB0' }}>No rounds match this filter.</p>
      )}

      {/* ── Handicap trend (all-time, unaffected by filter) ──────────────── */}
      {handicapHistory.length >= 2 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Handicap trend</h2>
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
                {handicapHistory[handicapHistory.length - 1].handicap}
              </span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                {handicapHistory.length} entries
              </span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart
                data={handicapHistory.map(h => ({
                  label: new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                  handicap: h.handicap,
                }))}
                margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2E3247" />
                <XAxis dataKey="label" tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} reversed />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
                      <p style={{ color: '#9A9DB0' }}>{label}</p>
                      <p style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>HCP {payload[0].value}</p>
                    </div>
                  )
                }} />
                <Line
                  type="monotone"
                  dataKey="handicap"
                  stroke="#CC2222"
                  strokeWidth={2}
                  dot={{ fill: '#CC2222', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>
              Updated automatically when you change your handicap in Profile
            </p>
          </div>
        </div>
      )}

      {agg && (
        <>
          {/* ── Scoring ───────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9A9DB0' }}>Scoring average</h2>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* 18-hole */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>18 holes</p>
                {agg.avgGross18 !== null ? (
                  <>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0', lineHeight: 1 }}>
                      {agg.avgGross18.toFixed(1)}
                    </p>
                    <p className="text-xs mt-1" style={{ fontFamily: 'var(--font-dm-mono)', color: agg.avgPar18 !== null ? scoreColor(agg.avgPar18) : '#9A9DB0' }}>
                      {agg.avgPar18 !== null ? `${agg.avgPar18 > 0 ? '+' : ''}${agg.avgPar18.toFixed(1)} to par` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60' }}>—</p>
                )}
              </div>
              {/* 9-hole */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>9 holes</p>
                {agg.avgGross9 !== null ? (
                  <>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0', lineHeight: 1 }}>
                      {agg.avgGross9.toFixed(1)}
                    </p>
                    <p className="text-xs mt-1" style={{ fontFamily: 'var(--font-dm-mono)', color: agg.avgPar9 !== null ? scoreColor(agg.avgPar9) : '#9A9DB0' }}>
                      {agg.avgPar9 !== null ? `${agg.avgPar9 > 0 ? '+' : ''}${agg.avgPar9.toFixed(1)} to par` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60' }}>—</p>
                )}
              </div>
            </div>
            <p className="text-xs mb-2" style={{ color: '#4A4D60' }}>
              Best {agg.bestScore > 0 ? '+' : ''}{agg.bestScore} · Worst {agg.worstScore > 0 ? '+' : ''}{agg.worstScore} across {filtered.length} round{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* ── SG breakdown boxes ────────────────────────────────────────── */}
          {agg.avgSgTotal !== null && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9A9DB0' }}>
                Strokes Gained vs {skillLevelLabel}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total SG', value: agg.avgSgTotal },
                  { label: 'Off the tee', value: agg.avgSgOffTee },
                  { label: 'Approach', value: agg.avgSgApproach },
                  { label: 'Around green', value: agg.avgSgAroundGreen },
                  { label: 'Putting', value: agg.avgSgPutt },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27', border: `1px solid ${value !== null && Math.abs(value) > 0.5 ? (value > 0 ? '#22C55E30' : '#EF444430') : '#2E3247'}` }}>
                    <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>{label}</p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: value !== null ? sgColor(value) : '#4A4D60' }}>
                      {value !== null ? fmtSG(value) : '—'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>avg / round</p>
                  </div>
                ))}
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
                  <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>SG rounds</p>
                  <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{agg.sgRoundsCount}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>full tracking</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Advanced breakdown — SG by distance band ─────────────────── */}
          {isPro && agg && agg.sgRoundsCount >= 1 && (() => {
            const puttBands   = bandAgg.filter(b => b.category === 'putting')
            const agBands     = bandAgg.filter(b => b.category === 'around_green')
            const appBands    = bandAgg.filter(b => b.category === 'approach')
            const otBands     = bandAgg.filter(b => b.category === 'off_tee')
            const hasBandData = bandAgg.some(b => b.count > 0)
            if (!hasBandData) return null

            const SCALE = 0.4 // max abs SG for bar width normalization

            function BandRow({ label, sgSum, count, alwaysShow = false }: { label: string; sgSum: number; count: number; alwaysShow?: boolean }) {
              if (count === 0 && !alwaysShow) return null
              const v = count > 0 ? sgSum / count : null
              const barW = v !== null ? Math.min(Math.abs(v) / SCALE * 100, 100) : 0
              const positive = v !== null && v >= 0
              return (
                <div className="py-2.5" style={{ borderTop: '1px solid #2E3247' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ color: count === 0 ? '#4A4D60' : '#9A9DB0' }}>{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#4A4D60' }}>{count > 0 ? `${count} shots` : 'no data'}</span>
                      <span className="text-sm font-bold w-14 text-right" style={{ fontFamily: 'var(--font-dm-mono)', color: v !== null ? sgColor(v) : '#4A4D60' }}>
                        {v !== null ? fmtSG(v) : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#22263A' }}>
                    <div
                      style={{
                        width: `${barW}%`,
                        height: '100%',
                        backgroundColor: positive ? '#22C55E' : '#EF4444',
                        marginLeft: positive ? '50%' : `${50 - barW}%`,
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>
              )
            }

            function AreaCard({ title, sub, bands, alwaysShowBands = false }: { title: string; sub: string; bands: typeof bandAgg; alwaysShowBands?: boolean }) {
              const hasData = bands.some(b => b.count > 0)
              return (
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{title}</p>
                  </div>
                  <p className="text-xs mb-3" style={{ color: '#4A4D60' }}>{sub}</p>
                  {(hasData || alwaysShowBands)
                    ? bands.map(b => <BandRow key={b.label} label={b.label} sgSum={b.sgSum} count={b.count} alwaysShow={alwaysShowBands} />)
                    : <p className="text-xs py-2" style={{ color: '#4A4D60' }}>No data yet — log full-tracking rounds to unlock</p>
                  }
                </div>
              )
            }

            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
                    Advanced breakdown
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                    {agg.sgRoundsCount} full-tracking round{agg.sgRoundsCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs mb-4" style={{ color: '#4A4D60' }}>
                  Average SG per shot by distance band. Bars show magnitude — green is gaining shots, red is losing shots vs your baseline.
                </p>
                <div className="space-y-3">
                  <AreaCard
                    title="Putting"
                    sub="All putts by distance from hole (in feet)"
                    bands={puttBands}
                  />
                  <AreaCard
                    title="Around the green"
                    sub="Chips, pitches & bunker shots inside 30y"
                    bands={agBands}
                    alwaysShowBands
                  />
                  <AreaCard
                    title="Approach"
                    sub="Irons & wedges from 30–200y (non-tee shots)"
                    bands={appBands}
                  />
                  <AreaCard
                    title="Off the tee"
                    sub="Tee shots on par 4s & par 5s"
                    bands={otBands}
                  />
                </div>
              </div>
            )
          })()}

          {/* ── Ball striking ─────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9A9DB0' }}>Ball striking</h2>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="FIR%" value={pct(agg.avgFir)} sub="fairways in regulation" />
              <StatCard label="GIR%" value={pct(agg.avgGir)} sub="greens in regulation" />
            </div>
          </div>

          {/* ── Benchmark layer ───────────────────────────────────────────── */}
          {agg.avgGir !== null && (() => {
            const bm = getBenchmarks(handicap)
            const band = handicapBandLabel(handicap)
            const rows: { label: string; yours: string; bench: string; better: boolean }[] = [
              {
                label: 'GIR%',
                yours: `${Math.round(agg.avgGir!)}%`,
                bench: `${bm.gir}%`,
                better: agg.avgGir! >= bm.gir,
              },
              ...(agg.avgFir !== null ? [{
                label: 'FIR%',
                yours: `${Math.round(agg.avgFir)}%`,
                bench: `${bm.fir}%`,
                better: agg.avgFir >= bm.fir,
              }] : []),
              {
                label: 'Putts/hole',
                yours: agg.avgPutts !== null ? agg.avgPutts.toFixed(2) : '—',
                bench: bm.putts.toFixed(2),
                better: agg.avgPutts !== null && agg.avgPutts <= bm.putts,
              },
            ]
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>How you compare</h2>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                    Hcp {band} avg
                  </span>
                </div>
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                  <div className="grid grid-cols-3 mb-2 px-1">
                    <span className="text-xs" style={{ color: '#4A4D60' }}>Stat</span>
                    <span className="text-xs text-center font-semibold" style={{ color: '#9A9DB0' }}>You</span>
                    <span className="text-xs text-center" style={{ color: '#4A4D60' }}>Benchmark</span>
                  </div>
                  {rows.map(row => (
                    <div key={row.label} className="grid grid-cols-3 py-2 px-1" style={{ borderTop: '1px solid #2E3247' }}>
                      <span className="text-xs self-center" style={{ color: '#9A9DB0' }}>{row.label}</span>
                      <span className="text-sm font-bold text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: row.better ? '#22C55E' : '#EF4444' }}>
                        {row.yours}
                      </span>
                      <span className="text-xs text-center self-center" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60' }}>
                        {row.bench}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── Score impact simulator ────────────────────────────────────── */}
          {agg.avgGir !== null && agg.avgScore !== null && (() => {
            const currentPutts = agg.avgPutts ?? 1.9
            // ~1 extra GIR per round saves ~0.8 strokes (avoids chip + potential extra putt)
            const girSaving = Math.round(1 * 0.8 * 10) / 10  // 1 more GIR → ~0.8 shots
            // 1 fewer 3-putt → 1 shot saved
            const threePuttRate = Math.max(0, currentPutts - 1.7)
            const puttSaving = threePuttRate > 0.1 ? '1 shot' : null
            return (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9A9DB0' }}>Score impact</h2>
                <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: '#1A1D27' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5">⛳</span>
                    <div>
                      <p className="text-sm" style={{ color: '#F0F0F0' }}>
                        Hit <span style={{ color: '#22C55E', fontFamily: 'var(--font-dm-mono)' }}>1 more GIR</span> per round
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>→ save ~{girSaving} shots on average</p>
                    </div>
                  </div>
                  {puttSaving && (
                    <div className="flex items-start gap-3" style={{ paddingTop: '12px', borderTop: '1px solid #2E3247' }}>
                      <span className="text-base mt-0.5">🏌️</span>
                      <div>
                        <p className="text-sm" style={{ color: '#F0F0F0' }}>
                          Eliminate <span style={{ color: '#22C55E', fontFamily: 'var(--font-dm-mono)' }}>1 three-putt</span> per round
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>→ save {puttSaving} directly</p>
                      </div>
                    </div>
                  )}
                  {agg.avgFir !== null && agg.avgFir < 50 && (
                    <div className="flex items-start gap-3" style={{ paddingTop: '12px', borderTop: '1px solid #2E3247' }}>
                      <span className="text-base mt-0.5">🎯</span>
                      <div>
                        <p className="text-sm" style={{ color: '#F0F0F0' }}>
                          Hit <span style={{ color: '#22C55E', fontFamily: 'var(--font-dm-mono)' }}>2 more fairways</span> per round
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>→ shorter approach distances → ~0.5 shots saved</p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs" style={{ color: '#4A4D60', paddingTop: '4px' }}>Based on typical scoring patterns at your level</p>
                </div>
              </div>
            )
          })()}

          {/* ── Short game ────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9A9DB0' }}>Short game & putting</h2>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Putts/hole" value={agg.avgPutts !== null ? agg.avgPutts.toFixed(2) : '—'} />
              {agg.avgUd !== null && <StatCard label="Up & down%" value={pct(agg.avgUd)} />}
              {agg.avgSandSave !== null && <StatCard label="Sand save%" value={pct(agg.avgSandSave)} />}
            </div>
          </div>

          {/* ── Score trend ───────────────────────────────────────────────── */}
          {trendData.length >= 2 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Score trend</h2>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3247" />
                    <XAxis dataKey="label" tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v > 0 ? `+${v}` : `${v}`} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke="#2E3247" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#CC2222"
                      strokeWidth={2}
                      dot={{ fill: '#CC2222', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── GIR & FIR trend ───────────────────────────────────────────── */}
          {trendData.length >= 2 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Ball striking trend</h2>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                <div className="flex gap-4 mb-3 text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: '#22C55E' }}>
                    <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: '#22C55E' }} />GIR%
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: '#F59E0B' }}>
                    <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: '#F59E0B' }} />FIR%
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3247" />
                    <XAxis dataKey="label" tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<ChartTooltip unit="" />} />
                    <Line type="monotone" dataKey="gir" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3, strokeWidth: 0 }} connectNulls />
                    <Line type="monotone" dataKey="fir" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3, strokeWidth: 0 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Putts trend ───────────────────────────────────────────────── */}
          {trendData.length >= 2 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Putts / hole trend</h2>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3247" />
                    <XAxis dataKey="label" tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="putts" stroke="#9A9DB0" strokeWidth={2} dot={{ fill: '#9A9DB0', r: 3, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── SG trend ──────────────────────────────────────────────────── */}
          {sgTrendPoints >= 2 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Strokes Gained trend</h2>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                <div className="flex flex-wrap gap-3 mb-3 text-xs">
                  {[
                    { key: 'sgOffTee',      label: 'Off tee',     color: '#F59E0B' },
                    { key: 'sgApproach',    label: 'Approach',    color: '#3B82F6' },
                    { key: 'sgAroundGreen', label: 'Arnd green',  color: '#A855F7' },
                    { key: 'sgPutt',        label: 'Putting',     color: '#22C55E' },
                  ].map(({ key, label, color }) => (
                    <span key={key} className="flex items-center gap-1.5" style={{ color }}>
                      <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: color }} />{label}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3247" />
                    <XAxis dataKey="label" tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="px-3 py-2 rounded-lg text-xs space-y-1" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
                          <p style={{ color: '#9A9DB0' }}>{label}</p>
                          {payload.map((p, i) => (
                            <p key={i} style={{ fontFamily: 'var(--font-dm-mono)', color: p.color as string }}>
                              {typeof p.value === 'number' ? (p.value > 0 ? '+' : '') + p.value.toFixed(2) : '—'}
                            </p>
                          ))}
                        </div>
                      )
                    }} />
                    <ReferenceLine y={0} stroke="#2E3247" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="sgOffTee"      stroke="#F59E0B" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="sgApproach"    stroke="#3B82F6" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="sgAroundGreen" stroke="#A855F7" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="sgPutt"        stroke="#22C55E" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── SG breakdown ──────────────────────────────────────────────── */}
          {sgCategoryData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>Strokes Gained avg</h2>
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
                  vs {skillLevelLabel}
                </span>
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                {/* Total */}
                <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '1px solid #2E3247' }}>
                  <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Total SG</span>
                  <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(agg.avgSgTotal ?? 0) }}>
                    {agg.avgSgTotal !== null ? fmtSG(agg.avgSgTotal) : '—'}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={sgCategoryData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E3247" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#9A9DB0', fontSize: 11 }} tickLine={false} axisLine={false} width={72} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const v = payload[0].value as number
                      return (
                        <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#22263A', border: '1px solid #2E3247' }}>
                          <p style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(v) }}>{fmtSG(v)}</p>
                        </div>
                      )
                    }} />
                    <ReferenceLine x={0} stroke="#2E3247" />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {sgCategoryData.map((entry, i) => (
                        <Cell key={i} fill={sgColor(entry.value)} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Personal records ──────────────────────────────────────────── */}
          {personalRecords && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9A9DB0' }}>Personal bests</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222220' }}>
                  <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Best round</p>
                  <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E' }}>
                    {personalRecords.bestScore > 0 ? `+${personalRecords.bestScore}` : personalRecords.bestScore === 0 ? 'E' : `${personalRecords.bestScore}`}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>vs par</p>
                </div>
                {personalRecords.bestSgTotal !== null && (
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222220' }}>
                    <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Best SG round</p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E' }}>
                      {personalRecords.bestSgTotal > 0 ? '+' : ''}{personalRecords.bestSgTotal.toFixed(2)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>total SG</p>
                  </div>
                )}
                {personalRecords.bestSgOffTee !== null && (
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                    <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Best off tee</p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E' }}>
                      {personalRecords.bestSgOffTee > 0 ? '+' : ''}{personalRecords.bestSgOffTee.toFixed(2)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>SG off tee</p>
                  </div>
                )}
                {personalRecords.bestSgApproach !== null && (
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                    <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Best approach</p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E' }}>
                      {personalRecords.bestSgApproach > 0 ? '+' : ''}{personalRecords.bestSgApproach.toFixed(2)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>SG approach</p>
                  </div>
                )}
                {personalRecords.bestSgAroundGreen !== null && (
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                    <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Best arnd green</p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E' }}>
                      {personalRecords.bestSgAroundGreen > 0 ? '+' : ''}{personalRecords.bestSgAroundGreen.toFixed(2)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>SG arnd green</p>
                  </div>
                )}
                {personalRecords.bestSgPutt !== null && (
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                    <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Best putting</p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E' }}>
                      {personalRecords.bestSgPutt > 0 ? '+' : ''}{personalRecords.bestSgPutt.toFixed(2)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>SG putting</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Scoring distribution ──────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>
              Scoring distribution — {agg.totalHoles} holes
            </h2>
            <div className="p-4 rounded-xl space-y-2" style={{ backgroundColor: '#1A1D27' }}>
              {[
                { label: 'Eagle+', count: agg.eagles, color: '#22C55E' },
                { label: 'Birdie',  count: agg.birdies, color: '#22C55E' },
                { label: 'Par',     count: agg.pars,    color: '#F0F0F0' },
                { label: 'Bogey',   count: agg.bogeys,  color: '#9A9DB0' },
                { label: 'Dbl+',    count: agg.doubles, color: '#EF4444' },
              ].map(({ label, count, color }) => {
                const width = agg.totalHoles > 0 ? (count / agg.totalHoles) * 100 : 0
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs w-12 shrink-0" style={{ color: '#9A9DB0' }}>{label}</span>
                    <div className="flex-1 h-5 rounded overflow-hidden" style={{ backgroundColor: '#22263A' }}>
                      <div className="h-full rounded" style={{ width: `${Math.max(width, count > 0 ? 2 : 0)}%`, backgroundColor: color, opacity: 0.7 }} />
                    </div>
                    <span className="text-xs font-medium shrink-0" style={{ fontFamily: 'var(--font-dm-mono)', color, width: '28px', textAlign: 'right' }}>
                      {count}
                    </span>
                    <span className="text-xs shrink-0" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0', width: '32px', textAlign: 'right' }}>
                      {agg.totalHoles > 0 ? `${Math.round(width)}%` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── AI Coaching ───────────────────────────────────────────────── */}
          <AICoachingSection
            isPro={isPro}
            coachPersona={coachPersona}
            statsPayload={aiStatsPayload}
          />
        </>
      )}
    </div>
  )
}
