import Image from 'next/image'
import Link from 'next/link'
import CookieBanner from '@/components/layout/CookieBanner'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ backgroundColor: '#0F1117' }}>
      {/* Logo — the hero of the page */}
      <Link href="/" className="mb-10 block">
        <Image
          src="/logo-outline.svg"
          alt="TM Stats"
          width={360}
          height={120}
          priority
          style={{ height: '100px', width: 'auto' }}
        />
      </Link>
      <main className="w-full max-w-sm">
        {children}
      </main>
      <CookieBanner />
    </div>
  )
}
