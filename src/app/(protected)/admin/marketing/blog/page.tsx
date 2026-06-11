'use client'

import { useState } from 'react'
import Link from 'next/link'

const SEO_KEYWORDS = [
  'strokes gained explained for amateur golfers',
  'golf statistics app UK 2025',
  'how to improve golf handicap with data',
  'what is strokes gained putting',
  'college golf statistics tracking software',
  'how to analyse your golf game',
  'strokes gained approach play explained',
  'golf performance tracking for coaches',
  'best golf stats app UK',
  'how to lower your golf handicap faster',
]

type Post = {
  title: string
  slug: string
  keyword: string
  status: 'generating' | 'ready' | 'published' | 'failed'
  excerpt?: string
  content?: string
  metaTitle?: string
  metaDesc?: string
  createdAt: string
}

type ViewingPost = Post & { content: string; metaTitle: string; metaDesc: string; slug: string }

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [generating, setGenerating] = useState(false)
  const [selectedKeyword, setSelectedKeyword] = useState(SEO_KEYWORDS[0])
  const [customKeyword, setCustomKeyword] = useState('')
  const [newsContext, setNewsContext] = useState('')
  const [viewing, setViewing] = useState<ViewingPost | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)

  async function generatePost() {
    const keyword = customKeyword.trim() || selectedKeyword
    setGenerating(true)

    const newPost: Post = { title: 'Generating...', slug: '', keyword, status: 'generating', createdAt: new Date().toISOString() }
    setPosts(prev => [newPost, ...prev])

    try {
      const res = await fetch('/api/marketing/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, newsContext }),
      })
      const data = await res.json()

      if (data.error) {
        setPosts(prev => prev.map((p, i) => i === 0 ? { ...p, title: 'Generation failed', status: 'failed' as const } : p))
      } else {
        setPosts(prev => prev.map((p, i) => i === 0 ? {
          ...p,
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt,
          content: data.content,
          metaTitle: data.metaTitle,
          metaDesc: data.metaDesc,
          status: 'ready' as const,
        } : p))
      }
    } catch {
      setPosts(prev => prev.map((p, i) => i === 0 ? { ...p, title: 'Error', status: 'failed' as const } : p))
    }

    setGenerating(false)
  }

  async function publishPost(post: ViewingPost) {
    setPublishing(post.slug)
    try {
      const res = await fetch('/api/marketing/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          metaTitle: post.metaTitle,
          metaDesc: post.metaDesc,
          keyword: post.keyword,
        }),
      })
      const data = await res.json()
      if (!data.error) {
        setPosts(prev => prev.map(p => p.slug === post.slug ? { ...p, status: 'published' as const } : p))
        setViewing(null)
      }
    } finally {
      setPublishing(null)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const statusColor = (s: string) => ({
    generating: '#f59e0b',
    ready: '#3b82f6',
    published: '#22c55e',
    failed: '#EF4444',
  }[s] || '#9A9DB0')

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>
        <Link href="/admin/marketing" style={{ color: '#9A9DB0' }}>← marketing hub</Link>
        <span style={{ color: '#2E3247' }}>/</span>
        <span style={{ color: '#F0F0F0' }}>blog autopilot</span>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0F0' }}>
        Blog <span style={{ color: '#8b5cf6' }}>Autopilot</span>
      </h1>
      <p className="text-sm mb-8" style={{ color: '#9A9DB0' }}>
        Generate SEO-optimised posts in your voice. Review before publishing.
      </p>

      <div className="grid gap-6 mb-8" style={{ gridTemplateColumns: '1fr 280px' }}>
        {/* Generator */}
        <div className="rounded-xl p-6" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>GENERATE A POST</h2>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Target keyword</label>
            <select
              value={selectedKeyword}
              onChange={e => setSelectedKeyword(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
            >
              {SEO_KEYWORDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Or enter custom keyword</label>
            <input
              value={customKeyword}
              onChange={e => setCustomKeyword(e.target.value)}
              placeholder="e.g. strokes gained vs traditional stats"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Golf news context (optional)</label>
            <textarea
              value={newsContext}
              onChange={e => setNewsContext(e.target.value)}
              placeholder="e.g. Rory McIlroy just won The Masters — weave in stats angle"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none', height: '80px', resize: 'vertical' }}
            />
          </div>

          <button
            onClick={generatePost}
            disabled={generating}
            className="w-full py-3 rounded-lg font-bold text-sm tracking-widest"
            style={{ background: generating ? '#22263A' : '#8b5cf6', color: 'white' }}
          >
            {generating ? 'GENERATING...' : '✍  GENERATE POST'}
          </button>
        </div>

        {/* SEO tips */}
        <div className="rounded-xl p-5" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
          <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>SEO NOTES</h3>
          <div className="text-sm leading-relaxed flex flex-col gap-3" style={{ color: '#9A9DB0' }}>
            <p>Each post targets a <strong style={{ color: '#F0F0F0' }}>low competition</strong>, high intent keyword.</p>
            <p>Posts are <strong style={{ color: '#F0F0F0' }}>600-900 words</strong> — enough to rank, short enough to read.</p>
            <p>Google takes <strong style={{ color: '#F0F0F0' }}>3-6 months</strong> to rank new posts. Start now.</p>
            <p>Aim for <strong style={{ color: '#F0F0F0' }}>3 posts per week</strong> for first 3 months.</p>
            <p>All posts include <strong style={{ color: '#F0F0F0' }}>meta title, meta desc, and slug</strong>.</p>
          </div>
        </div>
      </div>

      {/* Posts list */}
      {posts.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>GENERATED POSTS</h2>
          <div className="flex flex-col gap-3">
            {posts.map((post, i) => (
              <div key={i} className="rounded-xl p-4 flex items-center justify-between" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${statusColor(post.status)}20`, color: statusColor(post.status), fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{post.status}</span>
                    <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>{post.title}</p>
                  </div>
                  {post.excerpt && <p className="text-sm" style={{ color: '#9A9DB0' }}>{post.excerpt}</p>}
                  <p className="text-xs mt-1" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>/{post.slug || post.keyword}</p>
                </div>
                {(post.status === 'ready' || post.status === 'published') && (
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={() => setViewing(post as ViewingPost)}
                      className="px-4 py-2 rounded-lg text-xs font-bold"
                      style={{ background: '#22263A', color: '#F0F0F0', minHeight: 'auto' }}
                    >
                      VIEW
                    </button>
                    {post.status === 'ready' && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg text-xs font-bold"
                        style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640', minHeight: 'auto', display: 'flex', alignItems: 'center' }}
                      >
                        PREVIEW ↗
                      </a>
                    )}
                    {post.status === 'published' && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg text-xs font-bold"
                        style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', minHeight: 'auto', display: 'flex', alignItems: 'center' }}
                      >
                        LIVE ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post viewer modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={e => { if (e.target === e.currentTarget) setViewing(null) }}
        >
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2E3247' }}>
              <h2 className="text-sm font-bold" style={{ color: '#F0F0F0' }}>{viewing.title}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => publishPost(viewing)}
                  disabled={!!publishing}
                  className="px-4 py-2 rounded-lg text-xs font-bold"
                  style={{ background: publishing ? '#22263A' : '#22c55e', color: 'white', minHeight: 'auto' }}
                >
                  {publishing ? 'PUBLISHING...' : '🚀 PUBLISH LIVE'}
                </button>
                <button onClick={() => setViewing(null)} className="text-sm" style={{ color: '#9A9DB0', background: 'none', minHeight: 'auto', minWidth: 'auto' }}>✕</button>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Meta fields */}
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs uppercase tracking-widest" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>SLUG</label>
                    <button onClick={() => copy(viewing.slug, 'slug')} className="text-xs" style={{ color: copied === 'slug' ? '#22c55e' : '#9A9DB0', background: 'none', minHeight: 'auto', minWidth: 'auto' }}>
                      {copied === 'slug' ? '✓ copied' : 'copy'}
                    </button>
                  </div>
                  <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', fontFamily: 'var(--font-mono)' }}>/{viewing.slug}</div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs uppercase tracking-widest" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>META TITLE</label>
                    <button onClick={() => copy(viewing.metaTitle, 'metaTitle')} className="text-xs" style={{ color: copied === 'metaTitle' ? '#22c55e' : '#9A9DB0', background: 'none', minHeight: 'auto', minWidth: 'auto' }}>
                      {copied === 'metaTitle' ? '✓ copied' : 'copy'}
                    </button>
                  </div>
                  <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}>{viewing.metaTitle}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase tracking-widest" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>META DESCRIPTION</label>
                  <button onClick={() => copy(viewing.metaDesc, 'metaDesc')} className="text-xs" style={{ color: copied === 'metaDesc' ? '#22c55e' : '#9A9DB0', background: 'none', minHeight: 'auto', minWidth: 'auto' }}>
                    {copied === 'metaDesc' ? '✓ copied' : 'copy'}
                  </button>
                </div>
                <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}>{viewing.metaDesc}</div>
              </div>

              {/* Full HTML content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase tracking-widest" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>HTML CONTENT</label>
                  <button onClick={() => copy(viewing.content, 'content')} className="text-xs font-bold px-3 py-1 rounded-lg" style={{ background: copied === 'content' ? '#22c55e' : '#8b5cf6', color: 'white', minHeight: 'auto', minWidth: 'auto' }}>
                    {copied === 'content' ? '✓ COPIED' : 'COPY HTML'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={viewing.content}
                  className="w-full rounded-lg px-3 py-3 text-xs"
                  style={{ background: '#22263A', border: '1px solid #2E3247', color: '#9A9DB0', fontFamily: 'var(--font-mono)', height: '280px', resize: 'vertical', outline: 'none' }}
                />
              </div>

              {/* Live preview */}
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>PREVIEW</label>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2E3247', height: '300px' }}>
                  <iframe
                    srcDoc={`<style>body{font-family:Georgia,serif;max-width:680px;margin:32px auto;padding:0 16px;color:#1a1a1a;line-height:1.7}h1,h2,h3{line-height:1.3}</style>${viewing.content}`}
                    style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
                    title="Post preview"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
