export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getSummary, isConfigured, SC_PROPERTY, type ScSummary } from '@/lib/search-console'

const card = { backgroundColor: '#1A1D27', border: '1px solid #2E3247' } as const
const mono = { fontFamily: 'var(--font-dm-mono)' } as const

function pct(n: number) { return `${(n * 100).toFixed(1)}%` }
function delta(now: number, before: number, invert = false) {
  if (!before) return null
  const d = ((now - before) / before) * 100
  const good = invert ? d < 0 : d > 0
  return <span className="text-xs ml-2" style={{ color: good ? '#22C55E' : '#EF4444' }}>{d > 0 ? '+' : ''}{d.toFixed(0)}%</span>
}

function Setup() {
  return (
    <div className="p-5 rounded-2xl" style={card}>
      <p className="text-base font-bold mb-2" style={{ color: '#F0F0F0' }}>Connect Google Search Console</p>
      <p className="text-sm mb-4" style={{ color: '#9A9DB0' }}>
        One-off setup, about ten minutes. It gives this page read-only access to the search data for {SC_PROPERTY}.
      </p>
      <ol className="text-sm space-y-2 list-decimal pl-5" style={{ color: '#9A9DB0' }}>
        <li>Go to <a href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" target="_blank" rel="noreferrer" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>Google Cloud</a> signed in as rob.tmstats@gmail.com, create a project if asked, and enable the Google Search Console API.</li>
        <li>In the same project open IAM &amp; Admin, then Service Accounts. Create one called tm-stats-seo. Open it, go to Keys, Add key, JSON. A file downloads.</li>
        <li>Copy the service account&apos;s email address (ends in iam.gserviceaccount.com). In <a href="https://search.google.com/u/3/search-console/users?resource_id=sc-domain:tmstatsgolf.com" target="_blank" rel="noreferrer" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>Search Console users</a> add it as a user with Full permission.</li>
        <li>In <a href="https://vercel.com/rcullhss-blips-projects/tm-stats/settings/environment-variables" target="_blank" rel="noreferrer" style={{ color: '#F0F0F0', textDecoration: 'underline' }}>Vercel environment variables</a> add GOOGLE_SERVICE_ACCOUNT_JSON for Production and paste the entire contents of the downloaded file as the value. Redeploy.</li>
      </ol>
    </div>
  )
}

function Table({ title, rows, label }: { title: string; rows: ScSummary['queries']; label: (k: string) => string }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>{title}</h2>
      <div className="rounded-xl overflow-hidden" style={card}>
        <div className="grid grid-cols-12 px-4 py-2 text-xs" style={{ color: '#4A4D60', borderBottom: '1px solid #2E3247' }}>
          <span className="col-span-6">{title.includes('quer') ? 'Query' : 'Page'}</span>
          <span className="col-span-2 text-right">Clicks</span>
          <span className="col-span-2 text-right">Impr.</span>
          <span className="col-span-2 text-right">Pos.</span>
        </div>
        {rows.length === 0 && <p className="px-4 py-3 text-sm" style={{ color: '#4A4D60' }}>Nothing yet. Google needs a few days after verification.</p>}
        {rows.map((r, i) => (
          <div key={r.keys[0]} className="grid grid-cols-12 px-4 py-2.5 text-sm" style={{ borderBottom: i < rows.length - 1 ? '1px solid #2E3247' : 'none' }}>
            <span className="col-span-6 truncate" style={{ color: '#F0F0F0' }}>{label(r.keys[0])}</span>
            <span className="col-span-2 text-right" style={{ ...mono, color: '#F0F0F0' }}>{r.clicks}</span>
            <span className="col-span-2 text-right" style={{ ...mono, color: '#9A9DB0' }}>{r.impressions}</span>
            <span className="col-span-2 text-right" style={{ ...mono, color: '#9A9DB0' }}>{r.position.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function SeoPage() {
  let data: ScSummary | null = null
  let error: string | null = null
  if (isConfigured()) {
    try { data = await getSummary(28) } catch (e) { error = e instanceof Error ? e.message : String(e) }
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link href="/admin/marketing" className="text-sm mb-6 inline-block" style={{ color: '#9A9DB0' }}>← Marketing hub</Link>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Google search performance</h1>
      <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>
        Live from Search Console for {SC_PROPERTY}. Last 28 days against the 28 before. Data lags Google by about two days.
      </p>

      {!isConfigured() && <Setup />}
      {error && (
        <div className="p-4 rounded-xl mb-6" style={{ ...card, borderColor: '#EF4444' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#EF4444' }}>Search Console returned an error</p>
          <p className="text-xs break-all" style={{ color: '#9A9DB0' }}>{error}</p>
          <p className="text-xs mt-2" style={{ color: '#9A9DB0' }}>Usually this means the service account has not been added as a user on the property yet, or the API is not enabled on the Google Cloud project.</p>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: 'Clicks', value: data.totals.clicks.toLocaleString(), d: delta(data.totals.clicks, data.previous.clicks) },
              { label: 'Impressions', value: data.totals.impressions.toLocaleString(), d: delta(data.totals.impressions, data.previous.impressions) },
              { label: 'Click-through rate', value: pct(data.totals.ctr), d: delta(data.totals.ctr, data.previous.ctr) },
              { label: 'Average position', value: data.totals.position ? data.totals.position.toFixed(1) : '–', d: delta(data.totals.position, data.previous.position, true) },
            ].map(m => (
              <div key={m.label} className="p-4 rounded-xl" style={card}>
                <p className="text-xs mb-1" style={{ color: '#9A9DB0' }}>{m.label}</p>
                <p className="text-2xl font-bold" style={{ ...mono, color: '#F0F0F0' }}>{m.value}{m.d}</p>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Target keywords</h2>
          <div className="rounded-xl overflow-hidden mb-6" style={card}>
            {data.targets.map((t, i) => (
              <div key={t.query} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < data!.targets.length - 1 ? '1px solid #2E3247' : 'none' }}>
                <span className="text-sm" style={{ color: '#F0F0F0' }}>{t.query}</span>
                <span className="text-sm" style={{ ...mono, color: t.position ? (t.position <= 10 ? '#22C55E' : '#9A9DB0') : '#4A4D60' }}>
                  {t.position ? `#${t.position.toFixed(1)}` : 'not ranking'}
                  <span className="text-xs ml-2" style={{ color: '#4A4D60' }}>{t.impressions} impr.</span>
                </span>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#9A9DB0' }}>Clicks per day</h2>
          <div className="p-4 rounded-xl mb-6 flex items-end gap-1" style={{ ...card, height: '96px' }}>
            {data.daily.map(d => {
              const max = Math.max(1, ...data!.daily.map(x => x.clicks))
              return <div key={d.date} title={`${d.date}: ${d.clicks} clicks, ${d.impressions} impressions`} className="flex-1 rounded-sm" style={{ height: `${Math.max(4, (d.clicks / max) * 100)}%`, backgroundColor: d.clicks ? '#CC2222' : '#2E3247' }} />
            })}
          </div>

          <Table title="Top queries" rows={data.queries} label={k => k} />
          <Table title="Top pages" rows={data.pages} label={k => k.replace('https://www.tmstatsgolf.com', '') || '/'} />
          <p className="text-xs" style={{ color: '#4A4D60' }}>Window {data.range.start} to {data.range.end}.</p>
        </>
      )}
    </div>
  )
}
