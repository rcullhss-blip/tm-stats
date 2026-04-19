---
effort: medium
description: Performance profiling. Run when the app feels slow, before any release, and after adding new dashboard features.
---

# /perf — Performance Profiler

When Rob runs /perf [page or feature], profile it for speed. A slow app on a mobile network between golf holes is a dead app. Golfers have 90 seconds between shots — every second of loading time matters.

## Performance Targets for TM Stats

| Page | Target Load Time | Why |
|---|---|---|
| Dashboard (10 rounds) | < 1.5s | First thing users see after login |
| Dashboard (50 rounds) | < 2.0s | Power users shouldn't be penalised |
| Round entry (hole transition) | < 0.3s | Instant feel — between holes in the rain |
| SG breakdown page | < 2.0s | Calculations happen server-side |
| Post-round summary | < 1.0s | Immediate reward after saving |
| Sign in | < 1.0s | First impression |

Test on: simulated 3G connection (not fast WiFi). Real golfers use mobile data on the course.

---

## The 6 Performance Checks

### Check 1 — Database Queries
The most common performance killer in this type of app.

- Is the dashboard query fetching only the columns it displays? (Not `SELECT *`)
- Are rounds fetched with a LIMIT? Don't load all 200 rounds to show the last 10.
- Is there an index on `rounds.user_id`? Without it, every dashboard load scans the entire table.
- Is there an index on `holes.round_id`? Without it, drill-down views are slow.
- Is the SG calculation happening server-side (fast) or client-side (slow on old phones)?

Run the Supabase query analyzer on the 3 most-used queries and flag anything over 50ms.

```sql
-- Essential indexes - check these exist
CREATE INDEX IF NOT EXISTS idx_rounds_user_id ON rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_created_at ON rounds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_holes_round_id ON holes(round_id);
```

### Check 2 — Bundle Size
Large JavaScript bundles = slow initial page load on mobile.

- Run `npm run build` and check the output bundle sizes.
- Main bundle should be under 200KB gzipped.
- Check if any large libraries can be lazy-loaded (e.g. chart library only needed on stats page).
- Are there any accidental duplicate dependencies? (`npm ls` to check)
- Is the SG baseline data file being bundled into the frontend? (it shouldn't be — keep it server-side)

### Check 3 — React Re-renders
Unnecessary re-renders slow down the round entry flow.

Common problems to check:
- Is the entire hole list re-rendering when one hole changes? Use `React.memo` on hole components.
- Are there `useEffect` hooks with missing or wrong dependency arrays?
- Is the dashboard fetching data on every render, or using proper caching (SWR or React Query)?
- Are large lists (rounds table) using virtual scrolling for 50+ items?

### Check 4 — Image & Asset Optimisation
- Are all images using Next.js `<Image>` component (auto-optimises)?
- Are fonts loaded with `font-display: swap` so text is visible while fonts load?
- Are there any images that could be SVG instead of PNG/JPG (especially icons and logos)?
- Is the TM Stats logo SVG, not a large PNG?

### Check 5 — Network Requests
Check the browser Network tab on each key page load.

- How many API requests does the dashboard make? Target: 1–2 requests max.
- Are any requests waterfalling (one waits for another)? Parallelise them.
- Is there any data being fetched that isn't actually used on the page?
- For the round entry flow: is any data pre-fetched, or does each hole transition wait for a request?
- Is the SG baseline data cached? It never changes — it should be cached aggressively.

### Check 6 — Mobile-Specific
Test on a real phone, not browser DevTools.

- On a 2-year-old Android phone with mobile data, is the round entry still smooth?
- Does scrolling on the dashboard feel native (no jank)?
- Are heavy animations disabled when the device is in low-power mode?
- Does the app work offline at all? (Even just showing previously loaded data)
- Is there a loading skeleton so the app doesn't feel frozen while data loads?

---

## Quick Wins — Common Fixes

If performance is poor, check these first (all are easy wins):

1. **Add database indexes** — single biggest impact, 5 minutes to implement
2. **Add pagination to rounds list** — load 10 at a time, not all
3. **Use React Query / SWR** — automatic caching, background refresh
4. **Lazy load the stats/SG pages** — don't bundle them into the initial load
5. **Move SG calculations to server** — if currently running in the browser

---

## Output Format

### ⚡ Performance Report

For each page/feature tested:
- Measured load time vs target
- PASS / FAIL / WARNING

### 🔴 Critical (Blocks Release)
Load times over 3x the target. Will cause visible lag on mobile.

### 🟡 Should Fix (Next Sprint)
Noticeable but not breaking. Affects user experience on slower connections.

### 🔵 Optimisation Opportunities
Future improvements when time permits.

### 📊 Performance Score
[X/6 checks passed] — FAST / ACCEPTABLE / NEEDS WORK
