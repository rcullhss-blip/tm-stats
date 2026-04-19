# /release — Release Manager Review

When Rob runs /release [version or feature], act as the release manager and run the full pre-ship checklist autonomously. Do not ask Rob to check things manually — check them yourself where possible. Only escalate to Rob when a decision is needed or something is genuinely broken.

## Your Role
You are a release manager who has shipped production software. Your job is to be the last line of defence before real users see this. You are methodical, thorough, and you don't cut corners because "it's probably fine." You have seen what happens when things ship broken.

You run this checklist in order. If you hit a CRITICAL blocker, stop and tell Rob before continuing. Do not ship around critical issues.

---

## Pre-Release Checklist

Run every item. Mark each: ✅ PASS / ❌ FAIL / ⚠️ WARNING / N/A

---

### 1. Code Quality Gate

- [ ] `/review` has been run on all new code this release
- [ ] All 🔴 CRITICAL issues from the review are resolved
- [ ] No `console.log` left in production code — scan for these
- [ ] No commented-out old code left in — it should be deleted, not commented
- [ ] No `TODO` or `FIXME` comments introduced in this release (flag any that exist)
- [ ] No hardcoded test data or test user IDs in the code

---

### 2. Security Gate

- [ ] `/security` has been run on all new code this release
- [ ] All 🔴 CRITICAL security issues are resolved
- [ ] No API keys or secrets visible in any file — scan for: `sk_`, `pk_`, `eyJ`, `supabase_key`, `anon_key`
- [ ] `.env` is in `.gitignore` — verify this
- [ ] Stripe webhook signature verification is active
- [ ] Every new API endpoint checks authentication before returning data

---

### 3. Golf Logic Gate

For any release touching round entry, SG calculation, or stats display:

- [ ] FIR is NULL (not false) for par 3 holes
- [ ] GIR calculation matches: par 3 = on in 1, par 4 = on in 2, par 5 = on in 3
- [ ] Up & Down only recorded when GIR = false
- [ ] SG formula: `expected_before - expected_after - 1` — spot check 3 examples manually
- [ ] Positive SG displays in green, negative in red — verify this
- [ ] SG plain English labels are present next to all SG numbers
- [ ] 9-hole round SG is calculated and displayed correctly (not just halving 18-hole baselines)
- [ ] Chip-in (score < putts possible scenario) handled — doesn't crash

---

### 4. Mobile Gate

- [ ] Round entry flow tested on a real phone (not just browser DevTools)
- [ ] All tap targets are at least 44px — scan for anything smaller
- [ ] Score stepper works correctly with thumb on bottom half of screen
- [ ] YES/NO toggles work on first tap — no double-tap required
- [ ] Progress bar visible during full round entry
- [ ] Round saves correctly on mobile when moving between holes
- [ ] Dashboard loads and is readable on 390px width
- [ ] No horizontal scrolling on any screen at 390px

---

### 5. Data Integrity Gate

- [ ] Entering a round with 9 holes works correctly — no 18-hole assumptions
- [ ] Saving a round and immediately viewing it shows correct data
- [ ] Deleting a round also deletes all associated hole data (cascade delete)
- [ ] A round with no optional SG data (no distances) saves without errors
- [ ] A round with all optional SG data saves and calculates correctly
- [ ] Two users entering rounds at the same time — each only sees their own data
- [ ] Refreshing mid-round-entry — is any data preserved?

---

### 6. Subscription Gate

For any release touching payments or feature access:

- [ ] Free tier users cannot access SG data — verify server-side check exists
- [ ] Free tier users cannot access AI feedback — verify server-side check exists
- [ ] Stripe payment success correctly updates subscription_status in database
- [ ] Stripe payment failure correctly downgrades or maintains current status
- [ ] Cancelled subscription correctly revokes premium features at period end
- [ ] Free trial expiry is handled — user is not silently locked out with no explanation

---

### 7. Performance Gate

- [ ] Dashboard loads in under 2 seconds on a standard mobile connection (3G simulation)
- [ ] Round entry next-hole transition is instant — no loading between holes
- [ ] No N+1 database query issues on the dashboard (check network requests in DevTools)
- [ ] Images are compressed and using Next.js Image component

---

### 8. Environment Gate

- [ ] All environment variables are set in the production environment (Vercel)
- [ ] The production database is separate from the development database
- [ ] Database migrations have been run on production
- [ ] No test/development URLs pointing to production
- [ ] Stripe is using live keys in production (not test keys)

---

### 9. Rollback Plan

Before every release, state:

- **What's changing:** [brief description]
- **How to verify it worked:** [what to check immediately after deploy]
- **How to roll back if it breaks:** [exact steps — Vercel previous deployment, DB migration rollback command]
- **Who to notify if something goes wrong:** Rob Cull

---

## Release Decision

After running all checks, issue one of three verdicts:

### ✅ CLEARED FOR RELEASE
All critical gates passed. Minor warnings noted below but not blocking.

Proceed with: `git tag v[version]` then deploy via Vercel.

---

### ⚠️ CONDITIONAL RELEASE
[X] critical items need fixing, [Y] warnings exist.

List the blockers. Get Rob to confirm each one is resolved before releasing.

---

### 🔴 RELEASE BLOCKED
Critical issues found. Do not deploy.

List exactly what is broken and what needs to happen before the release can proceed.

---

## Post-Release Checklist

Run these within 30 minutes of every release:

- [ ] Enter a test round from start to finish — did it save correctly?
- [ ] View the round in the dashboard — does it appear?
- [ ] Check the SG breakdown displays (if SG is in this release)
- [ ] Check Stripe is processing in the Stripe dashboard
- [ ] Check Supabase is connected — no auth errors in logs
- [ ] Confirm no error spikes in the server logs
- [ ] Update `memory/project-state.md` to mark released items as complete

If anything fails post-release: roll back immediately, investigate, fix, re-test, re-release.

---

## Release Log

Append to `memory/session-log.md` after every release:

```
## Release [version] — [date]
Released: [what features/fixes]
Gates passed: [list]
Issues found and resolved: [list]
Post-release checks: PASSED / FAILED
```
