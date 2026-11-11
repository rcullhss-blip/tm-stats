'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PatternBucket, PatternGroup } from '@/lib/shot-patterns'

/**
 * Elite: every distance band, drilled down. Strokes Gained per round and per
 * shot, the trend, which way the misses go and a plot of where shots finished.
 */

interface Props {
  access: 'elite' | 'pro' | 'free'
  buckets: PatternBucket[]
  rounds: number
}

const GROUPS: { key: PatternGroup; label: string }[] = [
  { key: 'drive', label: 'Driving' },
  { key: 'approach', label: 'Approach' },
  { key: 'chip', label: 'Short game' },
  { key: 'putt', label: 'Putting' },
]

function fmtSG(n: number, dp = 1): string {
  const z = dp === 1 ? 0.05 : 0.005
  if (Math.abs(n) < z) return dp === 1 ? '0.0' : '0.00'
  return n > 0 ? `+${n.toFixed(dp)}` : n.toFixed(dp)
}
const sgColor = (n: number) => (n >= 0 ? '#22C55E' : '#EF4444')

// perRound is newest first. Recent half against the earlier half.
function trendOf(perRound: number[]): { text: string; color: string } | null {
  if (perRound.length < 4) return null
  const half = Math.floor(perRound.length / 2)
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
  const t = mean(perRound.slice(0, half)) - mean(perRound.slice(half))
  const amount = `${Math.abs(t).toFixed(1)} a round`
  if (t >= 0.3) return { text: `Improving, up ${amount}`, color: '#22C55E' }
  if (t <= -0.3) return { text: `Slipping, down ${amount}`, color: '#F59E0B' }
  return { text: 'Steady', color: '#9A9DB0' }
}

function describeAverage(b: PatternBucket): string | null {
  if (b.points.length < 3) return null
  const u = b.unit === 'ft' ? 'ft' : 'y'
  const parts: string[] = []
  if (Math.abs(b.avgY) >= 0.5) parts.push(`${Math.abs(b.avgY).toFixed(0)}${u} ${b.avgY < 0 ? 'short' : 'long'}`)
  if (Math.abs(b.avgX) >= 0.5) parts.push(`${Math.abs(b.avgX).toFixed(0)}${u} ${b.avgX < 0 ? 'left' : 'right'}`)
  return parts.length > 0 ? `Average finish: ${parts.join(', ')}` : 'Average finish: on the target'
}

