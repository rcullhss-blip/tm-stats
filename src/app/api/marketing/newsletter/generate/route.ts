import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import { generateNewsletter } from '@/lib/marketing-ai'

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const { golfNews, featureSpotlight, statOfFortnight } = await request.json()

  if (!golfNews?.length) {
    return NextResponse.json({ error: 'At least one news item required' }, { status: 400 })
  }

  try {
    const newsletter = await generateNewsletter({ golfNews, featureSpotlight, statOfFortnight })
    return NextResponse.json(newsletter)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
