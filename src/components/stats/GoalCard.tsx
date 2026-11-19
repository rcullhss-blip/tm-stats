'use client'

import { useState, useTransition } from 'react'
import { saveGoal } from '@/app/(protected)/profile/actions'
import { GOAL_LABEL, goalProgress, type Goal, type GoalMetric } from '@/lib/goal'
import { fmtHandicapLevel } from '@/lib/handicap-level'

interface Props {
  goal: Goal | null
  // The level each part of the game is playing like now (null = not enough rounds yet)
  current: Record<GoalMetric, number | null>
  today: string
  handicap?: number | null
}

const METRICS: GoalMetric[] = ['total', 'offTee', 'approach', 'aroundGreen', 'putting']
const field = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '48px' } as const

// Targets offered: +4 up to 28
const TARGETS = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 28]

function inMonths(today: string, months: number): string {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

/** A goal with a date: get a part of the game playing like a chosen handicap. */
export default function GoalCard({ goal, current, today, handicap = null }: Props) {
  const [editing, setEditing] = useState(false)
  const [metric, setMetric] = useState<GoalMetric>(goal?.metric ?? 'total')
  const [target, setTarget] = useState<number>(goal?.target ?? (() => {
    // Two shots better than where they are now, on the nearest target offered
    const base = Math.round((current.total ?? handicap ?? 10) - 2)
    return TARGETS.reduce((best, t) => (Math.abs(t - base) < Math.abs(best - base) ? t : best), TARGETS[0])
  })())
  const [by, setBy] = useState(goal?.by && goal.by > today ? goal.by : inMonths(today, 3))
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    setError(null)
    start(async () => {
      const res = await saveGoal({ metric, target, by, start: current[metric] })
      if (res?.error) setError(res.error); else setEditing(false)
    })
  }
  function clear() {
    start(async () => { await saveGoal(null); setEditing(false) })
  }

  if (editing || !goal) {
    if (!editing) {
      return (
        <button type="button" onClick={() => setEditing(true)} className="w-full text-left p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27', border: '1px dashed #2E3247', minHeight: '64px' }}>
          <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Set a goal</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Pick a part of your game, the handicap you want it playing like, and a date.</p>
        </button>
      )
    }
    const now = current[metric]
    return (
      <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: '#F0F0F0' }}>Your goal</p>

        <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Part of your game</label>
        <div className="flex gap-2 flex-wrap mb-3">
          {METRICS.map(m => (
            <button key={m} type="button" onClick={() => setMetric(m)} className="px-3 rounded-lg text-sm" style={{ backgroundColor: metric === m ? '#CC222220' : '#22263A', color: metric === m ? '#F0F0F0' : '#9A9DB0', border: `1px solid ${metric === m ? '#CC222260' : '#2E3247'}`, minHeight: '44px' }}>
              {GOAL_LABEL[m]}
            </button>
          ))}
        </div>
        <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
          {now !== null
            ? <>Playing like <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{fmtHandicapLevel(now)}</span> now.</>
            : metric === 'total' ? 'No full tracking rounds yet, so there is no level to start from. You can still set the goal.' : 'This needs 3 full tracking rounds before it has a level. You can still set the goal.'}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Play like a</label>
            <select value={target} onChange={e => setTarget(Number(e.target.value))} className="w-full px-3 rounded-lg text-sm" style={field}>
              {TARGETS.map(t => <option key={t} value={t}>{fmtHandicapLevel(t)}{t > 0 ? ' handicap' : t < 0 ? ' handicap' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>By</label>
            <input type="date" value={by} min={inMonths(today, 0)} onChange={e => setBy(e.target.value)} className="w-full px-3 rounded-lg text-sm" style={field} />
          </div>
        </div>

        {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => { setEditing(false); setError(null) }} disabled={pending} className="rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}>Cancel</button>
          <button type="button" onClick={save} disabled={pending} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px', opacity: pending ? 0.7 : 1 }}>{pending ? 'Saving…' : 'Save goal'}</button>
        </div>
        {goal && (
          <button type="button" onClick={clear} disabled={pending} className="text-xs mt-3" style={{ color: '#4A4D60', minHeight: '32px' }}>Remove this goal</button>
        )}
      </div>
    )
  }

  const now = current[goal.metric]
  const p = goalProgress(goal, now, today)
  const date = new Date(`${goal.by}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const tone = p.status === 'reached' || p.status === 'on_track' ? '#22C55E' : p.status === 'behind' ? '#F59E0B' : '#9A9DB0'
  const line =
    p.status === 'reached' ? 'Reached. Set the next one.'
    : p.status === 'expired' ? `The date has passed${p.toGo !== null ? `, ${p.toGo} to go` : ''}. Set a new one.`
    : p.status === 'no_data' ? (goal.metric === 'total' ? 'Log a full tracking round to see where you are.' : 'Needs 3 full tracking rounds to show where you are.')
    : `${p.toGo} to go · ${p.daysLeft} day${p.daysLeft !== 1 ? 's' : ''} left · ${p.status === 'on_track' ? 'on track' : 'behind the pace'}`

  return (
    <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9A9DB0' }}>Your goal</p>
          <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>
            {GOAL_LABEL[goal.metric]} playing like <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{fmtHandicapLevel(goal.target)}</span> by {date}
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="text-xs px-2" style={{ color: '#9A9DB0', minHeight: '44px' }}>Change</button>
      </div>
      <div className="flex items-end justify-between mb-2">
        <p className="text-xs" style={{ color: tone }}>{line}</p>
        <p className="text-2xl font-medium leading-none" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{now !== null ? fmtHandicapLevel(now) : '—'}</p>
      </div>
      {p.fraction !== null && (
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#22263A' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round(p.fraction * 100)}%`, backgroundColor: tone }} />
        </div>
      )}
    </div>
  )
}
