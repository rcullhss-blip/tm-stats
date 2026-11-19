import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { userFromDeviceToken } from '@/lib/device-auth'
import { Resend } from 'resend'
import { buildBoard, cleanAllGroups, cleanCard, fmtToPar, type BoardRow, type Par, type Qualifier, type QualifierScoreRow } from '@/lib/qualifying'
import { PERSONAL_FROM, REPLY_TO, statsReadyHtml, statsReadySubject } from '@/lib/lifecycle-emails'
import { claimUrl } from '@/lib/claim-link'

// The qualifying tables are server only (RLS on, no policies), so every read
// and write goes through the service client AFTER the caller's place on the
// team has been checked here.

export type QualifierRole = 'coach' | 'player'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

export async function currentUserId(): Promise<string | null> {
  // The Apple Watch signs in with its own token; everything else uses cookies
  const fromWatch = await userFromDeviceToken()
  if (fromWatch) return fromWatch
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** The caller's team and role: the team they coach, else the first team they play on. */
export async function teamFor(userId: string): Promise<{ service: Service; teamId: string; teamName: string; role: QualifierRole } | null> {
  const service: Service = createServiceClient()
  const { data: coached } = await service.from('teams').select('id, name').eq('coach_user_id', userId).limit(1)
  if (coached?.[0]) return { service, teamId: coached[0].id, teamName: coached[0].name, role: 'coach' }
  const { data: member } = await service.from('team_members').select('team_id, teams(name)').eq('user_id', userId).limit(1)
  if (member?.[0]) return { service, teamId: member[0].team_id, teamName: member[0].teams?.name ?? 'Team', role: 'player' }
  return null
}

function allIdsIn(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return []
  return Object.values(raw as Record<string, unknown>).flatMap(v => Array.isArray(v) ? v.flatMap(g => (g && Array.isArray((g as { players?: unknown }).players) ? (g as { players: unknown[] }).players.filter((x): x is string => typeof x === 'string') : [])) : [])
}

function normalise(row: Record<string, unknown>): Qualifier {
  const holes = row.holes === 9 ? 9 : 18
  const pars = Array.from({ length: holes }, (_, i) => {
    const p = Array.isArray(row.pars) ? row.pars[i] : 4
    return (p === 3 || p === 5 ? p : 4) as Par
  })
  return {
    id: String(row.id),
    team_id: String(row.team_id),
    kind: row.kind === 'tournament' ? 'tournament' : 'qualifying',
    name: String(row.name ?? ''),
    course_name: String(row.course_name ?? ''),
    holes,
    pars,
    round_count: Number(row.round_count) || 1,
    round_dates: Array.isArray(row.round_dates) ? row.round_dates.map(String) : [],
    rounds_finished: Number(row.rounds_finished) || 0,
    // Player ids are checked again where groups are saved; here only the shape
    groups: cleanAllGroups(row.groups, Number(row.round_count) || 1, allIdsIn(row.groups)),
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at ?? ''),
  }
}

/** A qualifier, only if the caller coaches or plays on its team. */
export async function qualifierFor(userId: string, qualifierId: string): Promise<{ service: Service; qualifier: Qualifier; role: QualifierRole } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(qualifierId)) return null
  const service: Service = createServiceClient()
  const { data: row } = await service.from('qualifiers').select('*').eq('id', qualifierId).maybeSingle()
  if (!row) return null
  const { data: team } = await service.from('teams').select('id, coach_user_id').eq('id', row.team_id).maybeSingle()
  if (!team) return null
  if (team.coach_user_id === userId) return { service, qualifier: normalise(row), role: 'coach' }
  const { data: member } = await service.from('team_members').select('id').eq('team_id', team.id).eq('user_id', userId).limit(1)
  if (member?.[0]) return { service, qualifier: normalise(row), role: 'player' }
  return null
}

export interface QualifierState {
  qualifier: Qualifier
  role: QualifierRole
  board: BoardRow[]
  // Coach only: has each player added their stats to each finished round?
  stats: Record<string, { roundNo: number; roundId: string; done: boolean }[]>
}

