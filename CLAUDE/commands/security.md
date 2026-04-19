# /security — TM Stats Security Scan

When Rob runs /security [file, feature, or "all"], perform a full security audit. Treat this like a penetration tester reviewing the code before it goes live with real golfer data and real payment information.

## Your Role
You are a security engineer. Your job is to find every way a bad actor could access, manipulate, or destroy user data. Be thorough. Be paranoid. Rob is not a security expert — explain every issue in plain English and give the exact fix.

---

## The 8 Security Vectors — Check All of Them

### Vector 1 — Authentication & Authorisation
The most common breach in apps like this is a logged-in user accessing another user's data.

Check every single API endpoint and database query:
- Does every round fetch filter by `user_id = authenticated_user`?
- Does every hole fetch join through the round, which joins through the user?
- Can a user delete someone else's round by guessing the round ID?
- Can a user access the coach dashboard without a coach subscription?
- Can a team member access rounds from a different team?
- Is the session token validated on EVERY protected route, or just some?
- Are JWT tokens verified server-side on every request, not just checked for existence?
- Does logout properly invalidate the session/token?

Flag as CRITICAL if any endpoint trusts a user_id sent from the frontend without server-side verification.

---

### Vector 2 — Input Validation & Injection
Check everywhere a user can input data:

- Are all inputs validated server-side (not just client-side)?
- Is every database query parameterised? (Never string-concatenate SQL)
- Check for SQL injection vectors: round names, course names, any free text field
- Is the score field validated as an integer between 1–20? (reject "DROP TABLE rounds")
- Is the course name length limited? (reject 10,000 character strings)
- Are par values validated as only 3, 4, or 5? (reject par = 99)
- Is hole_number validated as 1–18 only?
- Are distance_to_pin values validated as positive integers under 700 (yards)?
- Is file upload used anywhere? If so, check: type validation, size limits, no executable files

---

### Vector 3 — API Security
- Are all sensitive endpoints behind authentication middleware?
- Is rate limiting in place? (prevent brute force on login, prevent API abuse)
- Are CORS settings restrictive? (only allow requests from the actual domain)
- Is HTTPS enforced everywhere? (HTTP should redirect to HTTPS)
- Are API keys (Stripe, Anthropic) server-side only — never sent to the browser?
- Is the Stripe webhook signature verified before processing payment events?
- Are error messages generic to the user? (never expose stack traces or DB errors to the frontend)
- Are there any endpoints that return more data than necessary? (strip fields that shouldn't be exposed)

---

### Vector 4 — Frontend Security
- Is there any sensitive data (API keys, Supabase service keys) in the React code?
- Are all environment variables prefixed correctly? (NEXT_PUBLIC_ only for things that CAN be public)
- Is there XSS protection? (React handles most of this but check for `dangerouslySetInnerHTML`)
- Are external links using `rel="noopener noreferrer"`?
- Is there Content Security Policy (CSP) header configured?
- Are form inputs sanitised if displayed back to the user?

---

### Vector 5 — Data Privacy
- Is any personally identifiable information (PII) logged to the console or server logs?
- Is the database connection encrypted (SSL/TLS)?
- Are passwords hashed with bcrypt/argon2? (if managing passwords directly)
- Is payment card data ever stored? (it must not be — Stripe handles this)
- Is GDPR considered? Users must be able to request deletion of their data
- Is there a way to export all a user's data? (GDPR right to portability)
- Are analytics/tracking tools used? If so, are they disclosed in the privacy policy?

---

### Vector 6 — Dependency Security
- Are there any outdated npm packages with known CVEs?
- Run a check: `npm audit` — flag any high or critical vulnerabilities
- Are dependencies pinned to specific versions, or using wildcard ranges that could pull in malicious updates?
- Is the Supabase client library up to date?

---

### Vector 7 — Stripe & Payment Security
- Is the Stripe secret key server-side only — never in client code?
- Is the Stripe publishable key the only Stripe value in the frontend?
- Is the Stripe webhook endpoint validating the signature with `stripe.webhooks.constructEvent`?
- Are subscription statuses stored in the database AND verified against Stripe on sensitive operations?
- Can a user access paid features without an active subscription by manipulating the frontend state?
- Is there a check server-side before serving SG data or AI feedback that the user is a paid subscriber?

---

### Vector 8 — Infrastructure
- Are all secrets in environment variables, never in code or version control?
- Is `.env` in `.gitignore`?
- Does the `.env.example` file show variable names but never real values?
- Are Supabase Row Level Security (RLS) policies enabled on all tables?
- Is the Supabase service role key server-side only? (it bypasses RLS — extremely dangerous if exposed)
- Are database backups configured?
- Is there logging/alerting for unusual patterns (mass data access, repeated failed logins)?

---

## Output Format

Produce a security report in this format:

### 🔴 CRITICAL — Fix Before Launch
Issues that would directly expose user data, allow account takeover, or enable payment fraud.
For each: **Vulnerability** → **How it could be exploited** → **Exact fix**

### 🟡 HIGH — Fix This Week
Serious issues that could cause harm under the right conditions.
For each: **Vulnerability** → **Risk** → **Fix**

### 🟠 MEDIUM — Fix Before Scaling
Issues that matter more as user numbers grow.

### 🔵 LOW — Best Practice
Minor improvements that reduce attack surface.

### ✅ Passed
List what was checked and found secure.

### 📋 Security Score
X/8 vectors clean. Overall: CRITICAL ISSUES PRESENT / READY TO LAUNCH / HARDENED

---

## TM Stats Specific High-Risk Areas

These are the most dangerous areas for this specific app — always start here:

1. **Round data isolation** — can user A see user B's rounds?
2. **Stripe webhook** — is payment confirmation verified before unlocking premium features?
3. **SG baseline data** — is this read-only? Can a user manipulate the baseline tables?
4. **Coach access** — can a player access coach-level data by changing a URL parameter?
5. **Supabase service key** — is it anywhere in the client-side code?
