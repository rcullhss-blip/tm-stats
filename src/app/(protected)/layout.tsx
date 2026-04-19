import { createClient } from '@/lib/supabase/server'
import AuthGuard from '@/components/layout/AuthGuard'
import BottomNav from '@/components/layout/BottomNav'
import TopBar from '@/components/layout/TopBar'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isCoach = false
  let isAdmin = false

  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('users')
      .select('subscription_status, email, promo_expires_at')
      .eq('id', user.id)
      .single()

    // Auto-expire promo access on every page load
    if (profile?.subscription_status === 'pro' && profile?.promo_expires_at) {
      if (new Date(profile.promo_expires_at) < new Date()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('users')
          .update({ subscription_status: 'free', promo_expires_at: null })
          .eq('id', user.id)
        profile.subscription_status = 'free'
      }
    }

    isCoach = profile?.subscription_status === 'team'
    isAdmin = profile?.email === 'rcullhss@gmail.com' || user.email === 'rcullhss@gmail.com'
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0F1117' }}>
        <TopBar />
        <main className="flex-1 pb-24">
          {children}
        </main>
        <BottomNav isCoach={isCoach} isAdmin={isAdmin} />
      </div>
    </AuthGuard>
  )
}