/** Everything the live page needs: the qualifier, the leaderboard and who has done their stats. */
export async function qualifierState(service: Service, qualifier: Qualifier, role: QualifierRole): Promise<QualifierState> {
  const { data: scoreRaw } = await service.from('qualifier_scores').select('qualifier_id, round_no, user_id, scores, round_id, submitted_at').eq('qualifier_id', qualifier.id)
  const scoreRows: QualifierScoreRow[] = (scoreRaw ?? []).map((r: QualifierScoreRow) => ({ ...r, scores: cleanCard(r.scores, qualifier.holes) }))
  const playerIds = [...new Set(scoreRows.map(r => r.user_id))]
  const { data: users } = playerIds.length > 0
    ? await service.from('users').select('id, name, email').in('id', playerIds)
    : { data: [] }
  const players = (users ?? []).map((u: { id: string; name: string | null; email: string }) => ({ id: u.id, name: u.name ?? u.email.split('@')[0] }))

  const stats: QualifierState['stats'] = {}
  const roundIds = scoreRows.map(r => r.round_id).filter((id): id is string => !!id)
  if (roundIds.length > 0) {
    const { data: rounds } = await service.from('rounds').select('id, stats_pending').in('id', roundIds)
    const pending = new Map<string, boolean>((rounds ?? []).map((r: { id: string; stats_pending: boolean }) => [r.id, r.stats_pending === true]))
    for (const r of scoreRows) {
      if (!r.round_id || !pending.has(r.round_id)) continue
      if (!stats[r.user_id]) stats[r.user_id] = []
      stats[r.user_id].push({ roundNo: r.round_no, roundId: r.round_id, done: !pending.get(r.round_id) })
    }
  }

  return { qualifier, role, board: buildBoard(qualifier, players, scoreRows), stats: role === 'coach' ? stats : {} }
}

export interface FinishResult { created: number; emailed: number; incomplete: string[] }

/**
 * Finish one round of a qualifier (or an uploaded result). Every player with a
 * full card gets the round in their own account, pars and scores in and stats
 * still to add, plus an email with a link straight to it. Safe to run twice:
 * a card that already has a round is skipped.
 */
export async function finishQualifierRound(service: Service, qualifier: Qualifier, roundNo: number): Promise<FinishResult> {
  const { data: cards } = await service.from('qualifier_scores')
    .select('id, user_id, scores, round_id')
    .eq('qualifier_id', qualifier.id).eq('round_no', roundNo)
  const { data: team } = await service.from('teams').select('name').eq('id', qualifier.team_id).maybeSingle()
  const teamName: string = team?.name ?? 'your team'

  const ids = (cards ?? []).map((c: { user_id: string }) => c.user_id)
  const { data: users } = ids.length > 0
    ? await service.from('users').select('id, email, name, email_opt_out').in('id', ids)
    : { data: [] }
  const userById = new Map<string, { id: string; email: string; name: string | null; email_opt_out: boolean | null }>(
    (users ?? []).map((u: { id: string; email: string; name: string | null; email_opt_out: boolean | null }) => [u.id, u])
  )

  const parTotal = qualifier.pars.reduce((s, p) => s + p, 0)
  const date = qualifier.round_dates[roundNo - 1] ?? new Date().toISOString().slice(0, 10)
  const eventName = qualifier.round_count > 1 ? `${qualifier.name}, round ${roundNo}` : qualifier.name
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  let created = 0
  const incomplete: string[] = []
  const emailed: string[] = []

  for (const card of (cards ?? []) as { id: string; user_id: string; scores: unknown; round_id: string | null }[]) {
    if (card.round_id) continue
    const scores = cleanCard(card.scores, qualifier.holes)
    const player = userById.get(card.user_id)
    const label = player?.name ?? player?.email?.split('@')[0] ?? 'A player'
    // No scores at all: the player did not play this round. Leave them out quietly.
    if (scores.every(s => s === null)) continue
    if (scores.some(s => s === null)) { incomplete.push(label); continue }

    const scoreTotal = (scores as number[]).reduce((s, n) => s + n, 0)
    const { data: round, error: roundError } = await service.from('rounds').insert({
      user_id: card.user_id,
      date,
      course_name: qualifier.course_name,
      holes: qualifier.holes,
      round_type: qualifier.kind === 'tournament' ? 'tournament' : 'competition',
      input_mode: 'quick',
      par_total: parTotal,
      score_total: scoreTotal,
      notes: eventName,
      stats_pending: true,
      qualifier_id: qualifier.id,
    }).select('id').single()
    if (roundError || !round) { incomplete.push(`${label} (could not save)`); continue }

    const { error: holesError } = await service.from('holes').insert(
      (scores as number[]).map((score, i) => ({
        round_id: round.id, hole_number: i + 1, par: qualifier.pars[i], score,
        fir: null, gir: null, putts: null, up_and_down: null, sand_save: null, shots: null,
      }))
    )
    if (holesError) {
      await service.from('rounds').delete().eq('id', round.id)
      incomplete.push(`${label} (could not save)`)
      continue
    }
    await service.from('qualifier_scores').update({ round_id: round.id }).eq('id', card.id)
    created++

    // Email the link. A player whose account we created from the coach's roster
    // and who has never opened it cannot log in, so their link is the one-tap
    // claim link instead: it signs them in, they pick a password, and the round
    // is waiting on their dashboard.
    if (resend && player?.email && !player.email_opt_out) {
      let claimLink: string | undefined
      try {
        const { data: authUser } = await service.auth.admin.getUserById(card.user_id)
        if (authUser?.user?.app_metadata?.needs_claim === true) claimLink = claimUrl(card.user_id)
      } catch {}
      const { error: sendError } = await resend.emails.send({
        from: PERSONAL_FROM,
        replyTo: REPLY_TO,
        to: [player.email],
        subject: statsReadySubject(eventName),
        html: statsReadyHtml({
          userId: player.id,
          firstName: player.name?.split(' ')[0] || 'golfer',
          eventName,
          courseName: qualifier.course_name,
          score: scoreTotal,
          toPar: fmtToPar(scoreTotal - parTotal),
          roundId: round.id,
          teamName,
          claimLink,
        }),
      })
      if (!sendError) emailed.push(label)
    }
  }

  if (roundNo > qualifier.rounds_finished) {
    await service.from('qualifiers').update({ rounds_finished: roundNo }).eq('id', qualifier.id)
  }

  return { created, emailed: emailed.length, incomplete }
}

