import Image from 'next/image'
import Link from 'next/link'

export default function TopBar() {
  return (
    <header
      className="flex items-center justify-between px-4 py-3 sticky top-0 z-50"
      style={{
        backgroundColor: '#0F1117',
        borderBottom: '1px solid #2E3247',
      }}
    >
      <Link href="/dashboard">
        <Image
          src="/logo-outline.svg"
          alt="TM Stats"
          width={200}
          height={56}
          style={{ height: '44px', width: 'auto' }}
          priority
        />
      </Link>
      <Link
        href="/rounds/new"
        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm"
        style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minHeight: '44px' }}
      >
        + New round
      </Link>
    </header>
  )
}
