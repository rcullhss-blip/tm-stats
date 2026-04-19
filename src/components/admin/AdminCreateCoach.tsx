'use client'

import { useState } from 'react'

export default function AdminCreateCoach() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setStatus('loading')
    setMessage('')

    const res = await fetch('/api/admin/create-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setStatus('error')
      setMessage(data.error ?? 'Something went wrong')
    } else {
      setStatus('success')
      setMessage(`Coach account created for ${email}`)
      setName('')
      setEmail('')
      setPassword('')
    }
  }

  return (
    <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: '#F0F0F0' }}>Create coach account</p>
      <form onSubmit={handleCreate} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name (optional)"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email address"
          required
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}
        />
        <input
          type="text"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Temporary password"
          required
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}
        />
        {message && (
          <p className="text-xs" style={{ color: status === 'success' ? '#22C55E' : '#EF4444' }}>
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: '#3B82F6', color: '#F0F0F0' }}
        >
          {status === 'loading' ? 'Creating…' : 'Create coach account'}
        </button>
      </form>
    </div>
  )
}
