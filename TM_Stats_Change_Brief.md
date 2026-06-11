# TM Stats — Product Change Brief

| | |
|---|---|
| **Brief Reference** | TMB-001 |
| **Date** | 5 May 2026 |
| **Raised by** | User Feedback — Matt |
| **Priority** | High |
| **Status** | Approved for Development |

---

## Overview

This brief outlines two product changes to the TM Stats round input and Strokes Gained engine, arising from user feedback. Both changes address real friction points in the current experience and will improve accuracy and usability for all users.

---

## Change 1: Mid-Round Error Correction

### Background

Users currently must complete all 18 holes before reviewing or correcting any input. This creates anxiety during data entry and means a typo on hole 3 cannot be fixed until the round is fully submitted.

### Proposed Change

Allow users to edit any hole's data at any point during round input, without needing to complete the full 18 holes first.

### Acceptance Criteria

- A back/edit button is available on each hole entry screen
- A hole navigator (e.g. tap any hole number 1–18) allows jumping directly to any previously entered hole
- Edited data is saved correctly and does not corrupt subsequent hole entries
- The user can return to where they left off after making an edit

### Impact

Reduces user frustration and data entry errors. Low implementation complexity — this is a UX flow change rather than a data model change.

---

## Change 2: Lie Quality Modifier for Strokes Gained

### Background

The current Strokes Gained baseline assumes a standard lie for each shot category (fairway, rough, sand, green). This does not account for genuinely difficult lies — thick rough, awkward stances, severe slopes — which are common in real amateur play and can significantly affect the expected number of strokes to hole out.

Without this, a player who executes a difficult shot well receives no more credit than if they had played from a straightforward lie, understating their actual performance.

### Proposed Change

Introduce a Lie Quality Modifier at the point of shot input, with three options:

- **Good** — standard lie, no adjustment to baseline
- **Awkward** — moderately difficult lie (e.g. slight slope, semi-rough, restricted backswing); applies a moderate upward adjustment to expected strokes
- **Severe** — genuinely treacherous lie (e.g. thick rough, steep slope, plugged in sand, restricted stance); applies a larger upward adjustment to expected strokes

The modifier adjusts the Strokes Gained baseline for that shot, so the player's result is measured against a more accurate expectation.

### Acceptance Criteria

- Lie quality selector (Good / Awkward / Severe) appears on the shot input screen
- Baseline expected strokes value is adjusted according to the selected modifier
- Strokes Gained calculation uses the adjusted baseline, not the raw category baseline
- Modifier values are documented and consistent across all shot types
- The lie modifier selected is stored against each shot for future analysis

### Design Notes

Modifier values should be validated against DECADE Golf / PGA Tour baseline data before release. Suggested starting values:

| Modifier | Baseline Adjustment | Notes |
|---|---|---|
| Good | None (×1.0) | Standard baseline used |
| Awkward | +0.2 strokes (TBC) | To be validated against data |
| Severe | +0.5 strokes (TBC) | To be validated against data |

### Impact

Makes Strokes Gained meaningfully more accurate for real-world amateur play. Differentiates TM Stats from competitors who apply a flat baseline regardless of lie quality. Moderate implementation complexity — requires changes to the Strokes Gained engine and the shot input UI.

---

## Next Steps

- Assign both changes to the development backlog
- Confirm modifier adjustment values with reference to DECADE Golf baseline data before build
- Design updated shot input screen incorporating lie quality selector
- QA both changes against existing round data before release
- Communicate updates to users on release
