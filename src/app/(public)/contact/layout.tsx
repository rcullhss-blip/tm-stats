import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact TM Stats',
  description: 'Questions about TM Stats, team and coach accounts, or your subscription? Send a message and Rob will reply.',
  alternates: { canonical: '/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
