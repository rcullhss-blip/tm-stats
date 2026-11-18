'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Par } from '@/lib/qualifying'

export interface KnownCourse { name: string; holes: 9 | 18; pars: Par[] }

interface Props {
  teamName: string
  players: { id: string; name: string }[]
  knownCourses: KnownCourse[]
}

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const inputStyle = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '48px' } as const

export default function NewQualifierForm({ teamName, players, knownCourses }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [courseName, setCourseName] = useState('')
  const [holes, setHoles] = useState<9 | 18>(18)
  const [pars, setPars] = useState<Par[]>(Array.from({ length: 18 }, () => 4 as Par))
  const [roundCount, setRoundCount] = useState(1)
  const [dates, setDates] = useState<string[]>([today()])
  const [picked, setPicked] = useState<Set<string>>(new Set(players.map(p => p.id)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function changeHoles(n: 9 | 18) {
    setHoles(n)
    setPars(prev => Array.from({ length: n }, (_, i) => prev[i] ?? 4))
  }
  function changeRounds(n: number) {
    setRoundCount(n)
    setDates(prev => Array.from({ length: n }, (_, i) => prev[i] ?? addDays(prev[prev.length - 1] ?? today(), i - prev.length + 1)))
  }
  function cyclePar(i: number) {
    setPars(prev => prev.map((p, idx) => (idx === i ? ((p === 3 ? 4 : p === 4 ? 5 : 3) as Par) : p)))
  }
  function pickCourse(c: KnownCourse) {
    setCourseName(c.name)
    setHoles(c.holes)
    setPars(c.pars.slice(0, c.holes))
  }
  function togglePlayer(id: string) {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function create() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/qualifying', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, courseName, holes, pars, roundCount, dates, playerIds: [...picked] }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not set up the qualifier')
      router.push(`/qualifying/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not set up the qualifier')
      setSaving(false)
    }
  }

  const parTotal = pars.reduce((s, p) => s + p, 0)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Link href="/qualifying" className="text-sm mb-4 inline-block" style={{ color: '#9A9DB0' }}>← Qualifying</Link>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>New qualifier</h1>
      <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>{teamName}</p>

      {players.length === 0 ? (
        <div className="p-5 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Add your players first</p>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>Qualifying needs players on your team. Share your join code from the Coach page, then come back.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Spring qualifying" maxLength={80} className="w-full px-3 rounded-xl text-sm" style={inputStyle} />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>Course</label>
            <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" maxLength={120} className="w-full px-3 rounded-xl text-sm" style={inputStyle} />
            {knownCourses.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {knownCourses.map(c => (
                  <button key={`${c.name}:${c.holes}`} type="button" onClick={() => pickCourse(c)} className="px-3 rounded-lg text-xs" style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '36px' }}>
                    {c.name}{c.holes === 9 ? ' (9)' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>Holes</label>
              <div className="grid grid-cols-2 gap-2">
                {([18, 9] as const).map(n => (
                  <button key={n} type="button" onClick={() => changeHoles(n)} className="rounded-xl font-semibold" style={{ backgroundColor: holes === n ? '#CC2222' : '#1A1D27', color: holes === n ? '#F0F0F0' : '#9A9DB0', border: `1px solid ${holes === n ? '#CC2222' : '#2E3247'}`, minHeight: '48px', fontFamily: 'var(--font-dm-mono)' }}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>Rounds</label>
              <select value={roundCount} onChange={e => changeRounds(Number(e.target.value))} className="w-full px-3 rounded-xl text-sm" style={inputStyle}>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: '#9A9DB0' }}>{roundCount > 1 ? 'Dates' : 'Date'}</label>
            <div className="space-y-2">
              {dates.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  {roundCount > 1 && <span className="text-xs w-16" style={{ color: '#9A9DB0' }}>Round {i + 1}</span>}
                  <input type="date" value={d} onChange={e => setDates(prev => prev.map((x, idx) => (idx === i ? e.target.value : x)))} className="flex-1 px-3 rounded-xl text-sm" style={inputStyle} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: '#9A9DB0' }}>Pars</label>
              <span className="text-xs" style={{ color: '#9A9DB0' }}>Tap a hole to change · par <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{parTotal}</span></span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {pars.map((p, i) => (
                <button key={i} type="button" onClick={() => cyclePar(i)} className="rounded-xl flex flex-col items-center justify-center" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', minHeight: '56px' }}>
                  <span className="leading-none mb-1" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60', fontSize: '10px' }}>H{i + 1}</span>
                  <span className="text-lg font-medium leading-none" style={{ fontFamily: 'var(--font-dm-mono)', color: p === 4 ? '#F0F0F0' : '#CC2222' }}>{p}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: '#9A9DB0' }}>Players ({picked.size})</label>
              <button type="button" onClick={() => setPicked(picked.size === players.length ? new Set() : new Set(players.map(p => p.id)))} className="text-xs" style={{ color: '#9A9DB0', minHeight: '32px' }}>
                {picked.size === players.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-2">
              {players.map(p => {
                const on = picked.has(p.id)
                return (
                  <button key={p.id} type="button" onClick={() => togglePlayer(p.id)} className="w-full flex items-center justify-between px-4 rounded-xl text-sm" style={{ backgroundColor: on ? '#CC222215' : '#1A1D27', color: on ? '#F0F0F0' : '#9A9DB0', border: `1px solid ${on ? '#CC222260' : '#2E3247'}`, minHeight: '48px' }}>
                    <span>{p.name}</span>
                    <span style={{ color: on ? '#CC2222' : '#4A4D60' }}>{on ? 'Playing' : 'Not playing'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}

          <button type="button" onClick={create} disabled={saving} className="w-full rounded-xl font-semibold text-base" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Setting up…' : 'Start qualifying →'}
          </button>
        </div>
      )}
    </div>
  )
}
