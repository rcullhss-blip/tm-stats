import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#0F1117' }}>
      <div className="text-center max-w-sm">
        <p className="text-5xl font-bold mb-3" style={{ fontFamily: 'var(--font-dm-mono)', color: '#CC2222' }}>404</p>
        <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>That page isn&apos;t here</h1>
        <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>The link may be old or mistyped.</p>
        <Link href="/" className="inline-block px-5 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>Go to TM Stats</Link>
      </div>
    </div>
  )
}
