import Anthropic from '@anthropic-ai/sdk'
import type { VoiceParseResult } from '@/lib/voice-types'

// Turns the transcript of a golfer talking through their round into structured
// shot data. The model only reports what was said: missing numbers stay null
// and the golfer fills them in on the normal entry screens.

const client = new Anthropic()

const SYSTEM = `You turn a golfer's spoken description of their round into structured shot data for a Strokes Gained app.

The text is a speech-recognition transcript, so expect mishearings: "for" or "four" for 4, "to" or "too" for 2, "par for", "won" for 1, "ate" for 8, "put" for putt, "t" for tee. Use golf sense to read through them.

THE DATA MODEL
Each hole has a list called shots with one entry per stroke, in the order played. An entry describes where the ball was BEFORE that stroke: the lie, and the distance to the hole from there.
- The first entry is always the tee shot: lie "tee", distance = the full length of the hole in yards.
- The lie of each later entry is where the previous stroke finished.
- The last entry is the stroke that went in the hole.
- So the number of entries equals the score on the hole.
- A penalty stroke is its own entry: lie "penalty", distance null. Put it straight after the stroke that caused it, then carry on with where they played their next shot from. For out of bounds or a lost ball replayed from the same place, the next entry repeats the lie and distance of the stroke that went out.

UNITS
- On the green (lie "green"): unit "feet".
- Everywhere else: unit "yards". If the golfer gives a short shot off the green in feet, keep their number and set unit "feet".
- If a golfer says "paces" or "steps", treat one pace as one yard.

LIES
- tee, fairway, rough (also first cut, semi, trees, pine straw, waste area, long grass), bunker (sand, trap), fringe (apron, collar, fringe of the green), green, penalty.
- lie_quality is "good" unless they say otherwise. "awkward" for things like thick rough, a bad stance, blocked by a tree. "severe" for plugged, buried, unplayable-looking, deep in the trees.

THE MOST IMPORTANT RULE: NEVER INVENT A NUMBER
- If the golfer did not say the distance for a stroke, set that entry's distance to null. Do not estimate it.
- "Two putts from 20 feet" means two green entries: the first at 20 feet, the second with distance null unless they said its length.
- The only wording you may convert is a tap-in: "tap-in", "tapped in", "kick-in" or "gimme" means 2 feet.
- For the tee entry: use the yardage the golfer says. If they do not say one and a known yardage for that hole is supplied below, use the known yardage. Otherwise null.
- Par: use what the golfer says, else the known par supplied below, else null.

WHEN THEY ONLY GIVE SCORES
If the golfer gives no shot detail for a hole (for example "hole 3, par 3, made 4, two putts, missed the green"), leave shots as an empty list and fill score, putts, fairway_hit and green_in_regulation from what they said. "Par", "birdie", "bogey", "double" give the score once you know the par.
When they do describe shots, still set score if they state it, otherwise null. Set putts, fairway_hit and green_in_regulation only if stated outright, otherwise null. Do not work them out from the shots.

THE problem FIELD
One short, plain sentence for the golfer when something on that hole is missing or does not add up, otherwise null. Examples: "I did not hear how long your second putt was." "You said you made 5 but I counted 4 shots." "I did not catch the yardage for this hole." Write it in plain English with no dashes.

GENERAL
- Only return holes the golfer actually described. Keep them in hole order.
- Ignore chat that is not about the shots (weather, playing partners, how they felt).
- If a correction is spoken ("no sorry, that was 140 not 150"), use the corrected value.

EXAMPLE
Transcript: "Hole one, par four, 380 yards. Driver into the fairway, 150 left. Hit it on to 20 feet. Two putts, second one from three feet. Hole two, par three, 165. Missed the green right in the bunker, about 15 yards. Splashed out to 6 feet and holed it."
Hole 1 shots: tee 380 yards; fairway 150 yards; green 20 feet; green 3 feet. Score null (not stated), problem null.
Hole 2 shots: tee 165 yards; bunker 15 yards; green 6 feet. Problem null.`

const nullable = (type: string) => ({ type: [type, 'null'] })

const SCHEMA = {
  type: 'object',
  properties: {
    holes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hole_number: { type: 'integer' },
          par: nullable('integer'),
          score: nullable('integer'),
          putts: nullable('integer'),
          fairway_hit: nullable('boolean'),
          green_in_regulation: nullable('boolean'),
          shots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lie: { type: 'string', enum: ['tee', 'fairway', 'rough', 'bunker', 'fringe', 'green', 'penalty'] },
                distance: nullable('number'),
                unit: { type: 'string', enum: ['yards', 'feet'] },
                lie_quality: { type: 'string', enum: ['good', 'awkward', 'severe'] },
              },
              required: ['lie', 'distance', 'unit', 'lie_quality'],
              additionalProperties: false,
            },
          },
          problem: nullable('string'),
        },
        required: ['hole_number', 'par', 'score', 'putts', 'fairway_hit', 'green_in_regulation', 'shots', 'problem'],
        additionalProperties: false,
      },
    },
  },
  required: ['holes'],
  additionalProperties: false,
}

export class VoiceParseError extends Error {}

export async function parseRoundTranscript(opts: {
  transcript: string
  holeCount: number
  knownPars?: (number | null)[]
  knownYardages?: (number | null)[]
}): Promise<VoiceParseResult> {
  const known: string[] = []
  for (let i = 0; i < opts.holeCount; i++) {
    const par = opts.knownPars?.[i]
    const yards = opts.knownYardages?.[i]
    if (par || yards) known.push(`Hole ${i + 1}: ${par ? `par ${par}` : 'par unknown'}${yards ? `, ${yards} yards` : ''}`)
  }
  const context = known.length > 0
    ? `Known details for this course from the golfer's last round here:\n${known.join('\n')}`
    : 'No known pars or yardages for this course.'

  const stream = client.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{
      role: 'user',
      content: `This is a ${opts.holeCount} hole round.\n${context}\n\nTranscript:\n${opts.transcript}`,
    }],
  })
  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') throw new VoiceParseError('The recording could not be processed.')
  if (message.stop_reason === 'max_tokens') throw new VoiceParseError('That recording was too long to process in one go.')

  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!text) throw new VoiceParseError('No result came back for that recording.')

  const parsed = JSON.parse(text.text) as VoiceParseResult
  if (!parsed || !Array.isArray(parsed.holes)) throw new VoiceParseError('The result for that recording was not readable.')
  return parsed
}
