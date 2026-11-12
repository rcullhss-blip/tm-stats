// What the voice parser returns for each hole the golfer described.
// One entry in `shots` per stroke, in order: where the ball was BEFORE that
// stroke and how far it was from the hole. Anything not said is null.

export type VoiceLie = 'tee' | 'fairway' | 'rough' | 'bunker' | 'fringe' | 'green' | 'penalty'

export interface VoiceShot {
  lie: VoiceLie
  distance: number | null
  unit: 'yards' | 'feet'
  lie_quality: 'good' | 'awkward' | 'severe'
  // Where the stroke that got the ball here finished compared with its target.
  // Only set when the golfer said it. Older results do not have these.
  finish_side?: 'left' | 'right' | 'on_line' | 'not_said'
  finish_depth?: 'short' | 'long' | 'pin_high' | 'not_said'
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
