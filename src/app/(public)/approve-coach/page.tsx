import { createServiceClient } from '@/lib/supabase/service'
import { validApproval } from '@/lib/coach-approval'
import ApproveCoachClient from './ApproveCoachClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Approve coach | TM Stats', robots: { index: false } }

// Opened from Rob's email. Shows who is asking, then one tap to approve or decline.
// Nothing changes just by opening the page (email scanners open links too).
export default async function ApproveCoachPage({ searchParams }: { searchParams: Promise<{ u?: string; s?: string }> }) {
  const { u = '', s = '' } = await searchParams
  const box = (text: string) => <div className="max-w-md mx-auto px-6 py-16 text-center"><p className="text-sm" style={{ color: '#9A9DB0' }}>{text}</p></div>
  if (!validApproval(u, s)) return box('This approval link is not valid.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: user } = await service.from('users').select('name, email, subscription_status, created_at').eq('id', u).maybeSingle()
  if (!user) return box('That account no longer exists.')
  const { data: team } = await service.from('teams').select('name').eq('coach_user_id', u).maybeSingle()
  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>New coach</p>
      <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{team?.name ?? 'No team yet'}</h1>
      <div className="p-4 rounded-xl mb-6 text-sm space-y-1" style={{ backgroundColor: '#1A1D27', color: '#9A9DB0' }}>
        <p><span style={{ color: '#F0F0F0' }}>{user.name ?? 'No name'}</span></p>
        <p>{user.email}</p>
        <p>Account made {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
      <ApproveCoachClient u={u} s={s} approved={user.subscription_status === 'team'} hasTeam={!!team} />
    </div>
  )
}
