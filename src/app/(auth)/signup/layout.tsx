import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Your Free Golf Stats Account | TM Stats',
  description: 'Sign up free and log your first round in minutes. Track fairways, greens and putts, then unlock Strokes Gained and AI coaching when you are ready.',
  alternates: { canonical: '/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
