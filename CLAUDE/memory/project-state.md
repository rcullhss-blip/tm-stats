# TM Stats — Project State

## Phase 1: Foundation
- [x] Project setup (React + Next.js 16 + Supabase)
- [x] Authentication pages (signup, login, logout)
- [x] Protected routes via proxy.ts
- [x] Round entry — Step 1: RoundSetup (course details + mode)
- [x] Round entry — Step 2: HoleEntry (hole by hole, quick mode)
- [x] Round entry — Step 3: RoundSummary (stats + notes + save)
- [x] Dashboard — overview cards, rounds list
- [x] Round detail page (hole-by-hole drill-down)
- [x] Rounds list page
- [x] Profile page with logout
- [x] Stats stub page
- [x] Bottom nav + Top bar
- [x] Design system (colours, fonts, spacing)
- [x] Supabase schema SQL (supabase-schema.sql)
- [ ] Supabase project created (Rob needs to do this)
- [ ] .env.local filled in with real keys
- [ ] Mobile responsive check — all screens
- [ ] Stripe subscription integration (deferred to Sprint 4)

## Dev Server
- Runs at: http://localhost:3000
- Start: `cd "tm-stats-v2:" && ./node_modules/.bin/next dev --port 3000`
- Supabase not connected yet — auth/DB features need .env.local keys

## Next Session Should Do
1. Rob creates Supabase project → fills in .env.local → test auth works
2. Mobile QA check on all screens
3. Begin Sprint 2: SG engine baseline data

## Phase 2: Strokes Gained
- [ ] SG baseline data loaded into DB
- [ ] SG calculation engine
- [ ] Baseline selector (scratch/5hcp/10hcp etc)
- [ ] SG display on round summary
- [ ] SG display on dashboard
- [ ] SG trend charts

## Phase 3: AI Feedback
- [ ] Claude API integration
- [ ] Post-round AI feedback
- [ ] Dashboard AI practice recommendations
- [ ] Feedback quality review

## Phase 4: Teams
- [ ] Team creation
- [ ] Player join via code
- [ ] Coach dashboard
- [ ] Squad analytics

## Last Updated: 2026-04-15
## Last Worked On: Session 2 — Sprint 1 built. Full app scaffolded and running.
