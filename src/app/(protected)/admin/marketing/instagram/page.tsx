'use client'

import { useState } from 'react'
import Link from 'next/link'

type Post = {
  id: string
  type: string
  topic: string
  caption: string
  imagePrompt: string
  status: 'ready' | 'generating' | 'failed'
}

const POST_TYPES = [
  { value: 'stat', label: '📊 Stat of the week', color: '#3b82f6' },
  { value: 'news', label: '📰 Golf news tie-in', color: '#C22431' },
  { value: 'feature', label: '⚙️ Feature spotlight', color: '#8b5cf6' },
  { value: 'educational', label: '🎓 Strokes Gained tip', color: '#22c55e' },
]

export default function InstagramPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [generating, setGenerating] = useState(false)
  const [postType, setPostType] = useState('stat')
  const [topic, setTopic] = useState('')
  const [newsContext, setNewsContext] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  function copyCaption(id: string, caption: string) {
    navigator.clipboard.writeText(caption)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function generatePost() {
    if (!topic.trim()) return
    setGenerating(true)

    const tempId = Math.random().toString(36).slice(2)
    setPosts(prev => [{ id: tempId, type: postType, topic, caption: 'Generating...', imagePrompt: '', status: 'generating' }, ...prev])

    try {
      const res = await fetch('/api/marketing/instagram/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: postType, topic, newsContext }),
      })
      const data = await res.json()

      setPosts(prev => prev.map(p => p.id === tempId
        ? data.error
          ? { ...p, caption: 'Generation failed', status: 'failed' as const }
          : { ...p, caption: data.caption, imagePrompt: data.imagePrompt, status: 'ready' as const }
        : p
      ))
    } catch {
      setPosts(prev => prev.map(p => p.id === tempId ? { ...p, status: 'failed' as const } : p))
    }

    setGenerating(false)
    setTopic('')
  }

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>
        <Link href="/admin/marketing" style={{ color: '#9A9DB0' }}>← marketing hub</Link>
        <span style={{ color: '#2E3247' }}>/</span>
        <span style={{ color: '#F0F0F0' }}>instagram autopilot</span>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ color: '#F0F0F0' }}>
        Instagram <span style={{ color: '#ec4899' }}>Autopilot</span>
      </h1>
      <p className="text-sm mb-8" style={{ color: '#9A9DB0' }}>
        Generate captions + graphic briefs. You approve, then schedule via Buffer or Later.
      </p>

      {/* Generator */}
      <div className="rounded-xl p-6 mb-6" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
        <div className="flex gap-2 mb-4 flex-wrap">
          {POST_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setPostType(t.value)}
              className="text-sm px-3 py-2 rounded-lg transition-all"
              style={{
                background: postType === t.value ? t.color : '#22263A',
                color: 'white',
                fontWeight: postType === t.value ? '700' : '400',
                minHeight: 'auto',
              }}
            >{t.label}</button>
          ))}
        </div>

        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Topic / hook</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. approach play stats for 10-20 handicappers"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>Golf news context (optional)</label>
            <input
              value={newsContext}
              onChange={e => setNewsContext(e.target.value)}
              placeholder="e.g. link to current golf story"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', outline: 'none' }}
            />
          </div>
        </div>

        <button
          onClick={generatePost}
          disabled={generating || !topic.trim()}
          className="px-6 py-3 rounded-lg font-bold text-sm tracking-widest"
          style={{ background: generating || !topic.trim() ? '#22263A' : '#ec4899', color: 'white', minHeight: 'auto' }}
        >
          {generating ? 'GENERATING...' : '▣  GENERATE POST'}
        </button>
      </div>

      {/* Posts queue */}
      {posts.length > 0 && (
        <div className="flex flex-col gap-3">
          {posts.map(post => (
            <div key={post.id} className="rounded-xl p-5" style={{ background: '#1A1D27', border: '1px solid #2E3247' }}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex gap-2 mb-3 items-center">
                    <span className="text-xs px-2 py-0.5 rounded" style={{
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      background: post.status === 'ready' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                      color: post.status === 'ready' ? '#22c55e' : '#f59e0b',
                    }}>{post.status}</span>
                    <span className="text-xs" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>{post.type} · {post.topic}</span>
                  </div>

                  {post.status === 'ready' && (
                    <>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3" style={{ color: '#F0F0F0' }}>{post.caption}</p>
                      {post.imagePrompt && (
                        <div className="rounded-lg p-3" style={{ background: '#22263A', border: '1px solid #2E3247' }}>
                          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#9A9DB0', fontFamily: 'var(--font-mono)' }}>GRAPHIC BRIEF</p>
                          <p className="text-xs" style={{ color: '#9A9DB0' }}>{post.imagePrompt}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {post.status === 'ready' && (
                  <div className="flex flex-col gap-2" style={{ minWidth: '90px' }}>
                    <button
                      onClick={() => copyCaption(post.id, post.caption)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: copied === post.id ? '#22c55e' : '#22263A', color: 'white', minHeight: 'auto' }}
                    >{copied === post.id ? '✓ COPIED' : 'COPY'}</button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.3)', minHeight: 'auto' }}>SCHEDULE</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
