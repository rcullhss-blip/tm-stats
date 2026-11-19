import Anthropic from '@anthropic-ai/sdk'
import { RESULT_SCHEMA, cleanParsed, type ParsedResult } from '@/lib/results-import'

// Reads a tournament result (a PDF, a photo of one, or pasted text) and returns
// every player's hole-by-hole scores. The model only reads what is on the page:
// nothing is filled in or guessed, and the coach checks it before anything is created.

const client = new Anthropic()

export class ResultsParseError extends Error {}

const SYSTEM = `You read golf tournament results and return them as data.

Rules:
- Return only what is printed. Never invent, estimate or fill in a score, a par, a name or a date.
- Hole scores go in "scores" in hole order (hole 1 first). If a round only shows a total, or any hole is unreadable, return an empty "scores" list for that round and give the printed total.
- If the file shows the par of every hole, return them in "pars". Otherwise return an empty list.
- Names as "First Last", without seedings, positions or school abbreviations.
- Include every player in the result, from every team.
- Leave out players who withdrew or were disqualified before finishing a round, and say so in "notes".
- Use "notes" for anything a coach should know before trusting this: parts you could not read, rounds without hole scores, anything that looked inconsistent (for example a total that does not match the hole scores).`

export type ResultSource =
  | { kind: 'pdf'; base64: string }
  | { kind: 'image'; base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }
  | { kind: 'text'; text: string }

export async function parseResults(source: ResultSource): Promise<ParsedResult> {
  const content: Anthropic.ContentBlockParam[] =
    source.kind === 'pdf'
      ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: source.base64 } }]
      : source.kind === 'image'
        ? [{ type: 'image', source: { type: 'base64', media_type: source.mediaType, data: source.base64 } }]
        : [{ type: 'text', text: `Result:\n${source.text}` }]
  content.push({ type: 'text', text: 'Return this result as data, following the rules.' })

  const stream = client.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 32000,
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: RESULT_SCHEMA } },
    messages: [{ role: 'user', content }],
  })
  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') throw new ResultsParseError('That file could not be read.')
  if (message.stop_reason === 'max_tokens') throw new ResultsParseError('That result is too long to read in one go. Try uploading one round at a time.')

  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!text) throw new ResultsParseError('Nothing came back for that file.')
  let raw: unknown
  try { raw = JSON.parse(text.text) } catch { throw new ResultsParseError('The result could not be read. Try a clearer file.') }
  const parsed = cleanParsed(raw)
  if (parsed.players.length === 0) throw new ResultsParseError('No players were found in that file. Check it is a results sheet with scores.')
  return parsed
}
