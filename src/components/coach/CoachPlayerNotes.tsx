'use client'

import { useState } from 'react'

interface Props {
  playerId: string
  initialNotes: string
}

export default function CoachPlayerNotes({ playerId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    await fetch('/api/coach/player-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, notes: draft }),
    })
    setNotes(draft)
    setEditing(false)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9A9DB0' }}>
          Player context
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => { setDraft(notes); setEditing(true) }}
            className="text-xs"
            style={{ color: '#CC2222' }}
          >
            {notes ? 'Edit' : '+ Add context'}
          </button>
        )}
        {saved && <span className="text-xs" style={{ color: '#22C55E' }}>Saved</span>}
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={4}
            placeholder="Tendencies, injury history, technical work in progress, mental notes, course management habits... This context is included in all AI coaching for this player."
            className="w-full px-3 py-2.5 rounded-xl text-sm resize-none mb-2"
            style={{ backgroundColor: '#1A1D27', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none' }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ backgroundColor: '#22263A', color: '#9A9DB0' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: '#CC2222', color: '#F0F0F0', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save context'}
            </button>
          </div>
        </div>
      ) : notes ? (
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC222220' }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#9A9DB0' }}>{notes}</p>
        </div>
      ) : (
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1D27', border: '1px dashed #2E3247' }}>
          <p className="text-xs text-center" style={{ color: '#4A4D60' }}>
            No context yet. Add notes about this player to improve AI coaching accuracy.
          </p>
        </div>
      )}
    </div>
  )
}
