export default function PrivacyPage() {
  const section = (title: string, content: React.ReactNode) => (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: '#9A9DB0' }}>{content}</div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>Legal</p>
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Privacy Policy</h1>
      <p className="text-sm mb-8" style={{ color: '#4A4D60' }}>Last updated: November 2026</p>

      {section('1. Who we are', <>
        <p>TM Stats Golf Limited (&quot;TM Stats&quot;, &quot;we&quot;, &quot;us&quot;), registered in England, operates the TM Stats Golf web application at tmstatsgolf.com and the TM Stats apps for Android and iPhone, which open the same service.</p>
        <p>Contact for data matters: <a href="mailto:info@tmstatsgolf.com" style={{ color: '#CC2222' }}>info@tmstatsgolf.com</a></p>
      </>)}

      {section('2. What data we collect', <>
        <p>We collect the following personal data when you use TM Stats:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account data: name, email address, password (hashed — we never see it)</li>
          <li>Profile data: handicap index, coaching preferences</li>
          <li>Golf data: round scores, hole-by-hole stats, shot data, course names, dates, personal notes</li>
          <li>Payment data: subscription status. Card details are handled entirely by our payment processor — we do not store card numbers</li>
          <li>Team data: if you join a coach&apos;s team, the scores you and your teammates enter during team qualifying, and any results your coach uploads that include you</li>
          <li>Location you choose to give: a country and county, state or region, only if you add them for the leaderboards</li>
          <li>Recruiting profile details you choose to add: year starting college, home club or school, a short description and how coaches can contact you</li>
          <li>Usage data: pages visited and features used, from server logs and privacy-friendly site analytics that do not use cookies</li>
        </ul>
      </>)}

      {section('3. Why we collect it', <>
        <p>We use your data to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide the TM Stats service — store and display your golf stats</li>
          <li>Generate AI coaching feedback based on your round data</li>
          <li>Read tournament results a coach uploads, so team members&apos; scores are filled in for them</li>
          <li>Show your coach your rounds and stats when you join their team</li>
          <li>Show leaderboards and your recruiting profile, only if you switch them on</li>
          <li>Process payments and manage your subscription</li>
          <li>Improve the product and fix bugs</li>
          <li>Respond to support requests</li>
        </ul>
      </>)}

      {section('4. Legal basis (GDPR)', <>
        <p>We process your data on the following lawful bases:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong style={{ color: '#F0F0F0' }}>Contract performance</strong> — to provide the service you signed up for</li>
          <li><strong style={{ color: '#F0F0F0' }}>Legitimate interests</strong> — to improve the product and prevent abuse</li>
          <li><strong style={{ color: '#F0F0F0' }}>Consent</strong> — for any optional communications (e.g. email digests)</li>
        </ul>
      </>)}

      {section('5. What other people can see', <>
        <p>Your rounds and stats are private to you unless you choose otherwise:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong style={{ color: '#F0F0F0' }}>Your coach</strong> sees your rounds, stats and AI feedback once you join their team with their code. Round notes are only shared if you choose to share them.</li>
          <li><strong style={{ color: '#F0F0F0' }}>Your teammates</strong> see your scores on team qualifying leaderboards, and the squad leaderboard if your coach allows it.</li>
          <li><strong style={{ color: '#F0F0F0' }}>Area and world leaderboards</strong> show your first name, last initial and the handicap your rounds played like, only if you switch them on in Profile.</li>
          <li><strong style={{ color: '#F0F0F0' }}>Your recruiting profile</strong> can be seen by anyone you give the link to, only while you have it switched on. It shows your name, handicap, scores, recent rounds and stats. It never shows your email address, notes or coaching feedback, and we ask search engines not to list it.</li>
        </ul>
      </>)}

      {section('6. Who processes data for us', <>
        <p>We use these services to run TM Stats. Each only receives what it needs to do its job:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Supabase: database and sign-in</li>
          <li>Vercel: hosting and cookie-free site analytics</li>
          <li>Stripe and GoCardless: payments</li>
          <li>Resend: emails we send you</li>
          <li>Anthropic and OpenAI: AI coaching feedback, reading voice round recordings, and reading uploaded tournament results. They process the data to give us an answer and do not use it to train their models.</li>
        </ul>
      </>)}

      {section('7. Data retention', <>
        <p>We retain your data for as long as your account is active. If you request account deletion, we will delete your personal data within 30 days, except where we are required by law to retain records (e.g. financial records for 6 years under UK law).</p>
      </>)}

      {section('8. Your rights (GDPR Articles 15–20)', <>
        <p>You have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong style={{ color: '#F0F0F0' }}>Access</strong> — request a copy of your personal data</li>
          <li><strong style={{ color: '#F0F0F0' }}>Rectification</strong> — correct inaccurate data</li>
          <li><strong style={{ color: '#F0F0F0' }}>Erasure</strong> — request deletion of your data (&quot;right to be forgotten&quot;)</li>
          <li><strong style={{ color: '#F0F0F0' }}>Portability</strong> — receive your data in a machine-readable format</li>
          <li><strong style={{ color: '#F0F0F0' }}>Restriction</strong> — limit how we process your data</li>
          <li><strong style={{ color: '#F0F0F0' }}>Object</strong> — object to processing based on legitimate interests</li>
        </ul>
        <p>To exercise any right, email <a href="mailto:info@tmstatsgolf.com" style={{ color: '#CC2222' }}>info@tmstatsgolf.com</a>. We will respond within 30 days.</p>
        <p>You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO) at ico.org.uk.</p>
      </>)}

      {section('9. Cookies', <>
        <p>We use the following cookies:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong style={{ color: '#F0F0F0' }}>Authentication cookies</strong> — to keep you logged in. Essential — cannot be disabled.</li>
          <li><strong style={{ color: '#F0F0F0' }}>Cookie consent</strong> — remembers your cookie preference. Functional.</li>
        </ul>
        <p>We do not use advertising or tracking cookies.</p>
      </>)}

      {section('10. Contact', <>
        <p>For any privacy-related questions or data requests:</p>
        <p><a href="mailto:info@tmstatsgolf.com" style={{ color: '#CC2222' }}>info@tmstatsgolf.com</a></p>
        <p className="text-xs" style={{ color: '#4A4D60' }}>Note: Processing of personal data in the UK requires registration with the ICO. Register at ico.org.uk if not already registered.</p>
      </>)}
    </div>
  )
}
