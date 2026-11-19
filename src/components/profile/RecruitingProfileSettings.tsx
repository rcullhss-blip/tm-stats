'use client'

import { useState, useTransition } from 'react'
import { saveRecruitingProfile } from '@/app/(protected)/profile/actions'
import type { ProfileInfo } from '@/lib/recruit-profile'

interface RecentRound { id: string; date: string; course: string; holes: number; score: number; toPar: number; type: string }

interface Props {
  isPublic: boolean
  slug: string | null
  info: ProfileInfo
  rounds?: RecentRound[]
}

const field = { backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', outline: 'none', minHeight: '48px' } as const
const SITE = 'https://www.tmstatsgolf.com'

/** The page a golfer sends to college coaches. Off until they switch it on. */
export default function RecruitingProfileSettings({ isPublic, slug, info, rounds = [] }: Props) {
  const [showPractice, setShowPractice] = useState(info.showPractice)
  const [hidden, setHidden] = useState<string[]>(info.hiddenRounds)
  const [showList, setShowList] = useState(false)
  const [on, setOn] = useState(isPublic)
  const [gradYear, setGradYear] = useState(info.gradYear ? String(info.gradYear) : '')
  const [homeClub, setHomeClub] = useState(info.homeClub ?? '')
  const [bio, setBio] = useState(info.bio ?? '')
  const [contact, setContact] = useState(info.contact ?? '')
  const [link, setLink] = useState(isPublic && slug ? `${SITE}/p/${slug}` : null)
  const [pending, start] = useTransition()
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  const thisYear = new Date().getFullYear()

  function save() {
    setNote(null)
    start(async () => {
      const res = await saveRecruitingProfile({ isPublic: on, gradYear: gradYear ? Number(gradYear) : null, homeClub, bio, contact, showPractice, hiddenRounds: hidden })
      if (res?.error) { setNote({ text: res.error, ok: false }); return }
      setLink(on && res?.slug ? `${SITE}/p/${res.slug}` : null)
      setNote({ text: on ? 'Saved. Your profile is live.' : 'Saved. Your profile is switched off.', ok: true })
    })
  }

  async function copy() {
    if (!link) return
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  return (
    <div id="recruiting">
      <p className="text-sm font-semibold mb-1" style={{ color: '#F0F0F0' }}>Recruiting profile</p>
      <p className="text-xs mb-4" style={{ color: '#9A9DB0' }}>
        One link to send to college coaches: your scoring, recent rounds and the handicap each part of your game plays like. Only people you give the link to can find it.
      </p>

      <label className="flex items-start gap-3 mb-4" style={{ minHeight: '44px' }}>
        <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} style={{ width: '22px', height: '22px', accentColor: '#CC2222', marginTop: '2px', flexShrink: 0 }} />
        <span>
          <span className="text-sm block" style={{ color: '#F0F0F0' }}>Switch my profile on</span>
          <span className="text-xs" style={{ color: '#9A9DB0' }}>It shows your name, handicap, scores and stats. Your notes, email and coaching feedback are never shown.</span>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Starting college in</label>
          <select value={gradYear} onChange={e => setGradYear(e.target.value)} className="w-full px-3 rounded-lg text-sm" style={field}>
            <option value="">Not set</option>
            {Array.from({ length: 8 }, (_, i) => thisYear + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>Home club or school</label>
          <input value={homeClub} onChange={e => setHomeClub(e.target.value)} maxLength={80} placeholder="e.g. Bromborough GC" className="w-full px-3 rounded-lg text-sm" style={field} />
        </div>
      </div>

      <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>About you ({bio.length}/400)</label>
      <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 400))} rows={3} placeholder="Wins, county or national honours, what you are studying, what you are looking for." className="w-full px-3 py-3 rounded-lg text-sm mb-3" style={{ ...field, resize: 'vertical' }} />

      <label className="text-xs mb-1 block" style={{ color: '#9A9DB0' }}>How a coach should contact you</label>
      <input value={contact} onChange={e => setContact(e.target.value)} maxLength={120} placeholder="e.g. through my coach, or an email address" className="w-full px-3 rounded-lg text-sm mb-1" style={field} />
      <p className="text-xs mb-4" style={{ color: '#4A4D60' }}>Shown on the page exactly as typed. Leave blank to show nothing.</p>

      {/* Which rounds coaches see */}
      <label className="flex items-start gap-3 mb-2" style={{ minHeight: '44px' }}>
        <input type="checkbox" checked={showPractice} onChange={e => setShowPractice(e.target.checked)} style={{ width: '22px', height: '22px', accentColor: '#CC2222', marginTop: '2px', flexShrink: 0 }} />
        <span>
          <span className="text-sm block" style={{ color: '#F0F0F0' }}>Include practice rounds</span>
          <span className="text-xs" style={{ color: '#9A9DB0' }}>Turn off to show only competition, qualifying and tournament rounds.</span>
        </span>
      </label>
      {rounds.length > 0 && (
        <div className="mb-4">
          <button type="button" onClick={() => setShowList(v => !v)} className="text-sm" style={{ color: '#CC2222', minHeight: '44px' }}>
            {showList ? 'Done choosing rounds' : `Choose which rounds to show${hidden.length > 0 ? ` (${hidden.length} hidden)` : ''}`}
          </button>
          {showList && (
            <div className="rounded-xl overflow-hidden mt-1" style={{ backgroundColor: '#22263A' }}>
              {rounds.map((r, i) => {
                const off = hidden.includes(r.id) || (!showPractice && r.type === 'practice')
                const lockedOff = !showPractice && r.type === 'practice'
                return (
                  <button key={r.id} type="button" disabled={lockedOff}
                    onClick={() => setHidden(h => (h.includes(r.id) ? h.filter(x => x !== r.id) : [...h, r.id]))}
                    className="w-full flex items-center justify-between px-3 py-2 text-left" style={{ borderTop: i > 0 ? '1px solid #2E3247' : 'none', minHeight: '48px', opacity: lockedOff ? 0.5 : 1 }}>
                    <span className="min-w-0 pr-2">
                      <span className="text-sm block truncate" style={{ color: off ? '#4A4D60' : '#F0F0F0', textDecoration: off ? 'line-through' : 'none' }}>{r.course}</span>
                      <span className="text-xs" style={{ color: '#9A9DB0' }}>{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {r.holes} holes · {r.type}</span>
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm" style={{ fontFamily: 'var(--font-dm-mono)', color: off ? '#4A4D60' : '#F0F0F0' }}>{r.score}</span>
                      <span className="text-xs w-12 text-right" style={{ color: off ? '#9A9DB0' : '#22C55E' }}>{off ? 'Hidden' : 'Shown'}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {showList && <p className="text-xs mt-1" style={{ color: '#4A4D60' }}>Tap a round to hide or show it, then Save. Hidden rounds also leave your averages on the page.</p>}
        </div>
      )}

      <button type="button" onClick={save} disabled={pending} className="w-full rounded-xl font-semibold text-sm" style={{ backgroundColor: '#22263A', color: '#F0F0F0', border: '1px solid #2E3247', minHeight: '48px', opacity: pending ? 0.6 : 1 }}>
        {pending ? 'Saving…' : 'Save'}
      </button>
      {note && <p className="text-xs mt-2" style={{ color: note.ok ? '#22C55E' : '#EF4444' }}>{note.text}</p>}

      {link && (
        <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: '#22263A', border: '1px solid #CC222260' }}>
          <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Your link</p>
          <p className="text-sm break-all mb-3" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{link.replace('https://', '')}</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={copy} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '44px' }}>{copied ? 'Copied' : 'Copy link'}</button>
            <a href={link} target="_blank" rel="noreferrer" className="rounded-xl text-sm flex items-center justify-center" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '44px' }}>Open it</a>
          </div>
        </div>
      )}
    </div>
  )
}
