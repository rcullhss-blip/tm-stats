import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  fetchHtml, extractEmails, pickBestEmail, findContactLinks,
  findOfficialSite, findWikiArticles, findWikiListLinks,
  findAthleticsLink, findGolfEmails, domainAcceptsMail, sleep,
} from '@/lib/crawler'

export const maxDuration = 300

// Seed directories — static Wikipedia pages, each leading to real organisation
// websites and their published contact emails.
// UK clubs: category pages → club articles → official sites → contact emails.
// NCAA: institution lists → university articles → official sites → athletics
// staff directory → golf coach emails.
const SEED_DIRECTORIES: { url: string; type: string; region: string }[] = [
  { url: 'https://en.wikipedia.org/wiki/Category:Golf_clubs_and_courses_in_Cheshire', type: 'GOLF_CLUB', region: 'Cheshire' },
  { url: 'https://en.wikipedia.org/wiki/Category:Golf_clubs_and_courses_in_Lancashire', type: 'GOLF_CLUB', region: 'Lancashire' },
  { url: 'https://en.wikipedia.org/wiki/Category:Golf_clubs_and_courses_in_Merseyside', type: 'GOLF_CLUB', region: 'Merseyside' },
  { url: 'https://en.wikipedia.org/wiki/Category:Golf_clubs_and_courses_in_Greater_Manchester', type: 'GOLF_CLUB', region: 'Greater Manchester' },
  { url: 'https://en.wikipedia.org/wiki/Category:Golf_clubs_and_courses_in_Yorkshire', type: 'GOLF_CLUB', region: 'Yorkshire' },
  { url: 'https://en.wikipedia.org/wiki/Category:Golf_clubs_and_courses_in_Surrey', type: 'GOLF_CLUB', region: 'Surrey' },
  { url: 'https://en.wikipedia.org/wiki/Category:Golf_clubs_and_courses_in_Kent', type: 'GOLF_CLUB', region: 'Kent' },
  { url: 'https://en.wikipedia.org/wiki/Category:Golf_clubs_and_courses_in_Scotland', type: 'GOLF_CLUB', region: 'Scotland' },
  { url: 'https://en.wikipedia.org/wiki/Category:Golf_clubs_and_courses_in_Wales', type: 'GOLF_CLUB', region: 'Wales' },
  { url: 'https://en.wikipedia.org/wiki/List_of_NCAA_Division_I_institutions', type: 'NCAA_D1', region: 'USA' },
  { url: 'https://en.wikipedia.org/wiki/List_of_NCAA_Division_II_institutions', type: 'NCAA_D2', region: 'USA' },
  { url: 'https://en.wikipedia.org/wiki/List_of_NCAA_Division_III_institutions', type: 'NCAA_D3', region: 'USA' },
]

