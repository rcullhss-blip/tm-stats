'use client'

import { useRef, useState } from 'react'

interface Props {
  pars: (3 | 4 | 5)[]
  total: number                 // the round total from the results
  eventName: string
  onDone: (scores: number[], putts: (number | null)[]) => void
}

const field = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none' } as const

/** Shrink a camera photo before upload: phone photos are often 4 MB or more. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('no blob'))), 'image/jpeg', 0.85))
  } catch {
    return file
  }
}

/**
 * The results only had this golfer's total. They add each hole's score, by
 * photo of their scorecard or by typing, and it must add up to the total.
 */
export default function HoleScoresStep({ pars, total, eventName, onDone }: Props) {
  const [scores, setScores] = useState<string[]>(pars.map(() => ''))
  const [putts, setPutts] = useState<(number | null)[]>(pars.map(() => null))
  const [reading, setReading] = useState(false)
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const nums = scores.map(s => (/^\d{1,2}$/.test(s) && Number(s) >= 1 && Number(s) <= 15 ? Number(s) : null))
  const filled = nums.filter(n => n !== null).length
  const sum = nums.reduce<number>((a, n) => a + (n ?? 0), 0)
  const complete = filled === pars.length
  const parTotal = pars.reduce<number>((a, p) => a + p, 0)

  async function read(file: File) {
    setReading(true); setNote(null)
    try {
      const form = new FormData()
      form.append('photo', await shrink(file), 'scorecard.jpg')
      form.append('holes', String(pars.length))
      const res = await fetch('/api/scorecard/read', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'The photo could not be read')
      setScores((data.scores as (number | null)[]).map(n => (n ? String(n) : '')))
      setPutts(data.putts as (number | null)[])
      const read = (data.scores as (number | null)[]).filter(Boolean).length
      const msgs = [`Read ${read} of ${pars.length} holes. Check each one against your card.`]
      if (data.notes) msgs.push(data.notes)
      setNote({ text: msgs.join(' '), ok: read === pars.length })
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : 'The photo could not be read', ok: false })
    } finally {
      setReading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function setHole(i: number, v: string) {
    const clean = v.replace(/\D/g, '').slice(0, 2)
    setScores(prev => prev.map((s, idx) => (idx === i ? clean : s)))
    // A single digit from 2 to 9 is a whole score: move to the next box
    if (/^[2-9]$/.test(clean) && i < pars.length - 1) inputs.current[i + 1]?.focus()
  }

  const toParTotal = sum - parTotal

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>Your hole scores</p>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{eventName}</h1>
      <p className="text-sm mb-5" style={{ color: '#9A9DB0' }}>
        The result has your total, <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{total}</span>. Add each hole from your scorecard and it will check they add up.
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) read(f) }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={reading} className="w-full rounded-xl font-semibold text-base mb-2" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px', opacity: reading ? 0.7 : 1 }}>
        {reading ? 'Reading your card…' : 'Snap your scorecard'}
      </button>
      <p className="text-xs mb-5" style={{ color: '#4A4D60' }}>Lay the card flat in good light with your row in shot. Or type the scores below.</p>

      {note && (
        <div className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: note.ok ? '#22C55E15' : '#F59E0B15', border: `1px solid ${note.ok ? '#22C55E40' : '#F59E0B40'}` }}>
          <p className="text-sm" style={{ color: note.ok ? '#22C55E' : '#F59E0B', lineHeight: 1.5 }}>{note.text}</p>
        </div>
      )}

      {[0, 9].filter(start => start < pars.length).map(start => (
        <div key={start} className="mb-4">
          <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>{start === 0 ? (pars.length === 9 ? 'Holes' : 'Front nine') : 'Back nine'}</p>
          <div className="grid grid-cols-9 gap-1">
            {pars.slice(start, start + 9).map((par, k) => {
              const i = start + k
              const n = nums[i]
              const color = n === null ? '#F0F0F0' : n < par ? '#22C55E' : n === par ? '#F0F0F0' : n - par >= 2 ? '#EF4444' : '#9A9DB0'
              return (
                <label key={i} className="flex flex-col items-center">
                  <span className="leading-none mb-1" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60', fontSize: '10px' }}>{i + 1}</span>
                  <input
                    ref={el => { inputs.current[i] = el }}
                    value={scores[i]}
                    onChange={e => setHole(i, e.target.value)}
                    inputMode="numeric"
                    aria-label={`Hole ${i + 1} score, par ${par}`}
                    className="w-full text-center rounded-lg text-lg"
                    style={{ ...field, fontFamily: 'var(--font-dm-mono)', color, minHeight: '48px', borderColor: scores[i] && n === null ? '#EF4444' : '#2E3247' }}
                  />
                  <span className="leading-none mt-1" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60', fontSize: '10px' }}>P{par}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between p-4 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
        <div>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>{filled} of {pars.length} holes</p>
          {complete && sum !== total && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Adds up to {sum}, but the result says {total}. Check against your card.</p>}
          {complete && sum === total && <p className="text-xs mt-1" style={{ color: '#22C55E' }}>Adds up to your total</p>}
        </div>
        <p className="text-2xl font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: complete && sum !== total ? '#EF4444' : '#F0F0F0' }}>
          {sum || '–'} <span className="text-xs" style={{ color: '#9A9DB0' }}>{filled > 0 && complete ? (toParTotal === 0 ? 'E' : toParTotal > 0 ? `+${toParTotal}` : toParTotal) : ''}</span>
        </p>
      </div>

      <button type="button" disabled={!complete || sum !== total} onClick={() => onDone(nums as number[], putts)} className="w-full rounded-xl font-semibold text-base" style={{ backgroundColor: complete && sum === total ? '#CC2222' : '#22263A', color: '#F0F0F0', minHeight: '56px', opacity: complete && sum === total ? 1 : 0.6 }}>
        Next: add your stats →
      </button>
      <p className="text-xs mt-3" style={{ color: '#4A4D60' }}>If your card really does not match the result, ask your coach to check the result.</p>
    </div>
  )
}
