'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PracticeSession {
  id: string
  date: string
  focus: string
  duration_minutes: number | null
  notes: string | null
}

const FOCUS_OPTIONS = [
  { value: 'driving',    label: 'Driving' },
  { value: 'approach',   label: 'Approach' },
  { value: 'short_game', label: 'Short game' },
  { value: 'putting',    label: 'Putting' },
  { value: 'mental',     label: 'Mental' },
] as const

const today = new Date().toISOString().split('T')[0]

function focusMeta(value: string) {
  return FOCUS_OPTIONS.find(f => f.value === value) ?? { value, label: value }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function PracticeClient() {
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [date, setDate] = useState(today)
  const [focus, setFocus] = useState<string>('short_game')
  const [duration, setDuration] = useState('45')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: loadError } = await (supabase as any)
      .from('practice_sessions')
      .select('id, date, focus, duration_minutes, notes')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)
    if (loadError) {
      setError('Could not load practice sessions. If this is your first visit, the practice_sessions table may not exist yet — see SQL_MIGRATIONS.md.')
    } else {
      setSessions(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('practice_sessions')
      .insert({
        user_id: user.id,
        date,
        focus,
        duration_minutes: duration ? parseInt(duration) : null,
        notes: notes.trim() || null,
      })
    if (insertError) {
      setError('Could not save the session — check your connection and try again.')
      setSaving(false)
      return
    }
    setNotes('')
    setDuration('45')
    setDate(today)
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('practice_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  // This month summary
  const monthStart = new Date()
  monthStart.setDate(1)
  const thisMonth = sessions.filter(s => new Date(s.date) >= monthStart)
  const monthMinutes = thisMonth.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            Practice log
          </h1>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>
            Log your sessions — your AI coach&apos;s drills work better when you do them.
          </p>
        </div>
      </div>

      {/* This month summary */}
      {thisMonth.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
            <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Sessions this month</p>
            <p className="text-2xl font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{thisMonth.length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
            <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Time practised</p>
            <p className="text-2xl font-medium" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
              {monthMinutes >= 60 ? `${Math.floor(monthMinutes / 60)}h ${monthMinutes % 60}m` : `${monthMinutes}m`}
            </p>
          </div>
        </div>
      )}

      {/* Add session */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full py-4 rounded-xl font-semibold text-base mb-6"
          style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}
        >
          + Log a practice session
        </button>
      ) : (
        <div className="p-4 rounded-xl mb-6 space-y-4" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', fontFamily: 'var(--font-dm-mono)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>What did you work on?</label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFocus(f.value)}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: focus === f.value ? '#CC222220' : '#22263A',
                    color: focus === f.value ? '#CC2222' : '#9A9DB0',
                    border: `1px solid ${focus === f.value ? '#CC222240' : '#2E3247'}`,
                    minHeight: '44px',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>Minutes</label>
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              min={5}
              max={480}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0', fontFamily: 'var(--font-dm-mono)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#9A9DB0' }}>
              Notes <span className="font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ backgroundColor: '#22263A', border: '1px solid #2E3247', color: '#F0F0F0' }}
              placeholder="Which drill? How did it feel? e.g. Gate drill, 50 putts from 6ft…"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
              style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px' }}
            >
              {saving ? 'Saving…' : 'Save session'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-center mb-4" style={{ color: '#EF4444' }}>{error}</p>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: '#1A1D27' }} />
          ))}
        </div>
      ) : sessions.length === 0 && !error ? (
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            No sessions logged yet
          </h2>
          <p className="text-sm max-w-xs mx-auto" style={{ color: '#9A9DB0' }}>
            Your AI coach gives you drills after every round — log the sessions here and watch the stats prove the work.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const meta = focusMeta(s.focus)
            return (
              <div key={s.id} className="p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: '#F0F0F0' }}>
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-3">
                    {s.duration_minutes !== null && (
                      <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: '#9A9DB0' }}>
                        {s.duration_minutes}m
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: '#4A4D60', minHeight: '32px' }}
                      aria-label="Delete session"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-xs" style={{ color: '#9A9DB0' }}>{formatDate(s.date)}</p>
                {s.notes && (
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: '#9A9DB0' }}>{s.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
