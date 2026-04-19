# CLAUDE.md — TM Stats Golf V2

Read this file at the start of every single session before doing anything else.
Also read golf-context.md for deep golf knowledge.

---

## Session Start Protocol

Every session begins with:
```
/memory
```
This loads project state, decisions made, what was last worked on, and what to do next.
Every session ends with:
```
/memory save
```

---

## What TM Stats Is

A golf statistics web app for serious amateur golfers. The core differentiator is **Strokes Gained** combined with **AI coaching feedback** in the voice of a chosen coach persona.

Built by Rob Cull — former county golfer (Cheshire) and NCAA Division 2 player (Newberry College, SC). Rob is the product owner and golf domain expert. Claude Code is the developer.

**Tagline:** Track to Improve

---

## Custom Commands

### Workflow
| Command | When |
|---|---|
| `/memory` | Start of every session |
| `/memory save` | End of every session |
| `/brainstorm [topic]` | Before planning anything |
| `/plan [feature]` | Before building — get approval first |
| `/sprint [phase]` | Break work into weekly plans |
| `/review [code]` | After building |
| `/debug [problem]` | When something breaks |
| `/nextlevel [area]` | Challenge if it's genuinely excellent |

### Building
| Command | When |
|---|---|
| `/frontend [component]` | Any UI work — enforces design system |
| `/api [endpoint]` | Design endpoints before coding |
| `/test [feature]` | Write tests — mandatory for SG engine |
| `/copy [screen]` | Review all text on any screen |
| `/coach` | Coaching voices for AI feedback |

### Reviewing
| Command | When |
|---|---|
| `/security` | Before every release |
| `/payments` | Any Stripe changes |
| `/sgcheck` | Any SG engine changes |
| `/perf [page]` | Performance check |
| `/a11y [component]` | Accessibility check |
| `/data [check]` | Data integrity and migrations |
| `/env [setup/check]` | Environment variables |
| `/git [commit]` | Commit messages |
| `/tokens` | Context health check |

### Autonomous Review Team
| Command | Role |
|---|---|
| `/ceo` | Business value — ship or not |
| `/em` | Engineering quality |
| `/release` | Pre-ship checklist |

---

## Tech Stack

- Frontend: React / Next.js (App Router)
- Database: PostgreSQL via Supabase
- Auth: Supabase Auth
- Payments: Stripe (account already exists)
- Hosting: Vercel
- Domain: tmstatsgolf.com on Hostinger — pointed to Vercel when going live
- AI feedback: Anthropic Claude API

**Domain note:** Build locally → Vercel staging → point Hostinger to Vercel last. Domain is never needed to build.

---

## Accounts & Assets

- Auth emails: rob.tmstats@gmail.com
- Stripe: existing account, connect in Sprint 4
- Logo files in /assets/:
  - icon_only_logo.png — red target icon only
  - logo_black_text_no_background.png — full logo dark text
  - logo_white_text_no_background.png — full logo white text (use on dark bg)
  - logo_blackoutline_text_no_background.svg — SVG version (preferred for web)

---

## Pricing

| Plan | Price | Includes |
|---|---|---|
| Free | £0 | 5 rounds max, basic stats, no SG, no AI |
| Pro | £4.99/month or £50/year | Unlimited rounds, full SG, AI feedback, all coaches |
| Team/Coach | TBD | Squad dashboard, coach tools, AI challenge feature |

---

## Database Schema

### users
```sql
id, email, name, handicap, created_at, subscription_status,
feedback_level VARCHAR(20) DEFAULT 'intermediate',
coach_persona VARCHAR(50) DEFAULT 'club_pro'
```

### rounds
```sql
id, user_id, date, course_name, holes (9/18),
round_type ('practice'|'tournament'|'competition'),
par_total, score_total,
notes TEXT, notes_updated_at TIMESTAMP,
mood VARCHAR(20), conditions VARCHAR(50), energy_level VARCHAR(20),
created_at
```

### holes
```sql
id, round_id, hole_number, par, score,
fir BOOLEAN,         -- NULL on par 3s, auto-calculated from shots if available
gir BOOLEAN,         -- auto-calculated from shots if available
putts INTEGER,       -- auto-calculated from shots if available
up_and_down BOOLEAN, -- auto-calculated
sand_save BOOLEAN,   -- auto-calculated
distance_to_pin_yards INTEGER,
lie_type VARCHAR(20),
hole_note TEXT,
shots JSONB          -- array of individual shots for full tracking mode
```

