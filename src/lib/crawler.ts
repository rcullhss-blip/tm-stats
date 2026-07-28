import * as cheerio from 'cheerio'
import { resolveMx } from 'dns/promises'

const UA = 'Mozilla/5.0 (compatible; TMStatsBot/1.0; +https://tmstatsgolf.com)'

export async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('text/html')) return null
    return await res.text()
  } catch {
    return null
  }
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const JUNK = ['example.', 'sentry', 'wixpress', 'godaddy', '.png', '.jpg', '.gif', 'no-reply', 'noreply', 'yourdomain', 'email.com', 'domain.com']

// Valid top-level domains we expect. Used to repair addresses that get mashed
// together with the next word in scraped text (e.g. "name@gcu.edunate").
const KNOWN_TLDS = ['edu', 'com', 'org', 'net', 'gov', 'co', 'uk', 'us', 'ca', 'au',
  'ie', 'io', 'info', 'biz', 'golf', 'club', 'academy', 'sport', 'team', 'app', 'dev', 'email', 'me', 'tv']

// Clean and validate a raw email. Trims trailing junk on the TLD, rejects
// anything with an unrecognisable domain. Returns null if it can't be salvaged.
function normalizeEmail(raw: string): string | null {
  const at = raw.indexOf('@')
  if (at < 1) return null
  const local = raw.slice(0, at)
  const labels = raw.slice(at + 1).split('.').filter(Boolean)
  if (labels.length < 2) return null
  let tld = labels[labels.length - 1]
  if (!KNOWN_TLDS.includes(tld)) {
    // e.g. "edunate" / "comfull" → take the longest known TLD it starts with
    const hit = KNOWN_TLDS.filter(t => tld.startsWith(t)).sort((a, b) => b.length - a.length)[0]
    if (!hit) return null
    tld = hit
  }
  labels[labels.length - 1] = tld
  const email = `${local}@${labels.join('.')}`
  if (email.length > 80 || JUNK.some(j => email.includes(j))) return null
  return email
}

export function extractEmails(html: string): string[] {
  const found = new Set<string>()
  const $ = cheerio.load(html)
  $('a[href^="mailto:"]').each((_, el) => {
    const raw = $(el).attr('href')?.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase()
    const e = raw ? normalizeEmail(raw) : null
    if (e) found.add(e)
  })
  for (const m of html.match(EMAIL_RE) ?? []) {
    const e = normalizeEmail(m.toLowerCase())
    if (e) found.add(e)
  }
  return [...found]
}

// Prefer the addresses a club actually answers
const PREFERRED_PREFIXES = ['secretary', 'manager', 'office', 'admin', 'info', 'pro', 'golf', 'enquiries', 'contact', 'club']

export function pickBestEmail(emails: string[]): string | null {
  if (emails.length === 0) return null
  for (const prefix of PREFERRED_PREFIXES) {
    const match = emails.find(e => e.startsWith(prefix))
    if (match) return match
  }
  return emails[0]
}

export function findContactLinks(baseUrl: string, html: string): string[] {
  const $ = cheerio.load(html)
  const links = new Set<string>()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const text = $(el).text().toLowerCase()
    if (/contact|enquir|get-in-touch|getintouch/.test(href.toLowerCase()) || /contact/.test(text)) {
      try {
        links.add(new URL(href, baseUrl).toString())
      } catch {}
    }
  })
  return [...links].slice(0, 2)
}

// Wikipedia article → the club's official website from the infobox / external links
export function findOfficialSite(html: string): string | null {
  const $ = cheerio.load(html)
  const infobox = $('.infobox a.external').first().attr('href')
  if (infobox?.startsWith('http')) return infobox
  let official: string | null = null
  $('a.external').each((_, el) => {
    const text = $(el).text().toLowerCase()
    const href = $(el).attr('href') ?? ''
    if (!official && /official|website/.test(text) && href.startsWith('http')) official = href
  })
  return official
}

