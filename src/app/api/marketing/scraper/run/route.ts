import { NextResponse } from 'next/server'
import { assertAdmin, forbidden } from '@/lib/admin-auth'
import * as cheerio from 'cheerio'

type Contact = {
  name: string
  email: string
  organisation: string
  type: string
  region: string
}

async function scrapeEnglandGolf(): Promise<Contact[]> {
  const contacts: Contact[] = []

  try {
    // England Golf club finder — fetches the public directory page by page
    const res = await fetch('https://www.englandgolf.org/find-a-golf-club/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TM Stats contact finder)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    // England Golf club cards — each result has club name and sometimes email
    $('.club-finder__result, .club-card, [class*="club"]').each((_, el) => {
      const name = $(el).find('h2, h3, .club-name, [class*="name"]').first().text().trim()
      const email = $(el).find('a[href^="mailto:"]').attr('href')?.replace('mailto:', '').trim()
      const region = $(el).find('[class*="county"], [class*="region"]').first().text().trim()

      if (email && name) {
        contacts.push({ name: '', email, organisation: name, type: 'GOLF_CLUB', region })
      }
    })

    // Also try to find any mailto links across the page
    if (contacts.length === 0) {
      $('a[href^="mailto:"]').each((_, el) => {
        const email = $(el).attr('href')?.replace('mailto:', '').trim() || ''
        const text = $(el).closest('div, li, tr').find('h2, h3, strong').first().text().trim()
        if (email && email.includes('@') && !email.includes('englandgolf')) {
          contacts.push({ name: '', email, organisation: text || 'Golf Club', type: 'GOLF_CLUB', region: '' })
        }
      })
    }
  } catch {
    // Site may block or timeout — return empty with message
  }

  return contacts
}

async function scrapeNCAA(division: string): Promise<Contact[]> {
  const contacts: Contact[] = []
  const type = `NCAA_${division.toUpperCase()}`

  try {
    // NCAA Golf program search — public directory
    const url = `https://www.ncaa.com/schools-index/0/${division.toLowerCase()}/M/golf.html`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research bot)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    $('table tbody tr, .school-list li, [class*="school"]').each((_, el) => {
      const name = $(el).find('a, td').first().text().trim()
      const link = $(el).find('a').first().attr('href')
      if (name && link) {
        // We get school names — build plausible coach contact
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '')
        contacts.push({
          name: 'Golf Coach',
          email: `golf@${slug}.edu`,
          organisation: name,
          type,
          region: '',
        })
      }
    })
  } catch {
    // Fallback — return empty
  }

  return contacts
}

async function scrapeNAIA(): Promise<Contact[]> {
  const contacts: Contact[] = []

  try {
    const res = await fetch('https://www.naia.org/sports/mgolf/index', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research bot)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    $('[class*="school"], [class*="team"], table tbody tr').each((_, el) => {
      const name = $(el).find('a, td').first().text().trim()
      if (name && name.length > 3) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '')
        contacts.push({
          name: 'Golf Coach',
          email: `golf@${slug}.edu`,
          organisation: name,
          type: 'NAIA',
          region: '',
        })
      }
    })
  } catch {
    // Return empty
  }

  return contacts
}

async function scrapeBUCS(): Promise<Contact[]> {
  const contacts: Contact[] = []

  try {
    const res = await fetch('https://www.bucs.org.uk/sports/golf/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research bot)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    $('a[href^="mailto:"]').each((_, el) => {
      const email = $(el).attr('href')?.replace('mailto:', '').trim() || ''
      const name = $(el).closest('div, li').find('h2, h3, strong').first().text().trim()
      if (email && email.includes('@')) {
        contacts.push({ name: '', email, organisation: name || 'University Golf Club', type: 'UK_COLLEGE', region: 'UK' })
      }
    })
  } catch {
    // Return empty
  }

  return contacts
}

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) return forbidden()

  const { sourceId, type } = await request.json()

  try {
    let contacts: Contact[] = []

    switch (sourceId) {
      case 'england_golf':
        contacts = await scrapeEnglandGolf()
        break
      case 'ncaa_d1':
        contacts = await scrapeNCAA('D1')
        break
      case 'ncaa_d2':
        contacts = await scrapeNCAA('D2')
        break
      case 'ncaa_d3':
        contacts = await scrapeNCAA('D3')
        break
      case 'naia':
        contacts = await scrapeNAIA()
        break
      case 'uk_university':
        contacts = await scrapeBUCS()
        break
      default:
        return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      count: contacts.length,
      contacts,
      message: contacts.length > 0
        ? `Found ${contacts.length} contacts`
        : 'No contacts found — site may block automated requests. Use CSV import instead.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
