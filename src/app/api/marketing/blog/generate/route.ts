import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { generateBlogPost } from '@/lib/marketing-ai'

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const { keyword, newsContext, angle } = await request.json()

  if (!keyword) {
    return NextResponse.json({ error: 'keyword required' }, { status: 400 })
  }

  try {
    const post = await generateBlogPost({ keyword, newsContext, angle })
    return NextResponse.json(post)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
