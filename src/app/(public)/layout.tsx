import Image from 'next/image'
import Link from 'next/link'
import Footer from '@/components/layout/Footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0F1117', color: '#F0F0F0' }}>
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2E3247' }}>
        <Link href="/">
          <Image src="/logo-outline.svg" alt="TM Stats" width={120} height={36} style={{ height: '36px', width: 'auto' }} />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: '#9A9DB0' }}>
            Log in
          </Link>
          <Link href="/signup" className="text-sm font-medium px-5 py-2 rounded-lg" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
            Get started
          </Link>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
