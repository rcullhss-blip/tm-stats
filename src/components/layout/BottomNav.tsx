'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface NavItem {
  href: string
  label: string
  icon: (active: boolean) => React.ReactNode
}

const BASE_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
          stroke={active ? '#CC2222' : '#9A9DB0'}
          strokeWidth="2"
          strokeLinejoin="round"
          fill={active ? '#CC222220' : 'none'}
        />
      </svg>
    ),
  },
  {
    href: '/rounds',
    label: 'Rounds',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" fill={active ? '#CC222220' : 'none'} />
        <line x1="3" y1="9" x2="21" y2="9" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" />
        <line x1="9" y1="4" x2="9" y2="9" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" />
        <line x1="15" y1="4" x2="15" y2="9" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" />
      </svg>
    ),
  },
  {
    href: '/stats',
    label: 'Stats',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="14" width="4" height="7" rx="1" fill={active ? '#CC2222' : '#9A9DB0'} />
        <rect x="10" y="9" width="4" height="12" rx="1" fill={active ? '#CC2222' : '#9A9DB0'} />
        <rect x="17" y="4" width="4" height="17" rx="1" fill={active ? '#CC2222' : '#9A9DB0'} />
      </svg>
    ),
  },
  {
    href: '/mental',
    label: 'Mental',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3C7.03 3 3 6.8 3 11.5C3 14.1 4.2 16.4 6.1 17.9V21L9.5 19.2C10.3 19.4 11.1 19.5 12 19.5C16.97 19.5 21 15.7 21 11C21 6.3 16.97 3 12 3Z"
          stroke={active ? '#CC2222' : '#9A9DB0'}
          strokeWidth="2"
          strokeLinejoin="round"
          fill={active ? '#CC222220' : 'none'}
        />
        <line x1="8" y1="11" x2="16" y2="11" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="14" x2="13" y2="14" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" fill={active ? '#CC222220' : 'none'} />
        <path d="M4 20C4 17 7.6 14 12 14C16.4 14 20 17 20 20" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
]

const ADMIN_ITEM: NavItem = {
  href: '/admin',
  label: 'Admin',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3L4 7V12C4 16.4 7.4 20.5 12 21.5C16.6 20.5 20 16.4 20 12V7L12 3Z"
        stroke={active ? '#CC2222' : '#9A9DB0'}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={active ? '#CC222220' : 'none'}
      />
      <path d="M9 12L11 14L15 10" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

const COACH_ITEM: NavItem = {
  href: '/coach',
  label: 'Coach',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" fill={active ? '#CC222220' : 'none'} />
      <circle cx="17" cy="9" r="2" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="1.5" fill="none" />
      <path d="M3 19C3 16.2 5.7 14 9 14C12.3 14 15 16.2 15 19" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="2" strokeLinecap="round" />
      <path d="M17 15C18.7 15 21 16.3 21 18" stroke={active ? '#CC2222' : '#9A9DB0'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

interface Props {
  isCoach?: boolean
  isAdmin?: boolean
}

export default function BottomNav({ isCoach = false, isAdmin = false }: Props) {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Clear pending state when route actually changes
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  let items = isCoach
    ? [...BASE_ITEMS.slice(0, 4), COACH_ITEM, BASE_ITEMS[4]]
    : BASE_ITEMS
  if (isAdmin) items = [...items, ADMIN_ITEM]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe"
      style={{
        backgroundColor: '#0F1117',
        borderTop: '1px solid #2E3247',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        paddingTop: '8px',
      }}
    >
      {items.map(({ href, label, icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        const pending = pendingHref === href
        const highlighted = active || pending
        return (
          <Link
            key={href}
            href={href}
            onClick={() => { if (!active) setPendingHref(href) }}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1 relative"
            style={{ minHeight: '52px' }}
          >
            {icon(highlighted)}
            <span
              className="text-xs"
              style={{ color: highlighted ? '#CC2222' : '#9A9DB0', fontFamily: 'var(--font-inter)' }}
            >
              {label}
            </span>
            {pending && (
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ backgroundColor: '#CC2222' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
