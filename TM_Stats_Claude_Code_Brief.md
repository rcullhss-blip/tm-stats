# TM Stats V2 — Complete Claude Code Brief

**Owner:** Rob Cull  
**Current site:** tmstatsgolf.com  
**Goal:** Rebuild TM Stats from WordPress into a modern, scalable web app with Strokes Gained as the core differentiator and a clean, professional UI that serious golfers will pay for.

---

## 1. Who Rob Is — Important Context

Rob Cull is a former competitive golfer — county level for Cheshire, NCAA Division 2 at Newberry College (South Carolina), academic honours. He built the original TM Stats himself with zero coding background using WordPress and Fiverr. He is now learning to build properly using Claude Code.

Rob is NOT a developer. He is the product owner and golf domain expert. His job is to define what golfers need, test everything like a real user, and direct Claude Code clearly. Claude Code builds it.

---

## 2. What TM Stats Is Today — The Baseline

### Current Stack
- WordPress with a custom Fiverr-built plugin
- Hosted at tmstatsgolf.com
- Authentication via WooCommerce (subscription-based)

### Current User Flow (3 Steps)

**Step 1 — Round Details**
- Date (dd/mm/yyyy)
- Course Name (free text)
- Golf Holes: 18 Holes / 9 Holes

**Step 2 — Shot Data (hole by hole)**
- Scorecard grid at top: Holes 1–18, par row, score row (user fills in scores)
- Then per-hole entry panel:
  - Hole number (1–18)
  - Par: Par 3 / Par 4 / Par 5
  - Score (number input)
  - FIR (Fairway in Regulation): YES / NO
  - GIR (Green in Regulation): YES / NO
  - Up and Down: YES / NO
  - Sand Saves: YES / NO
  - Putts (number input)
  - Navigation: "Go to previous hole" / "Go to Next Hole"

**Step 3 — Summary (before submit)**
- Golf Club
- Date
- Round Played (Practice / Tournament label)
- Par
- Score
- GIR Average % (of all 18)
- FIR Average % (of all 18)
- Putts total
- Putts per hole
- Up and Down %
- Sand Saves %
- Par 3 Averages
- Par 4 Averages
- Par 5 Averages

### Current Dashboard (My Account)
- Table of all rounds showing: Holes, Date+Course, Par, Score, Fairway count, Fairway %, Green count, GIR %, Putts, Putts per hole, Up & Down %, Sand Saves %
- Filter by date range
- Filter by team
- "More Stats" drill-down per round (hole-by-hole breakdown)
- Delete round

### Current Other Features
- Referral/promo code system
- Team feature: coach account sees all players' stats
- Packages/subscription page

### What's Wrong With It (Rob's honest assessment)
- WordPress is a dead end — can't build what's needed on top of it
- No Strokes Gained — the one metric serious golfers actually care about
- No charts, no trends, no visual analytics — just a table
- Competing against Arccos and Clippd (millions in funding) on price — losing battle at £4.99/month
- The round entry UX is slow and clunky — one hole at a time with no smart shortcuts
- No mobile-first design — most golfers would use this on the course on their phone

---

## 3. The Vision — TM Stats V2

### Core Positioning
> "Golf stats that actually tell you where you're losing shots — compared to any level you choose. Tour pro, scratch, 5 handicap, 10 handicap. Track it, see it, fix it."

### Target Users
- Serious amateur golfer (handicap 0–18) who wants to improve
- College golf team players (NCAA and UK university)
- Golf coaches who want aggregated squad analytics
- Eventually: England Golf registered members (~750k players)

### Why People Will Pay £4.99/month
1. **Strokes Gained** — tells you exactly which part of your game costs you the most shots
2. **Personalised AI feedback** — tells you what to practice and why
3. **Benchmark flexibility** — compare yourself against whatever level you want
4. **Clean, fast UX** — designed for use on the course on a phone, not a desktop spreadsheet

---

## 4. Full Feature Specification for V2

