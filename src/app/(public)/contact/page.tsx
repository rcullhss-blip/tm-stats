'use client'

import { useState } from 'react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!email || !message) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSent(true)
    } catch {
      setError('Something went wrong — please try emailing us directly.')
    } finally {
      setSending(false)
    }
  }

  const inputStyle = {
    backgroundColor: '#1A1D27',
    border: '1px solid #2E3247',
    color: '#F0F0F0',
    borderRadius: '12px',
    padding: '12px 16px',
    width: '100%',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>
        Get in touch
      </p>
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
        Contact us
      </h1>
      <p className="text-sm mb-8" style={{ color: '#9A9DB0' }}>
        We aim to respond within 48 hours.
      </p>

      {sent ? (
        <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-2xl mb-3">✓</p>
          <p className="font-semibold mb-1" style={{ color: '#F0F0F0' }}>Message sent</p>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>
            We&apos;ll get back to you within 48 hours.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Email <span style={{ color: '#CC2222' }}>*</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Message <span style={{ color: '#CC2222' }}>*</span></label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              placeholder="How can we help?"
              rows={5}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {error && (
            <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!email || !message || sending}
            className="w-full py-4 rounded-xl font-semibold text-base"
            style={{
              backgroundColor: (!email || !message) ? '#7a1414' : '#CC2222',
              color: '#F0F0F0',
              opacity: (!email || !message || sending) ? 0.6 : 1,
              minHeight: '56px',
            }}
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
          <p className="text-xs text-center" style={{ color: '#4A4D60' }}>
            Or email us at{' '}
            <a href="mailto:info@tmstatsgolf.com" style={{ color: '#9A9DB0' }}>
              info@tmstatsgolf.com
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
