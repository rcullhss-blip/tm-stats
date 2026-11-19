'use client'

import { useState } from 'react'
import { MAX_GROUP_SIZE, type TeeGroup } from '@/lib/qualifying'

interface Player { id: string; name: string }

function addMinutes(tee: string, mins: number): string {
  const [h, m] = tee.split(':').map(Number)
  const t = (h * 60 + m + mins) % (24 * 60)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Coach: put players into groups with tee times. Optional. */
export default function GroupsEditor({ qualifierId, roundNo, roundsLeft, players, initial, onDone }: {
  qualifierId: string
  roundNo: number
  roundsLeft: number
  players: Player[]
  initial: TeeGroup[]
  onDone: (saved: boolean) => void
}) {
  const [groups, setGroups] = useState<TeeGroup[]>(initial.length > 0 ? initial.map(g => ({ ...g, players: [...g.players] })) : [{ tee: '08:00', players: [] }])
  const [allRounds, setAllRounds] = useState(roundsLeft > 1)
  const [firstTee, setFirstTee] = useState(initial[0]?.tee ?? '08:00')
  const [gap, setGap] = useState(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const placed = new Set(groups.flatMap(g => g.players))
  const free = players.filter(p => !placed.has(p.id))
  const nameOf = (id: string) => players.find(p => p.id === id)?.name ?? 'Player'

  function update(i: number, g: TeeGroup) { setGroups(gs => gs.map((x, j) => (j === i ? g : x))) }

  function auto(size: number) {
    const out: TeeGroup[] = []
    for (let i = 0; i < players.length; i += size) out.push({ tee: addMinutes(firstTee, gap * out.length), players: players.slice(i, i + size).map(p => p.id) })
    // Do not leave someone on their own at the end
    if (out.length > 1 && out[out.length - 1].players.length === 1 && out[out.length - 2].players.length < MAX_GROUP_SIZE) {
      out[out.length - 2].players.push(...out.pop()!.players)
    }
    setGroups(out)
  }

  async function save(clear = false) {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/qualifying/${qualifierId}/groups`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNo, allRounds, groups: clear ? [] : groups }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save the groups')
      onDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the groups')
      setBusy(false)
    }
  }

  const input = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '44px' }

  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
      <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>Quick start: first tee, minutes between groups, then a group size. Players go in leaderboard order; change anything after.</p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input type="time" value={firstTee} onChange={e => setFirstTee(e.target.value || '08:00')} className="px-2 rounded-lg text-sm" style={{ ...input, width: '100px' }} aria-label="First tee time" />
        <select value={gap} onChange={e => setGap(Number(e.target.value))} className="px-2 rounded-lg text-sm" style={input} aria-label="Minutes between groups">
          {[8, 9, 10, 11, 12, 15].map(m => <option key={m} value={m}>{m} min</option>)}
        </select>
        {[2, 3, 4].map(n => (
          <button key={n} type="button" onClick={() => auto(n)} className="px-3 rounded-lg text-sm" style={{ ...input, backgroundColor: '#0F1117' }}>Groups of {n}</button>
        ))}
      </div>

      {groups.map((g, i) => (
        <div key={i} className="py-3" style={{ borderTop: '1px solid #22263A' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Group {i + 1}</span>
            <input type="time" value={g.tee ?? ''} onChange={e => update(i, { ...g, tee: e.target.value || null })} className="px-2 rounded-lg text-sm" style={{ ...input, width: '100px' }} aria-label={`Tee time for group ${i + 1}`} />
            <button type="button" onClick={() => setGroups(gs => gs.filter((_, j) => j !== i))} className="text-xs ml-auto" style={{ color: '#4A4D60', minHeight: '44px' }}>Remove group</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {g.players.map(id => (
              <button key={id} type="button" onClick={() => update(i, { ...g, players: g.players.filter(x => x !== id) })} className="px-3 rounded-lg text-sm" style={{ backgroundColor: '#CC222220', color: '#F0F0F0', border: '1px solid #CC222260', minHeight: '40px' }} aria-label={`Take ${nameOf(id)} out of group ${i + 1}`}>
                {nameOf(id)} ×
              </button>
            ))}
            {free.length > 0 && g.players.length < MAX_GROUP_SIZE && (
              <select value="" onChange={e => { if (e.target.value) update(i, { ...g, players: [...g.players, e.target.value] }) }} className="px-2 rounded-lg text-sm" style={input} aria-label={`Add a player to group ${i + 1}`}>
                <option value="">+ Add player</option>
                {free.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setGroups(gs => [...gs, { tee: gs.length > 0 && gs[gs.length - 1].tee ? addMinutes(gs[gs.length - 1].tee!, gap) : null, players: [] }])} className="text-sm mb-3" style={{ color: '#CC2222', minHeight: '44px' }}>+ Add a group</button>

      {free.length > 0 && <p className="text-xs mb-3" style={{ color: '#F59E0B' }}>Not in a group yet: {free.map(p => p.name).join(', ')}. They pick who they mark for themselves.</p>}

      {roundsLeft > 1 && (
        <label className="flex items-center gap-2 text-sm mb-3" style={{ color: '#9A9DB0', minHeight: '44px' }}>
          <input type="checkbox" checked={allRounds} onChange={e => setAllRounds(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#CC2222' }} />
          Use these groups for every round left
        </label>
      )}
      {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onDone(false)} disabled={busy} className="rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}>Cancel</button>
        <button type="button" onClick={() => save()} disabled={busy} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px', opacity: busy ? 0.7 : 1 }}>{busy ? 'Saving…' : 'Save groups'}</button>
      </div>
      {initial.length > 0 && <button type="button" onClick={() => save(true)} disabled={busy} className="text-xs mt-2" style={{ color: '#4A4D60', minHeight: '44px' }}>Clear all groups</button>}
    </div>
  )
}
