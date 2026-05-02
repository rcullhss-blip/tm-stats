'use client'

import { useState, useEffect, useRef } from 'react'

const PROMPTS = [
  "I keep losing confidence after a bad hole",
  "I play well in practice but fall apart in competition",
  "I can't stop thinking about my swing on the course",
  "I get nervous on the first tee",
]

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Session {
  id: string
  title: string
  updated_at: string
}

interface Props {
  isPro: boolean
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function MentalGameClient({ isPro }: Props) {
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isPro) loadSessions()
  }, [isPro])

  useEffect(() => {
    if (view === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, view])

  async function loadSessions() {
    setSessionsLoading(true)
    try {
      const res = await fetch('/api/mental')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions ?? [])
      }
    } finally {
      setSessionsLoading(false)
    }
  }

  async function openSession(id: string) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/mental?sessionId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.session?.messages ?? [])
        setActiveSessionId(id)
        setView('chat')
      }
    } finally {
      setLoading(false)
    }
  }

  function startNewChat() {
    setActiveSessionId(null)
    setMessages([])
    setMessage('')
    setError(null)
    setView('chat')
  }

  async function send(text?: string) {
    const msg = text ?? message
    if (!msg.trim()) return
    setLoading(true)
    setError(null)

    const userMsg: Message = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setMessage('')

    try {
      const res = await fetch('/api/mental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId: activeSessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      if (!activeSessionId && data.sessionId) {
        setActiveSessionId(data.sessionId)
        loadSessions()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
      setMessages(prev => prev.slice(0, -1))
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/mental?sessionId=${id}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  if (!isPro) {
    return (
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222230' }}>
        <div className="flex items-start gap-3">
          <span className="text-xl">🧠</span>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Mental Game — Pro feature</p>
            <p className="text-xs mb-3" style={{ color: '#9A9DB0' }}>
              Talk through the mental side of your game with an experienced golf mentor.
            </p>
            <a
              href="/upgrade"
              className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}
            >
              Go Pro
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Chat view ──────────────────────────────────────────────────────────────
  if (view === 'chat') {
    return (
      <div>
        {/* Back + header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => { setView('list'); loadSessions() }}
            className="flex items-center gap-1 text-sm"
            style={{ color: '#9A9DB0', minHeight: '44px' }}
          >
            ← Back
          </button>
          <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>
            {activeSessionId ? 'Continuing chat' : 'New chat'}
          </p>
        </div>

        {/* Message thread */}
        <div className="space-y-3 mb-4">
          {messages.length === 0 && !loading && (
            <>
              <p className="text-xs mb-3" style={{ color: '#4A4D60' }}>Common topics</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {PROMPTS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => send(p)}
                    className="px-3 py-2 rounded-lg text-xs text-left"
                    style={{ backgroundColor: '#1A1D27', color: '#9A9DB0', border: '1px solid #2E3247' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={
                  m.role === 'user'
                    ? { backgroundColor: '#CC2222', color: '#F0F0F0', borderBottomRightRadius: '4px' }
                    : { backgroundColor: '#1A1D27', color: '#F0F0F0', border: '1px solid #2E3247', borderBottomLeftRadius: '4px' }
                }
              >
                {m.role === 'assistant' ? (
                  m.content.split('\n').filter(l => l.trim()).map((line, li) => (
                    <p key={li} className={li > 0 ? 'mt-2' : ''}>{line}</p>
                  ))
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="block w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: '#9A9DB0',
                        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #EF444430' }}>
              <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs px-3 py-1 rounded-lg"
                style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-28">
          <div
            className="flex gap-2 p-2 rounded-2xl"
            style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
          >
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What's on your mind about your golf?"
              rows={2}
              className="flex-1 px-3 py-2 text-sm resize-none outline-none bg-transparent"
              style={{ color: '#F0F0F0' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
              }}
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!message.trim() || loading}
              className="flex-shrink-0 flex items-center justify-center rounded-xl px-4"
              style={{
                backgroundColor: message.trim() && !loading ? '#CC2222' : '#22263A',
                color: '#F0F0F0',
                minWidth: '52px',
                minHeight: '48px',
              }}
            >
              →
            </button>
          </div>
        </div>

        <p className="text-xs mt-4 leading-relaxed" style={{ color: '#4A4D60' }}>
          TM Stats Mental Game is a golf-specific thinking tool, not a substitute for professional mental health support.
        </p>

        <style>{`
          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-6px); }
          }
        `}</style>
      </div>
    )
  }

  // ── Sessions list view ─────────────────────────────────────────────────────
  return (
    <div>
      <button
        type="button"
        onClick={startNewChat}
        className="w-full py-3.5 rounded-xl font-semibold text-sm mb-5"
        style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '52px' }}
      >
        + Start new chat
      </button>

      {sessionsLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: '#1A1D27' }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-3">💬</p>
          <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>No chats yet</p>
          <p className="text-xs" style={{ color: '#9A9DB0' }}>
            Start a conversation about the mental side of your game.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#4A4D60' }}>
            Past conversations
          </p>
          <div className="space-y-2">
            {sessions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => openSession(s.id)}
                className="w-full text-left p-4 rounded-xl flex items-center justify-between gap-3 active:opacity-80"
                style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#F0F0F0' }}>
                    {s.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#4A4D60' }}>
                    {formatDate(s.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs" style={{ color: '#9A9DB0' }}>Continue →</span>
                  <button
                    type="button"
                    onClick={(e) => deleteSession(s.id, e)}
                    className="flex items-center justify-center rounded-lg"
                    style={{ color: '#4A4D60', width: '32px', height: '32px' }}
                    aria-label="Delete chat"
                  >
                    ✕
                  </button>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="text-xs mt-6 leading-relaxed" style={{ color: '#4A4D60' }}>
        TM Stats Mental Game is a golf-specific thinking tool, not a substitute for professional mental health support.
      </p>
    </div>
  )
}
