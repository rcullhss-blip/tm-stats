'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_LABEL, LEVEL_LABEL, better, scoreTest, testByKey, testProgress } from '@/lib/practice-tests'
import { fmtScore, guideFor } from './practice-ui'
import { tapHaptic } from '@/lib/haptics'

interface Result { id: string; score: number; detail: number[][] | null; taken_on: string; notes: string | null; created_at: string }

const today = () => new Date().toISOString().slice(0, 10)

export default function TestClient({ testKey, userId, initial, handicap }: { testKey: string; userId: string; initial: Result[]; handicap: number | null }) {
  const test = testByKey(testKey)!
  const [results, setResults] = useState<Result[]>(initial)
  const [showSetup, setShowSetup] = useState(initial.length === 0)
  const [entering, setEntering] = useState(false)
  // One entry per station: a count, or one distance per ball
  const blank = () => test.stations.map(st => (st.kind === 'count' ? [0] : Array.from({ length: st.of }, () => NaN)))
  const [values, setValues] = useState<number[][]>(blank)
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<{ text: string; good: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const progress = useMemo(() => testProgress(test, results), [test, results])
  const guide = guideFor(test, handicap)
  const chart = results.map((r, i) => ({ n: i + 1, label: new Date(r.taken_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), score: Number(r.score) }))

  function setCount(i: number, v: number) {
    const st = test.stations[i]
    setValues(vs => vs.map((x, j) => (j === i ? [Math.max(0, Math.min(st.of, v))] : x)))
    tapHaptic()
  }
  function setFeet(i: number, b: number, raw: string) {
    const v = raw === '' ? NaN : Number(raw)
    setValues(vs => vs.map((x, j) => (j === i ? x.map((y, k) => (k === b ? v : y)) : x)))
  }

  async function save() {
    setError(null)
    const checked = scoreTest(test, values)
    if ('error' in checked) { setError(checked.error); return }
    setBusy(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: e } = await (supabase as any).from('practice_test_results')
        .insert({ user_id: userId, test_key: test.key, score: checked.score, detail: checked.detail, taken_on: date, notes: notes.trim() || null })
        .select('id, score, detail, taken_on, notes, created_at').single()
      if (e || !data) throw new Error('Could not save. Check your signal and try again.')
      const before = testProgress(test, results)
      const next = [...results, data as Result].sort((a, b) => (a.taken_on + a.created_at).localeCompare(b.taken_on + b.created_at))
      setResults(next)
      // How did it go?
      const s = checked.score
      let text: string
      let good = true
      if (before.best === null) text = `First score: ${fmtScore(test, s)} ${test.unit}. Now beat it next time.`
      else if (better(test, s, before.best)) text = `New personal best! ${fmtScore(test, s)} ${test.unit}, beating ${fmtScore(test, before.best)}.`
      else if (before.last !== null && better(test, s, before.last)) text = `Better than last time (${fmtScore(test, before.last)}). Best is still ${fmtScore(test, before.best)}.`
      else if (before.last !== null && s === before.last) text = `Same as last time. Best is ${fmtScore(test, before.best)}.`
      else { text = `${fmtScore(test, s)} ${test.unit}. Last time was ${fmtScore(test, before.last)}, best ${fmtScore(test, before.best)}. Next time.`; good = false }
      setVerdict({ text, good })
      tapHaptic(true)
      setEntering(false)
      setValues(blank())
      setNotes('')
      setDate(today())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('practice_test_results').delete().eq('id', id)
    setResults(rs => rs.filter(r => r.id !== id))
    setConfirmDelete(null)
  }

  const liveScore = (() => { const c = scoreTest(test, values); return 'error' in c ? null : c.score })()
  const field = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '48px' } as const

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Link href="/practice" className="text-sm mb-4 inline-block" style={{ color: '#9A9DB0' }}>← Practice</Link>
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#CC2222' }}>{CATEGORY_LABEL[test.category]} test</p>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{test.name}</h1>
      <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>{test.short}</p>

      {verdict && (
        <div className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: verdict.good ? '#22C55E15' : '#22263A', border: `1px solid ${verdict.good ? '#22C55E40' : '#2E3247'}` }}>
          <p className="text-sm" style={{ color: verdict.good ? '#22C55E' : '#F0F0F0' }}>{verdict.text}</p>
        </div>
      )}

      {/* Headline numbers */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { l: 'Best', v: fmtScore(test, progress.best) },
          { l: 'Last 5 average', v: fmtScore(test, progress.avgLast5) },
          { l: 'Times taken', v: String(progress.taken) },
        ].map(x => (
          <div key={x.l} className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{x.v}</p>
            <p className="text-xs" style={{ color: '#9A9DB0' }}>{x.l}</p>
          </div>
        ))}
      </div>
      {progress.taken > 0 && (
        <p className="text-xs mb-4" style={{ color: '#9A9DB0' }}>
          {progress.level ? `Your last 5 play like a ${LEVEL_LABEL[progress.level]}. ` : ''}
          Guide for a {guide.label}: {fmtScore(test, guide.value)} {test.unit}.
          {progress.change !== null ? ` ${progress.change > 0 ? `Up ${Math.abs(progress.change)}` : progress.change < 0 ? `Down ${Math.abs(progress.change)}` : 'Level'} on your first 5 goes.` : ''}
        </p>
      )}

      {/* Graph */}
      {chart.length >= 2 && (
        <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>Every go{test.higherIsBetter ? '' : ' (lower is better)'}</p>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#22263A" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#9A9DB0', fontSize: 10 }} tickLine={false} axisLine={false} reversed={!test.higherIsBetter} domain={test.max ? [0, test.max] : ['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', borderRadius: 8, color: '#F0F0F0' }} />
                <ReferenceLine y={guide.value} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: guide.label, fill: '#F59E0B', fontSize: 10, position: 'insideTopRight' }} />
                {progress.best !== null && <ReferenceLine y={progress.best} stroke="#22C55E" strokeDasharray="2 4" label={{ value: 'best', fill: '#22C55E', fontSize: 10, position: 'insideBottomRight' }} />}
                <Line type="monotone" dataKey="score" stroke="#CC2222" strokeWidth={2} dot={{ r: 3, fill: '#CC2222' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* How to set it up */}
      <button type="button" onClick={() => setShowSetup(v => !v)} className="text-sm mb-2" style={{ color: '#CC2222', minHeight: '44px' }}>{showSetup ? 'Hide how to set it up' : 'How to set it up'}</button>
      {showSetup && (
        <ol className="mb-4 p-4 rounded-xl space-y-2 text-sm list-decimal list-inside" style={{ backgroundColor: '#1A1D27', color: '#F0F0F0' }}>
          {test.setup.map(s => <li key={s}>{s}</li>)}
        </ol>
      )}

      {/* Enter a go */}
      {!entering ? (
        <button type="button" onClick={() => { setEntering(true); setVerdict(null) }} className="w-full rounded-xl font-semibold text-base mb-6" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}>
          {progress.taken === 0 ? 'Enter my first score' : 'Enter a new score'}
        </button>
      ) : (
        <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
          {test.stations.map((st, i) => (
            <div key={st.label} className="py-3" style={{ borderTop: i > 0 ? '1px solid #22263A' : 'none' }}>
              <p className="text-sm mb-2" style={{ color: '#F0F0F0' }}>{st.label}{st.kind === 'count' ? <span style={{ color: '#9A9DB0' }}> (out of {st.of})</span> : <span style={{ color: '#9A9DB0' }}> (feet from the hole, each ball)</span>}</p>
              {st.kind === 'count' ? (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setCount(i, values[i][0] - 1)} className="rounded-xl text-xl font-bold" style={{ backgroundColor: '#22263A', color: '#F0F0F0', width: '52px', height: '52px' }} aria-label={`One fewer, ${st.label}`}>−</button>
                  <span className="text-2xl font-bold w-12 text-center" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{values[i][0]}</span>
                  <button type="button" onClick={() => setCount(i, values[i][0] + 1)} className="rounded-xl text-xl font-bold" style={{ backgroundColor: '#22263A', color: '#F0F0F0', width: '52px', height: '52px' }} aria-label={`One more, ${st.label}`}>+</button>
                  <button type="button" onClick={() => setCount(i, st.of)} className="text-xs ml-auto" style={{ color: '#9A9DB0', minHeight: '44px' }}>All {st.of}</button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {values[i].map((v, b) => (
                    <input key={b} inputMode="decimal" value={Number.isNaN(v) ? '' : String(v)} onChange={e => setFeet(i, b, e.target.value.replace(/[^0-9.]/g, ''))} placeholder={`Ball ${b + 1}`} className="px-3 rounded-lg text-base text-center" style={{ ...field, fontFamily: 'var(--font-dm-mono)' }} aria-label={`${st.label}, ball ${b + 1}, feet`} />
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3 mt-2 mb-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Date</label>
              <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value || today())} className="w-full px-3 rounded-lg text-sm" style={field} />
            </div>
            <div className="text-right self-end">
              <p className="text-xs" style={{ color: '#9A9DB0' }}>Score</p>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{liveScore === null ? '–' : fmtScore(test, liveScore)}</p>
            </div>
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value.slice(0, 200))} placeholder="Notes (optional): wind, green speed, what you felt" className="w-full px-3 rounded-lg text-sm mb-3" style={field} />
          {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => { setEntering(false); setError(null) }} disabled={busy} className="rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}>Cancel</button>
            <button type="button" onClick={save} disabled={busy || liveScore === null} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px', opacity: busy || liveScore === null ? 0.5 : 1 }}>{busy ? 'Saving…' : 'Save score'}</button>
          </div>
        </div>
      )}

      {/* History */}
      {results.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9A9DB0' }}>History</p>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27' }}>
            {[...results].reverse().map((r, i) => (
              <div key={r.id} className="px-4 py-3" style={{ borderTop: i > 0 ? '1px solid #22263A' : 'none' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#9A9DB0' }}>{new Date(r.taken_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                  <span className="flex items-center gap-3">
                    {Number(r.score) === progress.best && <span className="text-xs" style={{ color: '#22C55E' }}>best</span>}
                    <span className="text-base font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{fmtScore(test, Number(r.score))}</span>
                    {confirmDelete === r.id ? (
                      <button type="button" onClick={() => remove(r.id)} className="text-xs" style={{ color: '#EF4444', minHeight: '40px' }}>Delete?</button>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(r.id)} className="text-xs" style={{ color: '#4A4D60', minHeight: '40px' }} aria-label="Delete this score">✕</button>
                    )}
                  </span>
                </div>
                {r.detail && <p className="text-xs" style={{ color: '#4A4D60' }}>{test.stations.map((st, k) => `${st.label}: ${(r.detail?.[k] ?? []).join(', ')}`).join(' · ')}</p>}
                {r.notes && <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>{r.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
