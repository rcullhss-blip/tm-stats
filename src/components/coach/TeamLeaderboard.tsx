'use client'

import { useState } from 'react'
import Link from 'next/link'
import { fmtHandicapLevel } from '@/lib/handicap-level'

/**
 * Coach view: the squad ranked. Handicap levels put every player on the same
 * scale whatever their own handicap, so a 2 and a 14 can be compared part by
 * part. Lower is better on every tab except rounds logged.
 */

export interface LeaderboardRow {
  id: string
  name: string
  handicap: number | null
  avgToPar: number | null      // last 5 scored rounds
  roundsLast30: number
  sgRounds: number             // full tracking rounds the levels are built from
  level: number | null
  offTee: number | null
  approach: number | null
  aroundGreen: number | null
  putting: number | null
}

type Tab = 'avgToPar' | 'level' | 'offTee' | 'approach' | 'aroundGreen' | 'putting' | 'roundsLast30'

const TABS: { key: Tab; label: string; note: string }[] = [
  { key: 'avgToPar', label: 'Scoring', note: 'Average score to par, last 5 rounds' },
  { key: 'level', label: 'Playing like', note: 'Handicap their last 5 full tracking rounds played like' },
  { key: 'offTee', label: 'Driving', note: 'Handicap level off the tee' },
  { key: 'approach', label: 'Approach', note: 'Handicap level on approach shots' },
  { key: 'aroundGreen', label: 'Short game', note: 'Handicap level around the green' },
  { key: 'putting', label: 'Putting', note: 'Handicap level on the greens' },
  { key: 'roundsLast30', label: 'Rounds logged', note: 'Rounds logged in the last 30 days' },
]

function display(tab: Tab, v: number): string {
  if (tab === 'avgToPar') return v === 0 ? 'E' : v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)
  if (tab === 'roundsLast30') return `${v}`
  return fmtHandicapLevel(v)
}

export default function TeamLeaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const [tab, setTab] = useState<Tab>('avgToPar')
  const meta = TABS.find(t => t.key === tab)!

  const ranked = rows
    .filter(r => r[tab] !== null)
    .sort((a, b) => tab === 'roundsLast30' ? (b[tab] as number) - (a[tab] as number) : (a[tab] as number) - (b[tab] as number))
  const unranked = rows.filter(r => r[tab] === null)

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Leaderboard</h2>

      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {TABS.map(t => {
          const selected = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="px-3 rounded-lg text-sm font-medium whitespace-nowrap shrink-0"
              style={{
                minHeight: '44px',
                backgroundColor: selected ? '#CC2222' : '#1A1D27',
                color: selected ? '#F0F0F0' : '#9A9DB0',
                border: `1px solid ${selected ? '#CC2222' : '#2E3247'}`,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>{meta.note}</p>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27' }}>
        {ranked.length === 0 && (
          <p className="text-sm p-4" style={{ color: '#9A9DB0' }}>
            {tab === 'avgToPar' || tab === 'roundsLast30' ? 'No rounds logged yet.' : 'No full tracking rounds yet. These need shot by shot rounds.'}
          </p>
        )}
        {ranked.map((r, i) => (
          <Link
            key={r.id}
            href={`/coach/players/${r.id}`}
            className="flex items-center justify-between px-4"
            style={{ minHeight: '52px', borderTop: i > 0 ? '1px solid #2E3247' : 'none' }}
          >
            <span className="flex items-center gap-3">
              <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: i === 0 ? '#22C55E' : '#9A9DB0', width: '20px' }}>{i + 1}</span>
              <span>
                <span className="text-sm block" style={{ color: '#F0F0F0' }}>{r.name}</span>
                <span className="text-xs" style={{ color: '#4A4D60' }}>
                  {r.handicap !== null ? `Hcp ${r.handicap}` : 'No handicap'}
                </span>
              </span>
            </span>
            <span className="text-lg font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
              {display(tab, r[tab] as number)}
            </span>
          </Link>
        ))}
      </div>

      {unranked.length > 0 && ranked.length > 0 && (
        <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>
          Not ranked yet: {unranked.map(r => r.name).join(', ')}
        </p>
      )}
    </div>
  )
}
