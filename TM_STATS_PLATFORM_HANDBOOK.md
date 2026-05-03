# TM Stats — Platform Handbook
### Product & Functionality Reference Document

**Version:** 1.2  
**Prepared by:** TM Stats Ltd  
**Classification:** Confidential — Business Use Only

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Technology Infrastructure](#2-technology-infrastructure)
3. [Subscription Tiers](#3-subscription-tiers)
4. [Authentication & Accounts](#4-authentication--accounts)
5. [Round Entry System](#5-round-entry-system)
6. [Strokes Gained Engine](#6-strokes-gained-engine)
7. [Dashboard](#7-dashboard)
8. [Rounds Management](#8-rounds-management)
9. [Statistics & Analytics](#9-statistics--analytics)
10. [AI Coaching System](#10-ai-coaching-system)
11. [Mental Game Feature](#11-mental-game-feature)
12. [Profile & Settings](#12-profile--settings)
13. [Coach & Team Accounts](#13-coach--team-accounts)
14. [Payments & Billing](#14-payments--billing)
15. [Admin Panel](#15-admin-panel)
16. [Promo Code System](#16-promo-code-system)
17. [Public-Facing Pages](#17-public-facing-pages)
18. [Data Architecture](#18-data-architecture)
19. [Security & Compliance](#19-security--compliance)

---

## 1. Platform Overview

**TM Stats** is a web-based golf performance analytics platform designed for serious amateur golfers. The core product proposition is the combination of **Strokes Gained analysis** — a statistical framework used on the PGA Tour — made accessible to club-level players, combined with **personalised AI coaching feedback** delivered in the voice of a chosen coaching style.

The platform is built mobile-first, designed for use on a smartphone at the golf course, and extends to full desktop use for deeper analysis.

**Tagline:** *Track to Improve*

**Target User:**
- Serious amateur golfers, typically 0–24 handicap
- Golfers who want data-driven insight rather than generic advice
- Coaches managing amateur squads or individual clients

**Core Differentiator:**
Most golf statistics apps track what happened — scores, fairways, putts. TM Stats tells golfers *why* their score was what it was, and *exactly* what to practise to improve it.

---

## 2. Technology Infrastructure

| Component | Technology |
|---|---|
| Frontend Framework | Next.js 16 (App Router, Turbopack) |
| Database | PostgreSQL via Supabase |
| Authentication | Supabase Auth |
| File Hosting | Vercel |
| Domain | tmstatsgolf.com |
| AI Engine | OpenAI GPT-4o-mini |
| Payments | Stripe (live) |
| Transactional Email | Resend |
| Styling | Tailwind CSS + custom design system |

**Architecture:** The platform uses a server-rendered Next.js App Router architecture. Protected pages are server components that query the database directly. Client components are used only where interactivity is required. All authentication and data access is handled server-side; the client never holds sensitive credentials.

---

## 3. Subscription Tiers

The platform operates a freemium model with three account types.

### Free Plan
- Up to **5 rounds** stored (hard limit enforced)
- Basic scoring stats (averages, scoring breakdown)
- No Strokes Gained data
- No AI coaching
- No advanced analytics

### Pro Plan
- **Unlimited rounds**
- Full **Strokes Gained** analysis across all 4 categories
- Full **AI coaching suite** (all 7 modes, all 7 coach personas)
- Advanced statistics and trend analysis
- Mental Game feature
- Golf DNA profile
- Pre-round planning, pattern finder, training focus

**Pricing:** £4.99/month or £50/year (billed via Stripe)

### Team / Coach Plan
- All Pro features included
- **Coach dashboard** with squad management
- **Player oversight** — view any squad member's stats, SG data, and round history
- **AI Challenge** feature — coach can override and enhance AI feedback
- Assigned via admin (not self-serve)

---

## 4. Authentication & Accounts

### Sign Up
New users register with an email address and password. Upon submission, Supabase Auth creates a user record and sends a **confirmation email** to the registered address. The user must confirm their email before they can log in. This prevents spam accounts and ensures contact details are valid.

**Example flow:**  
User visits `/signup` → enters name, email, password → receives confirmation email → clicks confirm link → redirected to login → enters credentials → lands on Dashboard.

### Login
Existing users log in via email and password at `/login`. Upon successful authentication, the session is established via a Supabase-managed JWT stored in a secure cookie. The session is automatically refreshed on page navigation via a server-side proxy.

**Admin redirect:** The system administrator (rcullhss@gmail.com) is automatically redirected to the Admin Panel upon login.

### Session Management
Sessions persist across browser sessions. If a session expires, the user is redirected to `/login`. Protected pages and API routes verify the session server-side on every request — the client cannot spoof authentication status.

### Password Security
Passwords are hashed and managed entirely by Supabase Auth. TM Stats never stores or has access to raw passwords.

---

## 5. Round Entry System

Round entry is the core data-collection feature of the platform. There are two distinct input modes designed to balance speed against analytical depth.

### 5.1 Round Setup

Before entering hole data, the user configures the round:

| Field | Options | Notes |
|---|---|---|
| Course name | Free text | e.g., "Royal Birkdale" |
| Date | Date picker | Defaults to today |
| Holes | 9 or 18 | Affects scoring and SG calculations |
| Round type | Practice / Competition / Tournament | Used in pattern analysis |
| Input mode | Quick Entry / Full Tracking | Determines data depth |

### 5.2 Quick Entry Mode

The simplest and fastest input method. For each hole the user enters:
- **Par** (3, 4, or 5)
- **Score** (number of strokes)
- **Fairway in Regulation** (yes/no — par 4s and 5s only; not shown on par 3s)
- **Green in Regulation** (yes/no)
- **Putts** (number)

**What it produces:** Scoring stats, FIR%, GIR%, putts data. No Strokes Gained (SG requires shot-by-shot data).

**Typical use case:** A golfer who wants to log rounds quickly without stopping to record every shot.

### 5.3 Full Tracking Mode

Shot-by-shot entry for complete analytical depth. For each shot on each hole, the user records:
- **Distance to pin** (in yards)
- **Lie type** (tee, fairway, rough, bunker, recovery, green, penalty, other)

The system **auto-calculates** all derived statistics from this data:
- FIR — automatically true if the first shot from the tee lands in the fairway (par 4/5)
- GIR — automatically true if the player reaches the green in regulation (par minus 2 strokes)
- Putts — automatically counted from shots taken on the putting surface
- Up & Down — automatically true if the player fails GIR but holes out in 2 from off the green
- Sand Save — automatically true if the player was in a greenside bunker and made up & down

**What it produces:** Everything from Quick Entry, plus full **Strokes Gained** across all 4 categories.

**Typical use case:** A low-handicap golfer who wants to know exactly where they are losing and gaining shots relative to their benchmark.

**Penalty shot handling**  
When the user selects "Penalty" as the lie type, no yardage input is required. A red info card confirms the penalty counts as 1 stroke and that play continues from the previous position. The system auto-inherits the distance from the prior shot. After a penalty from the tee, the next shot suggestion reverts to "Tee" so the player can re-tee correctly.

**Tee button highlighting**  
The "Tee" lie type button highlights green when selected, consistent with all other lie types.

**Live to-par tracker**  
During hole entry (both Quick and Full Tracking modes), a running to-par total is displayed below the progress bar and updates after each completed hole. Displays as colour-coded text: "+2", "−1", "E", etc.

**Scrollable scorecard strip**  
Below the to-par tracker, a horizontal scrollable row of tiles shows every hole in the round. Completed holes display the score (colour-coded: green = birdie or better, white = par, grey = bogey, red = double bogey or worse) and par (e.g. "P4"). The active hole has a red border. The strip auto-scrolls to keep the current hole centred. Allows the player to spot entry errors without navigating away from the current hole.

**Back from summary preserves data**  
Navigating back from the round summary screen to edit a hole no longer clears entered hole data. All scores are preserved. An amber "Editing round" banner is shown so the player is aware they are in edit mode rather than starting a new round.

### 5.4 Round Conditions

At the point of saving, the user can optionally record contextual data:
- **Mood** (tough / average / good / great)
- **Energy level** (fresh / normal / tired / niggly)
- **Conditions** (calm / breezy / windy / wet / cold)
- **Round notes** (free text — visible to coach if on a team)

These fields feed into AI coaching prompts for richer, more contextually accurate feedback.

### 5.5 Hole-Level Notes

In Full Tracking mode, individual holes support a short **hole note** field. Players can annotate specific holes — e.g., "pulled the drive left, course knowledge issue" — which gives the AI coaching system additional context.

---

## 6. Strokes Gained Engine

Strokes Gained (SG) is a statistical framework originally developed for the PGA Tour and now widely adopted as the gold standard for golf performance analysis. TM Stats implements a full SG calculation engine calibrated against seven amateur skill levels.

### 6.1 What is Strokes Gained?

SG measures how many strokes a player gains or loses on a shot relative to a benchmark of golfers at the same skill level. A positive SG value means the player outperformed the benchmark; negative means they underperformed.

**Formula:** `SG (shot) = Expected strokes from start − Expected strokes after shot − 1`

**Example:**  
A 15-handicap golfer hits a 150-yard approach. The benchmark says a 15-handicap should take 2.8 strokes from there. The player lands 12 feet from the pin, where the benchmark expects 1.5 more strokes.  
SG = 2.8 − 1.5 − 1 = **+0.3** (better than benchmark)

### 6.2 The Four SG Categories

| Category | What it measures |
|---|---|
| **SG: Off Tee** | Tee shots on par 4s and par 5s |
| **SG: Approach** | Shots from outside 30 yards that are not tee shots |
| **SG: Around Green** | Shots from within 30 yards, not on the putting surface |
| **SG: Putting** | All shots taken on the putting surface |

Each category produces a numerical value per round. The sum is **SG: Total**.

### 6.3 Skill Level Baselines

The platform uses 7 calibrated amateur baselines:

| Level | Handicap range |
|---|---|
| Scratch | 0 |
| Low amateur | 1–5 |
| Mid amateur | 6–12 |
| High amateur | 13–20 |
| Bogey golfer | 21–28 |
| High handicapper | 29–36 |
| Beginner | 37+ |

The baseline is automatically set from the user's handicap. Users can manually override it in Profile settings if they want to benchmark against a different level.

### 6.4 SG Interpretation

The platform displays SG data in a consistent format throughout:
- **Green values (positive)** — player outperforming benchmark in that category
- **Red values (negative)** — player underperforming benchmark in that category
- All values displayed to two decimal places using a monospace font for readability

---

## 7. Dashboard

The Dashboard is the home screen after login. It provides an at-a-glance performance summary and entry points to key features.

### 7.1 Greeting
Personalised greeting using the user's name (e.g., "Good morning, Rob").

### 7.2 Average Score
Displays the user's average score relative to par across all logged rounds.

### 7.3 Recent Rounds
A scrollable list of the user's most recent rounds showing date, course, score, and SG total (if available). Each item links through to the full round detail page.

### 7.4 Training Focus *(Pro only)*
Identifies the user's weakest SG category across their last 5 full-tracking rounds and surfaces it as an actionable focus area. Requires a minimum of 2 full-tracking rounds.

**Example output:** *"Your putting is your biggest opportunity right now — you're losing 1.2 strokes per round compared to your baseline. Prioritise the putting green this week."*

### 7.5 One Shot Fix *(Pro only)*
Generates a single, specific, immediately actionable recommendation based on the user's SG data. Framed positively — not "your driving is poor" but "one change that could save you the most shots."

### 7.6 Pre-Round Plan *(Pro only)*
Generates a 3-point course management plan based on the player's recent stats. Not swing advice — strategic decisions about how to play the round. Refreshes on demand.

**Example output:**
> 1. Take one extra club on approach shots — your GIR% improves significantly when you commit to full swings.
> 2. Play away from right-side trouble off the tee — your miss is a fade under pressure.
> 3. If you miss the green, focus on getting up-and-down — your short game stats show this is a strength.

### 7.7 Pattern Finder *(Pro only)*
Scans the user's recent rounds for a notable trend and surfaces one insight.

**Example output:** *"TM Stats has spotted a pattern: Your scoring is 3.2 shots better in practice rounds than competition rounds over your last 8 rounds."*

### 7.8 Free Tier Warning
Free plan users who have used 4 or 5 of their 5 allowed rounds see a persistent banner directing them to upgrade.

### 7.9 Guide Button
A red **GUIDE** tab is pinned to the right edge of the Dashboard screen at all times. Tapping it opens a bottom sheet modal covering how to use Full Tracking (Strokes Gained) mode and Quick Stats mode, including a worked example with a penalty shot, and tips. The modal uses `z-index: 200` to sit above the bottom navigation bar, and uses `height: 85dvh` for correct display on mobile devices.

---

## 8. Rounds Management

### 8.1 Rounds List View
All logged rounds displayed in reverse chronological order. Each entry shows:
- Date
- Course name
- Round type badge (Practice / Competition / Tournament)
- Score relative to par
- Input mode indicator (Quick / Full)
- SG Total (if full tracking round)

### 8.2 Journal / Timeline View
An alternative display mode showing rounds as a visual timeline. More narrative in presentation — treats each round as an entry in a golf journal rather than a row in a table.

### 8.3 Search
Free-text search across round entries by course name. Allows a user to quickly find all rounds played at a specific course.

### 8.4 View Toggle
Users can switch between List View and Journal View from the Rounds page — their preference is preserved within the session.

### 8.5 Round Detail Page

Each round has a dedicated detail page accessible from the Rounds list or Dashboard recent rounds. It contains:

**Scoring Summary**
- Score relative to par, total strokes, course and date
- Front 9 / Back 9 split (18-hole rounds)
- Par breakdown — performance on par 3s, par 4s, par 5s separately

**Scoring Distribution**
- Visual breakdown of eagles, birdies, pars, bogeys, doubles, and worse
- Only shows scoring types that actually occurred in that round

**Stats Grid**
- Fairways in Regulation %
- Greens in Regulation %
- Putts total and per hole
- Up & Down %
- Sand Save %

**Strokes Gained Breakdown** *(Full tracking rounds only)*
- Displayed as a four-category bar chart showing SG: Off Tee, Approach, Around Green, Putting
- Each category colour-coded positive (green) or negative (red)

**Advanced SG by Distance Band** *(Full tracking, Pro only — collapsible)*
- SG broken down by distance ranges: 0–30 yards, 30–75 yards, 75–125 yards, 125–175 yards, 175+ yards
- Allows identification of specific distance gaps (e.g., losing shots from 100–150 yards)

**Round Notes**
- Player's free-text notes displayed if recorded
- Conditions and mood tags if recorded

**Shot-by-Shot View** *(Full tracking rounds only)*
- A hole-by-hole, shot-by-shot replay showing distance, lie type, and SG value per shot

**AI Coaching Panel** *(Pro only)*
- Round-specific coaching feedback from the player's chosen coach persona
- See Section 10 for full details

**Bad Round Recovery Widget** *(Pro only — triggers on poor rounds)*
- Automatically appears if the round was notably poor (8+ over par relative to handicap, or 3+ double bogeys)
- Provides 4 lines of calm, forward-focused perspective — not dwelling on the bad round, focused on what to do next
- Example: *"One tough round doesn't define your season. Your approach play was the main factor today — a quick session with a mid-iron will reset that pattern."*

**Coach Feedback** *(Team plan players only)*
- If the player's coach has submitted an AI Challenge for this round (see Section 13), the revised coaching feedback appears here with a "From your coach" label

---

## 9. Statistics & Analytics

The Stats page provides aggregate analysis across multiple rounds, distinct from the single-round view.

### 9.1 Filters

Three filter controls affect all data on the Stats page simultaneously:

| Filter | Options |
|---|---|
| Date range | Last 5, 10, 20 rounds; or custom date range |
| Round type | All / Practice / Competition / Tournament |
| Holes | All / 9-hole only / 18-hole only |

### 9.2 Scoring Statistics
- Average score relative to par
- Best and worst rounds in the selected period
- Average score trend over time (line chart)

### 9.3 Strokes Gained Summary *(Pro only)*
- Average SG per round across all 4 categories
- Comparison against selected handicap benchmark
- SG trend charts for each of the 4 categories

### 9.4 Benchmark Layer
The stats page can overlay performance data with the average for the user's handicap band — showing not just what the player did, but how it compares to what a player of similar ability typically does.

**Example:** A 10-handicap might average 1.8 putts per hole. The benchmark for a 10-handicap is 1.72. The display would show this gap clearly, identifying putting as a relative weakness even if the raw number looks acceptable.

### 9.5 Score Impact Simulator *(Pro only)*
An interactive tool showing: "If you improved this SG category by X strokes, your average score would be Y lower."

**Example:** *"If your approach play improved by just 0.5 SG per round, your average score would drop from +8 to +5.5."* Helps players prioritise what to work on.

### 9.6 Ball Striking
- Fairways in Regulation % (trend over time)
- Greens in Regulation % (trend over time)
- Displayed as both current average and trend chart

### 9.7 Short Game
- Up & Down % — how often the player holes out in 2 from off the green
- Sand Save % — how often the player escapes a greenside bunker and makes the putt
- Trend over selected period

### 9.8 Putting
- Total putts per round
- Putts per hole average
- Trend chart over selected period

### 9.9 Personal Bests
- Best round score
- Best SG: Total round
- Best SG in each individual category
- Displayed as a summary card — motivational anchor

### 9.10 Scoring Distribution
Aggregate view across all selected rounds showing the percentage breakdown of eagles, birdies, pars, bogeys, doubles, and worse. Allows identification of whether a player's high scores are coming from too many bogeys or from high-number holes.

### 9.11 Handicap Trend *(requires database migration)*
A chart showing how the user's declared handicap has changed over time. Automatically logs a data point whenever the user updates their handicap in Profile settings. Requires 2+ data points to display.

### 9.12 AI Coaching — Overall *(Pro only)*
Generates coaching feedback based on the aggregate stats for the filtered period rather than a single round. Identifies the biggest area for improvement across all recent data.

---

## 10. AI Coaching System

The AI coaching system is the most sophisticated feature of the platform. It uses OpenAI GPT-4o-mini to generate personalised golf coaching feedback across 7 distinct modes, delivered in the voice of 1 of 7 coaching personas.

### 10.1 Coach Personas

Users select their preferred coaching style in Profile settings. The AI interprets all coaching prompts through this lens.

| Persona | Style |
|---|---|
| **Club Pro** | Friendly, practical, no jargon. Immediately actionable. |
| **Fundamentals Coach** | Direct, basics-first. Grip, posture, alignment before anything else. |
| **Technical Analyst** | Detailed cause-and-effect. Mechanical precision, swing positions. |
| **Short Game Specialist** | Everything inside 100 yards. Scoring from around the green. |
| **Ball Flight Coach** | Start line, face angle, path, dispersion. Ball flight laws as the framework. |
| **Encourager** | Highly positive. Leads with strengths, frames every weakness as opportunity. |
| **Straight Talker** | Blunt and direct. No padding. States exactly what the data shows. |

**Important:** These are coaching *styles*, not real people. The platform does not affiliate with, reference, or impersonate any real coach or instructor.

### 10.2 Feedback Depth

Users also select their preferred technical level:

| Level | Description |
|---|---|
| **Simple** | 2–3 observations in plain English, 2 drills |
| **Intermediate** | Stats context, 2–3 observations, 2–3 named drills with instructions |
| **Advanced** | Root cause analysis, patterns, 3 drills with full instructions and rationale |

### 10.3 Player Game Context

Users can write a free-text description of their game in **Profile → Settings → Your game context**. This field accepts any text the player wants the AI to know about them — current technical work, tendencies, goals, physical factors, competitive context.

This context is injected into the system prompt for every AI coaching response the player receives. It personalises all coaching outputs to the player's specific situation rather than responding to the statistical data alone.

**Example input:**  
*"I'm working on keeping my trail elbow tucked on the downswing. I tend to get quick when under pressure on short putts. I'm aiming to get from a 14 to a 10 handicap by the end of the season."*

**Effect:** Every round coaching response, practice plan, and round review will reference these factors where relevant — e.g., acknowledging the technical change, noting patterns around short putting pressure, framing feedback in terms of the 10-handicap goal.

Players who fill this in receive materially better-calibrated coaching feedback. If a player is on a coach's squad, the coach can also see this context when reviewing their player's profile and rounds.

### 10.4 AI Coaching Modes

**Mode 1: Round Coaching**
Triggered from the Round Detail page. Analyses the specific round's data (score, SG, FIR, GIR, putts, conditions, notes) and produces personalised coaching feedback with named practice drills.

**Mode 2: Round Review**
A structured analysis of a single round. Produces three specific outputs:
- `WEAKNESS:` — the single biggest weakness identified in the round's data
- `FIX:` — the single most impactful thing to address in practice
- `MODE:` — a recommended coaching persona for this player, based on the data, with rationale

**Mode 3: Practice Plan**
Generates a structured 45-minute practice session based on the weakest areas of a specific round. Output format is four timed blocks:

> FOCUS: Short game — missed 8 of 14 up-and-down opportunities  
> BLOCK 1: Chipping — 15min: Clock drill from 5 yards — 4 balls to each clock position  
> BLOCK 2: Pitching — 10min: 30/50/70 yard station drill  
> BLOCK 3: Bunker play — 10min: Consistent splash technique from flat lies  
> BLOCK 4: Putting — 10min: 6-foot make percentage drill  

**Mode 4: Overall Stats Coaching**
Analyses the aggregate stats summary (from the Stats page filtered selection) rather than a single round. Identifies the biggest area for improvement across the entire period.

**Mode 5: Pre-Round Plan**
Generates 3 specific, course management instructions based on the player's recent stats. Not swing tips — how to think, play, and decide on the course that day. Available on the Dashboard.

**Mode 6: Pattern Finder**
Scans the last 10 rounds for a notable trend or pattern. Returns one sentence framed positively. Available on the Dashboard.

**Mode 7: Bad Round Recovery**
Triggers automatically when a round is poor (8+ over par relative to handicap, or 3+ double bogeys). Four lines of calm, forward-focused perspective. Tone: experienced mentor, never clinical.

### 10.5 Legal Disclaimer
All AI coaching outputs display the following footer in small print:  
*"TM Stats coaching modes are generalised coaching styles and are not affiliated with or representative of any individual coach."*

This appears on every AI output, in every mode, without exception.

### 10.6 Pro Gate
All AI coaching features are gated behind the Pro subscription. Free plan users see prompts to upgrade in place of coaching content. The gate is enforced both at the UI level and at the API level — the endpoint returns a 403 for non-Pro users regardless of how it is called.

---

## 11. Mental Game Feature

A dedicated page (`/mental`) for the psychological side of the game. Available to Pro plan users only.

### 11.1 Session-Based Architecture

The Mental Game feature uses a persistent session model. Each conversation is stored as a session in the `mental_sessions` table. When the user opens `/mental`, they see a list of all their past sessions, each identified by the first message they sent and a relative timestamp (e.g. "3 days ago").

**User actions available:**
- **New chat** — starts a fresh session with no prior context. Previous sessions are preserved in the list.
- **Resume session** — tapping a past session reopens it in full. The complete conversation history for that session is sent to the AI on each subsequent message, so the AI has full context of everything discussed.
- **Delete session** — permanently removes the session and its message history.

### 11.2 API Endpoints

| Method | Behaviour |
|---|---|
| `GET /api/mental` | Returns a list of all sessions for the authenticated user (id, title, created_at, updated_at) |
| `GET /api/mental?session_id=<id>` | Returns a specific session including full messages array |
| `POST /api/mental` | Sends a message. If `session_id` is provided, appends to that session; if not, creates a new session. Returns the AI response and the session id. |
| `DELETE /api/mental?session_id=<id>` | Permanently deletes the specified session |

### 11.3 AI Response Behaviour
The AI responds as a calm, experienced golf mentor — not a sports psychologist or therapist. The tone is warm, grounded, and practical. Responses are 2–4 short paragraphs, focused on perspective and simple on-course cues.

When resuming a session, the full prior conversation is included in the AI prompt, allowing continuity across multiple conversations about the same issue.

The system explicitly avoids:
- Clinical language or therapy framing
- References to real sports psychologists or mental coaches
- Dwelling on the problem — always oriented toward what to do next

---

## 12. Profile & Settings

### 12.1 Account Information
Displays the user's name, email address, and current plan status (Free / Pro / Coach).

### 12.2 Plan Management

**Free users:** A prompt to upgrade to Pro with pricing, linking to the Upgrade page.

**Pro users:** A "Manage billing" button that opens the Stripe Customer Portal — allowing the user to update payment method, view invoices, cancel, or change plan.

**Promo users:** If the user activated Pro via a promo code, the expiry date of their access is displayed.

### 12.3 Settings
Users can update:
- **Display name**
- **Handicap index** — used for SG baseline selection and coaching context
- **Your game context** — free-text field. Player describes their game: technical work in progress, tendencies, goals, physical factors. Injected into every AI coaching prompt. Visible to coach if on a team.
- **Feedback level** — Simple / Intermediate / Advanced (affects AI coaching depth)
- **Coach persona** — one of the 7 coaching styles (affects all AI coaching outputs)

Changes are saved immediately.

### 12.4 Join a Team
Non-coach users see a field to enter an 8-character team join code. Entering a valid code links the player to their coach's squad. The player's rounds and stats then become visible to the coach.

**Example:** Player enters code `MXQT7F2A` → linked to their coach's squad → coach can now view their stats and run AI Challenges.

### 12.5 Strokes Gained Baseline Override
By default the SG baseline is derived from the user's handicap. Users who feel their handicap doesn't reflect their current ability can manually override the baseline to a different skill level. This affects all SG calculations and AI coaching context.

### 12.6 Golf DNA *(Pro only — requires 2+ full-tracking rounds)*
A summary of the player's game built from SG averages across their last 10 full-tracking rounds. Displays:
- **Strength** — the SG category in which the player most outperforms their baseline
- **Opportunity** — the SG category in which the player has the most room to improve

Always balanced — one strength highlighted, one opportunity. Framed positively. Updates automatically as new full-tracking rounds are added.

**Example:**  
> Strength: Driving (+0.34 SG avg)  
> Opportunity: Putting (−0.82 SG avg)

### 12.7 Promo Code Redemption
Free plan users see a field to enter a promo code. Valid codes activate Pro access for a defined period (e.g., 3 months). Access reverts to Free automatically when the promo expires — no manual action required.

### 12.8 Player Guide Link
A link card at the bottom of the Profile page labelled **"Player guide"** navigates to `/player-guide` — the full in-app Player Guide covering all platform features.

### 12.9 Contact Support Link
A link card at the bottom of the Profile page labelled **"Contact support"** navigates to `/contact` — the platform contact form.

---

## 13. Coach & Team Accounts

The Coach account tier is designed for golf coaches who manage multiple players and want to provide data-informed instruction.

### 13.1 Account Setup
Coach accounts are created by the TM Stats administrator. The coach receives login credentials directly — no self-serve signup. Their account is set to `team` subscription status upon creation.

### 13.2 Coach Dashboard (`/coach`)
The coach's home screen shows:
- Team name and unique 8-character join code
- List of all players currently in the squad, with their name and last active date

### 13.3 Creating a Team
On first login, a coach creates a team by entering a team name. The system generates a unique 8-character join code (e.g., `MXQT7F2A`) using alphanumeric characters only, excluding visually ambiguous characters (0, O, 1, I) to prevent misreading.

The join code is permanent and can be shared with players.

### 13.4 Player Profile View (`/coach/players/[id]`)
The coach can tap any player in their squad to view:
- Player's average SG across all 4 categories (from full-tracking rounds)
- Recent rounds list (date, course, score, SG total)

Access is strictly limited to players who have joined the coach's team. A coach cannot view data for any player outside their squad.

### 13.5 AI Challenge

The AI Challenge is the premium coaching tool. It allows a coach to enhance the AI's feedback with their own contextual knowledge — creating a blended recommendation that combines data analysis with real-world coaching insight.

**Workflow:**

**Step 1 — Select a round**  
The coach selects one of the player's recent rounds from the player profile page.

**Step 2 — Review AI feedback**  
The system displays the AI-generated coaching feedback that was produced for that round.

**Step 3 — Add coaching context**  
The coach enters context that the stats cannot show. Examples:
- *"This player is working on a new takeaway — the dispersion is intentional right now."*
- *"They have a niggling right shoulder injury affecting their follow-through."*
- *"They historically struggle in medal formats — the poor score is more mental than technical."*
- *"We are specifically trying to shape shots from the right rough this week as a drill."*

**Step 4 — Generate revised feedback**  
The AI re-analyses the round data combined with the coach's context and produces a revised recommendation that reflects both the statistics and the coach's knowledge.

**Step 5 — Player sees it**  
The revised feedback replaces the standard AI feedback on the player's Round Detail page, clearly labelled as coming from their coach.

**Example of impact:**  
The AI might identify putting as the biggest weakness in a round. But the coach knows this player has been intentionally working on a new putting grip and the short-term regression is expected. The coach adds this context, and the revised feedback instead focuses on the approach play and validates the putting change.

### 13.6 Data Privacy
Players join teams voluntarily by entering a join code. Only players who have opted in are visible to a coach. Players may leave a team at any time via their Profile settings.

---

## 14. Payments & Billing

Payments are processed via **Stripe** in live mode.

### 14.1 Upgrade Flow
Free plan users access the Upgrade page (`/upgrade`) via prompts throughout the app. The page displays:
- Monthly plan pricing
- Annual plan pricing (with saving highlighted)
- Feature comparison

Clicking either plan initiates a Stripe Checkout session. Payment is processed by Stripe — TM Stats never handles card details.

### 14.2 Subscription Activation
On successful payment, Stripe sends a webhook event to the platform. The webhook handler:
1. Verifies the Stripe signature to confirm authenticity
2. Identifies the user via the Stripe customer ID
3. Updates the user's `subscription_status` to `pro` in the database

This process is automatic and typically completes within seconds of payment.

### 14.3 Subscription Cancellation
If a user cancels their subscription or a payment fails, Stripe sends a `customer.subscription.deleted` event. The webhook handler downgrades the user's `subscription_status` to `free` automatically.

The user retains Pro access until the end of the paid billing period (Stripe handles this timing).

### 14.4 Billing Portal
Pro users can manage their own billing via the Stripe Customer Portal, accessible from their Profile page. Actions available:
- Update payment method
- View invoice history
- Change plan (monthly ↔ annual)
- Cancel subscription

### 14.5 Free Tier Enforcement
The 5-round limit for free plan users is enforced at the point of saving a new round. The system checks the user's subscription status and round count before inserting. Users who reach the limit see a clear prompt to upgrade.

---

## 15. Admin Panel

The Admin Panel is accessible only to the system administrator (rcullhss@gmail.com). It is not linked from any public navigation and the URL is not disclosed. Non-admin users who attempt to access `/admin` receive a 404 response.

### 15.1 Summary Statistics
Four cards showing:
- Total registered users
- Total rounds logged across all users
- Number of active Pro subscribers
- Number of Coach accounts

### 15.2 User List
All registered users displayed with:
- Name and email
- Current subscription status (Free / Pro / Coach)
- Round count
- Handicap (if set)
- Promo expiry date (if on promo access)

### 15.3 Plan Management
Inline buttons on each user row allow the administrator to change any user's subscription status between Free, Pro, and Coach. Changes take effect immediately.

**Use cases:**
- Manually granting Pro access to a journalist or reviewer
- Downgrading a user who has cancelled
- Upgrading a user after a manual payment arrangement

### 15.4 Create Coach Account
A form at the top of the Admin page allows the administrator to create a new coach login:
- Name (optional)
- Email address
- Temporary password

Submitting creates a Supabase Auth account with the email pre-confirmed (no verification email required) and sets the subscription status to `team`. The coach can log in immediately.

### 15.5 Promo Code Management
A dedicated sub-page (`/admin/promos`) for creating and managing promotional access codes. See Section 16.

---

## 16. Promo Code System

### 16.1 Creating Codes
The administrator creates promo codes via the Admin Panel. Parameters:
- **Code** — alphanumeric string, up to 20 characters (stored in uppercase)
- **Duration** — number of months of Pro access granted (1–36)
- **Max uses** — optional cap on the number of times the code can be redeemed (leave blank for unlimited)

### 16.2 Redemption
Free plan users see a promo code input field in their Profile page. Entering a valid, active code:
1. Upgrades the user's account to Pro immediately
2. Sets a `promo_expires_at` timestamp on the user record
3. Records the redemption so the code cannot be used again by the same user
4. Increments the code's use count

The user receives a confirmation message showing how long their access lasts.

**Example:** Code `LAUNCH3` grants 3 months of Pro access. User enters it on 1 May → Pro access until 1 August.

### 16.3 Expiry
Promo access expiry is checked on every page load. When the `promo_expires_at` date passes:
- `subscription_status` is automatically set back to `free`
- `promo_expires_at` is cleared
- The user is returned to the Free plan without any manual intervention

### 16.4 Deactivation
Codes can be toggled active/inactive from the Admin promo management page. Deactivated codes cannot be redeemed even if they have remaining uses.

---

## 17. Public-Facing Pages

The following pages are accessible without authentication and form the marketing presence of the platform.

| Page | URL | Content |
|---|---|---|
| Homepage | `/` | Product introduction, key features, pricing summary, CTAs to sign up |
| About | `/about` | Company background, product story, the team |
| Contact | `/contact` | Contact form — messages sent to info@tmstatsgolf.com via Resend |
| Privacy Policy | `/privacy` | Full GDPR-compliant privacy policy |
| Terms of Service | `/terms` | Platform terms and conditions |
| Player Guide | `/player-guide` | In-app guide page covering all platform features. Protected (requires login). Accessible from Dashboard (GUIDE button) and Profile → Player guide. |

### Contact Form
The contact form is functional and connected to Resend for email delivery. Messages are sent to `info@tmstatsgolf.com`. The form validates input client-side and confirms submission to the user.

### Cookie Banner
A cookie consent banner is displayed on first visit to the public site. Required for GDPR compliance.

---

## 18. Data Architecture

### Core Tables

**users**  
Stores the primary user profile. One row per registered user.  
Fields: `id`, `email`, `name`, `handicap`, `subscription_status`, `feedback_level`, `coach_persona`, `sg_baseline`, `player_context`, `promo_expires_at`, `created_at`

**rounds**  
Stores one row per logged round.  
Fields: `id`, `user_id`, `date`, `course_name`, `holes`, `round_type`, `input_mode`, `par_total`, `score_total`, `notes`, `mood`, `conditions`, `energy_level`, `created_at`

**holes**  
Stores one row per hole per round. For 18-hole rounds, 18 rows per round.  
Fields: `id`, `round_id`, `hole_number`, `par`, `score`, `fir`, `gir`, `putts`, `up_and_down`, `sand_save`, `shots` (JSONB — full shot-by-shot data), `hole_note`

**teams**  
Stores coach team records.  
Fields: `id`, `name`, `coach_user_id`, `join_code`, `created_at`

**team_members**  
Join table linking players to teams.  
Fields: `id`, `team_id`, `user_id`, `joined_at`

**coach_ai_challenges**  
Stores AI Challenge submissions and responses.  
Fields: `id`, `round_id`, `player_id`, `coach_id`, `original_ai_feedback`, `coach_context`, `revised_ai_feedback`, `created_at`

**promo_codes**  
Stores promotional access codes.  
Fields: `id`, `code`, `duration_months`, `max_uses`, `use_count`, `active`, `created_at`

**promo_redemptions**  
Audit log of code redemptions.  
Fields: `id`, `code_id`, `user_id`, `redeemed_at`, `expires_at`

**handicap_history**  
Log of handicap changes for trend charting.  
Fields: `id`, `user_id`, `handicap`, `date`, `created_at`

**mental_sessions**  
Stores persistent Mental Game conversation sessions.  
Fields: `id`, `user_id`, `title` (first message, used as session label), `messages` (JSONB — full conversation history as ordered array of role/content pairs), `created_at`, `updated_at`

### Row Level Security
All tables have Supabase Row Level Security (RLS) policies enforced. Users can only read and write their own data. Coaches can read data for players on their team. Admin operations require the service role key and are performed server-side only.

---

## 19. Security & Compliance

### Authentication Security
- All passwords hashed and managed by Supabase Auth
- JWTs used for session management with automatic refresh
- Sessions validated server-side on every protected request
- No client-side trust of authentication status

### Data Access Control
- Every database query is filtered by the authenticated user's ID
- No frontend-provided user IDs are trusted without server-side verification
- Coach access to player data is verified via team membership on every API call
- Admin access verified by email address on every admin API route

### API Security
- All AI features (coaching, mental game) require Pro subscription — verified server-side
- Stripe webhooks verified by signature before processing
- Admin endpoints return 404 (not 403) to non-admins, preventing discovery
- Service role key is server-side only, never exposed to the client

### Payments
- Card details never handled by TM Stats — Stripe manages all payment processing
- Stripe webhook signature verification prevents forged subscription events
- Subscription status changes are atomic — no partial states

### Environment Variables
- All secrets stored in environment variables, never hardcoded in source
- `.env.local` file excluded from version control via `.gitignore`
- Production secrets stored in Vercel environment variable management

### GDPR Considerations
- Privacy policy published at `/privacy`
- Cookie consent banner on public pages
- Users can delete their account and associated data
- No third-party analytics or tracking scripts

---

*This document is confidential and intended for internal use, due diligence, and authorised business purposes only. All features described are implemented and live unless stated otherwise.*

*© TM Stats Ltd. All rights reserved.*
