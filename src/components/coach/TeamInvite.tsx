'use client'

import { useState } from 'react'

/** The team's join link and QR code: players scan it or tap it and they are on the team. */
export default function TeamInvite({ teamName, code, link, qrSvg }: { teamName: string; code: string; link: string; qrSvg: string }) {
  const [copied, setCopied] = useState(false)
  const [big, setBig] = useState(false)

  async function share() {
    const text = `Join ${teamName} on TM Stats: ${link}`
    try {
      if (navigator.share) { await navigator.share({ title: `Join ${teamName}`, text, url: link }); return }
    } catch { return }
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  return (
    <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: '#1A1D27' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9A9DB0' }}>Get your players on</p>
      <div className="flex gap-4 items-center">
        <button type="button" onClick={() => setBig(true)} aria-label="Show the QR code full screen" className="flex-shrink-0 rounded-lg p-2" style={{ backgroundColor: '#FFFFFF', width: '112px', height: '112px' }}>
          <span className="block w-full h-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </button>
        <div className="min-w-0">
          <p className="text-xs" style={{ color: '#9A9DB0' }}>Players scan this with their phone camera, or tap the link. They&apos;re straight onto the team.</p>
          <p className="text-xs mt-2" style={{ color: '#4A4D60' }}>Or they type the code in Profile:</p>
          <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#CC2222', letterSpacing: '0.2em' }}>{code}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button type="button" onClick={share} className="rounded-xl font-semibold text-sm" style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '48px' }}>{copied ? 'Link copied' : 'Send the link'}</button>
        <a href={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`} download={`${teamName.replace(/[^a-z0-9]+/gi, '-')}-join-QR.svg`} className="rounded-xl text-sm flex items-center justify-center" style={{ backgroundColor: 'transparent', color: '#9A9DB0', border: '1px solid #2E3247', minHeight: '48px' }}>Save QR code</a>
      </div>

      {big && (
        <button type="button" onClick={() => setBig(false)} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#FFFFFF' }} aria-label="Close">
          <p className="text-lg font-bold mb-4" style={{ color: '#0F1117' }}>Scan to join {teamName}</p>
          <span className="block" style={{ width: 'min(80vw, 420px)', height: 'min(80vw, 420px)' }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="text-sm mt-4" style={{ color: '#4A4D60' }}>Tap anywhere to close</p>
        </button>
      )}
    </div>
  )
}
