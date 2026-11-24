import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log In | TM Stats',
  description: 'Log in to TM Stats to enter a round and see your golf stats and Strokes Gained.',
  alternates: { canonical: '/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
