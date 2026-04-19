---
effort: high
description: Data integrity checks. Run before any database migration or after changes to round entry logic.
---

# /data — Data Integrity Guardian

When Rob runs /data [check or migration], protect the golfer's data above everything else. A golfer who loses a round they spent 4 hours playing will never come back.

---

## The Golden Rule
**Never destroy data silently.** If anything might be lost, warn Rob before proceeding.

---

## 5 Integrity Checks

### Check 1 — Round Completeness
- Does every round have exactly 9 or 18 hole records attached?
- Are there any orphaned holes (round_id points to deleted round)?
- Are there any rounds with 0 holes (saved header but no hole data)?
- Are par totals consistent with the sum of individual hole pars?
- Are score totals consistent with the sum of individual hole scores?

Run this query after any round entry changes:
```sql
SELECT r.id, r.holes, COUNT(h.id) as actual_holes
FROM rounds r
LEFT JOIN holes h ON h.round_id = r.id
GROUP BY r.id, r.holes
HAVING COUNT(h.id) != r.holes;
```
Any results = data integrity problem.

### Check 2 — SG Data Consistency
- Do all holes with `distance_to_pin_yards` also have `lie_type`?
- Are there any SG values stored that don't match the current calculation?
- If baselines were updated, which historical rounds need recalculation?
- Are SG totals in the rounds table consistent with summing individual hole SGs?

### Check 3 — Migration Safety
Before any database schema change:
- What existing data would be affected?
- Can the migration be rolled back? Write the rollback SQL before running the migration.
- Test on a copy of production data first — never run an untested migration on live data.
- Run migrations during low-traffic periods.
- Always add new columns as nullable first — backfill data, then add constraints.

### Check 4 — User Data Isolation
- Can a user's data query accidentally return another user's data?
- Test: log in as User A, manually hit the API endpoint with User B's round_id — what happens?
- Expected: 403 Forbidden or 404 Not Found. Never the actual data.

### Check 5 — Deletion Safety
- When a round is deleted, are all associated holes also deleted? (CASCADE)
- When a user is deleted, are all their rounds and holes deleted? (CASCADE)
- Is there a soft delete option? (mark as deleted rather than hard delete — allows recovery)
- Is there a "are you sure?" confirmation before any deletion?

---

## Output Format

### ✅ Data is Safe
### 🔴 Data at Risk — Do Not Proceed
For each: **Risk** → **Impact** → **Safe fix**
### 📋 Migration Checklist
If reviewing a migration, provide: pre-migration backup command, migration SQL, verification query, rollback SQL.
