import { NextResponse } from 'next/server'
import { EMAIL_FROM } from '@/lib/email-from'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 60

interface TeamRow { id: string; name: string; coach_user_id: string }
interface MemberRow { team_id: string; user_id: string }
interface UserRow { id: string; email: string; name: string | null; handicap: number | null }
interface RoundRow {
  id: string; user_id: string; date: string; course_name: string
  holes: number; round_type: string; par_total: number | null; score_total: number | null
}

function fmtToPar(n: number): string {
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

// Weekly coach digest: every coach whose team logged rounds in the last 7 days
// gets a per-player summary. Coaches with no team activity get nothing (no spam).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Resend not configured' }, { status: 503 })

  try {
    const supabase = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    const { data: teamsRaw } = await sb.from('teams').select('id, name, coach_user_id')
    const teams: TeamRow[] = teamsRaw ?? []
    if (teams.length === 0) return NextResponse.json({ ok: true, sent: 0, reason: 'no teams' })

    const { data: membersRaw } = await sb.from('team_members').select('team_id, user_id')
    const members: MemberRow[] = membersRaw ?? []

    const allUserIds = [...new Set([...members.map(m => m.user_id), ...teams.map(t => t.coach_user_id)])]
    const { data: usersRaw } = await sb.from('users').select('id, email, name, handicap').in('id', allUserIds)
    const users = new Map<string, UserRow>((usersRaw ?? []).map((u: UserRow) => [u.id, u]))

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const since = weekAgo.toISOString().split('T')[0]

    const playerIds = members.map(m => m.user_id)
    const { data: roundsRaw } = playerIds.length > 0
      ? await sb
          .from('rounds')
          .select('id, user_id, date, course_name, holes, round_type, par_total, score_total')
          .in('user_id', playerIds)
          .gte('date', since)
          .order('date', { ascending: false })
      : { data: [] }
    const recentRounds: RoundRow[] = roundsRaw ?? []

    const resend = new Resend(apiKey)
    let sent = 0

    for (const team of teams) {
      const coach = users.get(team.coach_user_id)
      if (!coach?.email) continue

      const teamPlayerIds = members.filter(m => m.team_id === team.id).map(m => m.user_id)
      const teamRounds = recentRounds.filter(r => teamPlayerIds.includes(r.user_id))
      if (teamRounds.length === 0) continue // no activity — no email

      const lines: string[] = []
      for (const pid of teamPlayerIds) {
        const player = users.get(pid)
        const playerRounds = teamRounds.filter(r => r.user_id === pid)
        if (playerRounds.length === 0) continue

        const scored = playerRounds.filter(r => r.score_total != null && r.par_total != null)
        const best = scored.length > 0 ? Math.min(...scored.map(r => r.score_total! - r.par_total!)) : null
        const avg = scored.length > 0
          ? scored.reduce((s, r) => s + (r.score_total! - r.par_total!), 0) / scored.length
          : null

        lines.push(
          `${player?.name ?? 'Player'}${player?.handicap != null ? ` (HCP ${player.handicap})` : ''}: ` +
          `${playerRounds.length} round${playerRounds.length !== 1 ? 's' : ''}` +
          (avg !== null ? `, avg ${fmtToPar(Math.round(avg * 10) / 10)}` : '') +
          (best !== null ? `, best ${fmtToPar(best)}` : '') +
          ` — ${playerRounds.map(r => `${r.course_name} (${r.score_total ?? '—'})`).join(', ')}`
        )
      }

      const quietPlayers = teamPlayerIds
        .filter(pid => !teamRounds.some(r => r.user_id === pid))
        .map(pid => users.get(pid)?.name ?? 'Player')

      const body = [
        `Hi ${coach.name?.split(' ')[0] ?? 'Coach'},`,
        '',
        `Here's your ${team.name} week on TM Stats:`,
        '',
        ...lines,
        ...(quietPlayers.length > 0 ? ['', `No rounds logged this week: ${quietPlayers.join(', ')}`] : []),
        '',
        `See full stats, Strokes Gained and AI feedback for every player in your coach dashboard:`,
        `https://tmstatsgolf.com/coach`,
        '',
        '— TM Stats · Track to Improve',
      ].join('\n')

      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: [coach.email],
        subject: `${team.name}: ${teamRounds.length} round${teamRounds.length !== 1 ? 's' : ''} logged this week`,
        text: body,
      })
      if (!error) sent++
    }

    return NextResponse.json({ ok: true, sent, ts: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
