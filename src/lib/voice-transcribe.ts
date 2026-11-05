import OpenAI from 'openai'

// Speech to text for voice round entry. The prompt primes the recogniser with
// golf vocabulary so "par four", "fringe" and "tap-in" come through cleanly.
const GOLF_HINT =
  'A golfer describing their round hole by hole. Hole 1, par 4, 380 yards. Driver into the fairway, 150 left. ' +
  'Hit it on to 20 feet. Two putts, second from 3 feet. Rough, bunker, fringe, green, penalty, tap-in, birdie, bogey, double bogey, up and down.'

export async function transcribeRoundAudio(file: File): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Transcription is not configured')
  const openai = new OpenAI({ apiKey })
  const result = await openai.audio.transcriptions.create({
    file,
    model: 'gpt-4o-mini-transcribe',
    language: 'en',
    prompt: GOLF_HINT,
  })
  return (result.text ?? '').trim()
}
