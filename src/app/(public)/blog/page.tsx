import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Golf Stats & Strokes Gained Blog | TM Stats',
  description: 'Expert advice on Strokes Gained, golf performance tracking, and how to lower your handicap using data. Written by Rob Cull, founder of TM Stats Golf.',
}

type BlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  meta_desc: string | null
  keyword: string | null
  published_at: string
}

export default async function BlogIndexPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('blog_posts')
    .select('id, title, slug, excerpt, meta_desc, keyword, published_at')
    .order('published_at', { ascending: false })

  const postList: BlogPost[] = posts ?? []

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>
        The Blog
      </p>
      <h1 className="text-3xl font-bold mb-3" style={{ color: '#F0F0F0' }}>
        Golf stats, Strokes Gained,<br />and how to actually improve.
      </h1>
      <p className="text-base mb-10" style={{ color: '#9A9DB0' }}>
        Written by Rob Cull — ex-NCAA golfer, Cheshire county player, founder of TM Stats.
      </p>

      {postList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: '#9A9DB0' }}>Posts coming soon.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {postList.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <div
                className="p-5 rounded-2xl transition-all"
                style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
              >
                <p className="text-xs mb-2" style={{ color: '#9A9DB0', fontFamily: 'var(--font-dm-mono)' }}>
                  {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <h2 className="text-lg font-bold mb-2" style={{ color: '#F0F0F0' }}>{post.title}</h2>
                {(post.excerpt || post.meta_desc) && (
                  <p className="text-sm leading-relaxed" style={{ color: '#9A9DB0' }}>
                    {post.excerpt || post.meta_desc}
                  </p>
                )}
                <p className="text-sm mt-3 font-semibold" style={{ color: '#CC2222' }}>Read more →</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 p-6 rounded-2xl text-center" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>Track your own Strokes Gained</p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>Free to start. No card required.</p>
        <Link
          href="/signup"
          className="inline-block px-6 py-3 rounded-lg text-sm font-bold"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
        >
          Get started free
        </Link>
      </div>
    </div>
  )
}
