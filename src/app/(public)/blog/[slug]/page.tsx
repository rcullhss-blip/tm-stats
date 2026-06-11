import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post } = await (supabase as any)
    .from('blog_posts')
    .select('title, meta_title, meta_desc, excerpt')
    .eq('slug', slug)
    .single()

  if (!post) return {}

  return {
    title: post.meta_title || post.title,
    description: post.meta_desc || post.excerpt || '',
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_desc || post.excerpt || '',
      type: 'article',
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post } = await (supabase as any)
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!post) return notFound()

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Back link */}
      <Link href="/blog" className="text-sm mb-8 inline-block" style={{ color: '#9A9DB0' }}>
        ← All posts
      </Link>

      {/* Meta */}
      <p className="text-xs mb-3" style={{ color: '#9A9DB0', fontFamily: 'var(--font-dm-mono)' }}>
        {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        {post.keyword && <> · <span style={{ color: '#CC2222' }}>{post.keyword}</span></>}
      </p>

      <h1 className="text-3xl font-bold mb-6" style={{ color: '#F0F0F0', lineHeight: '1.3' }}>
        {post.title}
      </h1>

      {/* Post content rendered as HTML */}
      <div
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
        style={{ color: '#9A9DB0' }}
      />

      {/* Author byline */}
      <div className="mt-10 pt-6 flex items-center gap-4" style={{ borderTop: '1px solid #2E3247' }}>
        <div
          className="flex items-center justify-center rounded-full text-sm font-bold shrink-0"
          style={{ width: '40px', height: '40px', background: '#CC2222', color: 'white' }}
        >
          RC
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Rob Cull</p>
          <p className="text-xs" style={{ color: '#9A9DB0' }}>Founder, TM Stats Golf · Ex-Newberry College · Cheshire county</p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 p-6 rounded-2xl text-center" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>Track your own Strokes Gained</p>
        <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>See exactly where you&apos;re losing shots. Free to start.</p>
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
