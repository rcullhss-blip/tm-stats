import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const { title, slug, content, excerpt, metaTitle, metaDesc, keyword } = await request.json()

  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'title, slug, and content required' }, { status: 400 })
  }

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any).from('blog_posts').upsert({
    title,
    slug,
    content,
    excerpt,
    meta_title: metaTitle,
    meta_desc: metaDesc,
    keyword,
    published_at: new Date().toISOString(),
  }, { onConflict: 'slug' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, slug })
}
