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
| SG baselines | DECADE Golf / Lou Stagner tables | Build own | Saves months, proven data |
| FIR on par 3s | Store NULL (not false) | Store false | Semantically correct — it was never recorded |
| Round notes | Structured tags + free text | Free text only | Tags enable AI pattern matching across sessions |

## Last Updated: 2026-04-15
