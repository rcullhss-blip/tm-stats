import Image from 'next/image'
import Link from 'next/link'
import Footer from '@/components/layout/Footer'
import CookieBanner from '@/components/layout/CookieBanner'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0F1117', color: '#F0F0F0' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2E3247' }}>
        <Image
          src="/logo-outline.svg"
          alt="TM Stats"
          width={120}
          height={36}
          priority
          style={{ height: '36px', width: 'auto' }}
        />
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
        {/* Hero */}
        <section className="flex flex-col items-center px-6 py-16 text-center max-w-lg mx-auto w-full">
          <div className="mb-6">
            <Image src="/logo-outline.svg" alt="TM Stats" width={100} height={100} style={{ margin: '0 auto', height: '80px', width: 'auto' }} />
          </div>

          <h1 className="text-4xl font-bold mb-4 leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
            Stop guessing.<br />
            <span style={{ color: '#CC2222' }}>Know</span> where you lose shots.
          </h1>

          <p className="text-lg mb-8 leading-relaxed" style={{ color: '#9A9DB0' }}>
            Strokes Gained analytics for serious amateur golfers. Track every round, know exactly what to practice.
          </p>

          <Link
            href="/signup"
            className="w-full flex items-center justify-center py-4 rounded-xl text-base font-semibold mb-3"
            style={{ backgroundColor: '#CC2222', color: '#F0F0F0', maxWidth: '320px' }}
          >
            Start free — no card needed
          </Link>
          <p className="text-sm" style={{ color: '#9A9DB0' }}>5 rounds free. Pro from £4.99/month.</p>
        </section>

        {/* Track → Analyse → Improve */}
        <section className="px-6 pb-16 max-w-lg mx-auto w-full">
          <div className="grid grid-cols-3 gap-3 mb-12">
            {[
              { step: '1', label: 'Track', desc: 'Log rounds hole by hole in 60 seconds' },
              { step: '2', label: 'Analyse', desc: 'See exactly where shots are lost' },
              { step: '3', label: 'Improve', desc: 'Get coaching based on your actual data' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="p-4 rounded-2xl text-center" style={{ backgroundColor: '#1A1D27' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-2" style={{ backgroundColor: '#CC2222', color: '#F0F0F0' }}>
                  {step}
                </div>
                <p className="font-bold text-sm mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{label}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#9A9DB0' }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="space-y-3 mb-12">
            {[
              { icon: '📊', title: 'Strokes Gained', desc: 'The same analytics used on tour — see which shots actually cost you' },
              { icon: '🤖', title: 'AI Coaching', desc: 'Data-driven feedback in 7 different coaching styles, based on your round' },
              { icon: '📱', title: 'Built for the course', desc: 'Mobile-first, fast entry, works in any conditions — no hardware needed' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: '#1A1D27' }}>
                <span className="text-2xl mt-0.5">{icon}</span>
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{title}</p>
                  <p className="text-sm" style={{ color: '#9A9DB0' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-center mb-6" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>
              Simple pricing
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-5 rounded-2xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
                <p className="font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Free</p>
                <p className="text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>£0</p>
                <ul className="space-y-2 text-xs" style={{ color: '#9A9DB0' }}>
                  <li>✓ 5 rounds</li>
                  <li>✓ Basic stats</li>
                  <li style={{ color: '#4A4D60' }}>✗ Strokes Gained</li>
                  <li style={{ color: '#4A4D60' }}>✗ AI coaching</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #CC2222' }}>
                <p className="font-bold mb-1" style={{ fontFamily: 'var(--font-dm-sans)', color: '#CC2222' }}>Pro</p>
                <p className="text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-dm-mono)', color: '#F0F0F0' }}>
                  £4.99<span className="text-sm font-normal" style={{ color: '#9A9DB0' }}>/mo</span>
                </p>
                <ul className="space-y-2 text-xs" style={{ color: '#9A9DB0' }}>
                  <li>✓ Unlimited rounds</li>
                  <li>✓ Full Strokes Gained</li>
                  <li>✓ AI coaching</li>
                  <li>✓ All coaching modes</li>
                </ul>
              </div>
            </div>
            <p className="text-center text-xs mt-3" style={{ color: '#4A4D60' }}>Or £50/year — save 16%. Cancel any time.</p>
          </div>

          {/* Social proof placeholder */}
          <div className="mb-12 p-5 rounded-2xl" style={{ backgroundColor: '#1A1D27', border: '1px solid #2E3247' }}>
            <p className="text-xs uppercase tracking-widest font-semibold mb-4 text-center" style={{ color: '#CC2222' }}>
              What golfers say
            </p>
            <p className="text-sm italic text-center leading-relaxed" style={{ color: '#9A9DB0' }}>
              &quot;Finally a stats app that tells me something useful — I found out I was losing 2 shots per round from inside 100 yards. Changed what I practise completely.&quot;
            </p>
            <p className="text-xs text-center mt-3" style={{ color: '#4A4D60' }}>— Beta tester, 12 handicap</p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold"
              style={{ backgroundColor: '#CC2222', color: '#F0F0F0', minWidth: '200px' }}
            >
              Start tracking free
            </Link>
            <p className="text-xs mt-3" style={{ color: '#4A4D60' }}>No card required. 5 rounds free forever.</p>
          </div>
        </section>
      </main>

      <Footer />
      <CookieBanner />
    </div>
  )
}
