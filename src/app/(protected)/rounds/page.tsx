export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import RoundsView from '@/components/rounds/RoundsView'
import type { RoundRow } from '@/lib/types'

export default async function RoundsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rounds } = await supabase
    .from('rounds')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const roundList: RoundRow[] = rounds ?? []

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Rounds
        </h1>
        <Link
          href="/rounds/new"
          className="px-4 py-2 rounded-lg font-semibold text-sm"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '44px', display: 'flex', alignItems: 'center' }}
        >
          + New
        </Link>
      </div>

      {roundList.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏌️</div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#F0F0F0' }}>No rounds yet</h2>
          <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>
            Log your first round to start tracking your game.
          </p>
          <Link
            href="/rounds/new"
            className="inline-block px-6 py-4 rounded-xl font-semibold"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
          >
            Log a round
          </Link>
        </div>
      ) : (
        <RoundsView rounds={roundList} />
      )}
    </div>
  )
}
