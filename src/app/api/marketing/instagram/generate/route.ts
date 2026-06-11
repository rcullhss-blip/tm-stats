import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { generateInstagramCaption } from '@/lib/marketing-ai'

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const { type, topic, newsContext } = await request.json()

  if (!topic) {
    return NextResponse.json({ error: 'topic required' }, { status: 400 })
  }

  try {
    const result = await generateInstagramCaption({ type, topic, newsContext })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
