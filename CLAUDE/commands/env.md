---
effort: low
description: Environment setup and management. Run when setting up a new environment, onboarding, or moving between dev and production.
---

# /env — Environment Manager

When Rob runs /env [setup or check], manage the environment configuration safely. Wrong environment config is one of the most common causes of production incidents — test data going live, live Stripe keys in development, missing env vars causing silent failures.

## TM Stats Has 3 Environments

```
Local Development  → your laptop, http://localhost:3000
Staging            → preview deploys on Vercel (test before going live)
Production         → tmstats.app (or wherever the live site is)
```

---

## Required Environment Variables

Copy this into `.env.local` for local development. Never put real values in this file in the repo — only in the actual environment.

```bash
# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...           # Safe to be public - read-only anon access
SUPABASE_SERVICE_ROLE_KEY=eyJ...               # NEVER public - bypasses Row Level Security

# === STRIPE ===
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Safe to be public
STRIPE_SECRET_KEY=sk_test_...                  # NEVER public
STRIPE_WEBHOOK_SECRET=whsec_...                # NEVER public
STRIPE_PRICE_ID_MONTHLY=price_...             # Your £4.99/month price ID

# === ANTHROPIC (for AI feedback) ===
ANTHROPIC_API_KEY=sk-ant-...                   # NEVER public

# === APP ===
NEXTAUTH_SECRET=random-32-char-string          # Generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000             # Change to real URL in production
NODE_ENV=development
```

---

## Environment Checklist

### Local Setup Checklist (new machine or fresh clone)
- [ ] `npm install` — install all dependencies
- [ ] Copy `.env.example` to `.env.local` and fill in your development values
- [ ] Verify Supabase URL and anon key are the DEV project, not production
- [ ] Verify Stripe keys are `pk_test_` and `sk_test_` — NEVER live keys locally
- [ ] Run `npm run dev` — check no missing env var errors in console
- [ ] Run `npm test` — all tests should pass on a clean clone
- [ ] Check Supabase migrations are up to date: `supabase db push`

### Production Deployment Checklist
- [ ] All env vars set in Vercel dashboard (Settings → Environment Variables)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set but NOT prefixed with `NEXT_PUBLIC_`
- [ ] `STRIPE_SECRET_KEY` is the `sk_live_` key, not `sk_test_`
- [ ] `STRIPE_WEBHOOK_SECRET` matches the Vercel deployment URL webhook in Stripe dashboard
- [ ] `ANTHROPIC_API_KEY` is set and has sufficient credits
- [ ] `NODE_ENV=production`
- [ ] `NEXTAUTH_URL` is the live URL (https://tmstatsgolf.com or wherever)

### Staging Checklist
- [ ] Staging uses test Stripe keys — never live
- [ ] Staging uses a separate Supabase project — never production DB
- [ ] Staging webhook is registered in Stripe for the staging URL

---

## Common Environment Mistakes — Check These First When Things Break

**"Stripe payments aren't working"**
→ Check: is `STRIPE_SECRET_KEY` set in the server environment? Is it the right key (test vs live)?

**"Supabase auth errors"**
→ Check: is `NEXT_PUBLIC_SUPABASE_URL` correct? Is the anon key matching the right project?

**"AI feedback isn't working"**
→ Check: is `ANTHROPIC_API_KEY` set server-side (not `NEXT_PUBLIC_`)? Has the key expired?

**"Everything works locally but breaks in production"**
→ Go through the production checklist above. 90% of the time it's a missing env var.

**"I can see Stripe test data in production"**
→ Critical: you're using test keys in production. Update Vercel env vars immediately and redeploy.

---

## Scanning for Exposed Secrets

Run this before every commit to make sure nothing sensitive is in the code:

```bash
# Check for common secret patterns in tracked files
git grep -r "sk_live_" .
git grep -r "sk_test_" .
git grep -r "sk-ant-" .
git grep -r "supabase_service_role" .
git grep -r "SUPABASE_SERVICE_ROLE_KEY=" .
git grep -r "whsec_" .
```

If any of these return results (other than in `.env.example` with placeholder values), stop immediately and rotate the exposed key.

---

## Output Format

When Rob runs /env setup:
Output the full `.env.local` template with comments explaining each variable.

When Rob runs /env check:
Run through the appropriate checklist (local/staging/production) and flag any issues.

When Rob describes a bug that might be environment-related:
Run the common mistakes list and identify the most likely cause.
