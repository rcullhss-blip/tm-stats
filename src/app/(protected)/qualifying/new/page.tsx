export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { currentUserId, teamFor } from '@/lib/qualifying-server'
import NewQualifierForm, { type KnownCourse } from '@/components/qualifying/NewQualifierForm'
import type { Par } from '@/lib/qualifying'

// Coach sets up a qualifier.
export default async function NewQualifierPage() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')
  const team = await teamFor(userId)
  if (!team || team.role !== 'coach') return notFound()
  const { service } = team

  const { data: members } = await service.from('team_members').select('user_id').eq('team_id', team.teamId)
  const ids: string[] = (members ?? []).map((m: { user_id: string }) => m.user_id)
  const { data: users } = ids.length > 0 ? await service.from('users').select('id, name, email').in('id', ids) : { data: [] }
  const players = (users ?? [])
    .map((u: { id: string; name: string | null; email: string }) => ({ id: u.id, name: u.name ?? u.email.split('@')[0] }))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))

  // Courses the squad has already played, so pars can be filled in with one tap:
  // past qualifiers first, then courses from the players' own rounds.
  const known: KnownCourse[] = []
  const seen = new Set<string>()
  const { data: past } = await service.from('qualifiers').select('course_name, holes, pars').eq('team_id', team.teamId).order('created_at', { ascending: false }).limit(20)
  for (const q of past ?? []) {
    const key = `${String(q.course_name).trim().toLowerCase()}:${q.holes}`
    if (seen.has(key) || !Array.isArray(q.pars)) continue
    seen.add(key)
    known.push({ name: q.course_name, holes: q.holes === 9 ? 9 : 18, pars: q.pars as Par[] })
  }
  if (ids.length > 0) {
    const { data: rounds } = await service.from('rounds').select('id, course_name, holes').in('user_id', ids).order('date', { ascending: false }).limit(40)
    for (const r of rounds ?? []) {
      const key = `${String(r.course_name).trim().toLowerCase()}:${r.holes}`
      if (seen.has(key) || known.length >= 8) continue
      const { data: holes } = await service.from('holes').select('hole_number, par').eq('round_id', r.id).order('hole_number')
      if (!holes || holes.length !== r.holes) continue
      seen.add(key)
      known.push({ name: r.course_name, holes: r.holes === 9 ? 9 : 18, pars: holes.map((h: { par: Par }) => h.par) })
    }
  }

  return <NewQualifierForm teamName={team.teamName} players={players} knownCourses={known} />
}
