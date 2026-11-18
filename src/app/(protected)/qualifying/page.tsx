export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUserId, teamFor } from '@/lib/qualifying-server'
import { isFinished } from '@/lib/qualifying'

// Qualifying for the caller's team: what is open now and what has been played.
export default async function QualifyingListPage() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')
  const team = await teamFor(userId)

  if (!team) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Qualifying</h1>
        <div className="p-5 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>This is for teams</p>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>
            Qualifying and live scoring are run by a coach for their squad. Join your team with the code from your coach in Profile, and it will appear here.
          </p>
          <Link href="/profile" className="inline-block mt-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>Go to Profile</Link>
        </div>
      </div>
    )
  }

  const { data: rows } = await team.service.from('qualifiers').select('*').eq('team_id', team.teamId).order('created_at', { ascending: false }).limit(40)
  const list: { id: string; name: string; course_name: string; round_count: number; rounds_finished: number; round_dates: string[]; kind: string }[] = rows ?? []
  const open = list.filter(q => !isFinished(q))
  const done = list.filter(q => isFinished(q))
  const day = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''

  const Card = ({ q, live }: { q: typeof list[number]; live: boolean }) => (
    <Link href={`/qualifying/${q.id}`} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: `1px solid ${live ? '#CC222260' : '#2E3247'}`, minHeight: '64px' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{q.name}</p>
        <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
          {q.course_name} · {day(q.round_dates?.[0])}{q.round_count > 1 ? ` · ${q.round_count} rounds` : ''}{q.kind === 'tournament' ? ' · tournament' : ''}
        </p>
      </div>
      <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: live ? '#CC222220' : '#22263A', color: live ? '#CC2222' : '#9A9DB0' }}>
        {live ? (q.round_count > 1 ? `Round ${q.rounds_finished + 1}` : 'Live') : 'Final'}
      </span>
    </Link>
  )

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Qualifying</h1>
        {team.role === 'coach' && (
          <Link href="/qualifying/new" className="px-4 rounded-xl text-sm font-semibold flex items-center" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '44px' }}>New</Link>
        )}
      </div>
      <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>{team.teamName}</p>

      {list.length === 0 && (
        <div className="p-5 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>No qualifying yet</p>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>
            {team.role === 'coach'
              ? 'Set one up, share the page with your players, and scores go in hole by hole on their phones. When the round ends every player gets it in their account with pars and scores filled in, ready for stats.'
              : 'When your coach sets up qualifying it shows here, with a live leaderboard and a place to enter scores.'}
          </p>
        </div>
      )}

      {open.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>Open now</p>
          <div className="space-y-2">{open.map(q => <Card key={q.id} q={q} live />)}</div>
        </div>
      )}
      {done.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>Finished</p>
          <div className="space-y-2">{done.map(q => <Card key={q.id} q={q} live={false} />)}</div>
        </div>
      )}
    </div>
  )
}
