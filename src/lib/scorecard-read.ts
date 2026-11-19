import Anthropic from '@anthropic-ai/sdk'

// Reads one golfer's hole-by-hole scores from a photo of a paper scorecard.
// Only what is written is returned; anything unreadable comes back empty for
// the golfer to fill in. The golfer always checks the result before it is used.

const client = new Anthropic()

export class ScorecardReadError extends Error {}

const SCHEMA = {
  type: 'object',
  properties: {
    scores: { type: 'array', items: { type: 'integer' }, description: 'Strokes on each hole in order, 0 where unreadable or blank' },
    putts: { type: 'array', items: { type: 'integer' }, description: 'Putts on each hole if the card has a putts row for this player, otherwise empty' },
    total_written: { type: 'integer', description: 'The total written on the card for this player, 0 if none' },
    notes: { type: 'string', description: 'Anything the golfer should check, in one short sentence. Empty if nothing.' },
  },
  required: ['scores', 'putts', 'total_written', 'notes'],
  additionalProperties: false,
} as const

const SYSTEM = `You read golf scorecards from photos.

Rules:
- Return the strokes on each hole for the player you are asked about, in hole order.
- A card often has several rows: the player's own score, a playing partner's score kept as marker, putts, fairways. Use the row that belongs to the named player. If no name matches, use the row marked as the player's own (often labelled "Player", "Score" or the first score row), and say so in notes.
- Never guess. A digit you cannot read, or a blank box, is 0.
- Ignore handicap stroke dots, points, and running out/in totals when filling "scores".
- "total_written" is the gross total written for that player, 0 if none.`

export async function readScorecard(opts: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; holes: number; playerName: string | null }): Promise<{ scores: (number | null)[]; putts: (number | null)[]; totalWritten: number | null; notes: string }> {
  const message = await client.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: opts.mediaType, data: opts.base64 } },
        { type: 'text', text: `This is a ${opts.holes} hole round. The player is ${opts.playerName ? `"${opts.playerName}"` : 'not named'}. Read their scores.` },
      ],
    }],
  })
  if (message.stop_reason === 'refusal') throw new ScorecardReadError('That photo could not be read.')
  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!text) throw new ScorecardReadError('Nothing came back for that photo.')
  let raw: { scores?: unknown; putts?: unknown; total_written?: unknown; notes?: unknown }
  try { raw = JSON.parse(text.text) } catch { throw new ScorecardReadError('That photo could not be read. Try a closer, flatter shot.') }
  const clean = (list: unknown, max: number) => Array.from({ length: opts.holes }, (_, i) => {
    const v = Array.isArray(list) ? list[i] : null
    return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= max ? v : null
  })
  const scores = clean(raw.scores, 15)
  if (scores.every(s => s === null)) throw new ScorecardReadError('No scores could be read from that photo. Try a closer, flatter shot in good light.')
  const putts = Array.isArray(raw.putts) && raw.putts.length > 0 ? clean(raw.putts, 6).map((p, i) => (p !== null && scores[i] !== null && p <= scores[i]! ? p : null)) : Array.from({ length: opts.holes }, () => null)
  const tw = typeof raw.total_written === 'number' && raw.total_written > 0 ? raw.total_written : null
  return { scores, putts, totalWritten: tw, notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 300) : '' }
}