// Wikipedia category page → member article URLs
export function findWikiArticles(html: string): { url: string; title: string }[] {
  const $ = cheerio.load(html)
  const out: { url: string; title: string }[] = []
  $('#mw-pages a[href^="/wiki/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const title = $(el).text().trim()
    if (href && title && !href.includes(':')) {
      out.push({ url: `https://en.wikipedia.org${href}`, title })
    }
  })
  return out
}

// Cheap deliverability check: does the email's domain accept mail at all?
export async function domainAcceptsMail(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1]
    if (!domain) return false
    const mx = await resolveMx(domain)
    return mx.length > 0
  } catch {
    return false
  }
}

// Wikipedia list pages (tables of institutions) — grab university article links
export function findWikiListLinks(html: string): { url: string; title: string }[] {
  const $ = cheerio.load(html)
  const out: { url: string; title: string }[] = []
  const seen = new Set<string>()
  $('table a[href^="/wiki/"], .mw-parser-output ul a[href^="/wiki/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const title = $(el).text().trim()
    if (!href || href.includes(':') || seen.has(href)) return
    if (!/university|college|institute/i.test(title)) return
    seen.add(href)
    out.push({ url: `https://en.wikipedia.org${href}`, title })
  })
  return out
}

// On a university/athletics page: find the link most likely to lead to coach contacts
export function findAthleticsLink(baseUrl: string, html: string): string | null {
  const $ = cheerio.load(html)
  let staffDir: string | null = null
  let athletics: string | null = null
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const text = $(el).text().toLowerCase()
    const h = href.toLowerCase()
    try {
      const abs = new URL(href, baseUrl).toString()
      if (!staffDir && (/staff[-_ ]?directory/.test(h) || /staff directory/.test(text))) staffDir = abs
      if (!athletics && (/athletic/.test(h) || /athletic/.test(text))) athletics = abs
    } catch {}
  })
  return staffDir ?? athletics
}

// Athletics "multimedia rights" / sponsorship companies — not the coach.
const SPONSOR_DOMAIN_HINTS = ['sportsproperties', 'sports-properties', 'playfly', 'learfield',
  'sidearm', 'paciolan', 'jmisports', 'multimediarights', 'sportsrights']
// Other-sport mailbox prefixes we never want when hunting a golf coach.
const OTHER_SPORT_PREFIXES = ['msoccer', 'wsoccer', 'soccer', 'mbball', 'wbball', 'basketball',
  'football', 'baseball', 'softball', 'volleyball', 'tennis', 'swim', 'dive', 'track', 'crosscountry',
  'lacrosse', 'hockey', 'wrestling', 'rowing', 'gymnastics', 'rugby', 'mbb', 'wbb']

function isSponsorOrWrongSport(email: string): boolean {
  const [local, domain] = email.split('@')
  if (!domain) return true
  if (SPONSOR_DOMAIN_HINTS.some(h => domain.includes(h))) return true
  if (OTHER_SPORT_PREFIXES.some(p => local.startsWith(p))) return true
  return false
}

// Find the email for an actual golf coach. Only trusts clean mailto links that
// sit inside a block naming both "golf" and a coaching role — text-scraped
// addresses on athletics directories are too mangled to rely on.
export function findGolfEmails(html: string): string[] {
  const $ = cheerio.load(html)
  const found = new Set<string>()
  $('tr, li, [class*="staff"], [class*="person"], [class*="card"], [class*="coach"]').each((_, el) => {
    const text = $(el).text().toLowerCase()
    if (!/golf/.test(text) || !/coach/.test(text)) return
    $(el).find('a[href^="mailto:"]').each((_, a) => {
      const raw = $(a).attr('href')?.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase()
      const e = raw ? normalizeEmail(raw) : null
      if (e && !isSponsorOrWrongSport(e)) found.add(e)
    })
  })
  return [...found]
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
