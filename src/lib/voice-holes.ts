import type { HoleData, InputMode, LieQuality, ShotEntry } from '@/lib/types'
import type { VoiceHole, VoiceShot } from '@/lib/voice-types'
import { deriveShotStats } from '@/lib/shot-stats'

// Turns what the voice parser heard into the same hole data the entry screens
// use, ready for the golfer to check. Nothing is filled in that was not said:
// a hole with a missing distance keeps the shots up to that point and carries
// a note telling the golfer what to add.

export type VoiceHoleStatus = 'complete' | 'partial' | 'scores' | 'missing'

export interface VoiceDraft {
  inputMode: InputMode
  holes: HoleData[]
  notes: (string | null)[]      // per hole: what the golfer needs to check or add
  status: VoiceHoleStatus[]     // per hole
}

const LIES_WITH_QUALITY = ['fairway', 'rough', 'bunker', 'fringe']

function validPar(par: number | null | undefined): 3 | 4 | 5 | null {
  return par === 3 || par === 4 || par === 5 ? par : null
}

// Stored distances are yards. Putts are spoken in feet.
function toYards(shot: VoiceShot): number | null {
  if (shot.distance === null || !Number.isFinite(shot.distance) || shot.distance <= 0) return null
  if (shot.lie === 'green') {
    const feet = shot.unit === 'feet' ? shot.distance : shot.distance * 3
    return feet > 200 ? null : feet / 3
  }
  const yards = shot.unit === 'feet' ? Math.max(1, Math.round(shot.distance / 3)) : Math.round(shot.distance)
  return yards > 700 ? null : yards
}

// The usable run of shots from the start of the hole, stopping at the first
// one with a missing or impossible distance.
function buildShots(voiceShots: VoiceShot[]): { shots: ShotEntry[]; complete: boolean } {
  const shots: ShotEntry[] = []
  for (const v of voiceShots) {
    let distance: number
    if (v.lie === 'penalty') {
      if (shots.length === 0) break
      distance = shots[shots.length - 1].distanceToPin
    } else {
      const yards = toYards(v)
      if (yards === null) break
      distance = yards
    }
    const quality = v.lie_quality as LieQuality
    shots.push({
      shotNumber: shots.length + 1,
      distanceToPin: distance,
      lieType: v.lie,
      ...(LIES_WITH_QUALITY.includes(v.lie) && quality !== 'good' ? { lieQuality: quality } : {}),
    })
  }
  const startsOnTee = shots.length > 0 && shots[0].lieType === 'tee'
  return { shots: startsOnTee ? shots : [], complete: startsOnTee && shots.length === voiceShots.length }
}

function blankHole(holeNumber: number, par: 3 | 4 | 5): HoleData {
  // Same starting point as a hole nobody has touched on the entry screen
  return { holeNumber, par, score: par, fir: null, gir: null, putts: 2, upAndDown: null, sandSave: null, bunker: null }
}

export function buildVoiceDraft(
  heard: VoiceHole[],
  holeCount: 9 | 18,
  parsPrefill?: (3 | 4 | 5)[],
): VoiceDraft {
  const byNumber = new Map<number, VoiceHole>()
  for (const h of heard) {
    if (Number.isInteger(h.hole_number) && h.hole_number >= 1 && h.hole_number <= holeCount) byNumber.set(h.hole_number, h)
  }

  // Shot detail on at least half the holes described → Full tracking (Strokes
  // Gained). Otherwise it is a scores-only round → Quick.
  const described = [...byNumber.values()]
  const withShots = described.filter(h => buildShots(h.shots ?? []).shots.length > 0).length
  const inputMode: InputMode = described.length > 0 && withShots * 2 >= described.length ? 'full' : 'quick'

  const holes: HoleData[] = []
  const notes: (string | null)[] = []
  const status: VoiceHoleStatus[] = []

  for (let n = 1; n <= holeCount; n++) {
    const v = byNumber.get(n)
    const knownPar = validPar(v?.par) ?? parsPrefill?.[n - 1] ?? null
    const par: 3 | 4 | 5 = knownPar ?? 4

    if (!v) {
      holes.push(blankHole(n, par))
      notes.push('This hole was not in your recording. Enter it here.')
      status.push('missing')
      continue
    }

    const problems: string[] = []
    if (v.problem) problems.push(v.problem)
    if (knownPar === null) problems.push('I did not catch the par for this hole, so check it.')

    const { shots, complete } = buildShots(v.shots ?? [])
    const saidScore = typeof v.score === 'number' && v.score >= 1 && v.score <= 15 ? v.score : null

    if (shots.length > 0) {
      const scoreMatches = saidScore === null || saidScore === shots.length
      const isComplete = complete && scoreMatches
      if (complete && !scoreMatches && !v.problem) {
        problems.push(`You said you made ${saidScore} but I counted ${shots.length} shots.`)
      }
      if (!complete && !v.problem) {
        problems.push(`I am missing a distance for shot ${shots.length + 1}. Add it below.`)
      }

      if (inputMode === 'full') {
        holes.push(isComplete
          ? { holeNumber: n, par, ...deriveShotStats(shots, par), shots }
          : { ...blankHole(n, par), shots })
      } else {
        // Quick round: keep the stats the shots give us, drop the shot list
        const stats = deriveShotStats(shots, par)
        holes.push({
          ...blankHole(n, par),
          score: saidScore ?? (complete ? stats.score : par),
          fir: stats.fir,
          gir: stats.gir,
          putts: complete ? stats.putts : (v.putts ?? 2),
          upAndDown: stats.gir ? null : stats.upAndDown,
        })
        if (saidScore === null && !complete) problems.push('I did not hear your score on this hole.')
      }
      notes.push(problems.length > 0 ? problems.join(' ') : null)
      status.push(isComplete ? 'complete' : 'partial')
      continue
    }

    // Scores only for this hole
    const hole = blankHole(n, par)
    if (saidScore !== null) hole.score = saidScore
    else problems.push('I did not hear your score on this hole.')
    if (typeof v.putts === 'number' && v.putts >= 0 && v.putts <= 10) hole.putts = v.putts
    else if (inputMode === 'quick') problems.push('I did not hear how many putts you had.')
    hole.fir = par === 3 ? null : v.fairway_hit
    hole.gir = v.green_in_regulation
    if (inputMode === 'full') problems.push('No shot distances for this hole. Add the shots below to get Strokes Gained.')
    holes.push(hole)
    notes.push(problems.length > 0 ? problems.join(' ') : null)
    status.push(inputMode === 'quick' && saidScore !== null ? 'complete' : 'partial')
  }

  return { inputMode, holes, notes, status }
}
