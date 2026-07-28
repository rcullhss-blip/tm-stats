'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

export interface ShareData {
  courseName: string
  date: string
  holes: number
  score: number
  toPar: number
  par: number
  firPct: number | null
  girPct: number | null
  putts: number | null
  birdies: number
  sgTotal: number | null
  sgOffTee: number | null
  sgApproach: number | null
  sgAroundGreen: number | null
  sgPutt: number | null
  processPct: number | null
  playerName: string | null
}

interface Props {
  data: ShareData
}

function fmtToPar(n: number): string {
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

function fmtSGNum(n: number): string {
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Canvas rendering — 1080×1920 Instagram story format ─────────────────────

async function drawStoryImage(data: ShareData): Promise<Blob | null> {
  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const scoreColor = '#F0F0F0' // score always white on the share card

  // Background
  ctx.fillStyle = '#0F1117'
  ctx.fillRect(0, 0, W, H)

  // Subtle top accent
  ctx.fillStyle = '#CC2222'
  ctx.fillRect(0, 0, W, 12)

  // Brand
  ctx.textAlign = 'center'
  ctx.fillStyle = '#CC2222'
  ctx.font = 'bold 64px -apple-system, "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('TM STATS', W / 2, 200)
  ctx.fillStyle = '#9A9DB0'
  ctx.font = '36px -apple-system, "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('TRACK TO IMPROVE', W / 2, 260)

  // Course + date
  ctx.fillStyle = '#F0F0F0'
  ctx.font = 'bold 58px -apple-system, "Helvetica Neue", Arial, sans-serif'
  const course = data.courseName.length > 26 ? data.courseName.slice(0, 25) + '…' : data.courseName
  ctx.fillText(course, W / 2, 420)
  ctx.fillStyle = '#9A9DB0'
  ctx.font = '38px -apple-system, "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(`${formatDate(data.date)}  ·  ${data.holes} holes`, W / 2, 490)

  // Score hero
  ctx.fillStyle = scoreColor
  ctx.font = 'bold 300px -apple-system, "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(`${data.score}`, W / 2, 850)
  ctx.font = 'bold 96px -apple-system, "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(fmtToPar(data.toPar), W / 2, 980)
  ctx.fillStyle = '#9A9DB0'
  ctx.font = '40px -apple-system, "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(`Par ${data.par}`, W / 2, 1050)

  // Stats row
  const stats: { label: string; value: string }[] = []
  if (data.firPct !== null) stats.push({ label: 'FAIRWAYS', value: `${data.firPct}%` })
  if (data.girPct !== null) stats.push({ label: 'GREENS', value: `${data.girPct}%` })
  if (data.putts !== null) stats.push({ label: 'PUTTS', value: `${data.putts}` })
  if (data.birdies > 0) stats.push({ label: 'BIRDIES+', value: `${data.birdies}` })

  if (stats.length > 0) {
    const boxW = 220
    const gap = 24
    const totalW = stats.length * boxW + (stats.length - 1) * gap
    let x = (W - totalW) / 2
    const y = 1140
    for (const s of stats) {
      ctx.fillStyle = '#1A1D27'
      ctx.beginPath()
      ctx.roundRect(x, y, boxW, 170, 24)
      ctx.fill()
      ctx.fillStyle = '#F0F0F0'
      ctx.font = 'bold 64px -apple-system, "Helvetica Neue", Arial, sans-serif'
      ctx.fillText(s.value, x + boxW / 2, y + 90)
      ctx.fillStyle = '#9A9DB0'
      ctx.font = '28px -apple-system, "Helvetica Neue", Arial, sans-serif'
      ctx.fillText(s.label, x + boxW / 2, y + 140)
      x += boxW + gap
    }
  }

  // SG block
  let y = 1340
  if (data.sgTotal !== null) {
    ctx.fillStyle = '#1A1D27'
    ctx.beginPath()
    ctx.roundRect(80, y, W - 160, 280, 24)
    ctx.fill()

    ctx.fillStyle = '#9A9DB0'
    ctx.font = 'bold 32px -apple-system, "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('STROKES GAINED', 130, y + 70)
    ctx.textAlign = 'right'
    ctx.fillStyle = data.sgTotal >= 0 ? '#22C55E' : '#EF4444'
    ctx.font = 'bold 56px -apple-system, "Helvetica Neue", Arial, sans-serif'
    ctx.fillText(fmtSGNum(data.sgTotal), W - 130, y + 78)

    const cats = [
      { label: 'Tee', v: data.sgOffTee },
      { label: 'App', v: data.sgApproach },
      { label: 'A/G', v: data.sgAroundGreen },
      { label: 'Putt', v: data.sgPutt },
    ].filter(c => c.v !== null) as { label: string; v: number }[]

    const catW = (W - 260) / cats.length
    cats.forEach((c, i) => {
      const cx = 130 + catW * i + catW / 2
      ctx.textAlign = 'center'
      ctx.fillStyle = c.v >= 0 ? '#22C55E' : '#EF4444'
      ctx.font = 'bold 48px -apple-system, "Helvetica Neue", Arial, sans-serif'
      ctx.fillText(fmtSGNum(c.v), cx, y + 180)
      ctx.fillStyle = '#9A9DB0'
      ctx.font = '30px -apple-system, "Helvetica Neue", Arial, sans-serif'
      ctx.fillText(c.label, cx, y + 235)
    })
    y += 330
  }

  // Process %
  if (data.processPct !== null) {
    ctx.fillStyle = '#1A1D27'
    ctx.beginPath()
    ctx.roundRect(80, y, W - 160, 110, 24)
    ctx.fill()
    ctx.textAlign = 'left'
    ctx.fillStyle = '#9A9DB0'
    ctx.font = 'bold 32px -apple-system, "Helvetica Neue", Arial, sans-serif'
    ctx.fillText('MENTAL PROCESS', 130, y + 70)
    ctx.textAlign = 'right'
    ctx.fillStyle = data.processPct >= 80 ? '#22C55E' : data.processPct >= 60 ? '#F59E0B' : '#EF4444'
    ctx.font = 'bold 56px -apple-system, "Helvetica Neue", Arial, sans-serif'
    ctx.fillText(`${data.processPct}%`, W - 130, y + 75)
  }

  // Bottom band — QR code straight to signup, fixed position clear of all content
  try {
    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, 'https://tmstatsgolf.com/signup', {
      width: 110,
      margin: 1,
      color: { dark: '#0F1117', light: '#F0F0F0' },
    })
    ctx.drawImage(qrCanvas, 120, H - 130, 110, 110)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#F0F0F0'
    ctx.font = 'bold 36px -apple-system, "Helvetica Neue", Arial, sans-serif'
    ctx.fillText('tmstatsgolf.com', 260, H - 78)
    ctx.fillStyle = '#9A9DB0'
    ctx.font = '28px -apple-system, "Helvetica Neue", Arial, sans-serif'
    ctx.fillText('Scan to analyse your game free', 260, H - 38)

    // Logo bottom-right
    try {
      const logo = new Image()
      logo.src = '/logo-white.png'
      await logo.decode()
      if (logo.naturalWidth > 0) {
        const lw = 240
        const lh = (lw * logo.naturalHeight) / logo.naturalWidth
        ctx.drawImage(logo, W - lw - 100, H - 75 - lh / 2, lw, lh)
      }
    } catch {}
  } catch {
    ctx.textAlign = 'center'
    ctx.fillStyle = '#9A9DB0'
    ctx.font = '34px -apple-system, "Helvetica Neue", Arial, sans-serif'
    ctx.fillText('tmstatsgolf.com', W / 2, H - 80)
  }

  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'))
}

export default function ShareCard({ data }: Props) {
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')

  const scoreColor = '#F0F0F0' // score always white on the share card

  async function handleShare() {
    setSharing(true)
    setMessage('')
    try {
      const blob = await drawStoryImage(data)
      if (!blob) throw new Error('no canvas')
      const file = new File([blob], 'tm-stats-round.png', { type: 'image/png' })

      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
        setMessage('Shared!')
      } else {
        // Desktop fallback — download the image
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'tm-stats-round.png'
        a.click()
        URL.revokeObjectURL(url)
        setMessage('Image downloaded — post it anywhere.')
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        setMessage('Could not share — try a screenshot of the card instead.')
      }
    }
    setSharing(false)
  }

  const stats: { label: string; value: string }[] = []
  if (data.firPct !== null) stats.push({ label: 'Fairways', value: `${data.firPct}%` })
  if (data.girPct !== null) stats.push({ label: 'Greens', value: `${data.girPct}%` })
  if (data.putts !== null) stats.push({ label: 'Putts', value: `${data.putts}` })
  if (data.birdies > 0) stats.push({ label: 'Birdies+', value: `${data.birdies}` })

  const sgCats = [
    { label: 'Tee', v: data.sgOffTee },
    { label: 'App', v: data.sgApproach },
    { label: 'A/G', v: data.sgAroundGreen },
    { label: 'Putt', v: data.sgPutt },
  ].filter(c => c.v !== null) as { label: string; v: number }[]

  return (
    <div>
      {/* Preview card — story proportions */}
      <div
        className="rounded-2xl overflow-hidden mx-auto mb-5 px-6 py-8 text-center"
        style={{ backgroundColor: '#0F1117', border: '1px solid #2E3247', maxWidth: '340px', borderTop: '6px solid #CC2222' }}
      >
        <p className="text-lg font-bold tracking-widest" style={{ color: '#CC2222', fontFamily: 'var(--font-dm-sans)' }}>TM STATS</p>
        <p className="text-xs tracking-widest mb-6" style={{ color: '#9A9DB0' }}>TRACK TO IMPROVE</p>

        <p className="text-lg font-bold mb-0.5" style={{ color: '#F0F0F0', fontFamily: 'var(--font-dm-sans)' }}>{data.courseName}</p>
        <p className="text-xs mb-6" style={{ color: '#9A9DB0' }}>{formatDate(data.date)} · {data.holes} holes</p>

        <p className="font-bold leading-none" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor, fontSize: '88px' }}>{data.score}</p>
        <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'var(--font-dm-mono)', color: scoreColor }}>{fmtToPar(data.toPar)}</p>
        <p className="text-xs mb-6" style={{ color: '#9A9DB0' }}>Par {data.par}</p>

        {stats.length > 0 && (
          <div className="flex justify-center gap-2 mb-4">
            {stats.map(s => (
              <div key={s.label} className="px-2 py-2 rounded-lg flex-1" style={{ backgroundColor: '#1A1D27' }}>
                <p className="text-base font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>{s.value}</p>
                <p style={{ color: '#9A9DB0', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {data.sgTotal !== null && (
          <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: '#1A1D27' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold tracking-wide" style={{ color: '#9A9DB0' }}>STROKES GAINED</p>
              <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: data.sgTotal >= 0 ? '#22C55E' : '#EF4444' }}>
                {fmtSGNum(data.sgTotal)}
              </p>
            </div>
            <div className="flex justify-between">
              {sgCats.map(c => (
                <div key={c.label} className="text-center flex-1">
                  <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: c.v >= 0 ? '#22C55E' : '#EF4444' }}>{fmtSGNum(c.v)}</p>
                  <p style={{ color: '#9A9DB0', fontSize: '9px' }}>{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.processPct !== null && (
          <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ backgroundColor: '#1A1D27' }}>
            <p className="text-xs font-semibold tracking-wide" style={{ color: '#9A9DB0' }}>MENTAL PROCESS</p>
            <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-dm-mono)', color: data.processPct >= 80 ? '#22C55E' : data.processPct >= 60 ? '#F59E0B' : '#EF4444' }}>
              {data.processPct}%
            </p>
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="TM Stats" style={{ height: '26px', width: 'auto', margin: '0 auto 6px' }} />
        <p className="text-xs" style={{ color: '#9A9DB0' }}>tmstatsgolf.com</p>
      </div>

      {/* Share actions */}
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="w-full py-4 rounded-xl font-semibold text-base mb-3 disabled:opacity-60"
        style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '56px' }}
      >
        {sharing ? 'Preparing image…' : 'Share to Instagram story & more'}
      </button>
      <p className="text-xs text-center" style={{ color: '#9A9DB0' }}>
        Opens your phone&apos;s share sheet — pick Instagram and it drops straight into your story.
      </p>
      {message && (
        <p className="text-sm text-center mt-3" style={{ color: '#22C55E' }}>{message}</p>
      )}
    </div>
  )
}
