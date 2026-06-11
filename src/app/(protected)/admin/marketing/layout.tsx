import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single()
  const isAdmin = profile?.email === 'rcullhss@gmail.com' || user.email === 'rcullhss@gmail.com'
  if (!isAdmin) return notFound()

  return <>{children}</>
}
