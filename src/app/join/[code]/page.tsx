import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { joinTeam, teamByCode } from '@/lib/team-join'
import RememberJoin from './RememberJoin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Join your team | TM Stats', robots: { index: false } }

// The link (and QR code) a coach sends players. Signed in: joins straight away.
// Not signed in: remembers the code, then joins as soon as they sign up or log in.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const team = await teamByCode(code)
  const wrap = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-sm w-full text-center">{children}</div>
    </div>
  )
  const button = (href: string, label: string, primary = true) => (
    <Link href={href} className="block w-full py-3 rounded-xl text-sm font-semibold mb-3" style={{ backgroundColor: primary ? '#CC2222' : 'transparent', color: primary ? '#F0F0F0' : '#9A9DB0', border: primary ? 'none' : '1px solid #2E3247' }}>{label}</Link>
  )
  if (!team) return wrap(<>
    <h1 className="text-xl font-bold mb-2" style={{ color: '#F0F0F0' }}>That team link isn&apos;t working</h1>
    <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>Check the link or code with your coach.</p>
    {button('/', 'Go to TM Stats', false)}
  </>)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return wrap(<>
    <RememberJoin code={code} />
    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#CC2222' }}>Join your team</p>
    <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{team.name}</h1>
    <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>Make a free account, or log in, and you&apos;re straight onto the team. Team players get Pro for the team&apos;s first year.</p>
    {button('/signup', 'Create my account')}
    {button('/login', 'I already have an account', false)}
  </>)

  const r = await joinTeam(user.id, code)
  if (!r.ok) return wrap(<>
    <h1 className="text-xl font-bold mb-2" style={{ color: '#F0F0F0' }}>Couldn&apos;t join {team.name}</h1>
    <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>{r.error}</p>
    {button('/dashboard', 'Go to my dashboard', false)}
  </>)
  return wrap(<>
    <RememberJoin code="" />
    <p className="text-4xl mb-3">✓</p>
    <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{r.already ? `You're already in ${r.teamName}` : `You're in ${r.teamName}`}</h1>
    <p className="text-sm mb-6" style={{ color: '#9A9DB0' }}>
      Your coach can now see your stats and add you to qualifying.
      {r.proUntil ? ` Being on the team gives you Pro until ${new Date(r.proUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.` : ''}
    </p>
    {button('/dashboard', 'Go to my dashboard')}
  </>)
}
