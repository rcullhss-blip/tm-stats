# Round Notes — Feature Specification

## What This Feature Is

After completing a round, the golfer can write a free-text note about anything relevant to that round. Notes are stored permanently alongside the round data and can be reviewed at any time — individually, or in bulk across a season.

This sounds simple. Done properly, it is one of the most powerful features in TM Stats.

---

## Why Notes Matter More Than They Appear To

Stats tell you what happened. Notes tell you why.

A golfer who shoots 78 with SG: Putting of -2.1 looks like they had a bad putting day. But their note says "felt great with the putter, green speeds were unusual — very slow compared to normal." That context changes everything. The stats say problem, the note says anomaly. Without the note, the AI feedback might wrongly recommend a putting practice plan.

Over a full season, notes create a pattern layer that pure stats cannot:
- "Played well on this course 3 times — always score better here" → course affinity
- "Wind always affects my ball-striking" → weather conditions flag
- "Felt nervous in the medal competition" → performance under pressure pattern
- "Tried a new grip today — hit it well" → equipment/technique change log
- "Back was stiff" → physical condition tracking

This is the kind of insight a real caddie or coach builds up over months. TM Stats captures it automatically.

---

## Where Notes Can Be Added

### 1. Post-Round Note (Primary)
Shown on the summary screen after a round is saved.
- Free text field, no character limit but show a counter above 500 characters
- Placeholder text: "How did you play? What felt good? What was tough? Course conditions, how you felt, anything you want to remember..."
- Optional — can be skipped with a single tap
- Saves with the round record

### 2. Hole-Specific Notes (Advanced, Phase 2)
On any hole during round entry, the player can add a note.
- Short format — 1–2 sentences max (this is used on the course)
- Examples: "drove it OB left — nerves on this hole every time", "tried 3-wood off tee instead of driver, worked well", "putt broke more than I read — course note"
- These become the raw material for course-specific intelligence later

### 3. Post-Season Review Notes (Advanced, Phase 3)
When a player reviews their season summary, they can add a reflective note.
- "What I worked on this year", "what improved", "goals for next season"
- Displayed on the annual review screen

---

## Database Changes Required

### Add to `rounds` table:
```sql
notes TEXT,                        -- free text, no limit
notes_updated_at TIMESTAMP,        -- when note was last edited
mood VARCHAR(20),                  -- optional: 'great' | 'good' | 'average' | 'tough' | 'terrible'
conditions VARCHAR(50),            -- optional: 'sunny' | 'windy' | 'rainy' | 'cold' | 'hot'
energy_level VARCHAR(20),          -- optional: 'high' | 'normal' | 'tired'
```

### Add to `holes` table (Phase 2):
```sql
hole_note TEXT                     -- short hole-specific note
```

---

## The Quick Context Tags (Optional, Alongside Notes)

Before the free text field, show 3 rows of optional quick-tap tags. These capture the most important context in 2 seconds without typing.

**How did you feel?**
😤 Tough | 😐 Average | 🙂 Good | 😄 Great

**Conditions:**
☀️ Sunny | 💨 Windy | 🌧️ Rainy | 🥶 Cold | 🔥 Hot

**Physical:**
💪 Fresh | 😐 Normal | 😓 Tired | 🤕 Niggly

These tags are stored as structured data (not free text) so they can be queried and analysed across rounds. The free text note sits below them.

**Why this matters:** A golfer who never types notes will still contribute structured context data by tapping two or three tags in 5 seconds. The AI can then say: "You score 3.2 shots better in sunny conditions than in wind — consider this before next weekend's medal round forecast."

---

## The Notes Review Experience

### On a Single Round
- Notes displayed prominently on the round detail screen
- Tags shown as small badges above the note text
- "Edit note" button — golfer can add to or update the note at any time

### Across a Season (The Powerful Part)
A dedicated "Season Journal" view that shows:
- A timeline of all rounds with their notes
- Filterable by: date range, course, round type, tags, keywords
- Search across all notes: "windy" returns all rounds played in wind
- Pattern callouts: "You've noted feeling tired in 6 of your last 8 rounds — could be worth monitoring"

### Year-End Review
At the end of the season (or on demand), a compiled review:
- Your notes from every round
- How your stats correlated with different conditions and moods
- The rounds you noted as your best — what did the SG data show?
- "Your words about your game this year" — a genuine reflection tool

---

## AI Integration — Where This Becomes a Differentiator

When generating post-round feedback, the Claude API prompt should include:

```
Round stats: [SG data]
Player note: "[their note text]"
Player tags: [mood, conditions, energy]

Use the note to contextualise the stats. If the note suggests external factors 
(conditions, physical state, specific technique changes), acknowledge them in 
the feedback. Don't recommend fixing something the player identified as a 
one-off issue.
```

**Example output with notes integration:**

Player stats: SG: Putting -1.8 (poor)
Player note: "Greens were being aerated — bumpy and unpredictable. Couldn't trust any line."

Without notes → AI says: "Your putting was significantly below your average. Focus on lag putting from 20+ feet and short putt conversion."

With notes → AI says: "Your stats show a tough putting round, but your note mentions the greens were being aerated — that's a course condition issue, not a putting technique issue. Discount this round from your putting trend. Your SG: Approach at +0.4 was actually excellent today — that's the real story."

This is the difference between useful and genuinely impressive.

---

## Privacy and Ownership

- Notes are private by default — only the player can see them
- On team/coach accounts: player can choose to share notes with coach (opt-in toggle per round)
- When a user exports their data (GDPR), notes are included in full
- When a user deletes their account, all notes are permanently deleted

---

## UX Rules for Notes

### Mobile Entry
- Tap area for the note field must be large and obvious
- Keyboard auto-dismisses when scrolling away
- Auto-save as the player types — no separate save button for the note
- Character counter appears after 300 characters

### Tone Guidance (shown as placeholder or tooltip)
Not a mandatory field. Keep it natural. Examples:
- "Drove it great today. Irons were inconsistent. Three-putted 14 and 17 — kept misreading the break."
- "First round back after 3 weeks off — felt rusty but played better than expected. Course was dry and fast."
- "New 5-iron felt good. Back nine was much better than front — settled down after a nervous start."

### Length Guidance
Short is fine. One sentence is enough. There's no reward for writing essays — but the more context given, the better the AI feedback.

---

## Implementation Priority

**Phase 1 (build with round entry):**
- Free text note field on round summary screen
- Notes displayed on round detail view
- Notes included in round data export

**Phase 2 (after SG engine):**
- Quick context tags
- Notes factored into AI feedback
- Hole-specific notes
- Season journal / timeline view

**Phase 3 (with AI layer):**
- Pattern analysis across notes
- Condition correlation ("you play better in X conditions")
- Year-end review generation
- Coach-sharing opt-in
