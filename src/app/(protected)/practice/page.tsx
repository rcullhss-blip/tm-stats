export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import PracticeHub from '@/components/practice/PracticeHub'
import { weakestArea } from '@/lib/practice-server'

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { tab } = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any
  const [{ data: results }, { data: sessions }, { data: me }, suggestion] = await Promise.all([
    sb.from('practice_test_results').select('test_key, score, taken_on, created_at').eq('user_id', user.id).order('taken_on', { ascending: true }).limit(1000),
    sb.from('practice_sessions').select('date').eq('user_id', user.id).order('date', { ascending: false }).limit(200),
    sb.from('users').select('handicap').eq('id', user.id).maybeSingle(),
    weakestArea(user.id).catch(() => null),
  ])

  return (
    <PracticeHub
      initialTab={tab === 'log' ? 'log' : 'tests'}
      results={results ?? []}
      sessionDates={(sessions ?? []).map((s: { date: string }) => s.date)}
      handicap={me?.handicap ?? null}
      suggestion={suggestion}
    />
  )
}
