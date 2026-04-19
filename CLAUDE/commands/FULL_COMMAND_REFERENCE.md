# TM Stats — Complete Command Reference

Every command available in Claude Code for this project.
Put all .md files in: `tm-stats-v2/.claude/commands/`
Put CLAUDE.md in: `tm-stats-v2/`
Put statusline.sh in: `~/.claude/hooks/statusline.sh` (then chmod +x)
Put settings.json in: `~/.claude/settings.json`

---

## The Default Workflow for Any Feature

```
/memory        → load project state
/brainstorm    → explore the problem
/sprint        → plan the work
/plan          → get approval before building
/api           → design endpoints first
/frontend      → build UI to proper standards
/test          → write tests alongside the code
/copy          → review all text on the screen
/a11y          → accessibility check
/review        → 4-angle code review
/security      → security scan
/perf          → performance check
/data          → data integrity check
/payments      → if touching Stripe
/sgcheck       → if touching SG engine
/em            → engineering manager review
/ceo           → business value check
/release       → final pre-ship gate
/memory save   → update project state
/git           → write commit message and commit
```

You won't run all of these on every small change — use judgement.
Small bug fix: /fix, /review, /git, /release.
New feature: the full workflow above.

---

## Commands by Category

### 🧠 Thinking & Planning
| Command | Purpose |
|---|---|
| `/brainstorm [topic]` | Explore from 4 angles before planning |
| `/plan [feature]` | Step-by-step plan, Rob approves before building |
| `/sprint [phase]` | Break roadmap into buildable weekly sprints |
| `/nextlevel [area]` | Challenge whether it's genuinely excellent |

### 🔨 Building
| Command | Purpose |
|---|---|
| `/frontend [component]` | Build UI to real dev standards — design system enforced |
| `/api [endpoint]` | Design API endpoints consistently before coding |
| `/test [feature]` | Write tests — mandatory for SG engine |
| `/copy [screen]` | Write and review all text in the app |

### 🔍 Reviewing
| Command | Purpose |
|---|---|
| `/review [code]` | 4-angle check: logic, defensive, UX, quality |
| `/debug [problem]` | 4-angle investigation before suggesting fix |
| `/a11y [component]` | Accessibility — tap targets, contrast, screen readers |
| `/perf [page]` | Performance profiling — mobile network targets |
| `/data [check]` | Data integrity — round completeness, migrations |

### 🔒 Security & Safety
| Command | Purpose |
|---|---|
| `/security` | 8-vector security scan |
| `/payments` | Stripe and subscription audit |
| `/sgcheck` | Validate SG engine against 8 known correct results |
| `/env [setup/check]` | Environment variables — dev/staging/production |

### 👥 Autonomous Review Team
These run themselves — no manual approval needed from Rob:
| Command | Role | Verdict they issue |
|---|---|---|
| `/ceo [feature]` | CEO | Ship / Don't Ship |
| `/em [codebase]` | Engineering Manager | Healthy / Needs Attention / Concerning |
| `/release [version]` | Release Manager | Cleared / Conditional / Blocked |

### 🧰 Project Management
| Command | Purpose |
|---|---|
| `/memory` | Start of session — load all project state |
| `/memory save` | End of session — save progress and decisions |
| `/tokens` | Context health check, model advice |
| `/git [commit]` | Write commit messages, branch naming |

---

## Model Selection Guide

| Task | Model | Why |
|---|---|---|
| Simple edits, formatting, renaming | Haiku | Fast and cheap |
| Standard feature building | Sonnet (default) | Best balance |
| /brainstorm, /nextlevel, /sgcheck | Opus | Complex reasoning worth the cost |
| /security, /em, architecture decisions | Opus | Decisions that are hard to undo |

Switch with `/model` at any time. Status line always shows current model.

---

## Folder Structure

```
tm-stats-v2/
├── CLAUDE.md
├── memory/
│   ├── project-state.md
│   ├── decisions.md
│   ├── blockers.md
│   └── session-log.md
└── .claude/
    └── commands/
        ├── brainstorm.md
        ├── plan.md
        ├── sprint.md
        ├── nextlevel.md
        ├── frontend.md
        ├── api.md
        ├── test.md
        ├── copy.md
        ├── review.md
        ├── debug.md
        ├── a11y.md
        ├── perf.md
        ├── data.md
        ├── security.md
        ├── payments.md
        ├── sgcheck.md
        ├── env.md
        ├── ceo.md
        ├── em.md
        ├── release.md
        ├── memory.md
        ├── tokens.md
        └── git.md

~/.claude/
├── settings.json
└── hooks/
    └── statusline.sh
```

---

## Total: 22 commands + status line + settings
