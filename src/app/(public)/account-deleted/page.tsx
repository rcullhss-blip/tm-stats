import Link from 'next/link'

export const metadata = { title: 'Account deleted | TM Stats', robots: { index: false } }

export default function AccountDeletedPage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Your account has been deleted</h1>
      <p className="text-sm mb-8" style={{ color: '#9A9DB0', lineHeight: 1.6 }}>
        Your rounds, stats and profile are gone, and any card subscription has been cancelled. Thanks for trying TM Stats.
      </p>
      <Link href="/" className="inline-block px-5 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#22263A', color: '#F0F0F0' }}>Back to the home page</Link>
    </div>
  )
}
