export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import type { ShotEntry } from '@/lib/types'
import { calculateRoundSG, fmtSG, sgColor } from '@/lib/sg-engine'
import { pooledHandicapLevels, fmtHandicapLevel } from '@/lib/handicap-level'
import { parseProfileInfo, scoringSummary, type ProfileRound } from '@/lib/recruit-profile'

interface PageProps { params: Promise<{ slug: string }> }

// A golfer's page is theirs to hand out. It is never listed or indexed.
export const metadata: Metadata = {
  title: 'Player profile | TM Stats',
  robots: { index: false, follow: false },
}

const card = { backgroundColor: '#1A1D27' } as const
const label = 'text-xs font-semibold uppercase tracking-widest mb-3'
const mono = { fontFamily: 'var(--font-dm-mono)' } as const

function toPar(n: number): string {
  return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`
}
function toPar1(n: number): string {
  return n === 0 ? 'E' : n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}
function day(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// The page a golfer sends to college coaches: scoring, recent rounds and the
// level each part of their game plays to. Only shown when they have switched it on.
export default async function RecruitingProfilePage({ params }: PageProps) {
  const { slug } = await params
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: user } = await service.from('users')
    .select('id, name, handicap, profile_public, profile_info')
    .eq('profile_slug', slug).maybeSingle()
  if (!user || user.profile_public !== true) return notFound()

  const info = parseProfileInfo(user.profile_info)

  const { data: roundsRaw } = await service.from('rounds')
    .select('id, date, course_name, holes, round_type, input_mode, par_total, score_total, stats_pending, qualifier_id, notes')
    .eq('user_id', user.id).order('date', { ascending: false }).limit(40)
  const all: { id: string; date: string; course_name: string; holes: number; round_type: string; input_mode: string; par_total: number | null; score_total: number | null; stats_pending: boolean; qualifier_id: string | null; notes: string | null }[] = roundsRaw ?? []

  const rounds: (ProfileRound & { id: string })[] = all
    .filter(r => r.score_total != null && r.par_total != null)
    .map(r => ({
      id: r.id, date: r.date, course: r.course_name, holes: r.holes,
      score: r.score_total!, toPar: r.score_total! - r.par_total!, type: r.round_type, teamScored: !!r.qualifier_id,
    }))
  const scoring = scoringSummary(rounds)

  // Event names: only for rounds that came from team qualifying or an uploaded
  // result, where the "notes" field holds the event name. A golfer's own round
  // notes are private and never shown.
  const eventName = new Map<string, string>(all.filter(r => r.qualifier_id && r.notes).map(r => [r.id, r.notes as string]))

  // Fairways, greens and putts over the last 10 rounds that have stats
  const statRoundIds = all.filter(r => !r.stats_pending).slice(0, 10).map(r => r.id)
  const fir = { hit: 0, of: 0 }, gir = { hit: 0, of: 0 }, putts = { sum: 0, holes: 0 }
  if (statRoundIds.length > 0) {
    const { data: statHoles } = await service.from('holes').select('par, fir, gir, putts').in('round_id', statRoundIds)
    for (const h of statHoles ?? []) {
      if (h.par !== 3 && h.fir !== null) { fir.of++; if (h.fir) fir.hit++ }
      if (h.gir !== null) { gir.of++; if (h.gir) gir.hit++ }
      if (typeof h.putts === 'number') { putts.sum += h.putts; putts.holes++ }
    }
  }
  const pct = (x: { hit: number; of: number }) => (x.of >= 14 ? `${Math.round((x.hit / x.of) * 100)}%` : '—')
  const puttsPerRound = putts.holes >= 18 ? (putts.sum / putts.holes * 18).toFixed(1) : '—'

  // Playing level: the last 10 full tracking rounds, pooled
  const fullIds = all.filter(r => r.input_mode === 'full' && !r.stats_pending).slice(0, 10).map(r => r.id)
  const holesByRound = new Map<string, { holeNumber: number; par: 3 | 4 | 5; shots: ShotEntry[] | null }[]>()
  if (fullIds.length > 0) {
    const { data: holes } = await service.from('holes').select('round_id, hole_number, par, shots').in('round_id', fullIds)
    for (const h of holes ?? []) {
      if (!holesByRound.has(h.round_id)) holesByRound.set(h.round_id, [])
      holesByRound.get(h.round_id)!.push({ holeNumber: h.hole_number, par: h.par, shots: h.shots })
    }
  }
  const roundHoles = fullIds.map(id => holesByRound.get(id) ?? []).filter(h => h.length > 0)
  const levels = roundHoles.length > 0 ? pooledHandicapLevels(roundHoles) : null
  const nFull = roundHoles.length

  // Strokes Gained per round against a scratch golfer, the one fixed yardstick
  // every coach can read whatever the player's own handicap
  const sg = { offTee: 0, approach: 0, aroundGreen: 0, putt: 0, n: 0 }
  for (const h of roundHoles) {
    const r = calculateRoundSG(h, 'scratch')
    if (!r) continue
    sg.offTee += r.sgOffTee; sg.approach += r.sgApproach; sg.aroundGreen += r.sgAroundGreen; sg.putt += r.sgPutt; sg.n++
  }

  const parts = [
    { name: 'Driving', level: levels?.offTee ?? null, sg: sg.n ? sg.offTee / sg.n : null },
    { name: 'Approach', level: levels?.approach ?? null, sg: sg.n ? sg.approach / sg.n : null },
    { name: 'Short game', level: levels?.aroundGreen ?? null, sg: sg.n ? sg.aroundGreen / sg.n : null },
    { name: 'Putting', level: levels?.putting ?? null, sg: sg.n ? sg.putt / sg.n : null },
  ]

  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      {/* Who */}
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>Player profile</p>
      <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{user.name ?? 'Golfer'}</h1>
      <p className="text-sm mb-5" style={{ color: '#9A9DB0' }}>
        {[
          user.handicap != null ? `Handicap ${user.handicap}` : null,
          levels?.total != null ? `playing like ${fmtHandicapLevel(levels.total)}` : null,
          info.gradYear ? `Class of ${info.gradYear}` : null,
          info.homeClub,
        ].filter(Boolean).join(' · ') || 'TM Stats golfer'}
      </p>
      {info.bio && <p className="text-sm mb-6" style={{ color: '#F0F0F0', lineHeight: 1.6 }}>{info.bio}</p>}

      {/* Scoring */}
      <p className={label} style={{ color: '#9A9DB0' }}>Scoring</p>
      {scoring.rounds === 0 ? (
        <div className="p-4 rounded-xl mb-6" style={card}>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>No 18 hole rounds logged yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-2">
          <div className="p-3 rounded-xl" style={card}>
            <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Average</p>
            <p className="text-2xl font-medium leading-none" style={{ ...mono, color: '#F0F0F0' }}>{scoring.avgScore?.toFixed(1)}</p>
            <p className="text-xs mt-1" style={{ ...mono, color: '#9A9DB0' }}>{scoring.avgToPar !== null ? toPar1(scoring.avgToPar) : ''}</p>
          </div>
          <div className="p-3 rounded-xl" style={card}>
            <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>Best</p>
            <p className="text-2xl font-medium leading-none" style={{ ...mono, color: '#22C55E' }}>{scoring.best?.score}</p>
            <p className="text-xs mt-1" style={{ ...mono, color: '#9A9DB0' }}>{scoring.best ? toPar(scoring.best.toPar) : ''}</p>
          </div>
          <div className="p-3 rounded-xl" style={card}>
            <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>In competition</p>
            <p className="text-2xl font-medium leading-none" style={{ ...mono, color: '#F0F0F0' }}>{scoring.competitionAvgToPar !== null ? toPar1(scoring.competitionAvgToPar) : '—'}</p>
            <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>{scoring.competitionRounds} round{scoring.competitionRounds !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
      {scoring.rounds > 0 && (
        <p className="text-xs mb-6" style={{ color: '#4A4D60' }}>Last {scoring.rounds} round{scoring.rounds !== 1 ? 's' : ''} of 18 holes. Competition counts qualifying and tournament rounds.</p>
      )}

      {scoring.rounds > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Fairways', value: pct(fir) },
            { label: 'Greens', value: pct(gir) },
            { label: 'Putts a round', value: puttsPerRound },
          ].map(x => (
            <div key={x.label} className="p-3 rounded-xl" style={card}>
              <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>{x.label}</p>
              <p className="text-xl font-medium leading-none" style={{ ...mono, color: '#F0F0F0' }}>{x.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Playing level */}
      <p className={label} style={{ color: '#9A9DB0' }}>Playing level</p>
      {levels?.total == null ? (
        <div className="p-4 rounded-xl mb-6" style={card}>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>No shot by shot rounds yet. The level each part of the game plays to appears once rounds are tracked shot by shot.</p>
        </div>
      ) : (
        <>
          <div className="p-4 rounded-xl mb-3 flex items-end justify-between" style={card}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F0F0F0' }}>Playing like</p>
              <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>The handicap the last {nFull} shot by shot round{nFull !== 1 ? 's' : ''} played to</p>
            </div>
            <p className="font-medium leading-none" style={{ ...mono, color: '#F0F0F0', fontSize: '40px' }}>{fmtHandicapLevel(levels.total)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-2">
            {parts.map(p => (
              <div key={p.name} className="p-3 rounded-xl" style={card}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#9A9DB0' }}>{p.name}</p>
                <p className="leading-none font-medium" style={{ ...mono, color: '#F0F0F0', fontSize: '28px' }}>
                  {nFull >= 3 && p.level !== null ? fmtHandicapLevel(p.level) : '—'}
                </p>
                <p className="text-xs mt-1" style={{ color: '#9A9DB0' }}>
                  {p.sg !== null ? <><span style={{ ...mono, color: sgColor(p.sg) }}>{fmtSG(p.sg)}</span> a round v scratch</> : ''}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs mb-6" style={{ color: '#4A4D60' }}>
            Big number: the handicap that part of the game plays like{nFull < 3 ? ' (needs 3 shot by shot rounds)' : ''}. Small number: Strokes Gained a round against a scratch golfer.
          </p>
        </>
      )}

      {/* Rounds */}
      <p className={label} style={{ color: '#9A9DB0' }}>Recent rounds</p>
      {rounds.length === 0 ? (
        <div className="p-4 rounded-xl mb-6" style={card}>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>No rounds logged yet.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden mb-2" style={card}>
          {rounds.slice(0, 12).map((r, i) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i > 0 ? '1px solid #22263A' : 'none' }}>
              <div className="min-w-0 pr-3">
                <p className="text-sm truncate" style={{ color: '#F0F0F0' }}>{eventName.get(r.id) ?? r.course}</p>
                <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>
                  {eventName.has(r.id) ? `${r.course} · ` : ''}{day(r.date)}{r.holes === 9 ? ' · 9 holes' : ''} · {r.type === 'practice' ? 'Practice' : r.type === 'tournament' ? 'Tournament' : 'Competition'}
                  {r.teamScored && <span style={{ color: '#22C55E' }}> · Team scored</span>}
                </p>
              </div>
              <p className="text-base font-medium flex-shrink-0" style={{ ...mono, color: '#F0F0F0' }}>
                {r.score} <span className="text-xs" style={{ color: r.toPar < 0 ? '#22C55E' : '#9A9DB0' }}>{toPar(r.toPar)}</span>
              </p>
            </div>
          ))}
        </div>
      )}
      {rounds.some(r => r.teamScored) && (
        <p className="text-xs mb-6" style={{ color: '#4A4D60' }}>Team scored: entered hole by hole during team qualifying or from an official result, not typed in afterwards by the player.</p>
      )}

      {info.contact && (
        <div className="p-4 rounded-xl mt-6" style={card}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9A9DB0' }}>Contact</p>
          <p className="text-sm" style={{ color: '#F0F0F0' }}>{info.contact}</p>
        </div>
      )}

      <p className="text-xs mt-8" style={{ color: '#4A4D60', lineHeight: 1.6 }}>
        Rounds and stats are logged by the player in TM Stats unless marked Team scored. Strokes Gained compares every shot with what a scratch golfer averages from the same spot.
      </p>
    </div>
  )
}
