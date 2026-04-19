---
effort: medium
description: Design and review API endpoints. Run before building any new endpoint to ensure consistency.
---

# /api — API Design & Review

When Rob runs /api [endpoint or feature], design or review the API endpoint before any code is written. Inconsistent APIs become technical debt that slows everything down. Get this right first.

## TM Stats API Standards

### Base URL Pattern
```
/api/rounds          → round operations
/api/holes           → hole operations  
/api/strokes-gained  → SG calculations
/api/teams           → team/coach features
/api/user            → user profile and settings
/api/subscription    → Stripe/subscription status
```

### Response Shape — Always This Format
```javascript
// Success
{ "data": { ... }, "error": null }

// Error
{ "data": null, "error": { "code": "ROUND_NOT_FOUND", "message": "Round not found" } }

// List
{ "data": [ ... ], "meta": { "total": 42, "page": 1 }, "error": null }
```

Never return raw data without wrapping. Never return different shapes for success vs error.

### HTTP Status Codes — Use Correctly
```
200 OK            → successful GET, PUT
201 Created       → successful POST (new resource created)
204 No Content    → successful DELETE
400 Bad Request   → invalid input (validation failed)
401 Unauthorized  → not logged in
403 Forbidden     → logged in but not allowed (wrong user, no subscription)
404 Not Found     → resource doesn't exist
422 Unprocessable → input valid format but fails business rules
500 Server Error  → unexpected crash (never expose details to user)
```

---

## Core Endpoints for TM Stats

### Rounds
```
GET    /api/rounds              → list user's rounds (paginated)
POST   /api/rounds              → create new round
GET    /api/rounds/:id          → get single round with holes
PUT    /api/rounds/:id          → update round details
DELETE /api/rounds/:id          → delete round (cascade holes)
GET    /api/rounds/:id/holes    → get all holes for a round
```

### Strokes Gained (Premium)
```
GET    /api/strokes-gained/:roundId           → SG for a single round
GET    /api/strokes-gained/summary            → SG summary across all rounds
GET    /api/strokes-gained/trend              → SG trend over time
GET    /api/strokes-gained/baselines          → available baseline options
```

### Teams (Coach)
```
GET    /api/teams/:id                → team overview
GET    /api/teams/:id/players        → all players + stats
GET    /api/teams/:id/players/:uid   → individual player stats
POST   /api/teams                    → create team
POST   /api/teams/join               → join team with code
```

---

## Validation Rules Per Endpoint

### POST /api/rounds
```javascript
Required: date (ISO date string), course_name (string 1-100 chars), holes (9 or 18), round_type ('practice' | 'tournament' | 'competition')
Optional: par_total (integer 27-90)
Reject: any extra fields (strict mode)
```

### POST /api/holes (bulk save with round)
```javascript
Required per hole: hole_number (1-18), par (3|4|5), score (1-15), gir (boolean), putts (0-6)
Conditional: fir (boolean, required if par=4 or par=5, must be null if par=3)
Conditional: up_and_down (boolean, required if gir=false)
Optional: sand_save (boolean), distance_to_pin_yards (integer 0-700), lie_type ('fairway'|'rough'|'bunker'|'fringe'|'penalty')
```

---

## When Reviewing an Existing Endpoint, Check

1. **Consistency** — does it match the standard response shape?
2. **Auth** — is `userId` taken from the session, never from the request body?
3. **Validation** — are all inputs validated with clear error messages?
4. **No over-fetching** — does it return only what the frontend needs?
5. **Error codes** — are error codes constants (not magic strings) defined in one place?
6. **SG gate** — if this touches SG data, is the subscription check present?

---

## Output Format

When designing a new endpoint:
1. Full endpoint spec (method, path, request body, response shape)
2. Validation rules
3. Auth requirements
4. Edge cases handled
5. Ready-to-implement code stub (handler function signature only — not the full implementation)

When reviewing an existing endpoint:
Use the checklist above. Flag any deviation from standards as 🟡 (inconsistency) or 🔴 (security issue).
