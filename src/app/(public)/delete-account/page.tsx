import Link from 'next/link'

export const metadata = { title: 'Delete your account | TM Stats' }

// Google Play asks for a public page explaining how to delete an account.
export default function DeleteAccountPage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>Your data</p>
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Delete your TM Stats account</h1>
      <div className="text-sm leading-relaxed space-y-4" style={{ color: '#9A9DB0' }}>
        <p><strong style={{ color: '#F0F0F0' }}>In the app or on the website:</strong> sign in, go to Profile, scroll to the bottom and tap <strong style={{ color: '#F0F0F0' }}>Delete my account</strong>. Type DELETE to confirm. It happens straight away.</p>
        <p><strong style={{ color: '#F0F0F0' }}>By email:</strong> if you cannot sign in, email <a href="mailto:info@tmstatsgolf.com" style={{ color: '#CC2222' }}>info@tmstatsgolf.com</a> from the address on your account and ask for it to be deleted. We do it within 30 days and reply to confirm.</p>
        <p><strong style={{ color: '#F0F0F0' }}>What is deleted:</strong> your account, name and email address, every round, hole and shot, notes, goals, practice and mental game sessions, AI coaching feedback, your recruiting page, and any team you coach. A card subscription is cancelled when you delete.</p>
        <p><strong style={{ color: '#F0F0F0' }}>What is kept:</strong> records of payments, which UK law requires us to keep for six years. They hold no golf data.</p>
        <p>More detail is in our <Link href="/privacy" style={{ color: '#CC2222' }}>privacy policy</Link>.</p>
      </div>
    </div>
  )
}
