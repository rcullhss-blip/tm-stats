'use client'

import { useState } from 'react'
import AdminUserActions from './AdminUserActions'

interface User {
  id: string
  email: string
  name: string | null
  handicap: number | null
  subscription_status: string
  created_at: string
  promo_expires_at: string | null
}

interface Stats {
  rounds: number
  fullRounds: number
  lastRoundDate?: string | null
  avgToPar?: number | null
  bestRound?: { toPar: number; course: string | null; date: string } | null
  girPct?: number | null
  firPct?: number | null
  upDownPct?: number | null
  puttsPerRound?: number | null
  handicap?: number | null
  skillLevel?: string | null
  skillLevelSource?: string | null
  sg?: {
    rounds: number
    total: number
    offTee: number
    approach: number
    aroundGreen: number
    putting: number
  } | null
}

function fmtSG(n: number) {
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}
function sgColor(n: number) {
  return n > 0.05 ? '#22C55E' : n < -0.05 ? '#EF4444' : '#9A9DB0'
}

function planColor(status: string) {
  if (status === 'pro') return '#22C55E'
  if (status === 'team') return '#3B82F6'
  return '#9A9DB0'
}

function fmtToPar(n: number) {
  return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`
}

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB') : '—'
}

export default function AdminUserCard({ user, roundCount }: { user: User; roundCount: number }) {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && !stats && !loading) {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/admin/user-stats?userId=${user.id}`)
        if (!res.ok) throw new Error('Failed to load')
        setStats(await res.json())
      } catch {
        setError('Could not load stats')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1.5 text-left w-full"
            aria-expanded={open}
          >
            <span
              style={{ color: '#9A9DB0', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}
            >
              ›
            </span>
            <span className="text-sm font-medium truncate" style={{ color: '#F0F0F0' }}>
              {user.name ?? user.email}
            </span>
          </button>
          <p className="text-xs truncate ml-4" style={{ color: '#4A4D60' }}>{user.email}</p>
          <div className="flex items-center gap-2 mt-1 ml-4">
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: user.subscription_status !== 'free' ? '#22C55E20' : '#22263A', color: planColor(user.subscription_status) }}
            >
              {user.subscription_status}
            </span>
            <span className="text-xs" style={{ color: '#4A4D60' }}>
              {roundCount} rounds
              {user.handicap != null ? ` · hcp ${user.handicap}` : ''}
            </span>
          </div>
          {user.promo_expires_at && (
            <p className="text-xs mt-0.5 ml-4" style={{ color: '#F59E0B' }}>
              Promo expires {fmtDate(user.promo_expires_at)}
            </p>
          )}
        </div>
        <AdminUserActions userId={user.id} currentPlan={user.subscription_status} />
      </div>

      {open && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #2E3247' }}>
          {loading && <p className="text-xs" style={{ color: '#9A9DB0' }}>Loading…</p>}
          {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
          {stats && !loading && (
            stats.rounds === 0 ? (
              <p className="text-xs" style={{ color: '#9A9DB0' }}>No rounds logged yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Rounds" value={`${stats.rounds}`} sub={`${stats.fullRounds} full`} />
                  <Stat label="Avg score" value={stats.avgToPar != null ? fmtToPar(stats.avgToPar) : '—'} sub="to par" />
                  <Stat
                    label="Best"
                    value={stats.bestRound ? fmtToPar(stats.bestRound.toPar) : '—'}
                    sub={stats.bestRound?.course ?? ''}
                  />
                  <Stat label="GIR" value={stats.girPct != null ? `${stats.girPct}%` : '—'} />
                  <Stat label="FIR" value={stats.firPct != null ? `${stats.firPct}%` : '—'} />
                  <Stat label="Putts/rd" value={stats.puttsPerRound != null ? `${stats.puttsPerRound}` : '—'} />
                </div>
                <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>
                  Up &amp; down {stats.upDownPct != null ? `${stats.upDownPct}%` : '—'} · Last round {fmtDate(stats.lastRoundDate)}
                </p>

                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #2E3247' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>
                      Strokes Gained
                    </span>
                    {stats.sg && (
                      <span className="text-xs" style={{ color: '#4A4D60' }}>
                        avg / round · {stats.sg.rounds} full {stats.sg.rounds === 1 ? 'round' : 'rounds'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>
                    Handicap {stats.handicap != null ? stats.handicap : '—'}
                    {' · '}measured at <span style={{ color: '#F0F0F0' }}>{stats.skillLevel ?? '—'}</span>
                    {stats.skillLevelSource ? ` (${stats.skillLevelSource})` : ''}
                  </p>
                  {stats.sg ? (
                    <div className="grid grid-cols-5 gap-1.5">
                      <SGStat label="Total" value={stats.sg.total} />
                      <SGStat label="Tee" value={stats.sg.offTee} />
                      <SGStat label="App" value={stats.sg.approach} />
                      <SGStat label="Short" value={stats.sg.aroundGreen} />
                      <SGStat label="Putt" value={stats.sg.putting} />
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: '#4A4D60' }}>
                      No Strokes Gained yet — needs a full-tracking round.
                    </p>
                  )}
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  )
}

function SGStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-1.5 rounded-lg text-center" style={{ backgroundColor: '#22263A' }}>
      <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(value) }}>{fmtSG(value)}</p>
      <p className="text-xs" style={{ color: '#9A9DB0' }}>{label}</p>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#22263A' }}>
      <p className="text-base font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{value}</p>
      <p className="text-xs" style={{ color: '#9A9DB0' }}>{label}</p>
      {sub ? <p className="text-xs truncate" style={{ color: '#4A4D60' }}>{sub}</p> : null}
    </div>
  )
}
