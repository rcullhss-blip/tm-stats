import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildBreakdown, fetchLatestWinner, renderPost } from '@/lib/tour-winner'

export const maxDuration = 60

// Weekly tour winner post. Runs Monday and Tuesday at noon UTC (Tuesday catches
// Monday finishes and playoffs). Finds the tournament that has just finished,
// works the winner's hole scores out against a 5 to 9 handicap, and publishes
// it to the blog. Publishes once per event, and nothing at all when the feed
// is missing anything or the numbers do not add up.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const input = await fetchLatestWinner()
    if (!input) return NextResponse.json({ ok: true, published: false, reason: 'no finished event this week' })

    const breakdown = buildBreakdown(input)
    if (!breakdown) return NextResponse.json({ ok: true, published: false, reason: 'could not match the rounds to a course', event: input.eventName })

    const post = renderPost(breakdown)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createServiceClient() as any

    const { data: existing } = await sb.from('blog_posts').select('slug').eq('slug', post.slug).maybeSingle()
    if (existing) return NextResponse.json({ ok: true, published: false, reason: 'already published', slug: post.slug })

    const { error } = await sb.from('blog_posts').insert({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      meta_title: post.metaTitle,
      meta_desc: post.metaDesc,
      keyword: 'tour winner breakdown',
      published_at: new Date().toISOString(),
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, published: true, slug: post.slug, event: input.eventName, winner: input.winner })
  } catch (err) {
    console.error('[tour-winner]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
