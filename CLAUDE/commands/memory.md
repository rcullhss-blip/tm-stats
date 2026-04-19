# /memory — TM Stats Session Memory

When Rob runs /memory at the START of any session, do the following before anything else.

---

## Step 1 — Load Project State

Read these files in order:
1. `CLAUDE.md` — full project context, golf rules, tech stack, design rules
2. `memory/project-state.md` — current build status, what's done, what's in progress
3. `memory/decisions.md` — architectural and product decisions already made (don't revisit these)
4. `memory/blockers.md` — anything that was stuck or unresolved last session

If any of these files don't exist yet, create them with empty templates (see Step 4).

---

## Step 2 — Summarise the State to Rob

After reading all files, give Rob a brief plain-English summary:

"Here's where we are:
- **Last completed:** [what was finished]
- **In progress:** [what was being worked on]
- **Decided (don't revisit):** [key decisions made]
- **Blocked on:** [anything waiting]
- **Recommended next:** [what to pick up today]"

Keep this to 5–8 bullet points. Not a long essay.

---

## Step 3 — Ask What Rob Wants to Do

After the summary, ask: "What do you want to work on today?"

Then proceed with /plan before any building starts.

---

## Step 4 — Memory File Templates

If memory files don't exist, create this folder structure:

```
memory/
  project-state.md
  decisions.md
  blockers.md
  session-log.md
```

### memory/project-state.md template:
```markdown
# TM Stats — Project State

## Phase 1: Foundation
- [ ] Project setup (React + Next.js + Supabase)
- [ ] Authentication (sign up, login, logout)
- [ ] Stripe subscription integration
- [ ] Round entry — Step 1 (course details)
- [ ] Round entry — Step 2 (hole by hole)
- [ ] Round entry — Step 3 (summary + save)
- [ ] Dashboard — rounds table
- [ ] Dashboard — hole drill-down
- [ ] Mobile responsive check — all screens

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

## Last Updated: [date]
## Last Worked On: [description]
```

### memory/decisions.md template:
```markdown
# TM Stats — Decisions Made (Don't Revisit Without Good Reason)

These decisions have been made and agreed. Do not suggest changing them unless there is a critical technical reason.

| Decision | Chosen | Alternatives Rejected | Reason |
|---|---|---|---|
| Frontend framework | React / Next.js | Vue, Svelte | Industry standard, Rob learning on it |
| Database | PostgreSQL via Supabase | MongoDB, Firebase | Relational data fits golf stats perfectly |
| Auth | Supabase Auth | Clerk, Auth0 | Simplest with Supabase DB |
| Payments | Stripe | Paddle, Lemon Squeezy | Most reliable, best docs |
| Hosting | Vercel | Netlify, Railway | Best Next.js integration |
| Mobile approach | Responsive web | Native app | Ship faster, no app store |
| SG baselines | DECADE Golf tables | Build own | Saves months, proven data |

## Last Updated: [date]
```

### memory/blockers.md template:
```markdown
# TM Stats — Blockers & Unresolved Issues

## Active Blockers
[Nothing yet]

## Resolved (keep for reference)
[Nothing yet]

## Decisions Needed From Rob
[Nothing yet]
```

### memory/session-log.md template:
```markdown
# TM Stats — Session Log

## [Date]
**Worked on:** 
**Completed:** 
**Left unfinished:** 
**Decisions made:** 
**Next session should start with:** 
```

---

## Step 5 — Update Memory at End of Session

When Rob runs /memory save OR at the natural end of a session, update the memory files:

1. **Update `memory/project-state.md`** — tick off completed items, add new ones discovered
2. **Update `memory/decisions.md`** — add any new architectural or product decisions made this session
3. **Update `memory/blockers.md`** — add new blockers, mark resolved ones as resolved
4. **Append to `memory/session-log.md`** — log today's date, what was done, what's next

Then confirm to Rob: "Memory updated. Next session, run /memory to pick up exactly where we left off."

---

## Why This Matters

Claude Code has no memory between sessions by default. Without this, every session starts from scratch and Rob has to re-explain context. This skill turns Claude Code into a developer who remembers the project — what's been built, what decisions were made, and exactly where to pick up.

The memory files live in the project folder and are tracked by git — so the project history is always there.
