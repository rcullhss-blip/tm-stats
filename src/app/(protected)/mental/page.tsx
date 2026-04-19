export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import MentalGameClient from '@/components/mental/MentalGameClient'

export default async function MentalGamePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'team'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        Mental Game
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>
        Talk through what&apos;s on your mind. Get a calm perspective from an experienced golf mentor.
      </p>
      <MentalGameClient isPro={isPro} />
    </div>
  )
}