/**
 * A round where the result only had the player's total. The round is created
 * with that total and no holes; the golfer adds hole scores (photo of the card
 * or typed) and then stats. Safe to run twice: a card with a round is skipped.
 */
export async function createTotalOnlyRound(service: Service, qualifier: Qualifier, roundNo: number, userId: string, total: number): Promise<{ created: boolean; emailed: boolean }> {
  const { data: card } = await service.from('qualifier_scores').select('id, round_id').eq('qualifier_id', qualifier.id).eq('round_no', roundNo).eq('user_id', userId).maybeSingle()
  if (!card || card.round_id) return { created: false, emailed: false }
  const parTotal = qualifier.pars.reduce((s, p) => s + p, 0)
  const date = qualifier.round_dates[roundNo - 1] ?? new Date().toISOString().slice(0, 10)
  const eventName = qualifier.round_count > 1 ? `${qualifier.name}, round ${roundNo}` : qualifier.name
  const { data: round, error } = await service.from('rounds').insert({
    user_id: userId, date, course_name: qualifier.course_name, holes: qualifier.holes,
    round_type: qualifier.kind === 'tournament' ? 'tournament' : 'competition', input_mode: 'quick',
    par_total: parTotal, score_total: total, notes: eventName, stats_pending: true, qualifier_id: qualifier.id,
  }).select('id').single()
  if (error || !round) return { created: false, emailed: false }
  await service.from('qualifier_scores').update({ round_id: round.id }).eq('id', card.id)

  let emailed = false
  const { data: player } = await service.from('users').select('id, email, name, email_opt_out').eq('id', userId).maybeSingle()
  const { data: team } = await service.from('teams').select('name').eq('id', qualifier.team_id).maybeSingle()
  if (process.env.RESEND_API_KEY && player?.email && !player.email_opt_out) {
    let claimLink: string | undefined
    try {
      const { data: authUser } = await service.auth.admin.getUserById(userId)
      if (authUser?.user?.app_metadata?.needs_claim === true) claimLink = claimUrl(userId)
    } catch {}
    const { error: sendError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: PERSONAL_FROM, replyTo: REPLY_TO, to: [player.email],
      subject: statsReadySubject(eventName),
      html: statsReadyHtml({ userId, firstName: player.name?.split(' ')[0] || 'golfer', eventName, courseName: qualifier.course_name, score: total, toPar: fmtToPar(total - parTotal), roundId: round.id, teamName: team?.name ?? 'your team', claimLink, totalOnly: true }),
    })
    emailed = !sendError
  }
  return { created: true, emailed }
}
