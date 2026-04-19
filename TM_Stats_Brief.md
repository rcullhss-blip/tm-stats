# TM Stats V2 — Full Project Brief
**For Claude Code — read alongside CLAUDE.md**
**Owner:** Rob Cull | rob.tmstats@gmail.com
**Current site:** tmstatsgolf.com

---

## The Story

Rob Cull played county golf for Cheshire and NCAA Division 2 at Newberry College, South Carolina (season low 70, SAC Commissioner's Honor Roll). As a serious amateur he could never find stats tracking that was affordable, worked on a phone, and gave real insight. He built TM Stats himself on WordPress with zero coding background.

The original site works — golfers can enter rounds hole by hole, see basic stats, and compare. But it has no Strokes Gained, no charts, no mobile-first design, no AI insight. It competes on price alone against Arccos and Clippd who have millions in funding.

TM Stats V2 rebuilds from scratch on a proper stack with Strokes Gained as the core differentiator and AI coaching feedback as the retention engine.

---

## The Problem Being Solved

Basic golf stats tell you what happened. Strokes Gained tells you what it cost you.

A golfer who hits 11 GIR and shoots 75 looks like they played well. But if their approach shots left them 40 feet from the pin every time, they were actually losing shots on every hole. Strokes Gained reveals this. No competitor does this well at this price point without requiring hardware.

---

## Target Users

**Primary — The improving amateur (handicap 0–18)**
Plays 1–3 times per week. Wants to know what to practice, not just what happened. Would pay £4.99/month if the insight is genuine.

**Secondary — The competitive amateur (handicap 0–8)**
Already aware of SG. Wants Tour-level analytics without Tour-level cost. Responds to honest, data-driven feedback.

**Team — College golf coaches and PGA club professionals**
Has 8–15 players. Wants aggregate squad data and individual drill recommendations. Would pay £30–50/month for a tool that saves hours of analysis.

**B2B — England Golf**
750,071 registered members in 2025. A partnership at £1/member/month = ~£750k/month recurring revenue. Long-term goal.

---

## What Exists Today (V1 — WordPress)

**Round entry (3 steps):**
1. Date, course name, 9 or 18 holes
2. Hole-by-hole: par, score, FIR (YES/NO), GIR (YES/NO), putts, up & down (YES/NO), sand save (YES/NO)
3. Summary screen — auto-calculated stats

**Dashboard:**
Table of all rounds showing: holes, date/course, par, score, fairway %, GIR %, putts, putts per hole, up & down %, sand saves %

**Other features:**
- Drill-down per round (hole by hole breakdown)
- Date range filter
- Team feature (coach sees all players)
- Referral/promo code system
- £4.99/month subscription via WooCommerce

**What's missing:**
- Strokes Gained
- Charts or trend visualisation
- Mobile-first design
- AI feedback
- Auto-calculation from shot data

---

## V2 Full Feature Specification

### Round Entry — Rebuilt

**Two modes (player chooses at round setup):**

**Quick Mode (same speed as V1):**
- Date, course, 9/18, round type
- Per hole: par selector, score stepper, manual FIR/GIR toggles, putts stepper
- Fast, no SG calculation possible
- For golfers who just want basic stats

**Full Tracking Mode (unlocks SG):**
- Per hole: par, then each shot entered with:
  - Distance to pin (yards)
  - Lie type: fairway / rough / bunker / fringe / green / penalty
- System automatically calculates: FIR, GIR, putts, up & down, sand save
- Player never manually enters YES/NO — the system knows from the shot data
- Full Strokes Gained calculation available

**Round setup fields:**
- Date (auto today)
- Course name
- 9 or 18 holes
- Round type: Practice / Tournament / Competition
- Input mode: Quick / Full tracking

**Post-round:**
- Summary screen with stats
- Round notes field with quick-tap mood/conditions/energy tags
- AI feedback generated immediately (Pro users)

---

### Strokes Gained Engine

**Formula:**
```
SG = expected_strokes_from_position_A - expected_strokes_from_position_B - 1
```

**Four categories:**
1. Off the Tee — tee shots on par 4s and 5s
2. Approach — shots into the green
3. Around the Green — chips, pitches, bunker shots within 30 yards
4. Putting — all putts on the green

**Baselines (player selects):**
- PGA Tour average
- European Tour average
- Scratch (0 handicap)
- 5 handicap
- 10 handicap
- 18 handicap
- 28 handicap

**Data source:** DECADE Golf / Lou Stagner published expected strokes tables

---

### Dashboard (Full Rebuild)

**Overview tab:**
- Summary cards: rounds played, scoring average, SG total, handicap trend
- SG bar chart: 4 categories vs selected baseline
- Trend lines: scoring average and SG over last 10 rounds
- Plain English insight: "Your biggest opportunity: Approach shots (-1.4 vs scratch)"

**Rounds tab:**
- Card-based list (not table on mobile)
- Date, course, score, SG total badge (green/red)
- Tap to drill down

**Stats tab:**
- Par 3/4/5 averages
- GIR % trend, FIR % trend
- Putts per GIR (isolates putting from approach quality)
- Scrambling %, sand save %

**SG tab:**
- Full category breakdown per round
- Distance band breakdowns (150–175yd, 10–20ft putts etc)
- Best and worst rounds by category
- Pattern identification

---

### AI Feedback (Phase 3)

**Post-round:**
- Triggered immediately after saving a round
- Uses: SG data + round notes + conditions tags + last 5 rounds + round type
- Delivered in chosen coach voice at chosen feedback level
- Specific drills, not generic advice

**Practice recommendations:**
- Available on dashboard between rounds
- "Based on your last 5 rounds, here's what to work on this week"

**Coach voices:** Butch / Leadbetter / Pelz / Cowen / Haney / Club Pro / Encourager / Straight Talker / Harvey
**Feedback levels:** Simple / Intermediate / Advanced
See /coach skill for full definitions.

---

### Team & Coach Feature (Phase 4)

**Setup:**
- Coach creates account, gets 8-character join code
- Players enter code → linked to coach's squad
- Coach sees all players' full stats, SG, history, AI feedback

**Coach dashboard:**
- All players ranked by SG category
- Aggregate squad weaknesses: "8 of 12 players are losing shots on approach"
- Individual player deep-dives
- Practice session planner based on squad data

**Coach AI Challenge:**
- Coach reads AI recommendation for a player
- Adds context stats don't show: mental tendencies, current technical work, injury history, pressure patterns
- System re-analyses with combined statistical + human knowledge
- Revised recommendation shown to both coach and player
- Coach can iterate — keep challenging until satisfied
- Stored in coach_ai_challenges table

---

### Round Notes System

- Free text note after every round
- Quick-tap tags: mood (tough/average/good/great), conditions (sunny/windy/rainy/cold/hot), energy (fresh/normal/tired/niggly)
- Tags stored as structured data for pattern analysis
- Notes included in AI feedback prompt — changes interpretation of stats
- Season journal: timeline of all rounds with notes, searchable
- Year-end review: compiled season summary with stats/notes correlation

---

## Design Direction

- Dark UI, red brand, sports analytics feel — not social app
- DM Mono for all numbers (makes stats feel precise and credible)
- Mobile first — designed for a phone on a golf course in the rain
- 44px minimum tap targets — always
- Skeletons not spinners
- Every empty state is designed

---

## Competitors

| | Arccos | Clippd | Shot Scope | TM Stats V2 |
|---|---|---|---|---|
| Price | ~£20/mo | ~£12/mo | Hardware cost | £4.99/mo |
| Hardware | Required | No | Required | No |
| Strokes Gained | Yes | Yes | Yes | Yes |
| AI Feedback | Basic | No | No | Yes — coach voices |
| No-hardware SG | No | Yes | No | Yes |
| Coach tools | No | Yes | No | Yes + AI challenge |
| Auto-calc stats | Yes (GPS) | No | Yes (GPS) | Yes (shot entry) |

---

## Hosting & Deployment

1. Build locally (localhost:3000)
2. Deploy to Vercel for staging (free tier)
3. When ready to go live: add custom domain in Vercel → update DNS in Hostinger
4. tmstatsgolf.com points to Vercel — done

No need to touch the domain until Step 3. Everything before that is independent.

---

## Success Metrics

V2 is working when:
1. A golfer enters a round on their phone in under 8 minutes
2. They immediately see their Strokes Gained vs their chosen baseline
3. They receive specific, accurate practice advice in the voice of their chosen coach
4. They come back after their next round
5. They would not switch to a free alternative because TM Stats tells them something no free app does