function Plot({ b }: { b: PatternBucket }) {
  const size = 240
  const c = size / 2
  const farthest = Math.max(...b.points.map(p => Math.hypot(p.x, p.y)), 1)
  // Round the outer ring up to a tidy number
  const steps = b.unit === 'ft' ? [3, 6, 10, 15, 20, 30, 45, 60] : [5, 10, 15, 20, 30, 40, 60, 80, 120]
  const outer = steps.find(s => s >= farthest) ?? Math.ceil(farthest / 10) * 10
  const scale = (c - 22) / outer
  const px = (x: number) => c + x * scale
  const py = (y: number) => c - y * scale

  // One standard deviation each way: roughly two thirds of shots
  const sd = (vals: number[], mean: number) => Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(vals.length, 1))
  const sdX = sd(b.points.map(p => p.x), b.avgX)
  const sdY = sd(b.points.map(p => p.y), b.avgY)
  const showSpread = b.points.length >= 5

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: '280px', display: 'block', margin: '0 auto' }} role="img" aria-label={`Where ${b.label} finished around the target`}>
      {[1, 2 / 3, 1 / 3].map(f => (
        <circle key={f} cx={c} cy={c} r={outer * f * scale} fill="none" stroke="#2E3247" strokeWidth="1" />
      ))}
      <line x1={c} y1={8} x2={c} y2={size - 8} stroke="#2E3247" strokeWidth="1" />
      <line x1={8} y1={c} x2={size - 8} y2={c} stroke="#2E3247" strokeWidth="1" />
      <text x={c} y={12} textAnchor="middle" fontSize="9" fill="#9A9DB0">LONG</text>
      <text x={c} y={size - 4} textAnchor="middle" fontSize="9" fill="#9A9DB0">SHORT</text>
      <text x={6} y={c - 4} fontSize="9" fill="#9A9DB0">L</text>
      <text x={size - 6} y={c - 4} textAnchor="end" fontSize="9" fill="#9A9DB0">R</text>
      <text x={c + 4} y={c - outer * scale + 11} fontSize="9" fill="#4A4D60" style={{ fontFamily: 'var(--font-dm-mono)' }}>{outer}{b.unit}</text>

      {showSpread && (
        <ellipse cx={px(b.avgX)} cy={py(b.avgY)} rx={Math.max(sdX * scale, 4)} ry={Math.max(sdY * scale, 4)} fill="#F0F0F010" stroke="#9A9DB0" strokeWidth="1" strokeDasharray="3 3" />
      )}

      {b.points.map((p, i) => {
        // Each tap covers a 45 degree slice. Fan the dots out inside their slice
        // (same slice, same distance from the target) so they do not stack.
        const a = (((i * 37) % 21) - 10) * (Math.PI / 180) * 1.6
        const x = p.x * Math.cos(a) - p.y * Math.sin(a)
        const y = p.x * Math.sin(a) + p.y * Math.cos(a)
        return <circle key={i} cx={px(x)} cy={py(y)} r="4" fill={p.sg >= 0 ? '#22C55E' : '#EF4444'} fillOpacity="0.75" />
      })}

      {/* The target */}
      <circle cx={c} cy={c} r="3" fill="#F0F0F0" />
      {/* Average finish */}
      {b.points.length >= 3 && (
        <>
          <circle cx={px(b.avgX)} cy={py(b.avgY)} r="6" fill="none" stroke="#F0F0F0" strokeWidth="2" />
          <circle cx={px(b.avgX)} cy={py(b.avgY)} r="1.5" fill="#F0F0F0" />
        </>
      )}
    </svg>
  )
}

function MissBar({ a, b, mid, labels }: { a: number; b: number; mid: number; labels: [string, string, string] }) {
  const total = a + b + mid
  if (total === 0) return null
  const pct = (n: number) => Math.round((n / total) * 100)
  return (
    <div className="mb-2">
      <div className="flex rounded-full overflow-hidden" style={{ height: '8px', backgroundColor: '#22263A' }}>
        <div style={{ width: `${pct(a)}%`, backgroundColor: '#F59E0B' }} />
        <div style={{ width: `${pct(mid)}%`, backgroundColor: '#22C55E' }} />
        <div style={{ width: `${pct(b)}%`, backgroundColor: '#F59E0B' }} />
      </div>
      <div className="flex justify-between mt-1 text-xs" style={{ color: '#9A9DB0' }}>
        <span>{labels[0]} <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{pct(a)}%</span></span>
        <span>{labels[1]} <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{pct(mid)}%</span></span>
        <span>{labels[2]} <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{pct(b)}%</span></span>
      </div>
    </div>
  )
}