### 4.1 Tech Stack (what to build on)
- **Frontend:** React (modern, component-based, fast)
- **Backend:** Node.js + Express or Next.js (API routes)
- **Database:** PostgreSQL (structured data, good for stats queries)
- **Auth:** Supabase Auth or Clerk (easy user management)
- **Hosting:** Vercel (frontend) + Supabase or Railway (backend/DB)
- **Payments:** Stripe (subscriptions)

### 4.2 Round Entry — Rebuild and Improve

Keep all existing fields but redesign the UX:

**Round setup screen:**
- Date (auto-filled to today, editable)
- Course name (free text + future: search/autocomplete)
- 9 or 18 holes
- Round type: Practice / Tournament / Competition
- Tee colour (optional): Black / White / Yellow / Red (affects yardage for SG later)

**Hole entry — redesigned for mobile speed:**
- One screen per hole (like current) BUT with big tap-friendly buttons
- Par selector: big buttons for 3 / 4 / 5
- Score: +/- stepper (not a keyboard number input)
- FIR: YES / NO large toggle (only shown on par 4s and 5s)
- GIR: YES / NO large toggle
- Putts: +/- stepper (0–6)
- Up & Down: YES / NO (only shown if GIR = NO)
- Sand Save: YES / NO (only shown if in bunker — optional flag)
- **NEW for Strokes Gained:** Distance to pin (yards) for approach shots — optional field
- Progress bar at top: Hole 1 of 18
- Auto-advance to next hole after entering putts

**Summary screen before save:**
- All existing summary fields
- PLUS Strokes Gained totals per category (if distance data entered)

### 4.3 Strokes Gained Engine — The Core Feature

**What it is:**
Strokes Gained (SG) measures how many shots a golfer gains or loses on each shot type vs a baseline. It was developed from PGA Tour ShotLink data by Mark Broadie.

**The four categories:**
1. **SG: Off the Tee** — all tee shots on par 4s and par 5s
2. **SG: Approach** — shots into the green from fairway/rough
3. **SG: Around the Green** — chips, pitches, bunker shots inside ~30 yards
4. **SG: Putting** — all putts on the green

**How it calculates:**
- Each position (distance + lie type) has an "expected strokes to hole out" value from the baseline dataset
- SG for one shot = expected_strokes_before - expected_strokes_after - 1
- Sum all shots in a category = that category's SG for the round
- Positive = better than baseline. Negative = worse.

**Baseline levels to offer (user selects at any time):**
- PGA Tour average
- European Tour average
- Scratch (0 handicap)
- 5 handicap
- 10 handicap
- 18 handicap
- 28 handicap

**Data source:**
Use DECADE Golf / Lou Stagner published expected strokes tables (publicly available, based on shot distance and lie type).

**Input data needed from golfer per shot (for full SG):**
- Tee shot: distance to pin after tee shot (yards), lie (fairway/rough/bunker/penalty)
- Approach: distance to pin before shot, lie, distance to pin after
- Around green: distance to pin before shot, surface (green/fringe/rough/bunker)
- Putts: distance to pin before each putt

