export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import AdminPromoForm from '@/components/admin/AdminPromoForm'

export default async function AdminPromosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single()
  const isAdmin = profile?.email === 'rcullhss@gmail.com' || user.email === 'rcullhss@gmail.com'
  if (!isAdmin) return notFound()

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: codes } = await (service as any)
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  const codeList = codes ?? []

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-sm" style={{ color: '#9A9DB0' }}>← Admin</Link>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Promo Codes
        </h1>
      </div>

      {/* Create form */}
      <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#F0F0F0' }}>Create a code</p>
        <AdminPromoForm />
      </div>

      {/* Existing codes */}
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>
        Active codes
      </h2>
      {codeList.length === 0 && (
        <p className="text-sm" style={{ color: '#4A4D60' }}>No codes yet.</p>
      )}
      <div className="space-y-2">
        {codeList.map((c: { id: string; code: string; duration_months: number; max_uses: number | null; use_count: number; active: boolean; created_at: string }) => (
          <div key={c.id} className="p-3 rounded-xl flex items-center justify-between gap-2" style={{ backgroundColor: '#1A1D27' }}>
            <div>
              <p
                className="text-base font-bold tracking-widest"
                style={{ fontFamily: 'var(--font-dm-mono)', color: c.active ? '#F0F0F0' : '#4A4D60' }}
              >
                {c.code}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
                {c.duration_months} months · {c.use_count}/{c.max_uses ?? '∞'} uses
              </p>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: c.active ? '#22C55E20' : '#22263A',
                color: c.active ? '#22C55E' : '#4A4D60',
              }}
            >
              {c.active ? 'active' : 'inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
