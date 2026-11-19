export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { testByKey } from '@/lib/practice-tests'
import TestClient from '@/components/practice/TestClient'

export default async function PracticeTestPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const test = testByKey(key)
  if (!test) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any
  const [{ data: results }, { data: me }] = await Promise.all([
    sb.from('practice_test_results').select('id, score, detail, taken_on, notes, created_at').eq('user_id', user.id).eq('test_key', key).order('taken_on', { ascending: true }).order('created_at', { ascending: true }),
    sb.from('users').select('handicap').eq('id', user.id).maybeSingle(),
  ])
  return <TestClient testKey={key} userId={user.id} initial={results ?? []} handicap={me?.handicap ?? null} />
}
