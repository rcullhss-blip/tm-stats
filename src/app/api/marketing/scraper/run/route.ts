import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const { sourceId, type } = await request.json()

  try {
    switch (sourceId) {
      case 'england_golf':
        return NextResponse.json({ source: 'england_golf', count: 0, message: 'Scraper stub — implement with cheerio' })
      case 'ncaa_d1':
      case 'ncaa_d2':
      case 'ncaa_d3':
        return NextResponse.json({ source: 'ncaa', division: type, count: 0, message: 'NCAA scraper stub' })
      case 'naia':
        return NextResponse.json({ source: 'naia', count: 0, message: 'NAIA scraper stub' })
      case 'uk_university':
        return NextResponse.json({ source: 'bucs', count: 0, message: 'BUCS scraper stub' })
      default:
        return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
