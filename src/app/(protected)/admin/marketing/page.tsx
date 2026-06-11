import Link from 'next/link'

const modules = [
  {
    id: 'outreach',
    label: 'Outreach Engine',
    desc: 'Upload coach/club CSVs, generate personalised emails, send via Brevo in controlled batches.',
    icon: '✉',
    color: '#C22431',
    stat: '0 sent today',
  },
  {
    id: 'scraper',
    label: 'Contact Scraper',
    desc: 'Auto-find publicly listed emails from England Golf, NCAA directories, and NAIA schools.',
    icon: '⚲',
    color: '#3b82f6',
    stat: 'Run on demand',
  },
  {
    id: 'blog',
    label: 'Blog Autopilot',
    desc: 'Generate 3–4 SEO-optimised posts per week. Review before publish. Builds Google rankings.',
    icon: '✍',
    color: '#8b5cf6',
    stat: '0 posts published',
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    desc: 'Biweekly email to subscribers. Golf news + TM Stats tips. Genuine value, not filler.',
    icon: '◎',
    color: '#f59e0b',
    stat: 'Next: not scheduled',
  },
  {
    id: 'instagram',
    label: 'Instagram Autopilot',
    desc: '2–3 posts per week. Claude writes captions + designs graphics. You approve before posting.',
    icon: '▣',
    color: '#ec4899',
    stat: '0 posts queued',
  },
]

export default function MarketingHubPage() {
  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold" style={{ color: '#F0F0F0' }}>
          Marketing Hub
        </h1>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#C2243120', color: '#C22431' }}>
          Rob only
        </span>
      </div>
      <p className="text-sm mb-8" style={{ color: '#9A9DB0' }}>
        Six modules. Zero ad spend. Growth on autopilot.
      </p>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: '#F0F0F0' }}>0</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Emails sent (all time)</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#1A1D27' }}>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: '#F0F0F0' }}>0</p>
          <p className="text-xs mt-0.5" style={{ color: '#9A9DB0' }}>Blog posts live</p>
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 gap-3 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {modules.map((mod) => (
          <Link href={`/admin/marketing/${mod.id}`} key={mod.id}>
            <div
              className="p-5 rounded-xl flex flex-col gap-3 h-full transition-all"
              style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247', cursor: 'pointer' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-lg flex items-center justify-center"
                  style={{
                    width: '40px', height: '40px',
                    background: `${mod.color}18`,
                    borderRadius: '8px',
                    color: mod.color,
                  }}
                >{mod.icon}</span>
                <span
                  className="text-xs"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: '#22c55e',
                    background: 'rgba(34,197,94,0.1)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >READY</span>
              </div>
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#F0F0F0' }}>{mod.label}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#9A9DB0' }}>{mod.desc}</p>
              </div>
              <div
                className="mt-auto pt-3 text-xs"
                style={{
                  borderTop: '1px solid #2E3247',
                  fontFamily: 'var(--font-mono)',
                  color: '#9A9DB0',
                }}
              >{mod.stat}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
