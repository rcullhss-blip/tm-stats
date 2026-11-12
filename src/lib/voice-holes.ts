import type { HoleData, InputMode, LieQuality, ShotEntry, ShotMiss } from '@/lib/types'
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

// Every shot the golfer described, in order. A shot whose distance was not
// heard (or made no sense) is kept in place and flagged needsDistance, so the
// golfer fills in just that gap rather than re-entering the rest of the hole.
function buildShots(voiceShots: VoiceShot[]): { shots: ShotEntry[]; complete: boolean } {
  if (voiceShots.length === 0 || voiceShots[0].lie !== 'tee') return { shots: [], complete: false }
  const shots: ShotEntry[] = []
  for (const v of voiceShots) {
    const quality = v.lie_quality as LieQuality
    const miss = spokenMiss(v, shots.length === 0)
    const base = {
      shotNumber: shots.length + 1,
      lieType: v.lie,
      ...(LIES_WITH_QUALITY.includes(v.lie) && quality !== 'good' ? { lieQuality: quality } : {}),
      ...(miss ? { miss } : {}),
    }
    if (v.lie === 'penalty') {
      // A penalty has no distance of its own: it sits where the shot before it was played from
      const prev = shots[shots.length - 1]
      shots.push({ ...base, distanceToPin: prev.distanceToPin })
      continue
    }
    const yards = toYards(v)
    shots.push(yards === null ? { ...base, distanceToPin: 0, needsDistance: true } : { ...base, distanceToPin: yards })
  }
  return { shots, complete: !shots.some(s => s.needsDistance) }
}

// What the golfer said about where a shot finished, as a miss on the row the
// ball ended up at. Null when they said nothing about it.
function spokenMiss(v: VoiceShot, isFirst: boolean): ShotMiss | null {
  if (isFirst || v.lie === 'penalty') return null
  const side = v.finish_side && v.finish_side !== 'not_said' ? v.finish_side : null
  const depth = v.finish_depth && v.finish_depth !== 'not_said' ? v.finish_depth : null
  if (!side && !depth) return null
  const x = side === 'left' ? -1 : side === 'right' ? 1 : 0
  const y = depth === 'short' ? -1 : depth === 'long' ? 1 : 0
  return { x, y }
}

function gapList(shots: ShotEntry[]): string {
  const gaps = shots.filter(s => s.needsDistance).map(s => s.shotNumber)
  return gaps.length === 1 ? `shot ${gaps[0]}` : `shots ${gaps.slice(0, -1).join(', ')} and ${gaps[gaps.length - 1]}`
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
      if (!complete && inputMode === 'full') {
        problems.push(`Add the distance for ${gapList(shots)} in the amber box below.`)
      }

      if (inputMode === 'full') {
        holes.push(isComplete
          ? { holeNumber: n, par, ...deriveShotStats(shots, par), shots }
          : { ...blankHole(n, par), shots })
      } else {
        // Quick round: every stroke is in the list, so the basic stats do not
        // need the distances. Keep the stats, drop the shot list.
        const counted = shots.map(s => (s.needsDistance ? { ...s, distanceToPin: 1 } : s))
        const stats = deriveShotStats(counted, par)
        const bunkerGap = shots.some(s => s.needsDistance && s.lieType === 'bunker')
        holes.push({
          ...blankHole(n, par),
          score: saidScore ?? stats.score,
          fir: stats.fir,
          gir: stats.gir,
          putts: stats.putts,
          upAndDown: stats.gir ? null : stats.upAndDown,
          sandSave: bunkerGap ? null : stats.sandSave,
        })
        notes.push(scoreMatches ? null : (problems.join(' ') || null))
        status.push(scoreMatches ? 'complete' : 'partial')
        continue
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
