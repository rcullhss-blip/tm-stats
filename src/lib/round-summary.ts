import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import type { ShotEntry } from '@/lib/types'
import {
  calculateRoundSG, handicapToSkillLevel, normalizeSkillLevel, SKILL_LEVEL_LABELS,
  type RoundSGSummary, type SkillLevel,
} from '@/lib/sg-engine'

// Everything the round breakdown email and its PDF need, worked out once from
// the saved round. Same rules as the round page (FIR from shots in full
// tracking, Strokes Gained gating for free accounts).

export interface SummaryHole {
  number: number
  par: number
  score: number
  putts: number | null
  fir: boolean | null
  gir: boolean | null
}

export type SGKey = 'offTee' | 'approach' | 'aroundGreen' | 'putting'

export interface RoundSummary {
  roundId: string
  userId: string
  playerName: string | null
  playerEmail: string
  optedOut: boolean
  courseName: string
  date: string
  roundType: string
  holesPlayed: number
  score: number
  par: number
  fairwaysHit: number
  fairwaysTotal: number
  girs: number
  putts: number
  upDowns: number
  upDownAttempts: number
  birdiesOrBetter: number
  pars: number
  bogeys: number
  doublesOrWorse: number
  isFullTracking: boolean
  sg: { total: number; byCategory: Record<SGKey, number> } | null
  skillLabel: string
  focusTitle: string
  focusText: string
  holes: SummaryHole[]
}

export const SG_LABELS: Record<SGKey, string> = {
  offTee: 'Off the tee',
  approach: 'Approach',
  aroundGreen: 'Around the green',
  putting: 'Putting',
}

const PRACTICE_TIP: Record<SGKey, string> = {
  offTee: 'Next range session, pick a target the width of a fairway and count how many drives out of ten finish inside it.',
  approach: 'Work on stock distances with your scoring irons: ten balls each to a fixed target, and note how far the misses spread.',
  aroundGreen: 'Spend twenty minutes on one basic chip from three different lies, with the aim of leaving every ball inside six feet.',
  putting: 'Split your putting practice between four to eight footers and lag putts from thirty feet or more.',
}

