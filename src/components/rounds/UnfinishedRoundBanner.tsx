'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// The round being entered is kept on this phone (see NewRoundClient). If one is
// part way through, say so wherever the golfer lands, so it is never forgotten.
const DRAFT_KEY = 'tmstats_round_draft'

export default function UnfinishedRoundBanner() {
  const [draft, setDraft] = useState<{ course: string; done: number; holes: number; review: boolean } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (!d?.setup?.courseName || !Array.isArray(d.holes)) return
      setDraft({ course: d.setup.courseName, done: d.step === 'summary' ? d.holes.length : d.highest ?? 0, holes: d.setup.holes ?? d.holes.length, review: d.step === 'summary' })
    } catch {}
  }, [])

  if (!draft) return null
  return (
    <Link href="/rounds/new" className="block mb-4 p-4 rounded-xl" style={{ backgroundColor: '#CC222215', border: '1px solid #CC222260' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#CC2222' }}>Unfinished round</p>
      <p className="text-sm" style={{ color: '#F0F0F0' }}>
        {draft.course}: {draft.review ? 'all holes in, ready to save' : `${draft.done} of ${draft.holes} holes entered`}. <span style={{ color: '#CC2222', fontWeight: 600 }}>Carry on →</span>
      </p>
    </Link>
  )
}
