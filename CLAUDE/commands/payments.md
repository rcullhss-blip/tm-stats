---
effort: high
description: Payments and subscription review. Run before any changes touching Stripe, subscription gates, or pricing.
---

# /payments — Stripe & Subscription Guard

When Rob runs /payments, audit everything related to money and subscriptions. This is the highest-risk area of the codebase — a mistake here means either users get free access to paid features, or paying customers get locked out. Both are catastrophic.

---

## The 6 Payment Checks

### Check 1 — Stripe Keys
- Is `STRIPE_SECRET_KEY` server-side only? Search entire codebase — it must never appear in client-side code.
- Is `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` the only Stripe key in the frontend?
- Are test keys (`sk_test_`, `pk_test_`) only used in development, never in production?
- Are live keys (`sk_live_`, `pk_live_`) only in the production environment variables?

### Check 2 — Webhook Security
The Stripe webhook is the most critical endpoint in the app — it's how TM Stats knows a payment succeeded.

- Is `stripe.webhooks.constructEvent()` called on EVERY webhook request?
- Is the raw request body (not parsed JSON) used for signature verification?
- If signature verification fails, does the endpoint return 400 and stop processing?
- Is the webhook secret (`STRIPE_WEBHOOK_SECRET`) stored securely in env vars?
- Are all relevant webhook events handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`?

### Check 3 — Feature Gates (Critical)
Every premium feature must be checked server-side before serving data.

Check these specific gates:
- SG data endpoint: does it verify `subscription_status = 'active'` in the database before returning SG data?
- AI feedback endpoint: same check
- Team/coach features: same check, plus team role check

**The dangerous pattern to look for:**
```javascript
// WRONG — trusts the frontend
if (req.body.isPremium) { ... }

// RIGHT — checks the database
const user = await db.users.findById(req.user.id)
if (user.subscription_status !== 'active') return res.status(403).json({ error: 'Premium required' })
```

Flag any feature gate that reads subscription status from the frontend instead of the database.

### Check 4 — Subscription Status Sync
- When Stripe sends a `subscription.deleted` webhook, is `subscription_status` updated in the database immediately?
- When a payment fails (`invoice.payment_failed`), is the user notified AND does their access get managed correctly?
- Is there a grace period for failed payments, or is access revoked immediately?
- Is the Stripe Customer ID stored against the user in the database for easy lookup?
- If a user cancels, do they keep access until the end of the billing period?

### Check 5 — Free Tier Logic
- What exactly can a free user do? Is this documented and enforced consistently?
- Are free tier limits checked server-side (e.g. round count limit)?
- Does the free trial expiry work correctly?
- When a free user hits a limit, do they see a clear upgrade prompt — not just an error?

### Check 6 — Pricing Display
- Is the price displayed in the UI consistent with what Stripe actually charges?
- Is VAT/tax handled correctly for UK users?
- Is there a clear cancellation policy shown before subscribing?

---

## Output Format

### 🔴 Critical Payment Issues
Issues that expose the business to revenue loss or legal risk. Must fix before any paying customer is onboarded.

### 🟡 Important Issues
Issues that will cause problems at scale.

### ✅ Payment Security Passed

### 📋 Payments Score
[X/6 checks clean] — SAFE TO CHARGE USERS / ISSUES FOUND
