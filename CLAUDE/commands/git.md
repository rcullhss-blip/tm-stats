---
effort: low
description: Git commit conventions, branch naming, and clean history. Run before committing or merging.
---

# /git — Git Discipline

When Rob runs /git [commit or task], write proper commit messages, suggest branch names, and keep the git history clean. Good git history is the project's diary — when something breaks in 6 months, clean commits tell you exactly what changed and why.

## TM Stats Branch Naming

```
main          → production code only — never commit directly here
dev           → integration branch — merge features here first
feature/      → new features
fix/          → bug fixes
chore/        → maintenance, dependency updates, config
experiment/   → trying something out — never merges to main
```

Examples:
```
feature/sg-calculation-engine
feature/round-entry-mobile-redesign
fix/par3-fir-null-bug
fix/putt-stepper-double-tap
chore/update-supabase-client
chore/add-db-indexes
experiment/ai-feedback-prompt-v2
```

---

## Commit Message Format

Use Conventional Commits — it makes the history readable and can auto-generate changelogs.

```
type(scope): short description (max 72 chars)

Optional: longer explanation of WHY this change was made, not just WHAT.
Reference any relevant issue or decision.
```

### Types
```
feat     → new feature for the user
fix      → bug fix
test     → adding or fixing tests
refactor → code change that neither fixes a bug nor adds a feature
perf     → performance improvement
chore    → maintenance (deps, config, build tools)
docs     → documentation only
style    → formatting only (no logic change)
```

### Good Commit Examples for TM Stats
```
feat(sg): add strokes gained calculation for approach shots

Implements SG: Approach using DECADE Golf baseline tables.
Distances covered: 50yd to 250yd in 25yd bands.
Falls back to null (not crash) when distance data is missing.

fix(round-entry): set FIR to null for par 3 holes not false

Previously storing false for par 3 FIR was causing incorrect
fairway percentage calculations. Now stores NULL to indicate
the stat is not applicable for this hole type.

fix(mobile): increase stepper button size to 52px on round entry

Tap targets were 36px — too small for reliable one-hand use
on the course. Users were accidentally tapping the wrong button.

perf(dashboard): add index on rounds.user_id

Dashboard query was doing a full table scan. Index reduces
query time from ~200ms to ~3ms at 1000 rounds.

test(sg): add unit tests for all 8 known SG calculation cases

Covers: positive putt, negative putt, good approach, poor tee,
9-hole round, chip-in, missing data, scratch vs scratch baseline.
All tests pass against current implementation.
```

### Bad Commit Examples (Never Do These)
```
fix stuff
WIP
update
changes
fixed the bug
Rob's changes
asdfgh
```

---

## Before Every Commit — Quick Checklist

Run through these before `git commit`:

- [ ] Does the commit do ONE thing? If it does three things, make three commits.
- [ ] Is there any debug code left? (`console.log`, `debugger`, test user IDs)
- [ ] Is `.env` in `.gitignore`? (check once per session — takes 2 seconds)
- [ ] Are there any `TODO` or `FIXME` comments that should be tracked as issues instead?
- [ ] Does the commit message explain WHY, not just WHAT?

---

## Before Every Merge to Dev

- [ ] Has the feature been tested on mobile (not just desktop)?
- [ ] Has `/review` been run on the new code?
- [ ] Are there tests for any new golf logic or SG calculations?
- [ ] Is the branch up to date with `dev`? (`git pull origin dev`)

## Before Every Merge to Main (Production)

- [ ] Has `/release` been run and cleared?
- [ ] Has `/security` been run and cleared?
- [ ] Is there a rollback plan?

---

## Output Format

When Rob says "help me commit this":
1. Suggest the commit type and scope
2. Write the commit message (subject line + body if needed)
3. Flag any issues with the current changes before committing

When Rob says "help me with branches":
1. Suggest the branch name following the convention
2. Show the git command to create it from the right base branch
