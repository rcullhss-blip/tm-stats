---
description: Token-aware context management. Use this skill when context is filling up, when switching between simple and complex tasks, or when Rob runs /tokens.
---

# /tokens — Context & Model Manager

When Rob runs /tokens, give a full context health check and recommendations. Also use the rules in this file automatically throughout every session.

---

## Automatic Rules — Apply These Always, Every Session

### Rule 1 — Right Model for the Right Task

Never use Opus for simple tasks. Never use Haiku for complex architecture.

| Task Type | Use | Why |
|---|---|---|
| Simple file edits, renaming, formatting | Haiku | Fast, cheap, no complex reasoning needed |
| Standard feature building, bug fixing | Sonnet | Best balance of speed and quality |
| Complex architecture, SG engine design, security review | Opus | Worth the cost for decisions that are hard to undo |
| Reviewing or reading files | Sonnet | Good enough, saves Opus for real work |
| Running /security, /em, /release | Sonnet | Thorough but not architecturally complex |
| Running /brainstorm or /nextlevel | Opus | Creative and strategic thinking benefits from depth |

To switch model mid-session: type `/model` in Claude Code and select from the picker.

---

### Rule 2 — Context Window Thresholds

The status line shows the bar. Act on it:

| Usage | What to do |
|---|---|
| 0–50% (green) | Work freely |
| 50–75% (yellow) | Start being selective — don't load large files unnecessarily |
| 75–90% (amber) | Run `/compact` soon — summarises earlier conversation |
| 90%+ (red) | Run `/compact` immediately before continuing |
| Near 100% | Run `/clear` — start a fresh session, rely on CLAUDE.md + memory files |

**Never let the context hit 100% mid-task.** If a task is likely to be long, run `/compact` proactively at 70%.

---

### Rule 3 — Don't Load What You Don't Need

Before reading a file, ask: do I actually need the full contents, or just a specific function?

- Use `grep` or search to find the relevant section instead of reading the whole file
- Don't load the entire SG baseline data table into context — query only the distance band needed
- Don't re-read CLAUDE.md every turn — it's loaded once at session start
- Don't include full error stack traces in context — extract just the relevant lines
- When reviewing multiple files, review one at a time and compact between them

---

### Rule 4 — Skill Effort Levels

Each skill in `.claude/commands/` should declare its effort level in frontmatter. This controls how much reasoning Claude uses when that skill runs:

- `effort: low` — quick tasks, formatting, simple edits
- `effort: medium` — standard feature work, most reviews (default)
- `effort: high` — security reviews, SG engine work, architectural decisions

Example skill frontmatter:
```
---
effort: high
description: Security scan — use high effort for thorough vulnerability checking
---
```

---

## When Rob Runs /tokens — Full Health Check

Run this report:

### 1. Current Status
```
Model:        [current model]
Context used: [X%] — [status: healthy/filling/critical]
Tokens in:    [Xk]
Tokens out:   [Xk]
Session cost: [$X.XX]
```

### 2. Recommendation
Based on current usage, recommend one of:

**HEALTHY** (under 50%)
"Context is healthy. Continue working. Current model is appropriate for the current task."

**FILLING** (50–75%)
"Context is filling up. Recommend running `/compact` after the current task completes. Avoid loading large files. Switch to Sonnet if currently on Opus to conserve tokens."

**COMPACT NOW** (75–90%)
"Run `/compact` now before continuing. This will summarise the conversation history and free up significant context. You won't lose work — the summary will capture decisions made."

**RESET NEEDED** (90%+)
"Context is nearly full. Options:
1. Run `/compact` immediately — best if mid-task
2. Run `/clear` + `/memory` — best if at a natural break point
After clearing, run `/memory` to reload project state from the memory files."

### 3. Token Efficiency Tips for This Session
List 2–3 specific things from this session that used unnecessary tokens, if any. For example:
- "You loaded the full database schema file twice — use @ mentions to reference sections"
- "The security review loaded all 18 files at once — consider reviewing by module"

---

## How /compact Works

Running `/compact` tells Claude Code to summarise everything discussed so far into a compressed version, freeing up most of the context window while keeping the key decisions and progress. It does NOT delete your code or files — only the conversation history is compressed.

Run it proactively at 70%. Don't wait until 95% when the session might be unstable.

## How /clear Works

Running `/clear` wipes the conversation entirely and starts fresh. Use this at natural break points (end of a feature, start of a new phase).

After `/clear`, always run `/memory` immediately — this reloads the project state from the memory files so you pick up exactly where you left off.

## How /model Works

Type `/model` at any time to open the model picker and switch between:
- `claude-haiku-4-5` — fastest, cheapest, for simple tasks
- `claude-sonnet-4-6` — balanced, default for most work
- `claude-opus-4-6` — most capable, for hard problems

The status line shows which model is active at all times.
