'use client'

import { useState, useTransition } from 'react'
import { saveLeaderboardSettings } from '@/app/(protected)/profile/actions'

interface Props {
  country: string | null
  region: string | null
  optIn: boolean
}

const COUNTRIES = ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Ireland', 'United States', 'Canada', 'Australia', 'New Zealand', 'South Africa', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands']

const field = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '48px' } as const

/** Where the golfer plays, and whether they appear on the location leaderboards. */
export default function LeaderboardSettings({ country, region, optIn }: Props) {
  const known = country && COUNTRIES.includes(country)
  const [pick, setPick] = useState(country ? (known ? country : 'other') : '')
  const [other, setOther] = useState(known ? '' : country ?? '')
  const [area, setArea] = useState(region ?? '')
  const [on, setOn] = useState(optIn)
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)

  const isUS = pick === 'United States'
  const areaLabel = isUS ? 'State' : pick === 'Canada' ? 'Province' : 'County or region'

  function save() {
    setSaved(null)
    start(async () => {
      const res = await saveLeaderboardSettings({ country: pick === 'other' ? other : pick, region: area, optIn: on })
      setSaved(res?.error ?? 'Saved')
    })
  }

  return (
    <div id="leaderboards">
      <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Leaderboards</p>
      <p className="text-xs mb-4" style={{ color: '#9A9DB0' }}>
        Add where you play to be ranked with golfers in your area, country and worldwide. Boards open once 20 golfers are on them.
      </p>

      <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Country</label>
      <select value={pick} onChange={e => setPick(e.target.value)} className="w-full px-3 rounded-lg text-sm mb-3" style={field}>
        <option value="">Not set</option>
        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="other">Somewhere else</option>
      </select>
      {pick === 'other' && (
        <input value={other} onChange={e => setOther(e.target.value)} placeholder="Your country" maxLength={60} className="w-full px-3 rounded-lg text-sm mb-3" style={field} />
      )}

      <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>{areaLabel}</label>
      <input value={area} onChange={e => setArea(e.target.value)} placeholder={isUS ? 'e.g. Tennessee' : 'e.g. Cheshire'} maxLength={60} className="w-full px-3 rounded-lg text-sm mb-4" style={field} />

      <label className="flex items-start gap-3 mb-4" style={{ minHeight: '44px' }}>
        <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} style={{ width: '22px', height: '22px', accentColor: '#CC2222', marginTop: '2px', flexShrink: 0 }} />
        <span>
          <span className="text-sm block" style={{ color: '#F0F0F0' }}>Show me on these leaderboards</span>
          <span className="text-xs" style={{ color: '#9A9DB0' }}>Other golfers see your first name, last initial and the handicap your rounds played like. Nothing else.</span>
        </span>
      </label>

      <button type="button" onClick={save} disabled={pending} className="w-full rounded-xl font-semibold text-sm" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', minHeight: '48px', opacity: pending ? 0.6 : 1 }}>
        {pending ? 'Saving…' : 'Save'}
      </button>
      {saved && <p className="text-xs mt-2" style={{ color: saved === 'Saved' ? '#22C55E' : '#EF4444' }}>{saved}</p>}
    </div>
  )
}