### teams
```sql
id, name, coach_user_id, join_code VARCHAR(8), created_at
```

### team_members
```sql
id, team_id, user_id, joined_at
```

### coach_ai_challenges
```sql
id, round_id, player_id, coach_id,
original_ai_feedback TEXT,
coach_context TEXT,
revised_ai_feedback TEXT,
created_at
```

---

## Golf Rules — Non-Negotiable

- FIR: Only on par 4s/5s. NULL (not false) on par 3s.
- GIR: Par 3 = on in 1. Par 4 = on in 2. Par 5 = on in 3.
- Up & Down: Only when GIR = false. Hole out in 2 from off green.
- Sand Save: In greenside bunker AND made up and down.
- Putts: From putting surface only. Chip-in = 0 putts.
- SG Formula: expected_before - expected_after - 1
- Positive SG = better than baseline. Negative = worse.

---

## Smart Auto-Calculation

When players enter shot-by-shot data with distances and lies, the system auto-calculates FIR, GIR, up & down, sand save, and putts — player never manually enters YES/NO.

**Two input modes:**
1. Quick mode — enter par, score, manual FIR/GIR/putts (fast, no SG)
2. Full tracking mode — enter each shot with distance and lie type → everything auto-calculated → full SG unlocked

Toggle at round setup: "Quick entry" vs "Full tracking (enables Strokes Gained)"

**Auto-calc logic:**
- Shot 1 lie = 'fairway' → FIR = true (par 4/5 only)
- Shot ≤ (par-2) with lie = 'green' → GIR = true
- Shots with lie = 'green' → putt count
- Off green + holed in 2 → up_and_down = true
- Any lie = 'bunker' near green + up_and_down = true → sand_save = true

---

## Team & Coach Feature

- Coach creates team → gets 8-character join code
- Players enter code in settings → linked to coach
- Coach sees all players' stats, SG, round history, AI recommendations

### Coach AI Challenge
After AI generates player feedback, coach can:
1. Read the AI recommendation
2. Add context the stats don't show: player tendencies, mental game, injury history, technical work in progress
3. Challenge the AI — it re-analyses using both stats AND coach knowledge
4. Revised recommendation shown to coach and player
5. Stored in coach_ai_challenges table

---

## AI Coaching System

Player profile settings:
- Feedback level: Simple / Intermediate / Advanced
- Coach voice: Butch / Leadbetter / Pelz / Cowen / Haney / Club Pro / Encourager / Straight Talker / Harvey

Always include in AI prompt:
- SG data by category
- Round notes and condition tags
- Last 5-round averages
- Round type (practice vs competition)
- Feedback level and coach persona

See /coach skill for full voice definitions and example outputs.

---

## Design System

- Primary red: #CC2222
- Dark bg: #0F1117 | Surface: #1A1D27 | Surface raised: #22263A
- Text: #F0F0F0 | Muted: #9A9DB0
- SG positive: #22C55E | SG negative: #EF4444
- Fonts: DM Sans (headings), Inter (body), DM Mono (all numbers/stats)
- Mobile first — 390px before desktop
- Min tap target 44px — this is on a golf course in the rain
- Loading skeletons not spinners
- Every empty state is designed — never blank

---

## Security Rules

- Every DB query filtered by server-side user_id — never trust frontend
- Supabase service role key server-side only
- All secrets in .env — never in code
- Stripe webhook verifies signature
- Coaches only see players who joined their team
- Notes sharing with coach is opt-in per round

---

## Roadmap

| Phase | What |
|---|---|
| 1 — Sprints 1–3 | Auth, round entry, dashboard, mobile UI |
| 2 — Sprints 4–5 | SG engine, baselines, auto-calc from shots |
| 3 — Sprints 6–7 | AI feedback, coach voices, notes integration |
| 4 — Sprint 8+ | Team accounts, coach challenge, B2B |

---

## How Rob Works

- Tests everything as a real golfer on a phone — confusing = rebuild it
- Speaks plain English — Claude Code explains plans plainly before coding
- Always run /plan, always wait for YES before building
- Rob is not a developer — never assume technical knowledge