**Simplified SG mode (for users who don't enter distances):**
- Use score + GIR + putts + par to calculate an estimated SG using average assumptions
- Less accurate but still useful — show as "estimated SG"

### 4.4 Dashboard — Complete Rebuild

**Overview tab:**
- Summary cards: Rounds played, Scoring average, Average SG total, Handicap trend
- SG breakdown chart (bar chart): Off the Tee / Approach / Around the Green / Putting — vs selected baseline
- Trend line: scoring average over last 10 rounds
- Trend line: SG total over last 10 rounds
- Strengths and weaknesses panel: "Your strongest category: Putting (+0.8 vs scratch). Your biggest opportunity: Approach (-1.4 vs scratch)."

**Rounds tab:**
- Same table as current but cleaner design
- Sortable columns
- Click into any round for full hole-by-hole breakdown
- Add round button prominent at top

**Stats tab:**
- Deeper breakdowns:
  - Par 3 / 4 / 5 scoring averages
  - GIR % trend
  - FIR % trend
  - Putts per GIR (key stat — isolates putting from approach quality)
  - Scrambling % (up & down when missing GIR)
  - Sand save %

**Strokes Gained tab:**
- Full SG breakdown per round
- Category totals vs selected baseline
- Best and worst rounds by SG
- Which holes/shot types are costing most

**Compare tab (existing feature, rebuild):**
- Compare your stats vs another TM Stats user (by username or team)
- Compare your last 5 rounds vs your previous 5 (trend direction)

### 4.5 AI Feedback Layer

Using the Claude API, generate personalised practice recommendations based on a player's SG data.

**How it works:**
- After each round, or on demand from dashboard
- Feed Claude: last 5 rounds SG data, category averages, selected baseline
- Claude outputs:
  - Your biggest weakness this month: [category]
  - Why this is costing you shots: [explanation]
  - 3 specific drills to fix it: [drill 1, 2, 3]
  - What to focus on in your next practice session

**Tone:** Direct, like a good coach. Not generic. Referenced to their actual numbers.

### 4.6 Team / Coach Feature (rebuild from existing)

- Coach creates a team
- Players join via team code
- Coach dashboard: table of all players' stats side by side
- Coach can see each player's full round history
- Filter by: player, date range, round type (practice vs competition)
- Aggregate team stats: team GIR %, team SG averages

### 4.7 Subscription / Payments

- £4.99/month via Stripe
- Free tier: up to 5 rounds, no SG, no AI feedback
- Paid tier: unlimited rounds, full SG, AI feedback, team features
- Coach/team account: separate pricing TBD

### 4.8 Mobile-First Design Requirements

- This app will primarily be used on a phone on a golf course
- Round entry must work perfectly on a small screen with one hand
- Big tap targets, no tiny text inputs
- Works offline or with poor signal — save data locally and sync when connected
- Fast — no waiting for page loads between holes

---

## 5. What NOT to Build in V1

Keep scope tight for first build. Do not include:
- GPS / shot tracking (that's Arccos territory and needs hardware)
- Course database / handicap calculator
- Social features / leaderboards
- Video analysis
- Swing tips content

Add these later once the core is working.

---

## 6. Phased Build Plan

### Phase 1 — Foundation (build this first)
- React frontend + backend API + database
- User auth (sign up, log in, subscription)
- Round entry: full hole-by-hole with all existing fields
- Dashboard: rounds table + hole drill-down
- Mobile-first design throughout

### Phase 2 — Strokes Gained Engine
- SG data tables loaded into database
- SG calculation logic
- Baseline selector
- SG display on dashboard and round summary
- Simplified estimated SG mode

### Phase 3 — AI Feedback
- Claude API integration
- Practice recommendation generation
- Feedback shown after rounds and on dashboard

### Phase 4 — Team & B2B
- Team/coach feature rebuild
- College team targeting
- England Golf partnership prep

---

## 7. Design Direction

- **Colour palette:** Keep TM Stats red (#CC2222 approx) as primary brand colour — it's established
- **Style:** Clean, dark UI — serious and performance-focused, not toy-like
- **Typography:** Strong, clear — think sports analytics not social app
- **Key principle:** Easy enough for a 60-year-old club golfer to use on the first attempt
- **Mobile:** Design mobile first, desktop second

---

## 8. Key Files Claude Code Will Need to Know About

When building, Claude Code should always be aware of:
- `CLAUDE.md` — this file, project context and rules
- `src/data/strokes-gained-baseline.js` — the SG expected strokes tables
- `src/components/HoleEntry.jsx` — the core round entry component
- `src/components/Dashboard.jsx` — main dashboard
- `src/api/rounds.js` — round save/fetch logic
- `src/api/strokes-gained.js` — SG calculation engine
- `database/schema.sql` — full database schema

---

## 9. Success Definition

TM Stats V2 is successful when:
1. A golfer can enter a round on their phone in under 8 minutes
2. They can immediately see their Strokes Gained vs scratch
3. They get a specific, accurate practice recommendation
4. They come back after their next round to track progress
5. They would not switch to a free alternative because TM Stats tells them something no free app does
