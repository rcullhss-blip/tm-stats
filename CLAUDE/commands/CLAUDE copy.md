# CLAUDE.md — TM Stats Golf

Read this at the start of every session before doing anything else.

---

## What This Project Is

TM Stats is a golf statistics web app. The goal is to give serious amateur golfers Strokes Gained analysis so they can see exactly where they're losing shots and what to practice.

Rob Cull is the product owner and golf domain expert. Claude Code is the developer. Rob tests and directs. Claude Code builds.

---

## Full Command Reference

### Workflow Commands
| Command | When to use |
|---|---|
| `/brainstorm [topic]` | Before planning — explore from 4 angles, generate ideas |
| `/plan [feature]` | Before building — step-by-step plan, wait for Rob's YES |
| `/review [file/feature]` | After building — 4-angle check: logic, defensive, UX, code quality |
| `/debug [problem]` | When broken — 4-angle investigation before suggesting fix |
| `/nextlevel [area]` | Periodically — challenge whether it's genuinely excellent |

### Specialist Commands
| Command | When to use |
|---|---|
| `/frontend [component]` | Building any UI — enforces design system, mobile-first, real dev standards |
| `/security` | Before every release — 8-vector security scan |
| `/memory` | Start of every session — load project state and context |
| `/memory save` | End of every session — update all memory files |

### Autonomous Review Team
These run themselves — they do not need manual approval from Rob:
| Command | Role | What they check |
|---|---|---|
| `/ceo [feature]` | CEO | Business value, retention, competition, B2B readiness |
| `/em [codebase]` | Engineering Manager | Code structure, SG engine tests, error handling, performance |
| `/release [version]` | Release Manager | Full pre-ship checklist — clears or blocks the release |

**Default workflow for any new feature:**
1. `/memory` — load context
2. `/brainstorm` — explore the problem
3. `/plan` — get Rob's approval
4. `/frontend` — build UI to proper standards
5. `/review` — check thoroughly
6. `/security` — scan for vulnerabilities
7. `/em` — check engineering quality
8. `/ceo` — check business value
9. `/release` — final pre-ship gate

---

## Tech Stack

- **Frontend:** React / Next.js
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth
- **Payments:** Stripe
- **Hosting:** Vercel
- **AI feedback:** Anthropic Claude API

Do not introduce new libraries without flagging to Rob first.

---

## Database Tables

**users:** id, email, name, handicap, created_at, subscription_status
**rounds:** id, user_id, date, course_name, holes (9/18), round_type, par_total, score_total
**holes:** id, round_id, hole_number, par, score, fir (NULL on par3s), gir, putts, up_and_down, sand_save, distance_to_pin_yards, lie_type
**teams:** id, name, coach_user_id, join_code
**team_members:** id, team_id, user_id

---

## Golf Rules — Non-Negotiable

- **FIR:** Only on par 4s and par 5s. Store NULL (not false) on par 3s.
- **GIR:** Par 3 = green in 1. Par 4 = green in 2. Par 5 = green in 3.
- **Up & Down:** Only recorded when GIR = false.
- **Sand Save:** In greenside bunker AND made up & down.
- **Putts:** From putting surface only. Chip-in = 0 putts.
- **SG Formula:** `expected_strokes_before - expected_strokes_after - 1`
- **SG Positive** = gained shots (better than baseline). **SG Negative** = lost shots.
- **Four SG categories:** Off the Tee, Approach, Around the Green, Putting.

---

## Design Rules

- Primary red: `#CC2222`
- Dark background: `#0F1117` / Surface: `#1A1D27`
- Fonts: DM Sans (headings), Inter (body), DM Mono (all stat numbers)
- Mobile first — 390px width designed before desktop
- Minimum tap target: 44px
- +/- steppers for scores/putts, YES/NO pill toggles (not dropdowns)
- Always show plain English translation next to SG numbers

---

## Security Rules

- Every DB query filters by server-side authenticated user_id
- Never trust user_id from the frontend
- Supabase service key is server-side only — never in client code
- All secrets in environment variables
- Stripe webhook must verify signature before processing

---

## Phased Roadmap

| Phase | What | Status |
|---|---|---|
| 1 | Auth + round entry + dashboard + mobile UI | 🔨 Build first |
| 2 | Strokes Gained engine + baselines | Next |
| 3 | AI feedback via Claude API | After |
| 4 | Team/coach + B2B (England Golf) | Future |

---

## Competitors

- **Arccos** ~£20/month — GPS hardware required
- **Clippd** ~£12/month — SG analytics, complex UX
- **Shot Scope** — hardware dependent

TM Stats wins: cheaper + simpler + SG + AI feedback + no hardware.

---

## How Rob Works

- Tests everything as a real golfer — if confusing, rebuild it
- Describes things in plain English — Claude Code explains plans in plain English before coding
- Run /plan before any build, wait for approval
- When something breaks, explain simply — not in jargon
