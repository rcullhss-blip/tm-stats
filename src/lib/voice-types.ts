// What the voice parser returns for each hole the golfer described.
// One entry in `shots` per stroke, in order: where the ball was BEFORE that
// stroke and how far it was from the hole. Anything not said is null.

export type VoiceLie = 'tee' | 'fairway' | 'rough' | 'bunker' | 'fringe' | 'green' | 'penalty'

export interface VoiceShot {
  lie: VoiceLie
  distance: number | null
  unit: 'yards' | 'feet'
  lie_quality: 'good' | 'awkward' | 'severe'
}

export interface VoiceHole {
  hole_number: number
  par: number | null
  score: number | null
  putts: number | null
  fairway_hit: boolean | null
  green_in_regulation: boolean | null
  shots: VoiceShot[]
  problem: string | null
}

export interface VoiceParseResult {
  holes: VoiceHole[]
}
