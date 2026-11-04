export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import AdminCreateCoach from '@/components/admin/AdminCreateCoach'
import AdminUserCard from '@/components/admin/AdminUserCard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single()
  const isAdmin = profile?.email === 'rcullhss@gmail.com' || user.email === 'rcullhss@gmail.com'
  if (!isAdmin) return notFound()

  const service = createServiceClient()

  // Sweep lapsed promo access before showing the list, so a user whose code
  // expired but who hasn't opened the app since (which is when the per-user
  // check in the layout runs) is corrected here too — the list is accurate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any)
    .from('users')
    .update({ subscription_status: 'free', promo_expires_at: null })
    .eq('subscription_status', 'pro')
    .lt('promo_expires_at', new Date().toISOString())

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

      {/* Quick links */}
      <div className="space-y-2 mb-6">
        <Link
          href="/admin/promos"
          className="block p-4 rounded-xl"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Promo codes</span>
            <span style={{ color: '#9A9DB0' }}>→</span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>Generate and manage access codes</p>
        </Link>
        <Link
          href="/admin/marketing/seo"
          className="block p-4 rounded-xl"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #22C55E55' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Google Search</span>
            <span style={{ color: '#9A9DB0' }}>→</span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>Clicks, impressions and keyword rankings from Search Console</p>
        </Link>
        <Link
          href="/admin/marketing"
          className="block p-4 rounded-xl"
          style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Marketing Hub</span>
            <span style={{ color: '#9A9DB0' }}>→</span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>Outreach, blog, newsletter, Instagram, scraper</p>
        </Link>
      </div>

      {/* User list */}
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Users</h2>
      <p className="text-xs mb-2" style={{ color: '#4A4D60' }}>Tap a name to see their stats.</p>
      <div className="space-y-2">
        {userList.map((u: { id: string; email: string; name: string | null; handicap: number | null; subscription_status: string; created_at: string; promo_expires_at: string | null }) => (
          <AdminUserCard key={u.id} user={u} roundCount={rcMap[u.id] ?? 0} />
        ))}
      </div>
    </div>
  )
}
