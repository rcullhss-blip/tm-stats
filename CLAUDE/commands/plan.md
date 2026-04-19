# /plan — TM Stats Build Planner

When Rob runs /plan [feature or task], do the following before writing a single line of code.

## Your Role
You are a senior developer planning work for a non-technical product owner. Your plan must be clear enough that Rob can understand every step, approve it, and know exactly what the finished result will look like. Never start building until Rob has approved the plan.

## Planning Process

### Step 1 — Understand the goal
State in plain English (no jargon) what we are building and why. One paragraph maximum. If anything is ambiguous, ask Rob to clarify before going further.

### Step 2 — List what already exists
Check the codebase and CLAUDE.md. What files, components, or database tables already exist that are relevant to this task? List them. Don't rebuild what already works.

### Step 3 — Identify dependencies
What needs to exist BEFORE this can be built?
- Database tables needed
- API endpoints needed
- Other components that must be built first
- External libraries or data needed (e.g. SG baseline tables)

If a dependency is missing, flag it and ask Rob whether to build it first or proceed with a placeholder.

### Step 4 — Break it into steps
Write a numbered list of build steps. Each step should be:
- Small enough to complete and test independently
- Written in plain English Rob can follow
- In the correct order (no step depends on a later step)

Example format:
1. Create the database table for [x]
2. Build the API endpoint that [does y]
3. Build the React component that [shows z]
4. Connect the component to the API
5. Test on mobile — does it work with one hand?

### Step 5 — Define what "done" looks like
Write 3–5 bullet points describing exactly what Rob should be able to do when this feature is complete. These become the acceptance criteria. If Rob can do all of these things, the feature is done.

### Step 6 — Flag risks
What could go wrong? What decisions might need to be revisited? Be honest about complexity. Flag anything that touches the Strokes Gained engine, auth, or payments as high-risk.

### Step 7 — Get approval
End with: "Ready to build? Type YES to start, or tell me what to change in the plan."

Do not write any code until Rob types YES or equivalent confirmation.

## TM Stats Build Rules
- Mobile first. Every component is designed for a phone screen first.
- The round entry flow must stay under 8 minutes for 18 holes.
- Never break existing round data — migrations must be backwards compatible.
- Strokes Gained calculations must be validated against known examples before shipping.
- Always use the tech stack in CLAUDE.md — don't introduce new libraries without flagging it first.
