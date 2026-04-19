export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import AdminUserActions from '@/components/admin/AdminUserActions'
import AdminCreateCoach from '@/components/admin/AdminCreateCoach'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single()
  const isAdmin = profile?.email === 'rcullhss@gmail.com' || user.email === 'rcullhss@gmail.com'
  if (!isAdmin) return notFound()

  const service = createServiceClient()

  // Fetch all users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users } = await (service as any)
    .from('users')
    .select('id, email, name, handicap, subscription_status, created_at, promo_expires_at')
    .order('created_at', { ascending: false })

  // Fetch round counts per user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roundCounts } = await (service as any)
    .from('rounds')
    .select('user_id')

  const rcMap: Record<string, number> = {}
  for (const r of (roundCounts ?? [])) {
    rcMap[r.user_id] = (rcMap[r.user_id] ?? 0) + 1
  }

  const userList = users ?? []
  const proCount = userList.filter((u: { subscription_status: string }) => u.subscription_status === 'pro').length
  const teamCount = userList.filter((u: { subscription_status: string }) => u.subscription_status === 'team').length

  function planColor(status: string) {
    if (status === 'pro') return '#22C55E'
    if (status === 'team') return '#3B82F6'
    return '#9A9DB0'
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Admin
        </h1>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#CC222220', color: '#CC2222' }}>
          Rob only
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{userList.length}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Total users</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{Object.values(rcMap).reduce((a, b) => a + b, 0)}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Total rounds</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#22C55E' }}>{proCount}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Pro</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#3B82F6' }}>{teamCount}</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Coach</p>
        </div>
      </div>

      {/* Create coach */}
      <AdminCreateCoach />

      {/* Promo codes link */}
      <Link
        href="/admin/promos"
        className="block p-4 rounded-xl mb-6"
        style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Promo codes</span>
          <span style={{ color: '#9A9DB0' }}>→</span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>Generate and manage access codes</p>
      </Link>

      {/* User list */}
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Users</h2>
      <div className="space-y-2">
        {userList.map((u: { id: string; email: string; name: string | null; handicap: number | null; subscription_status: string; created_at: string; promo_expires_at: string | null }) => (
          <div key={u.id} className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#F0F0F0' }}>{u.name ?? u.email}</p>
                <p className="text-xs truncate" style={{ color: '#4A4D60' }}>{u.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: u.subscription_status !== 'free' ? '#22C55E20' : '#22263A', color: planColor(u.subscription_status) }}
                  >
                    {u.subscription_status}
                  </span>
                  <span className="text-xs" style={{ color: '#4A4D60' }}>
                    {rcMap[u.id] ?? 0} rounds
                    {u.handicap != null ? ` · hcp ${u.handicap}` : ''}
                  </span>
                </div>
                {u.promo_expires_at && (
                  <p className="text-xs mt-0.5" style={{ color: '#F59E0B' }}>
                    Promo expires {new Date(u.promo_expires_at).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
              <AdminUserActions userId={u.id} currentPlan={u.subscription_status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