export default function ShotPatterns({ access, buckets, rounds }: Props) {
  const firstGroup = GROUPS.find(g => buckets.some(b => b.group === g.key))?.key ?? 'approach'
  const [group, setGroup] = useState<PatternGroup>(firstGroup)
  const inGroup = buckets.filter(b => b.group === group)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const open = inGroup.find(b => b.key === openKey) ?? null

  // Free accounts already see the Pro teaser above; one upsell is enough
  if (access === 'free') return null

  if (access !== 'elite') {
    return (
      <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222240' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>Shot patterns · Elite</p>
        <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>
          Which way do you miss, and from where?
        </p>
        <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
          Elite adds one tap per shot for where it finished. You get a plot of your misses for every distance, short or long and left or right, and coaching built on the pattern.
        </p>
        <Link href="/upgrade?tier=elite" className="inline-block px-4 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
          See Elite
        </Link>
      </div>
    )
  }

  if (buckets.length === 0) {
    return (
      <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>Shot patterns</p>
        <p className="text-sm" style={{ color: '#F0F0F0' }}>Log a full tracking round and tap where each shot finished. Your patterns build from there.</p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>Shot patterns</h2>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}>
          {rounds} round{rounds !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Part of the game */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {GROUPS.map(g => {
          const has = buckets.some(b => b.group === g.key)
          const selected = group === g.key
          return (
            <button
              key={g.key}
              type="button"
              disabled={!has}
              onClick={() => { setGroup(g.key); setOpenKey(null) }}
              className="px-3 rounded-lg text-sm font-medium whitespace-nowrap shrink-0"
              style={{
                minHeight: '44px',
                backgroundColor: selected ? '#CC2222' : '#1A1D27',
                color: selected ? '#F0F0F0' : has ? '#9A9DB0' : '#4A4D60',
                border: `1px solid ${selected ? '#CC2222' : '#2E3247'}`,
              }}
            >
              {g.label}
            </button>
          )
        })}
      </div>

      {/* Bands */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27' }}>
        {inGroup.map((b, i) => {
          const isOpen = open?.key === b.key
          const trend = trendOf(b.perRound)
          const avg = describeAverage(b)
          return (
            <div key={b.key} style={{ borderTop: i > 0 ? '1px solid #2E3247' : 'none' }}>
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : b.key)}
                className="w-full flex items-center justify-between px-4 text-left"
                style={{ minHeight: '56px' }}
                aria-expanded={isOpen}
              >
                <span>
                  <span className="text-sm block" style={{ color: '#F0F0F0' }}>{b.label}</span>
                  <span className="text-xs" style={{ color: '#9A9DB0' }}>
                    <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{b.shots}</span> shots
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-right">
                    <span className="text-sm font-medium block" style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(b.sgPerRound) }}>{fmtSG(b.sgPerRound)}</span>
                    <span className="text-xs" style={{ color: '#9A9DB0' }}>per round</span>
                  </span>
                  <span style={{ color: '#9A9DB0' }}>{isOpen ? '−' : '+'}</span>
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: '#22263A' }}>
                      <p className="text-xs" style={{ color: '#9A9DB0' }}>SG per shot</p>
                      <p className="text-base font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: sgColor(b.sgPerShot) }}>{fmtSG(b.sgPerShot, 2)}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: '#22263A' }}>
                      <p className="text-xs" style={{ color: '#9A9DB0' }}>Trend</p>
                      <p className="text-sm font-medium" style={{ color: trend?.color ?? '#9A9DB0' }}>{trend?.text ?? 'Needs 4 rounds'}</p>
                    </div>
                  </div>

                  {b.tracked === 0 ? (
                    <p className="text-xs" style={{ color: '#9A9DB0' }}>
                      No finishes recorded for this distance yet. Tap where each shot finished when you log a round.
                    </p>
                  ) : (
                    <>
                      <MissBar a={b.left} b={b.right} mid={b.tracked - b.left - b.right} labels={['Left', b.group === 'drive' ? 'On line' : 'On line', 'Right']} />
                      {b.group !== 'drive' && (
                        <MissBar a={b.short} b={b.long} mid={b.tracked - b.short - b.long} labels={['Short', 'Pin high', 'Long']} />
                      )}
                      {b.group !== 'drive' && b.points.length > 0 && (
                        <div className="mt-3">
                          <Plot b={b} />
                          {avg && <p className="text-sm text-center mt-2" style={{ color: '#F0F0F0' }}>{avg}</p>}
                          <p className="text-xs text-center mt-1" style={{ color: '#9A9DB0' }}>
                            Green dots gained shots, red dots lost them. The ring is your average finish
                            {b.points.length >= 5 ? ', the dashed shape is where about two thirds of your shots end up' : ''}.
                          </p>
                        </div>
                      )}
                      <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>
                        Finish recorded on <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{b.tracked}</span> of <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{b.shots}</span> shots.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
