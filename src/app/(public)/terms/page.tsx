export default function TermsPage() {
  const section = (title: string, content: React.ReactNode) => (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: '#9A9DB0' }}>{content}</div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#CC2222' }}>Legal</p>
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-dm-sans)', color: '#F0F0F0' }}>Terms & Conditions</h1>
      <p className="text-sm mb-8" style={{ color: '#4A4D60' }}>Last updated: April 2026. Governing law: England and Wales.</p>

      {section('1. The service', <>
        <p>TM Stats Golf (&quot;TM Stats&quot;) provides a golf statistics tracking and AI coaching web application. By creating an account, you agree to these terms.</p>
      </>)}

      {section('2. Free tier', <>
        <p>Free accounts include up to 5 rounds of data entry and basic statistics. Free accounts do not include Strokes Gained analysis, AI coaching feedback, or unlimited round storage.</p>
      </>)}

      {section('3. Pro subscription', <>
        <p>Pro subscriptions are available at £4.99/month or £50/year (prices may change — existing subscribers notified in advance).</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Subscriptions renew automatically unless cancelled</li>
          <li>Cancel any time via your Profile page → Manage billing</li>
          <li>Cancellation takes effect at the end of the current billing period</li>
          <li>No partial refunds for unused subscription time, except as required by law</li>
        </ul>
      </>)}

      {section('4. Right to withdraw (UK Consumer Contracts Regulations)', <>
        <p>If you are a consumer in the UK, you have a 14-day right to withdraw from a new subscription and receive a full refund, provided you have not used the Pro features during that period.</p>
        <p>To exercise this right, email <a href="mailto:info@tmstatsgolf.com" style={{ color: '#CC2222' }}>info@tmstatsgolf.com</a> within 14 days of purchase.</p>
      </>)}

      {section('5. Payment', <>
        <p>All payments are processed by Stripe. Prices are in GBP and include VAT where applicable. By subscribing, you authorise Stripe to charge your payment method on a recurring basis.</p>
      </>)}

      {section('6. Acceptable use', <>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the service for any unlawful purpose</li>
          <li>Attempt to access other users&apos; data</li>
          <li>Reverse engineer or copy the application</li>
          <li>Use automated tools to bulk-extract data</li>
        </ul>
        <p>We reserve the right to terminate accounts that breach these terms.</p>
      </>)}

      {section('7. AI coaching', <>
        <p>AI coaching feedback is generated automatically and is intended for informational and entertainment purposes only. It is not professional golf instruction. TM Stats is not responsible for any decisions made based on AI coaching output.</p>
        <p>TM Stats coaching modes are generalised coaching styles and are not affiliated with or representative of any individual coach.</p>
      </>)}

      {section('8. Intellectual property', <>
        <p>All content, branding, and code within TM Stats is owned by TM Stats Golf. Your golf data remains yours — you can export or delete it at any time.</p>
      </>)}

      {section('9. Limitation of liability', <>
        <p>To the extent permitted by law, TM Stats is not liable for any indirect, incidental, or consequential loss arising from use of the service. Our total liability to you shall not exceed the amount you paid in the 12 months prior to the claim.</p>
        <p>Nothing in these terms affects your statutory rights as a UK consumer.</p>
      </>)}

      {section('10. Changes to terms', <>
        <p>We may update these terms. Significant changes will be notified by email or in-app notification. Continued use after notification constitutes acceptance.</p>
      </>)}

      {section('11. Contact & disputes', <>
        <p>For any questions or disputes: <a href="mailto:info@tmstatsgolf.com" style={{ color: '#CC2222' }}>info@tmstatsgolf.com</a></p>
        <p>We will always try to resolve disputes informally first. These terms are governed by the law of England and Wales.</p>
      </>)}
    </div>
  )
}
