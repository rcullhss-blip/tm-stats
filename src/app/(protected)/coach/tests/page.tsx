export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CATEGORY_LABEL, PRACTICE_TESTS, testProgress, type TestResult } from '@/lib/practice-tests'
import { fmtScore } from '@/components/practice/practice-ui'

// Coach: the squad's practice test scores. Best first; who has not tried it yet at the bottom.
export default async function CoachTestsPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any
  const { data: me } = await sb.from('users').select('subscription_status').eq('id', user.id).maybeSingle()
  if (me?.subscription_status !== 'team') notFound()
  const { data: team } = await sb.from('teams').select('id, name').eq('coach_user_id', user.id).maybeSingle()
  if (!team) redirect('/coach')
  const { data: members } = await sb.from('team_members').select('user_id').eq('team_id', team.id)
  const ids: string[] = (members ?? []).map((m: { user_id: string }) => m.user_id)
  const { data: people } = ids.length ? await sb.from('users').select('id, name').in('id', ids) : { data: [] }
  const { data: results } = ids.length ? await sb.from('practice_test_results').select('user_id, test_key, score, taken_on, created_at').in('user_id', ids) : { data: [] }

  const { test: sel } = await searchParams
  const test = PRACTICE_TESTS.find(t => t.key === sel) ?? PRACTICE_TESTS[0]
  const rows = (people ?? []).map((p: { id: string; name: string | null }) => {
    const list: TestResult[] = (results ?? []).filter((r: { user_id: string; test_key: string }) => r.user_id === p.id && r.test_key === test.key)
    return { id: p.id, name: p.name ?? 'Player', p: testProgress(test, list) }
  }).sort((a: { p: { best: number | null } }, b: { p: { best: number | null } }) => {
    if (a.p.best === null) return 1
    if (b.p.best === null) return -1
    return test.higherIsBetter ? b.p.best - a.p.best : a.p.best - b.p.best
  })
  const tried = rows.filter((r: { p: { taken: number } }) => r.p.taken > 0).length

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <Link href="/coach" className="text-sm mb-4 inline-block" style={{ color: '#9A9DB0' }}>← Coach</Link>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Practice tests</h1>
      <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>{team.name}: who is putting the work in, and who is getting better.</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
        {PRACTICE_TESTS.map(t => (
          <Link key={t.key} href={`/coach/tests?test=${t.key}`} className="flex-shrink-0 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: t.key === test.key ? '#CC222220' : '#1A1D27', color: t.key === test.key ? '#F0F0F0' : '#9A9DB0', border: `1px solid ${t.key === test.key ? '#CC222260' : '#2E3247'}` }}>{t.name}</Link>
        ))}
      </div>
      <p className="text-xs mb-2" style={{ color: '#9A9DB0' }}>{CATEGORY_LABEL[test.category]} · {test.short} · {tried} of {rows.length} have tried it</p>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1D27' }}>
        <div className="flex px-4 py-2 text-xs" style={{ color: '#4A4D60', borderBottom: '1px solid #22263A' }}>
          <span className="flex-1">Player</span><span className="w-12 text-right">Best</span><span className="w-12 text-right">Last</span><span className="w-14 text-right">Change</span><span className="w-10 text-right">Goes</span>
        </div>
        {rows.length === 0 && <p className="px-4 py-6 text-sm" style={{ color: '#9A9DB0' }}>No players on the team yet.</p>}
        {rows.map((r: { id: string; name: string; p: ReturnType<typeof testProgress> }, i: number) => (
          <div key={r.id} className="flex items-center px-4 py-3 text-sm" style={{ borderTop: i > 0 ? '1px solid #22263A' : 'none' }}>
            <span className="flex-1 truncate pr-2" style={{ color: '#F0F0F0' }}>{r.name}</span>
            <span className="w-12 text-right" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{fmtScore(test, r.p.best)}</span>
            <span className="w-12 text-right" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>{fmtScore(test, r.p.last)}</span>
            <span className="w-14 text-right" style={{ fontFamily: 'var(--font-dm-mono)', color: r.p.change === null ? '#4A4D60' : r.p.change > 0 ? '#22C55E' : r.p.change < 0 ? '#EF4444' : '#9A9DB0' }}>{r.p.change === null ? '–' : `${r.p.change > 0 ? '+' : ''}${r.p.change}`}</span>
            <span className="w-10 text-right" style={{ color: '#9A9DB0' }}>{r.p.taken}</span>
          </div>
        ))}
      </div>
      <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>Change is the last 5 goes against the first 5 (shown after 4 goes); green is better{test.higherIsBetter ? '' : ', for this test lower scores are better'}.</p>
    </div>
  )
}