export function toParText(score: number, par: number): string {
  const diff = score - par
  if (diff === 0) return 'level par'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function fmt(n: number): string {
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

function buildFocus(s: Omit<RoundSummary, 'focusTitle' | 'focusText'>): { title: string; text: string } {
  if (s.sg) {
    const entries = (Object.keys(SG_LABELS) as SGKey[]).map(k => ({ key: k, value: s.sg!.byCategory[k] }))
    const worst = entries.reduce((a, b) => (b.value < a.value ? b : a))
    const best = entries.reduce((a, b) => (b.value > a.value ? b : a))
    const bestLine = best.value > 0.2 && best.key !== worst.key
      ? ` Your strongest area was ${SG_LABELS[best.key].toLowerCase()} (${fmt(best.value)}).`
      : ''
    if (worst.value <= -0.3) {
      return {
        title: `Work on: ${SG_LABELS[worst.key].toLowerCase()}`,
        text: `Your biggest leak this round was ${SG_LABELS[worst.key].toLowerCase()}: ${Math.abs(worst.value).toFixed(1)} shots lost against the ${s.skillLabel} baseline.${bestLine} ${PRACTICE_TIP[worst.key]}`,
      }
    }
    return {
      title: 'No real leak this round',
      text: `Nothing cost you more than a fraction of a shot against the ${s.skillLabel} baseline.${bestLine} Keep logging rounds so the trend shows whether this is your normal game or a good day.`,
    }
  }

  const per18 = s.holesPlayed > 0 ? 18 / s.holesPlayed : 1
  const nextStep = s.isFullTracking
    ? 'Strokes Gained on every round is part of Pro.'
    : 'Log your next round in Full Tracking and you will see exactly how many shots each part of your game cost you.'
  if (s.putts * per18 >= 34) {
    return { title: 'Work on: putting', text: `${s.putts} putts is where the shots went in this round. ${PRACTICE_TIP.putting} ${nextStep}` }
  }
  if (s.girs * per18 < 7) {
    return { title: 'Work on: approach play', text: `${s.girs} greens in regulation leaves a lot of work for your short game. ${PRACTICE_TIP.approach} ${nextStep}` }
  }
  return { title: 'A solid base to build on', text: `These are the basic numbers from your round. ${nextStep}` }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadRoundSummary(sb: any, roundId: string, userId: string): Promise<RoundSummary | null> {
  const { data: round } = await sb.from('rounds').select('*').eq('id', roundId).eq('user_id', userId).single()
  if (!round) return null
  const { data: holeRows } = await sb.from('holes').select('*').eq('round_id', roundId).order('hole_number')
  const { data: profile } = await sb
    .from('users')
    .select('email, name, handicap, sg_baseline, subscription_status, email_opt_out')
    .eq('id', userId)
    .single()
  if (!profile?.email || !holeRows || holeRows.length === 0) return null

  const isFullTracking = round.input_mode === 'full'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const holeFIR = (h: any): boolean | null => {
    if (h.par === 3) return null
    if (isFullTracking && Array.isArray(h.shots) && h.shots.length > 1) {
      return (h.shots as ShotEntry[])[1]?.lieType === 'fairway'
    }
    return h.fir
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const holes: SummaryHole[] = holeRows.map((h: any) => ({
    number: h.hole_number, par: h.par, score: h.score, putts: h.putts, fir: holeFIR(h), gir: h.gir,
  }))

  const skillLevel: SkillLevel = normalizeSkillLevel(profile.sg_baseline) ?? handicapToSkillLevel(profile.handicap ?? null)

  // Strokes Gained: Pro and team accounts always; free accounts on their first
  // full-tracking round only (the free taster), exactly as on the round page.
  const isPro = profile.subscription_status === 'pro' || profile.subscription_status === 'team'
  let sgUnlocked = isPro
  if (!isPro && isFullTracking) {
    const { data: firstFull } = await sb
      .from('rounds').select('id').eq('user_id', userId).eq('input_mode', 'full')
      .order('created_at', { ascending: true }).limit(1).single()
    sgUnlocked = firstFull?.id === roundId
  }
  const sgRaw: RoundSGSummary | null = isFullTracking && sgUnlocked
    ? calculateRoundSG(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        holeRows.map((h: any) => ({ holeNumber: h.hole_number, par: h.par as 3 | 4 | 5, shots: h.shots as ShotEntry[] | null })),
        skillLevel,
      )
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missedGreens = holeRows.filter((h: any) => h.gir === false)
  const base = {
    roundId,
    userId,
    playerName: profile.name ?? null,
    playerEmail: profile.email as string,
    optedOut: profile.email_opt_out === true,
    courseName: round.course_name ?? 'Your round',
    date: round.date,
    roundType: round.round_type ?? 'practice',
    holesPlayed: holes.length,
    score: round.score_total ?? holes.reduce((s, h) => s + h.score, 0),
    par: round.par_total ?? holes.reduce((s, h) => s + h.par, 0),
    fairwaysHit: holes.filter(h => h.fir === true).length,
    fairwaysTotal: holes.filter(h => h.par !== 3).length,
    girs: holes.filter(h => h.gir === true).length,
    putts: holes.reduce((s, h) => s + (h.putts ?? 0), 0),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upDowns: missedGreens.filter((h: any) => h.up_and_down === true).length,
    upDownAttempts: missedGreens.length,
    birdiesOrBetter: holes.filter(h => h.score < h.par).length,
    pars: holes.filter(h => h.score === h.par).length,
    bogeys: holes.filter(h => h.score === h.par + 1).length,
    doublesOrWorse: holes.filter(h => h.score >= h.par + 2).length,
    isFullTracking,
    sg: sgRaw
      ? {
          total: sgRaw.sgTotal,
          byCategory: { offTee: sgRaw.sgOffTee, approach: sgRaw.sgApproach, aroundGreen: sgRaw.sgAroundGreen, putting: sgRaw.sgPutt },
        }
      : null,
    // The labels use an en dash ("Handicap 5–9"); plain "to" reads better in a sentence.
    skillLabel: SKILL_LEVEL_LABELS[skillLevel].replace('–', ' to ').replace(' (0)', ''),
    holes,
  }
  const focus = buildFocus(base)
  return { ...base, focusTitle: focus.title, focusText: focus.text }
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}
const RED = hex('#CC2222')
const INK = hex('#1A1D27')
const MUTED = hex('#6B6F82')
const TILE = hex('#F3F4F7')
const LINE = hex('#DDDFE6')
const GREEN = hex('#16A34A')
const BAD = hex('#DC2626')

// The built-in PDF fonts only cover basic Latin, so anything else in a course
// or player name would crash the render. Swap what we can, drop the rest.
function safe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of safe(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function textRight(page: PDFPage, text: string, xRight: number, y: number, font: PDFFont, size: number, color: RGB) {
  const t = safe(text)
  page.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y, font, size, color })
}

function textCentre(page: PDFPage, text: string, xCentre: number, y: number, font: PDFFont, size: number, color: RGB) {
  const t = safe(text)
  page.drawText(t, { x: xCentre - font.widthOfTextAtSize(t, size) / 2, y, font, size, color })
}

export async function renderRoundPdf(s: RoundSummary, logoPng?: Uint8Array | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(safe(`TM Stats round breakdown: ${s.courseName}`))
  doc.setAuthor('TM Stats')
  const page = doc.addPage([595.28, 841.89])
  const W = page.getWidth()
  const H = page.getHeight()
  const M = 40
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  // Header: logo on white with a red rule, the same look as the coach overview PDF
  page.drawRectangle({ x: 0, y: H - 87, width: W, height: 3, color: RED })
  let logoDrawn = false
  if (logoPng) {
    try {
      const img = await doc.embedPng(logoPng)
      const h = 46
      const w = (img.width / img.height) * h
      // The artwork has a little empty space on its left edge; pull it back to the margin.
      page.drawImage(img, { x: M - w * 0.066, y: H - 70, width: w, height: h })
      logoDrawn = true
    } catch { /* fall through to the text wordmark */ }
  }
  if (!logoDrawn) page.drawText('TM STATS', { x: M, y: H - 56, font: bold, size: 22, color: INK })
  textRight(page, 'ROUND BREAKDOWN', W - M, H - 44, bold, 10, INK)
  textRight(page, 'Track to Improve', W - M, H - 59, font, 9, MUTED)

  // Title block
  let y = H - 128
  const titleLines = wrapText(s.courseName, bold, 20, W - 2 * M - 150).slice(0, 2)
  for (const line of titleLines) {
    page.drawText(line, { x: M, y, font: bold, size: 20, color: INK })
    y -= 24
  }
  const dateText = new Date(s.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const typeText = s.roundType === 'competition' ? 'Competition' : s.roundType === 'tournament' ? 'Tournament' : 'Practice'
  const who = s.playerName ? `${s.playerName}  |  ` : ''
  page.drawText(safe(`${who}${dateText}  |  ${typeText}  |  ${s.holesPlayed} holes`), { x: M, y: y + 4, font, size: 9.5, color: MUTED })

  // Score, top right
  const diff = s.score - s.par
  textRight(page, String(s.score), W - M, H - 138, bold, 40, INK)
  textRight(page, diff === 0 ? 'Level par' : `${toParText(s.score, s.par)} to par`, W - M, H - 156, bold, 11, diff <= 0 ? GREEN : MUTED)

  // Stat tiles
  y -= 22
  const tiles: [string, string][] = [
    ['Fairways', s.fairwaysTotal > 0 ? `${s.fairwaysHit}/${s.fairwaysTotal}` : '-'],
    ['Greens in reg', `${s.girs}/${s.holesPlayed}`],
    ['Putts', String(s.putts)],
    ['Up and downs', s.upDownAttempts > 0 ? `${s.upDowns}/${s.upDownAttempts}` : '-'],
  ]
  const gap = 10
  const tileW = (W - 2 * M - gap * 3) / 4
  const tileH = 58
  tiles.forEach(([label, value], i) => {
    const x = M + i * (tileW + gap)
    page.drawRectangle({ x, y: y - tileH, width: tileW, height: tileH, color: TILE })
    textCentre(page, value, x + tileW / 2, y - 30, bold, 19, INK)
    textCentre(page, label.toUpperCase(), x + tileW / 2, y - 47, font, 7.5, MUTED)
  })
  y -= tileH + 14

  const scoring = `Birdies or better ${s.birdiesOrBetter}   |   Pars ${s.pars}   |   Bogeys ${s.bogeys}   |   Doubles or worse ${s.doublesOrWorse}`
  textCentre(page, scoring, W / 2, y - 8, font, 9.5, MUTED)
  y -= 34

  // Strokes Gained
  if (s.sg) {
    page.drawText('STROKES GAINED', { x: M, y, font: bold, size: 11, color: RED })
    page.drawText(safe(`against the ${s.skillLabel} baseline`), { x: M + 112, y, font, size: 9.5, color: MUTED })
    textRight(page, `Total ${fmt(s.sg.total)}`, W - M, y, bold, 11, s.sg.total >= 0 ? GREEN : BAD)
    y -= 20

    const keys = Object.keys(SG_LABELS) as SGKey[]
    const maxAbs = Math.max(1, ...keys.map(k => Math.abs(s.sg!.byCategory[k])))
    const labelW = 112
    const valueW = 44
    const trackX = M + labelW
    const trackW = W - 2 * M - labelW - valueW
    const zeroX = trackX + trackW / 2
    for (const k of keys) {
      const v = s.sg.byCategory[k]
      const barH = 15
      page.drawText(SG_LABELS[k], { x: M, y: y - 11, font, size: 10, color: INK })
      page.drawRectangle({ x: trackX, y: y - barH, width: trackW, height: barH, color: TILE })
      const len = (Math.abs(v) / maxAbs) * (trackW / 2)
      if (len > 0.5) {
        page.drawRectangle({ x: v >= 0 ? zeroX : zeroX - len, y: y - barH, width: len, height: barH, color: v >= 0 ? GREEN : BAD })
      }
      page.drawRectangle({ x: zeroX - 0.5, y: y - barH - 2, width: 1, height: barH + 4, color: INK })
      textRight(page, fmt(v), W - M, y - 11, bold, 10, v >= 0 ? GREEN : BAD)
      y -= barH + 9
    }
    page.drawText('Left of the line is shots lost, right is shots gained.', { x: trackX, y: y - 2, font, size: 8, color: MUTED })
    y -= 26
  }

  // Focus box
  const focusLines = wrapText(s.focusText, font, 10, W - 2 * M - 30)
  const boxH = 34 + focusLines.length * 14
  page.drawRectangle({ x: M, y: y - boxH, width: W - 2 * M, height: boxH, color: TILE })
  page.drawRectangle({ x: M, y: y - boxH, width: 4, height: boxH, color: RED })
  page.drawText(safe(s.focusTitle), { x: M + 16, y: y - 20, font: bold, size: 11.5, color: INK })
  focusLines.forEach((line, i) => {
    page.drawText(line, { x: M + 16, y: y - 38 - i * 14, font, size: 10, color: INK })
  })
  y -= boxH + 26

  // Hole by hole, nine holes to a block
  page.drawText('HOLE BY HOLE', { x: M, y, font: bold, size: 11, color: RED })
  y -= 14
  const hasFir = s.holes.some(h => h.fir !== null)
  const rows: { label: string; cell: (h: SummaryHole) => { text: string; color: RGB; bold?: boolean } }[] = [
    { label: 'Hole', cell: h => ({ text: String(h.number), color: MUTED }) },
    { label: 'Par', cell: h => ({ text: String(h.par), color: MUTED }) },
    {
      label: 'Score',
      cell: h => ({
        text: String(h.score), bold: true,
        color: h.score < h.par ? GREEN : h.score === h.par ? INK : h.score === h.par + 1 ? MUTED : BAD,
      }),
    },
    { label: 'Putts', cell: h => ({ text: h.putts === null ? '-' : String(h.putts), color: INK }) },
    ...(hasFir ? [{ label: 'Fairway', cell: (h: SummaryHole) => ({ text: h.fir === null ? '' : h.fir ? 'Y' : 'N', color: h.fir ? GREEN : MUTED }) }] : []),
    { label: 'Green', cell: h => ({ text: h.gir === null ? '-' : h.gir ? 'Y' : 'N', color: h.gir ? GREEN : MUTED }) },
  ]
  const rowH = 15
  const labelColW = 56
  const totalColW = 40
  const cellW = (W - 2 * M - labelColW - totalColW) / 9
  for (let start = 0; start < s.holes.length; start += 9) {
    const block = s.holes.slice(start, start + 9)
    rows.forEach((row, r) => {
      const rowY = y - r * rowH
      if (r === 0) page.drawRectangle({ x: M, y: rowY - 4, width: W - 2 * M, height: rowH, color: TILE })
      page.drawText(row.label, { x: M + 6, y: rowY, font: r === 0 ? bold : font, size: 9, color: r === 0 ? INK : MUTED })
      block.forEach((h, i) => {
        const c = row.cell(h)
        textCentre(page, c.text, M + labelColW + i * cellW + cellW / 2, rowY, c.bold ? bold : font, 9.5, c.color)
      })
      const totalX = M + labelColW + 9 * cellW + totalColW / 2
      if (row.label === 'Hole') textCentre(page, block.length === 9 ? (start === 0 ? 'Out' : 'In') : 'Tot', totalX, rowY, bold, 9, INK)
      if (row.label === 'Par') textCentre(page, String(block.reduce((a, h) => a + h.par, 0)), totalX, rowY, font, 9.5, MUTED)
      if (row.label === 'Score') textCentre(page, String(block.reduce((a, h) => a + h.score, 0)), totalX, rowY, bold, 9.5, INK)
      if (row.label === 'Putts') textCentre(page, String(block.reduce((a, h) => a + (h.putts ?? 0), 0)), totalX, rowY, font, 9.5, INK)
    })
    y -= rows.length * rowH + 4
    page.drawRectangle({ x: M, y: y + 6, width: W - 2 * M, height: 0.6, color: LINE })
    y -= 10
  }

  // Footer
  page.drawRectangle({ x: M, y: 46, width: W - 2 * M, height: 0.6, color: LINE })
  page.drawText('TM Stats  |  Track to Improve', { x: M, y: 30, font: bold, size: 9, color: INK })
  textRight(page, 'tmstatsgolf.com', W - M, 30, font, 9, RED)

  return doc.save()
}
