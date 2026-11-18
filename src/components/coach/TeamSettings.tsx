'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SKILL_LEVEL_LABELS, COLLEGE_LEVELS, COLLEGE_BENCHMARKS_LIVE, type SkillLevel } from '@/lib/sg-engine'

interface Props {
  benchmark: string | null
  playersSeeLeaderboard: boolean
}

/** Coach settings for the squad: what Strokes Gained is measured against, and who sees the leaderboard. */
export default function TeamSettings({ benchmark, playersSeeLeaderboard }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState(benchmark ?? '')
  const [visible, setVisible] = useState(playersSeeLeaderboard)

  async function save(body: Record<string, unknown>) {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/coach/team-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const LEVELS: SkillLevel[] = [...COLLEGE_LEVELS, 'tour', 'scratch']

  return (
    <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>Squad settings</p>

      {COLLEGE_BENCHMARKS_LIVE && (
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1" style={{ color: '#F0F0F0' }}>Strokes Gained benchmark</label>
          <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>
            Measure the whole squad against the same level. College levels are estimates built from scoring averages.
          </p>
          <select
            value={level}
            disabled={saving}
            onChange={e => { setLevel(e.target.value); save({ benchmark: e.target.value || null }) }}
            className="w-full px-3 rounded-lg text-sm"
            style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', minHeight: '44px' }}
          >
            <option value="">Each player&apos;s own handicap level</option>
            {LEVELS.map(l => <option key={l} value={l}>{SKILL_LEVEL_LABELS[l]}</option>)}
          </select>
        </div>
      )}

      <label className="flex items-center justify-between gap-4" style={{ minHeight: '44px' }}>
        <span>
          <span className="text-sm font-medium block" style={{ color: '#F0F0F0' }}>Players can see the squad leaderboard</span>
          <span className="text-xs" style={{ color: '#9A9DB0' }}>Turn off to keep it for coaches only.</span>
        </span>
        <input
          type="checkbox"
          checked={visible}
          disabled={saving}
          onChange={e => { setVisible(e.target.checked); save({ playersSeeLeaderboard: e.target.checked }) }}
          style={{ width: '22px', height: '22px', accentColor: '#CC2222' }}
        />
      </label>

      {error && <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}
