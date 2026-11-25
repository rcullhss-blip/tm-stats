import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateBlogPost, isIntentKeyword } from '@/lib/marketing-ai'
import { getKeywordGaps, isConfigured as searchConsoleReady } from '@/lib/search-console'
import { COMPETITORS } from '@/lib/compare'

export const maxDuration = 120

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// Topics for golfers who are ready to pick a tool, not after general advice.
// Added to the queue once (the table ignores ones it already has) and written
// ahead of general topics. Every one must be something TM Stats really does.
const INTENT_SEEDS = [
  'strokes gained app for amateur golfers',
  'golf stats app for a 10 handicap',
  'strokes gained tracker for college golf teams',
  'golf stats app for junior golfers',
  'golf stats app for single figure handicaps',
  'how to track strokes gained without a watch or sensors',
  'free strokes gained calculator for amateur golfers',
  'golf stats tracker for coaches and county squads',
  'best way to track golf stats on your phone',
  'golf stats app for high handicappers',
]

// Auto-blog: picks the next unused keyword from blog_keywords, writes the post,
// publishes it to /blog. Runs once a week (Tuesday) via Vercel cron — zero input needed.
// Add keywords any time: INSERT INTO blog_keywords (keyword) VALUES ('...')
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Top up the queue from real searches: phrases Google already shows the site
  // for where nothing is written yet. At most two a run, golf topics only, and
  // never another company's name (those belong on the compare pages).
  const autoQueued: string[] = []
  if (searchConsoleReady()) {
    try {
      const [{ data: kw }, { data: posts }] = await Promise.all([
        sb.from('blog_keywords').select('keyword'),
        sb.from('blog_posts').select('keyword, title'),
      ])
      const covered = [
        ...(kw ?? []).map((k: { keyword: string }) => k.keyword),
        ...(posts ?? []).flatMap((p: { keyword: string | null; title: string | null }) => [p.keyword ?? '', p.title ?? '']),
      ]
      const brands = [...COMPETITORS.map(c => c.name.toLowerCase().split(' ')[0]), 'arccos', 'shot scope', 'shotscope', '18birdies', 'garmin', 'strokesgain', 'decade', 'clippd', 'hole19', 'golfshot', 'grint', 'login', 'log in']
      const golf = /\b(golf|golfer|handicap|strokes? gained|putt|putting|putts|fairway|green|gir|driver|driving|iron|wedge|chip|chipping|bunker|sand|scramb|up and down|par|bogey|birdie|score|scoring|round|course|swing|short game|approach|tee|break (100|90|80|70)|stats?)\b/
      const picks = (await getKeywordGaps(covered))
        .filter(g => g.impressions >= 5)
        .map(g => g.query.toLowerCase().trim())
        .filter(q => golf.test(q) && !brands.some(b => q.includes(b)))
        .slice(0, 2)
      for (const keyword of picks) {
        const { error: insertError } = await sb.from('blog_keywords').insert({ keyword })
        if (!insertError) autoQueued.push(keyword)
      }
    } catch (e) {
      console.error('[auto-blog] keyword top-up failed', e)
    }
  }

  // Make sure the ready-to-use topics are in the queue.
  try {
    const { data: all } = await sb.from('blog_keywords').select('keyword')
    const have = new Set((all ?? []).map((k: { keyword: string }) => k.keyword.toLowerCase().trim()))
    const missing = INTENT_SEEDS.filter(k => !have.has(k))
    if (missing.length > 0) await sb.from('blog_keywords').insert(missing.map(keyword => ({ keyword })))
  } catch (e) {
    console.error('[auto-blog] seed top-up failed', e)
  }

  // Oldest first, but a ready-to-use topic jumps the queue.
  const { data: queue } = await sb
    .from('blog_keywords')
    .select('id, keyword')
    .eq('used', false)
    .order('created_at', { ascending: true })
    .limit(200)
  const waiting: { id: string; keyword: string }[] = queue ?? []
  const next = waiting.find(k => isIntentKeyword(k.keyword)) ?? waiting[0]

  if (!next) {
    return NextResponse.json({ ok: true, published: false, autoQueued, reason: 'keyword queue empty — add more to blog_keywords' })
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

    return NextResponse.json({ ok: true, published: true, slug, keyword: next.keyword, autoQueued })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
