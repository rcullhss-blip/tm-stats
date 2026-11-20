'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Rounds finished with no signal. The round gets its id on the phone, so
 * uploading it twice can never make two rounds: a retry finds the first one.
 */

const OUTBOX_KEY = 'tmstats_round_outbox'

export interface PendingRound {
  round: Record<string, unknown> & { id: string; course_name: string }
  holes: Record<string, unknown>[]
  queuedAt: string
  // Tee the golfer picked at setup (optional). Not a rounds column; it only
  // goes to the course library.
  tee?: string
}

export function readOutbox(): PendingRound[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') } catch { return [] }
}

function writeOutbox(list: PendingRound[]) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)) } catch {}
}

export function queueRound(p: PendingRound) {
  writeOutbox([...readOutbox().filter(x => x.round.id !== p.round.id), p])
}

/** Upload one round with its holes. True when it is safely in the account. */
export async function uploadRound(p: PendingRound): Promise<boolean> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error: roundError } = await sb.from('rounds').insert(p.round)
  // 23505: this round is already there from an earlier try
  if (roundError && roundError.code !== '23505') return false
  const { count } = await sb.from('holes').select('id', { count: 'exact', head: true }).eq('round_id', p.round.id)
  if ((count ?? 0) >= p.holes.length) return true
  if ((count ?? 0) > 0) await sb.from('holes').delete().eq('round_id', p.round.id)
  const { error: holesError } = await sb.from('holes').insert(p.holes)
  if (holesError) {
    // Do not leave a round with no holes behind; the next try starts clean
    if (!roundError) await sb.from('rounds').delete().eq('id', p.round.id)
    return false
  }
  return true
}

/** Share the round's course card with the course library. Fire and forget: never blocks a save. */
export function contributeCourse(roundId: string, tee?: string) {
  fetch('/api/courses/contribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId, tee: tee ?? '' }),
    keepalive: true,
  }).catch(() => {})
}

let flushing = false

/** Try every waiting round. Returns how many went up. */
export async function flushOutbox(): Promise<number> {
  if (flushing) return 0
  flushing = true
  let done = 0
  try {
    for (const p of readOutbox()) {
      let ok = false
      try { ok = await uploadRound(p) } catch { ok = false }
      if (!ok) break
      writeOutbox(readOutbox().filter(x => x.round.id !== p.round.id))
      done++
      fetch(`/api/rounds/${p.round.id}/summary-email`, { method: 'POST', keepalive: true }).catch(() => {})
      contributeCourse(p.round.id, p.tee)
    }
  } finally {
    flushing = false
  }
  return done
}
