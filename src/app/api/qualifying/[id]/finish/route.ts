import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { currentUserId, qualifierFor } from '@/lib/qualifying-server'
import { cleanCard, fmtToPar } from '@/lib/qualifying'
import { PERSONAL_FROM, REPLY_TO, statsReadyHtml, statsReadySubject } from '@/lib/lifecycle-emails'
import { claimUrl } from '@/lib/claim-link'

export const maxDuration = 60

// Coach finishes a qualifying round. Every player with a full card gets the
// round in their own account (pars and scores in, stats to add) and an email
// with a link straight to it. Safe to press twice: a card that already has a
// round is skipped, so a player who was missing a hole can be added later.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await qualifierFor(userId, id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (access.role !== 'coach') return NextResponse.json({ error: 'Only the coach can finish a round' }, { status: 403 })
  const { qualifier, service } = access

  const body = await request.json().catch(() => ({}))
  const roundNo = Number(body.roundNo)
  if (!Number.isInteger(roundNo) || roundNo < 1 || roundNo > qualifier.round_count) return NextResponse.json({ error: 'Unknown round' }, { status: 400 })
  // Rounds are finished in order
  if (roundNo > qualifier.rounds_finished + 1) return NextResponse.json({ error: `Finish round ${qualifier.rounds_finished + 1} first` }, { status: 400 })

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

  return NextResponse.json({ ok: true, created, emailed: emailed.length, incomplete })
}
