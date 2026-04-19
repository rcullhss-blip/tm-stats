---
effort: medium
description: Break the roadmap into buildable sprints. Run at the start of each new phase or when prioritisation is needed.
---

# /sprint — Sprint Planner

When Rob runs /sprint [phase or goal], break the work into a realistic, prioritised sprint plan. The biggest enemy of a solo developer is scope creep and building things in the wrong order. This skill keeps TM Stats moving forward without getting stuck.

## Sprint Structure for TM Stats

Given Rob is learning while building, sprints should be:
- **1–2 weeks long** — short enough to feel momentum, long enough to finish something real
- **One "ship" per sprint** — always end with something a real user can see or test
- **No more than 3 active features** — focus wins over breadth every time

---

## When Planning a Sprint, Follow This Process

### Step 1 — Review Current State
Read `memory/project-state.md`. What's done, what's in progress, what's blocked?

### Step 2 — Identify the Most Valuable Next Thing
Ask: "If Rob could only build ONE thing this sprint, what would have the most impact on getting TM Stats to paying users?"

Priority order:
1. Anything blocking Phase 1 from being usable (auth, round entry, dashboard)
2. Anything that enables real user testing (mobile UX, deployment)
3. Strokes Gained engine (Phase 2 — the core differentiator)
4. AI feedback (Phase 3)
5. Team features (Phase 4)

### Step 3 — Break Into Day-Sized Tasks
Each task should be completable in one focused session (2–4 hours). If a task is bigger, split it.

### Step 4 — Order Tasks Correctly
Dependencies first. Never build the dashboard before round save works. Never build SG display before the SG calculation engine is tested.

### Step 5 — Set the Sprint Goal
One sentence: "By the end of this sprint, Rob will be able to [specific thing]."

Good sprint goals:
- "Enter a full 18-hole round on mobile and see it in the dashboard"
- "See accurate Strokes Gained breakdown after entering a round"
- "Invite a friend to test the app with their own account"

Bad sprint goals:
- "Work on the app"
- "Improve things"
- "Phase 2"

---

## Phase 1 Sprint Breakdown (Reference)

### Sprint 1 — Project Foundation (Week 1)
**Goal:** Get the project running locally with auth working.

Tasks:
1. Set up Next.js project with Supabase (2h)
2. Configure environment variables — run /env setup (30min)
3. Build sign up + sign in pages using /frontend (3h)
4. Set up database schema — users, rounds, holes tables (2h)
5. Test auth flow on mobile browser (1h)
6. Deploy to Vercel staging — run /env check (1h)

**Done when:** Rob can sign up, log in, and see an empty dashboard on his phone.

---

### Sprint 2 — Round Entry (Week 2)
**Goal:** Enter a full 18-hole round and save it.

Tasks:
1. Build round setup screen (date, course, 9/18, type) using /frontend (3h)
2. Build hole entry screen with mobile steppers and toggles using /frontend (4h)
3. Build round summary screen using /frontend (2h)
4. Build POST /api/rounds endpoint — run /api to design it first (3h)
5. Connect frontend to API, test full save flow (2h)
6. Run /review + /test on round entry logic (2h)

**Done when:** Rob can enter a complete round on his phone and it saves to the database.

---

### Sprint 3 — Dashboard (Week 3)
**Goal:** View all rounds in a clean dashboard with drill-down.

Tasks:
1. Build GET /api/rounds endpoint with pagination — run /api (2h)
2. Build dashboard rounds list using /frontend (3h)
3. Build hole-by-hole drill-down view using /frontend (2h)
4. Run /perf — check dashboard load time on mobile (1h)
5. Run /a11y — accessibility check (1h)
6. Run /security — auth check (1h)
7. Run /release — first real release (1h)

**Done when:** Rob can see all his rounds, tap into any round, and see every hole. Looks like a real app.

---

### Sprint 4 — Subscriptions (Week 4)
**Goal:** Charge £4.99/month and gate premium features.

Tasks:
1. Set up Stripe products and prices (1h)
2. Build subscription signup flow using /frontend (3h)
3. Build POST /api/subscription + webhook endpoint (4h)
4. Add subscription gate to SG endpoints (1h)
5. Run /payments — full Stripe audit (2h)
6. Test with Stripe test cards — success, failure, cancellation (2h)

**Done when:** Rob can subscribe to Pro, and free users can't access premium features.

---

## Output Format

When Rob runs /sprint:
1. **Sprint Goal** — one sentence
2. **Task List** — ordered, with estimated hours
3. **Total hours** — realistic estimate
4. **Definition of Done** — exactly what Rob can do when the sprint is complete
5. **What's deliberately excluded** — what won't be built this sprint and why

Always end with: "Ready to start? Type YES to begin Sprint [X], or tell me what to change."