const BATCH_SIZE = 20

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queueUrl(sb: any, url: string, kind: string, organisation: string | null, type: string, region: string | null) {
  await sb.from('crawl_queue').upsert(
    { url, kind, organisation, type, region },
    { onConflict: 'url', ignoreDuplicates: true }
  )
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Auto-seed the queue the first time (or when it has fully drained)
  const { count: pendingCount } = await sb
    .from('crawl_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if ((pendingCount ?? 0) === 0) {
    const { count: totalCount } = await sb
      .from('crawl_queue')
      .select('id', { count: 'exact', head: true })
    if ((totalCount ?? 0) === 0) {
      for (const seed of SEED_DIRECTORIES) {
        await queueUrl(sb, seed.url, 'directory', null, seed.type, seed.region)
      }
    }
  }

  // Priority order so the most valuable contacts surface first instead of
  // grinding through every UK golf Wikipedia hop before NCAA is even touched:
  //   1. NCAA pages ready to extract an email (club_site)
  //   2. NCAA discovery pages (directory / article) — they feed tier 1
  //   3. UK golf pages ready to extract an email
  //   4. UK golf discovery pages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function pendingTier(opts: { ncaa: boolean; clubSiteOnly: boolean }): Promise<any[]> {
    let q = sb.from('crawl_queue').select('*').eq('status', 'pending')
    q = opts.ncaa ? q.like('type', 'NCAA%') : q.not('type', 'like', 'NCAA%')
    if (opts.clubSiteOnly) q = q.eq('kind', 'club_site')
    const { data } = await q.order('created_at', { ascending: true }).limit(BATCH_SIZE)
    return data ?? []
  }

  const tiers = [
    { ncaa: true, clubSiteOnly: true },
    { ncaa: true, clubSiteOnly: false },
    { ncaa: false, clubSiteOnly: true },
    { ncaa: false, clubSiteOnly: false },
  ]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batch: any[] = []
  const seen = new Set<string>()
  for (const tier of tiers) {
    if (batch.length >= BATCH_SIZE) break
    for (const row of await pendingTier(tier)) {
      if (batch.length >= BATCH_SIZE) break
      if (seen.has(row.id)) continue
      seen.add(row.id)
      batch.push(row)
    }
  }

  let processed = 0
  let contactsFound = 0

  for (const item of batch ?? []) {
    let ok = false
    try {
      const html = await fetchHtml(item.url)
      if (html) {
        if (item.kind === 'directory') {
          // Wikipedia category page (clubs) or list page (NCAA institutions)
          const articles = item.url.includes('/List_of')
            ? findWikiListLinks(html)
            : findWikiArticles(html)
          for (const article of articles) {
            await queueUrl(sb, article.url, 'wiki_article', article.title, item.type, item.region)
          }
          ok = true
        } else if (item.kind === 'wiki_article') {
          // Club article → official website
          const site = findOfficialSite(html)
          if (site) {
            await queueUrl(sb, site, 'club_site', item.organisation, item.type, item.region)
          }
          ok = true
        } else if (String(item.type).startsWith('NCAA')) {
          // University site → athletics section → staff directory → golf coach email
          let emails: string[] = findGolfEmails(html)
          let nextUrl = findAthleticsLink(item.url, html)
          let hops = 0
          while (emails.length === 0 && nextUrl && hops < 2) {
            await sleep(400)
            const pageHtml = await fetchHtml(nextUrl)
            if (!pageHtml) break
            emails = findGolfEmails(pageHtml)
            const deeper: string | null = findAthleticsLink(nextUrl, pageHtml)
            nextUrl = deeper && deeper !== nextUrl ? deeper : null
            hops++
          }
          const best = pickBestEmail(emails)
          if (best) {
            const verified = await domainAcceptsMail(best)
            await sb.from('marketing_contacts').upsert(
              {
                email: best,
                organisation: item.organisation,
                website: item.url,
                type: item.type,
                region: item.region,
                status: verified ? 'verified' : 'found',
              },
              { onConflict: 'email', ignoreDuplicates: true }
            )
            contactsFound++
          }
          ok = true
        } else {
          // Club website → homepage emails, else contact page emails
          let emails = extractEmails(html)
          if (emails.length === 0) {
            for (const contactUrl of findContactLinks(item.url, html)) {
              const contactHtml = await fetchHtml(contactUrl)
              if (contactHtml) emails = emails.concat(extractEmails(contactHtml))
              if (emails.length > 0) break
              await sleep(300)
            }
          }
          const best = pickBestEmail(emails)
          if (best) {
            const verified = await domainAcceptsMail(best)
            await sb.from('marketing_contacts').upsert(
              {
                email: best,
                organisation: item.organisation,
                website: item.url,
                type: item.type,
                region: item.region,
                status: verified ? 'verified' : 'found',
              },
              { onConflict: 'email', ignoreDuplicates: true }
            )
            contactsFound++
          }
          ok = true
        }
      }
    } catch {
      ok = false
    }

    await sb
      .from('crawl_queue')
      .update({ status: ok ? 'done' : 'failed', processed_at: new Date().toISOString() })
      .eq('id', item.id)
    processed++
    await sleep(500) // politeness: ~2 requests/second max
  }

  const { count: remaining } = await sb
    .from('crawl_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({
    ok: true,
    processed,
    contactsFound,
    remainingInQueue: remaining ?? 0,
    ts: new Date().toISOString(),
  })
}
