# TM Stats — Session Log

## 2026-04-15 (Session 1)
**Worked on:** Project initialisation — read CLAUDE.md and golf-context.md, set up memory files, ran Sprint 1 plan
**Completed:** All four memory files created (project-state, decisions, blockers, session-log). Sprint 1 plan produced.
**Left unfinished:** No code written yet — Sprint 1 not started
**Decisions made:** No new decisions this session — existing stack decisions documented in decisions.md
**Next session should start with:** `/memory` then confirm Sprint 1 start. First task: Next.js project setup with Supabase.

## 2026-04-15 (Session 2)
**Worked on:** Sprint 1 — full app build
**Completed:**
- Next.js 16 + Tailwind v4 + TypeScript scaffolded
- Supabase SSR client (browser + server) + Database types
- Auth: signup, login, logout (Supabase Auth)
- Protected routes via proxy.ts (Next.js 16 middleware replacement)
- Round entry: 3-step flow — RoundSetup → HoleEntry → RoundSummary
- Dashboard with overview cards and recent rounds list
- Rounds list page
- Round detail page (hole drill-down, stats, notes display)
- Profile page with plan status and logout
- Stats stub page
- Bottom nav + TopBar components
- Design system: #CC2222 red, dark bg, DM Sans/Inter/DM Mono fonts
- supabase-schema.sql with full RLS policies
- Dev server running at localhost:3000
**Left unfinished:** Supabase project not created yet — Rob needs to do that next
**Decisions made:** Stripe deferred to Sprint 4. Full tracking mode deferred to Sprint 2.
**Next session should start with:** Rob creates Supabase project → fills .env.local → test auth. Then mobile QA. Then Sprint 2 (SG engine).
