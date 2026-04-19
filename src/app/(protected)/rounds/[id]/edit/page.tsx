export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { HoleRow } from '@/lib/types'
import RoundEditForm from '@/components/rounds/RoundEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditRoundPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: round } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!round) notFound()

  const { data: holesRaw } = await supabase
    .from('holes')
    .select('*')
    .eq('round_id', id)
    .order('hole_number')

  const holes: HoleRow[] = holesRaw ?? []

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/rounds/${id}`}
          className="flex items-center text-sm"
          style={{ color: '#9A9DB0', minHeight: '44px' }}
        >
          ← Cancel
        </Link>
        <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
          Edit round
        </h1>
        <div style={{ width: '64px' }} />
      </div>

      <RoundEditForm round={round} holes={holes} />
    </div>
  )
}
