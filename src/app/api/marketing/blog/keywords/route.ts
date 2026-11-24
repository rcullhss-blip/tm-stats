import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'

// Adds a search phrase to the blog queue. The Tuesday and Friday blog job
// writes the next unused one.
export async function POST(request: Request) {
  if (!(await assertAdmin())) return forbidden()
  const body = await request.json().catch(() => ({}))
  const keyword = String(body.keyword ?? '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80)
  if (keyword.length < 4) return NextResponse.json({ error: 'Keyword too short' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createServiceClient() as any
  const { data: existing } = await sb.from('blog_keywords').select('id').eq('keyword', keyword).limit(1)
  if (existing?.length) return NextResponse.json({ ok: true, already: true })
  const { error } = await sb.from('blog_keywords').insert({ keyword })
  if (error) return NextResponse.json({ error: 'Could not add it' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
