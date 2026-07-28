import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateBlogPost } from '@/lib/marketing-ai'

export const maxDuration = 120

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// Auto-blog: picks the next unused keyword from blog_keywords, writes the post,
// publishes it to /blog. Runs twice a week via Vercel cron — zero input needed.
// Add keywords any time: INSERT INTO blog_keywords (keyword) VALUES ('...')
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: next } = await sb
    .from('blog_keywords')
    .select('id, keyword')
    .eq('used', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!next) {
    return NextResponse.json({ ok: true, published: false, reason: 'keyword queue empty — add more to blog_keywords' })
  }

  try {
    const post = await generateBlogPost({ keyword: next.keyword })

    const title = post.title ?? next.keyword
    const slug = slugify(post.slug ?? title)

    const { error } = await sb.from('blog_posts').upsert({
      title,
      slug,
      content: post.content,
      excerpt: post.excerpt ?? null,
      meta_title: post.metaTitle ?? title,
      meta_desc: post.metaDesc ?? post.excerpt ?? null,
      keyword: next.keyword,
      published_at: new Date().toISOString(),
    }, { onConflict: 'slug' })

    if (error) throw new Error(error.message)

    await sb.from('blog_keywords').update({ used: true }).eq('id', next.id)

    return NextResponse.json({ ok: true, published: true, slug, keyword: next.keyword })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
