'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { currentRound, fmtToPar, isFinished, rebuildBoard, type BoardRow } from '@/lib/qualifying'
import type { QualifierState } from '@/lib/qualifying-server'

interface Props {
  initial: QualifierState
  userId: string
}

const REFRESH_MS = 15000

function toParColor(n: number | null): string {
  if (n === null) return '#4A4D60'
  if (n < 0) return '#22C55E'
  if (n === 0) return '#F0F0F0'
  return '#9A9DB0'
}

export default function QualifyingClient({ initial, userId }: Props) {
  const router = useRouter()
  const [state, setState] = useState<QualifierState>(initial)
  const [tab, setTab] = useState<'board' | 'score'>('board')
  const [group, setGroup] = useState<string[]>([])
  const [hole, setHole] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Scores typed but not yet confirmed by the server, so a refresh never undoes a tap
  const pending = useRef<Map<string, number | null>>(new Map())

  const q = state.qualifier
  const isCoach = state.role === 'coach'
  const finished = isFinished(q)
  const liveRound = currentRound(q)
  const [roundSel, setRoundSel] = useState<number | null>(null)
  const openRound = roundSel ?? liveRound
  const groupKey = `tmstats_qual_group_${q.id}`

  // The group this phone is marking for, remembered between visits
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(groupKey) ?? '[]') as string[]
      const valid = saved.filter(id => initial.board.some(r => r.userId === id))
      if (valid.length > 0) { setGroup(valid); return }
    } catch {}
    if (initial.board.some(r => r.userId === userId)) setGroup([userId])
  }, [groupKey, initial.board, userId])

  const applyPending = useCallback((s: QualifierState): QualifierState => {
    if (pending.current.size === 0) return s
    const board = s.board.map(row => ({
      ...row,
      rounds: row.rounds.map(r => ({
        ...r,
        scores: r.scores.map((sc, i) => {
          const key = `${row.userId}:${r.roundNo}:${i + 1}`
          return pending.current.has(key) ? pending.current.get(key)! : sc
        }),
      })),
    }))
    // Totals, "thru" and the order all follow the new scores straight away
    return { ...s, board: rebuildBoard(s.qualifier, board) }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/qualifying/${q.id}`, { cache: 'no-store' })
      if (!res.ok) return
      const fresh = (await res.json()) as QualifierState
      setState(applyPending(fresh))
    } catch {}
  }, [q.id, applyPending])

  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, REFRESH_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [refresh])

  // Open score entry on the first hole this group has not finished
  function openScoring() {
    const rows = group.map(id => state.board.find(r => r.userId === id)).filter((r): r is BoardRow => !!r)
    if (rows.length > 0) {
      const first = q.pars.findIndex((_, i) => rows.some(r => r.rounds[openRound - 1].scores[i] === null))
      setHole(first === -1 ? q.holes : first + 1)
    }
    setTab('score')
  }

  function toggleGroup(id: string) {
    setGroup(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      try { localStorage.setItem(groupKey, JSON.stringify(next)) } catch {}
      return next
    })
  }

  async function setScore(playerId: string, holeNo: number, score: number | null) {
    const key = `${playerId}:${openRound}:${holeNo}`
    pending.current.set(key, score)
    setState(s => applyPending(s))
    setMessage(null)
    try {
      const res = await fetch(`/api/qualifying/${q.id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: playerId, roundNo: openRound, hole: holeNo, score }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save that score')
      // Only let go of the tap once the server has this exact value
      if (pending.current.get(key) === score) pending.current.delete(key)
    } catch (e) {
      pending.current.delete(key)
      setMessage({ text: `${e instanceof Error ? e.message : 'Could not save that score'}. Check your signal and tap it again.`, ok: false })
      refresh()
    }
  }

  async function finishRound() {
    setBusy(true); setMessage(null)
    try {
      const res = await fetch(`/api/qualifying/${q.id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNo: openRound }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not finish the round')
      const parts = [`${data.created} player${data.created !== 1 ? 's' : ''} now ${data.created === 1 ? 'has' : 'have'} the round in their account`]
      if (data.emailed > 0) parts.push(`${data.emailed} emailed the link to add stats`)
      if (data.incomplete?.length > 0) parts.push(`Card not complete, so not added yet: ${data.incomplete.join(', ')}. Fill in the missing holes and finish again to add them`)
      setMessage({ text: `${parts.join('. ')}.`, ok: (data.incomplete?.length ?? 0) === 0 })
      setConfirmFinish(false)
      if (roundSel !== null) { setRoundSel(null); setGroup([]); setTab('board') }
      await refresh()
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Could not finish the round', ok: false })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      const res = await fetch(`/api/qualifying/${q.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not remove it')
      router.push('/qualifying')
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Could not remove it', ok: false })
      setBusy(false)
    }
  }

  const par = q.pars[hole - 1]
  const groupRows = group.map(id => state.board.find(r => r.userId === id)).filter((r): r is BoardRow => !!r)
  const roundOf = (row: BoardRow) => row.rounds[openRound - 1]
  const editing = !finished || roundSel !== null
  // Cards from rounds already finished that were not complete at the time, so
  // never reached the player's account. The coach can fill them in and add them.
  const earlierGaps = isCoach
    ? Array.from({ length: q.rounds_finished }, (_, i) => i + 1).flatMap(n =>
        state.board.filter(r => { const rd = r.rounds[n - 1]; return rd && rd.thru > 0 && !rd.complete && !rd.roundId }).map(r => ({ roundNo: n, row: r }))
      ).filter(g => g.roundNo !== roundSel)
    : []
  function completeEarlier(roundNo: number, userId: string) {
    setRoundSel(roundNo)
    setGroup([userId])
    const row = state.board.find(r => r.userId === userId)
    const first = row ? row.rounds[roundNo - 1].scores.findIndex(sc => sc === null) : 0
    setHole(first === -1 ? 1 : first + 1)
    setMessage(null)
    setTab('score')
  }
  const incompleteCards = state.board.filter(r => { const rd = roundOf(r); return rd.thru > 0 && !rd.complete })
  const untouched = state.board.filter(r => roundOf(r).thru === 0)
  const waitingStats = Object.values(state.stats).flat().filter(s => !s.done).length

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Link href="/qualifying" className="text-sm mb-4 inline-block" style={{ color: '#9A9DB0' }}>← Qualifying</Link>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{q.name}</h1>
        <span className="text-xs font-semibold px-2 py-1 rounded mt-1" style={{ backgroundColor: finished ? '#22263A' : '#CC222220', color: finished ? '#9A9DB0' : '#CC2222' }}>
          {roundSel !== null ? `Fixing round ${roundSel}` : finished ? 'Final' : q.round_count > 1 ? `Round ${openRound} of ${q.round_count}` : 'Live'}
        </span>
      </div>
      <p className="text-sm mb-5" style={{ color: '#9A9DB0' }}>
        {q.course_name} · par <span style={{ fontFamily: 'var(--font-dm-mono)' }}>{q.pars.reduce((s, p) => s + p, 0)}</span>
      </p>

      {roundSel !== null && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between gap-3" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B40' }}>
          <p className="text-sm" style={{ color: '#F59E0B' }}>Completing a card from round {roundSel}. Fill in the missing holes, then add it below.</p>
          <button type="button" onClick={() => { setRoundSel(null); setGroup([]); setTab('board') }} className="text-xs flex-shrink-0" style={{ color: '#9A9DB0', minHeight: '44px' }}>Done</button>
        </div>
      )}

      {editing && (
        <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
          {(['board', 'score'] as const).map(t => (
            <button key={t} type="button" onClick={() => (t === 'score' ? openScoring() : setTab('board'))} className="rounded-lg text-sm font-semibold" style={{ backgroundColor: tab === t ? '#CC2222' : 'transparent', color: tab === t ? '#F0F0F0' : '#9A9DB0', minHeight: '44px' }}>
              {t === 'board' ? 'Leaderboard' : 'Enter scores'}
            </button>
          ))}
        </div>
      )}

      {message && (
        <div className="mb-4 px-4 py-3 rounded-xl" style={{ backgroundColor: message.ok ? '#22C55E15' : '#F59E0B15', border: `1px solid ${message.ok ? '#22C55E40' : '#F59E0B40'}` }}>
          <p className="text-sm" style={{ color: message.ok ? '#22C55E' : '#F59E0B', lineHeight: 1.5 }}>{message.text}</p>
        </div>
      )}

      {/* ── Leaderboard ── */}
      {(tab === 'board' || !editing) && (
        <>
          <div className="rounded-xl overflow-hidden mb-5" style={{ backgroundColor: '#1A1D27' }}>
            <div className="flex items-center px-4 py-2 text-xs" style={{ color: '#4A4D60', borderBottom: '1px solid #22263A' }}>
              <span className="w-9">Pos</span>
              <span className="flex-1">Player</span>
              {q.round_count > 1 && <span className="w-20 text-right">Scores</span>}
              <span className="w-12 text-right">Thru</span>
              <span className="w-12 text-right">Total</span>
            </div>
            {state.board.length === 0 && <p className="px-4 py-6 text-sm" style={{ color: '#9A9DB0' }}>No players in this qualifier.</p>}
            {state.board.map((row, i) => (
              <div key={row.userId} className="flex items-center px-4 py-3" style={{ borderTop: i > 0 ? '1px solid #22263A' : 'none', backgroundColor: row.userId === userId ? '#CC222210' : 'transparent' }}>
                <span className="w-9 text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{row.position}</span>
                <span className="flex-1 text-sm truncate pr-2" style={{ color: '#F0F0F0' }}>{row.name}</span>
                {q.round_count > 1 && (
                  <span className="w-20 text-right text-xs" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>
                    {row.rounds.filter(r => r.complete).map(r => r.strokes).join(' ') || '-'}
                  </span>
                )}
                <span className="w-12 text-right text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>
                  {finished ? (row.holesPlayed > 0 ? 'F' : '-') : row.thru === 0 ? '-' : row.thru === q.holes ? 'F' : row.thru}
                </span>
                <span className="w-12 text-right text-base font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: toParColor(row.toPar) }}>{fmtToPar(row.toPar)}</span>
              </div>
            ))}
          </div>
          {!finished && <p className="text-xs mb-5" style={{ color: '#4A4D60' }}>Updates every 15 seconds while this page is open.</p>}
        </>
      )}

      {/* ── Score entry ── */}
      {tab === 'score' && editing && (
        <>
          <div className="mb-5">
            <p className="text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Who are you marking for?</p>
            <div className="flex gap-2 flex-wrap">
              {state.board.map(row => {
                const on = group.includes(row.userId)
                return (
                  <button key={row.userId} type="button" onClick={() => toggleGroup(row.userId)} className="px-3 rounded-lg text-sm" style={{ backgroundColor: on ? '#CC222220' : '#1A1D27', color: on ? '#F0F0F0' : '#9A9DB0', border: `1px solid ${on ? '#CC222260' : '#2E3247'}`, minHeight: '44px' }}>
                    {row.name}{row.userId === userId ? ' (you)' : ''}
                  </button>
                )
              })}
            </div>
          </div>

          {groupRows.length === 0 ? (
            <p className="text-sm" style={{ color: '#9A9DB0' }}>Pick the players in your group above, then enter their scores hole by hole.</p>
          ) : (
            <>
              {/* Hole strip */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
                {q.pars.map((p, i) => {
                  const n = i + 1
                  const done = groupRows.every(r => roundOf(r).scores[i] !== null)
                  const active = n === hole
                  return (
                    <button key={n} type="button" onClick={() => setHole(n)} className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg" style={{ width: '40px', minHeight: '44px', backgroundColor: active ? '#CC222220' : '#1A1D27', border: `1px solid ${active ? '#CC2222' : done ? '#22C55E40' : '#2E3247'}` }}>
                      <span className="text-sm font-medium leading-none" style={{ fontFamily: 'var(--font-dm-mono)', color: active ? '#F0F0F0' : done ? '#22C55E' : '#9A9DB0' }}>{n}</span>
                      <span className="leading-none mt-1" style={{ fontFamily: 'var(--font-dm-mono)', color: '#4A4D60', fontSize: '9px' }}>P{p}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-end justify-between mb-4">
                <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Hole {hole}</h2>
                <p className="text-sm" style={{ color: '#9A9DB0' }}>Par <span style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{par}</span></p>
              </div>

              <div className="space-y-3 mb-6">
                {groupRows.map(row => {
                  const value = roundOf(row).scores[hole - 1]
                  const locked = !!roundOf(row).roundId
                  const diff = value === null ? null : value - par
                  return (
                    <div key={row.userId} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                      <div className="pr-2 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#F0F0F0' }}>{row.name}</p>
                        <p className="text-xs" style={{ color: '#9A9DB0' }}>
                          {fmtToPar(roundOf(row).thru > 0 ? roundOf(row).toPar : null)} thru {roundOf(row).thru}
                        </p>
                      </div>
                      {locked ? (
                        <p className="text-sm" style={{ color: '#9A9DB0' }}>Round finished</p>
                      ) : (
                        <div className="flex items-center flex-shrink-0">
                          <button type="button" aria-label={`One fewer for ${row.name}`} onClick={() => setScore(row.userId, hole, value === null ? par - 1 : Math.max(1, value - 1))} className="rounded-l-xl font-bold text-xl" style={{ backgroundColor: '#22263A', color: '#F0F0F0', width: '52px', height: '52px', border: '1px solid #2E3247' }}>−</button>
                          <button type="button" aria-label={`Set par for ${row.name}`} onClick={() => { if (value === null) setScore(row.userId, hole, par) }} className="font-medium text-xl" style={{ fontFamily: 'var(--font-dm-mono)', backgroundColor: '#0F1117', color: diff === null ? '#4A4D60' : diff < 0 ? '#22C55E' : diff === 0 ? '#F0F0F0' : diff >= 2 ? '#EF4444' : '#9A9DB0', width: '56px', height: '52px', borderTop: '1px solid #2E3247', borderBottom: '1px solid #2E3247' }}>
                            {value ?? '–'}
                          </button>
                          <button type="button" aria-label={`One more for ${row.name}`} onClick={() => setScore(row.userId, hole, value === null ? par + 1 : Math.min(15, value + 1))} className="rounded-r-xl font-bold text-xl" style={{ backgroundColor: '#22263A', color: '#F0F0F0', width: '52px', height: '52px', border: '1px solid #2E3247' }}>+</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs mb-4" style={{ color: '#4A4D60' }}>Tap the middle for par, or + and − for anything else. Scores save as you tap.</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button type="button" disabled={hole === 1} onClick={() => setHole(h => Math.max(1, h - 1))} className="rounded-xl text-sm font-medium" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '56px', opacity: hole === 1 ? 0.4 : 1 }}>← Hole {Math.max(1, hole - 1)}</button>
                {hole < q.holes ? (
                  <button type="button" onClick={() => setHole(h => Math.min(q.holes, h + 1))} className="rounded-xl font-semibold text-base" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}>Hole {hole + 1} →</button>
                ) : (
                  <button type="button" onClick={() => setTab('board')} className="rounded-xl font-semibold text-base" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}>Leaderboard →</button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Coach: who has added their stats ── */}
      {isCoach && Object.keys(state.stats).length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9A9DB0' }}>Stats added</p>
            <span className="text-xs" style={{ color: waitingStats === 0 ? '#22C55E' : '#9A9DB0' }}>{waitingStats === 0 ? 'Everyone is done' : `${waitingStats} still to do`}</span>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27' }}>
            {state.board.filter(r => state.stats[r.userId]).map((row, i) => (
              <div key={row.userId} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i > 0 ? '1px solid #22263A' : 'none' }}>
                <span className="text-sm truncate pr-2" style={{ color: '#F0F0F0' }}>{row.name}</span>
                <span className="flex gap-2 flex-shrink-0">
                  {[...state.stats[row.userId]].sort((a, b) => a.roundNo - b.roundNo).map(s => (
                    <Link key={s.roundId} href={`/coach/players/${row.userId}/rounds/${s.roundId}`} className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: s.done ? '#22C55E20' : '#22263A', color: s.done ? '#22C55E' : '#9A9DB0', minHeight: 'auto', display: 'inline-block' }}>
                      {q.round_count > 1 ? `R${s.roundNo} ` : ''}{s.done ? 'Done' : 'Waiting'}
                    </Link>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>Players who are still waiting after three days get one reminder from us. A word from you works faster.</p>
        </div>
      )}

      {/* ── Coach: cards from earlier rounds that are not in yet ── */}
      {earlierGaps.length > 0 && (
        <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: '#1A1D27', border: '1px solid #F59E0B40' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Cards not added yet</p>
          <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>These were incomplete when the round was finished, so the players do not have them yet.</p>
          {earlierGaps.map(g => (
            <button key={`${g.roundNo}:${g.row.userId}`} type="button" onClick={() => completeEarlier(g.roundNo, g.row.userId)} className="w-full flex items-center justify-between px-3 rounded-lg mb-2 text-sm" style={{ backgroundColor: '#22263A', color: '#F0F0F0', minHeight: '48px' }}>
              <span>{g.row.name}{q.round_count > 1 ? `, round ${g.roundNo}` : ''} <span style={{ color: '#9A9DB0' }}>({g.row.rounds[g.roundNo - 1].thru}/{q.holes})</span></span>
              <span style={{ color: '#F59E0B' }}>Complete it →</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Coach: finish the round ── */}
      {isCoach && editing && (
        <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>{roundSel !== null ? `Add completed cards to round ${roundSel}` : `Finish ${q.round_count > 1 ? `round ${openRound}` : 'the round'}`}</p>
          <p className="text-xs mb-3" style={{ color: '#9A9DB0', lineHeight: 1.5 }}>
            Every player with a full card gets this round in their own account, pars and scores already in, and an email with a link to add their stats.
          </p>
          {incompleteCards.length > 0 && (
            <p className="text-xs mb-3" style={{ color: '#F59E0B' }}>
              Card not complete yet: {incompleteCards.map(r => `${r.name} (${roundOf(r).thru}/${q.holes})`).join(', ')}. They will be left out until it is. You can finish again later to add them.
            </p>
          )}
          {untouched.length > 0 && untouched.length < state.board.length && (
            <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>No scores at all, so treated as not playing: {untouched.map(r => r.name).join(', ')}.</p>
          )}
          {!confirmFinish ? (
            <button type="button" onClick={() => setConfirmFinish(true)} disabled={busy || untouched.length === state.board.length} className="w-full rounded-xl font-semibold text-sm" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', minHeight: '48px', opacity: untouched.length === state.board.length ? 0.4 : 1 }}>
              {roundSel !== null ? 'Add to players\' accounts' : `Finish ${q.round_count > 1 ? `round ${openRound}` : 'round'}`}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmFinish(false)} disabled={busy} className="rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}>Not yet</button>
              <button type="button" onClick={finishRound} disabled={busy} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px', opacity: busy ? 0.7 : 1 }}>{busy ? 'Finishing…' : 'Yes, finish and send'}</button>
            </div>
          )}
        </div>
      )}

      {isCoach && (
        !confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs" style={{ color: '#4A4D60', minHeight: '44px' }}>Remove this qualifier</button>
        ) : (
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #EF444440' }}>
            <p className="text-sm mb-3" style={{ color: '#F0F0F0' }}>Remove {q.name}? The leaderboard goes. Rounds already in players&apos; accounts stay.</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy} className="rounded-xl text-sm" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}>Keep it</button>
              <button type="button" onClick={remove} disabled={busy} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#EF4444', color: '#F0F0F0', minHeight: '48px' }}>Remove</button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
