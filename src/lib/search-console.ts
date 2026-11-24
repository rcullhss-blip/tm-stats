// Google Search Console, read through a service account. No extra packages:
// the JWT is signed with Node's crypto and the REST API is called with fetch.
//
// Setup (one-off, Rob does this in his browser):
//   1. console.cloud.google.com: create a project, enable "Google Search Console API"
//   2. IAM & Admin > Service Accounts > Create, then Keys > Add key > JSON
//   3. Search Console > Settings > Users and permissions > Add the service
//      account's email address with Full permission
//   4. Vercel > Environment Variables > GOOGLE_SERVICE_ACCOUNT_JSON = the whole
//      contents of the JSON key file, Production, then redeploy
import { createSign } from 'crypto'

export const SC_PROPERTY = 'sc-domain:tmstatsgolf.com'
export const TARGET_QUERIES = ['golf stats', 'golf stats tracker', 'strokes gained app', 'golf stats app', 'strokes gained']

export function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function accessToken(): Promise<string> {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON as string) as { client_email: string; private_key: string }
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key)
  const assertion = `${header}.${claims}.${b64url(signature)}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google token error ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { access_token: string }
  return json.access_token
}

export interface ScRow { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

async function query(token: string, body: Record<string, unknown>): Promise<ScRow[]> {
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SC_PROPERTY)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Search Console error ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { rows?: ScRow[] }
  return json.rows ?? []
}

function iso(d: Date): string { return d.toISOString().slice(0, 10) }
function daysAgo(n: number): Date { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d }

export interface ScSummary {
  range: { start: string; end: string }
  totals: { clicks: number; impressions: number; ctr: number; position: number }
  previous: { clicks: number; impressions: number; ctr: number; position: number }
  daily: { date: string; clicks: number; impressions: number }[]
  queries: ScRow[]
  pages: ScRow[]
  targets: { query: string; clicks: number; impressions: number; position: number | null }[]
}

function sum(rows: ScRow[]) {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0)
  const impressions = rows.reduce((s, r) => s + r.impressions, 0)
  const position = impressions ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : 0
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position }
}

// Search Console data lags about two days, so the window ends the day before yesterday.
export async function getSummary(days = 28): Promise<ScSummary> {
  const token = await accessToken()
  const end = daysAgo(2), start = daysAgo(2 + days - 1)
  const prevEnd = daysAgo(2 + days), prevStart = daysAgo(2 + days * 2 - 1)
  const base = { startDate: iso(start), endDate: iso(end) }
  // The API only ANDs filters, so pull a wide query list once and pick the
  // target keywords out of it ourselves.
  const [daily, prevDaily, allQueries, pages] = await Promise.all([
    query(token, { ...base, dimensions: ['date'], rowLimit: 100 }),
    query(token, { startDate: iso(prevStart), endDate: iso(prevEnd), dimensions: ['date'], rowLimit: 100 }),
    query(token, { ...base, dimensions: ['query'], rowLimit: 500 }),
    query(token, { ...base, dimensions: ['page'], rowLimit: 15 }),
  ])
  const queries = allQueries.slice(0, 15)
  const targets = allQueries
  return {
    range: { start: iso(start), end: iso(end) },
    totals: sum(daily),
    previous: sum(prevDaily),
    daily: daily.map(r => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
    queries,
    pages,
    targets: TARGET_QUERIES.map(q => {
      const row = targets.find(r => r.keys[0] === q)
      return { query: q, clicks: row?.clicks ?? 0, impressions: row?.impressions ?? 0, position: row ? row.position : null }
    }),
  }
}

export interface KeywordGap { query: string; impressions: number; clicks: number; position: number; page: string }

function norm(s: string): string { return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() }

/**
 * Searches Google already shows TM Stats for, but where there is no page
 * written for that search: it lands on the home page or sits beyond the first
 * page of results. Each one is a blog post waiting to be written.
 * `covered` is the keywords and titles that already exist or are queued.
 */
export async function getKeywordGaps(covered: string[], days = 90): Promise<KeywordGap[]> {
  const token = await accessToken()
  const rows = await query(token, {
    startDate: iso(daysAgo(2 + days - 1)),
    endDate: iso(daysAgo(2)),
    dimensions: ['query', 'page'],
    rowLimit: 2000,
  })
  const byQuery = new Map<string, KeywordGap>()
  for (const r of rows) {
    const [q, page] = r.keys
    const cur = byQuery.get(q)
    if (!cur) byQuery.set(q, { query: q, impressions: r.impressions, clicks: r.clicks, position: r.position, page })
    else {
      // Keep the page Google ranks best for this search
      if (r.position < cur.position) { cur.position = r.position; cur.page = page }
      cur.impressions += r.impressions
      cur.clicks += r.clicks
    }
  }
  const have = covered.map(norm).filter(Boolean)
  const path = (u: string) => u.replace(/^https?:\/\/[^/]+/, '') || '/'
  return [...byQuery.values()]
    .filter(g => {
      const q = norm(g.query)
      if (q.split(' ').length < 2 || q.length > 80) return false
      if (/\btm ?stats\b|tmstatsgolf/.test(q)) return false // people looking for us by name
      if (have.some(h => h === q || h.includes(q) || q.includes(h))) return false
      const p = path(g.page)
      const hasOwnPage = p !== '/' && g.position <= 10
      return g.impressions >= 3 && !hasOwnPage
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
    .map(g => ({ ...g, page: path(g.page) }))
}
