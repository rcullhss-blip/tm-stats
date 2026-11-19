export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { currentUserId, teamFor } from '@/lib/qualifying-server'
import { cleanCard } from '@/lib/qualifying'
import { calculateRoundSG } from '@/lib/sg-engine'
import { parseSaved, type SelectionRound } from '@/lib/selection'
import type { ShotEntry } from '@/lib/types'
import SelectionClient from '@/components/coach/SelectionClient'

// Coach: every qualifying and tournament round for the squad in one place, to
// pick a travel team.
export default async function SelectionPage() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')
  const team = await teamFor(userId)
  if (!team || team.role !== 'coach') return notFound()
  const { service } = team

  const { data: teamRow } = await service.from('teams').select('*').eq('id', team.teamId).maybeSingle()
  const canSave = !!teamRow && 'selection' in teamRow
  const saved = parseSaved(teamRow?.selection)

  const { data: members } = await service.from('team_members').select('user_id').eq('team_id', team.teamId)
  const ids: string[] = (members ?? []).map((m: { user_id: string }) => m.user_id)
  const { data: users } = ids.length > 0 ? await service.from('users').select('id, name, email').in('id', ids) : { data: [] }
  const players = (users ?? []).map((u: { id: string; name: string | null; email: string }) => ({ id: u.id, name: u.name ?? u.email.split('@')[0] }))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))

  const { data: quals } = await service.from('qualifiers').select('*').eq('team_id', team.teamId).order('created_at', { ascending: false }).limit(200)
  const qualById = new Map<string, { name: string; kind: string; course_name: string; holes: number; pars: number[]; round_dates: string[] }>((quals ?? []).map((q: { id: string }) => [q.id, q]))
  const qualIds = [...qualById.keys()]

  const cards: { qualifier_id: string; round_no: number; user_id: string; scores: unknown; round_id: string | null }[] = []
  for (let i = 0; i < qualIds.length; i += 50) {
    const { data } = await service.from('qualifier_scores').select('qualifier_id, round_no, user_id, scores, round_id').in('qualifier_id', qualIds.slice(i, i + 50))
    cards.push(...(data ?? []))
  }

  // Strokes Gained v scratch for rounds the player has added full stats to
  const roundIds = cards.map(c => c.round_id).filter((x): x is string => !!x)
  const sgByRound = new Map<string, number>()
  for (let i = 0; i < roundIds.length; i += 40) {
    const { data: rs } = await service.from('rounds').select('id, input_mode, stats_pending').in('id', roundIds.slice(i, i + 40))
    const full = (rs ?? []).filter((r: { input_mode: string; stats_pending: boolean }) => r.input_mode === 'full' && !r.stats_pending).map((r: { id: string }) => r.id)
    if (full.length === 0) continue
    const { data: hs } = await service.from('holes').select('round_id, hole_number, par, shots').in('round_id', full)
    for (const rid of full) {
      const holes = (hs ?? []).filter((h: { round_id: string }) => h.round_id === rid).map((h: { hole_number: number; par: 3 | 4 | 5; shots: ShotEntry[] | null }) => ({ holeNumber: h.hole_number, par: h.par, shots: h.shots }))
      const sg = holes.length > 0 ? calculateRoundSG(holes, 'scratch') : null
      if (sg) sgByRound.set(rid, Math.round(sg.sgTotal * 10) / 10)
    }
  }

  const rounds: SelectionRound[] = []
  for (const c of cards) {
    const q = qualById.get(c.qualifier_id)
    if (!q) continue
    const holes = q.holes === 9 ? 9 : 18
    const scores = cleanCard(c.scores, holes)
    if (scores.some(s => s === null)) continue      // only complete cards count
    const par = (Array.isArray(q.pars) ? q.pars : []).slice(0, holes).reduce((s: number, p: number) => s + p, 0) || 72
    const score = (scores as number[]).reduce((s, n) => s + n, 0)
    rounds.push({
      key: `${c.qualifier_id}:${c.round_no}:${c.user_id}`,
      userId: c.user_id,
      qualifierId: c.qualifier_id,
      event: q.name,
      kind: q.kind === 'tournament' ? 'tournament' : 'qualifying',
      roundNo: c.round_no,
      date: (Array.isArray(q.round_dates) && q.round_dates[c.round_no - 1]) || '',
      course: q.course_name,
      par,
      score,
      toPar: score - par,
      sg: c.round_id ? sgByRound.get(c.round_id) ?? null : null,
    })
  }

  const events = qualIds.map(id => ({ id, name: qualById.get(id)!.name, kind: qualById.get(id)!.kind, date: qualById.get(id)!.round_dates?.[0] ?? '' }))
    .filter(e => rounds.some(r => r.qualifierId === e.id))

  return <SelectionClient teamName={team.teamName} players={players} rounds={rounds} events={events} saved={saved} canSave={canSave} />
}
