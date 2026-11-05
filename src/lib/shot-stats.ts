import type { HoleData, ShotEntry } from '@/lib/types'

// Works out a hole's score and stats from its shot list (full tracking mode).
// Moved here unchanged from FullTrackingEntry so voice entry can use the same rules.
export function deriveShotStats(shots: ShotEntry[], par: 3 | 4 | 5): Omit<HoleData, 'holeNumber' | 'par'> {
  const score = shots.length

  // lieType = where the ball IS before that shot.
  // shots[0] = from tee, shots[1] = where tee shot landed, shots[2] = where approach landed, etc.

  // FIR: ball in fairway AFTER tee shot = shots[1].lieType (par 4/5 only)
  const fir: boolean | null =
    par === 3
      ? null
      : shots.length > 1
        ? shots[1].lieType === 'fairway'
        : false

  // GIR: ball on green in regulation = first green lie at index ≤ (par - 2)
  // par3 → shots[1] is green (on in 1), par4 → shots[2] (on in 2), par5 → shots[3] (on in 3)
  const girThreshold = par - 2          // par3=1, par4=2, par5=3
  const firstGreenIndex = shots.findIndex(s => s.lieType === 'green')
  const gir = firstGreenIndex !== -1 && firstGreenIndex <= girThreshold

  // Putts: shots on the green with dist > 0 (exclude the hole-out dist=0 marker)
  const putts = shots.filter(s => s.lieType === 'green' && s.distanceToPin > 0).length

  // Up and down: missed GIR AND holed out in ≤2 shots counting from the first
  // off-green position once the GIR chance had passed. This is only computed when
  // the hole is finished (deriveShotStats runs on hole-out), so the last entered
  // shot always holed it — chip-ins count correctly.
  const upAndDown: boolean | null =
    !gir && shots.length > 0
      ? (() => {
          const startIdx = shots.findIndex((s, i) => i >= girThreshold && s.lieType !== 'green')
          // Holed out before the GIR chance even passed (e.g. holed approach) — up & down by definition
          if (startIdx === -1) return true
          return shots.length - startIdx <= 2
        })()
      : null

  // Sand save: greenside bunker (within 50y of the pin) AND made up and down
  const hadGreensideBunker = shots.some((s, i) => i > 0 && s.lieType === 'bunker' && s.distanceToPin <= 50)
  const sandSave: boolean | null = hadGreensideBunker && upAndDown !== null ? upAndDown : null

  return { score, fir, gir, putts, upAndDown, sandSave }
}
