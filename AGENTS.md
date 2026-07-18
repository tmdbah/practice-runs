<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Practice Runs

> **A mobile-first tool for a pickup basketball crew to set weekly availability and see when enough people overlap to actually get a run together.**

---

## Context Files

Read the following to get the full context of the project:

- [@context/practiceRuns-ProjectOverview.md](context/practiceRuns-ProjectOverview.md) — full spec: data model, decisions log, routes, build phases
- [@context/practiceRuns-ProjectPlan.html](context/practiceRuns-ProjectPlan.html) — visual brainstorm artifact, kept in lockstep with the overview
- [@context/coding-standards.md](context/coding-standards.md)
- [@context/ai-interaction.md](context/ai-interaction.md)
- [@context/current-feature.md](context/current-feature.md)

---

## Project Overview

Replaces a Google Sheets prototype used by the "Uncrowned Kings" pickup basketball group to coordinate weekly availability. The sheet proved the data model but breaks down at time-of-day granularity, especially on mobile. This app rebuilds the same logic — plus a real fix for one-off session planning (venue, cost split, headcount) that the sheet never covered — as a small, purpose-built app. Status: planning complete, Phase 1 not started.

---

## Tech Stack

- **Framework:** Next.js (App Router, latest stable)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Neon (Postgres) + Prisma
- **Auth:** None in V1 — client-stored identity (`localStorage`), no accounts. NextAuth v5 deferred to Phase 5, gated on a real trigger (opening this to people outside the trust circle)
- **Deployment:** Vercel

---

## Key Directories

```
src/
├── app/           # Next.js App Router pages and layouts
│   └── api/       # Route handlers (see Routes & API in the overview doc)
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── lib/           # Utilities, helpers, API clients
└── types/         # Shared TypeScript types
prisma/
└── schema.prisma  # Team / Player / DayDefault / DateOverride (+ Venue/Session/Rsvp from Phase 3)
```

---

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
# npm test      # Run tests (uncomment if used)
```

---

## Architecture Decisions

- **Client-stored identity, no auth (V1):** first visit picks a name from the roster, stored in `localStorage`. Trust-based — anyone can edit anyone's row, matching how the spreadsheet already worked. Real auth is deferred until there's a concrete trigger (see Decisions log in the overview doc).
- **One grid, two write targets:** "Usual" and "This Week" are the same grid and the same tap interaction — a toggle only changes whether a tap writes to `DayDefault` or `DateOverride`. Avoids building and maintaining two separate views.
- **Optimistic, no-confirmation saves:** tapping Save updates the cell instantly, before the network call resolves, then closes the drawer. On failure the cell reverts with an inline error. No toasts, no modals.
- **Manual pull-to-refresh, not real-time sync:** no websockets or polling. Right-sized for ~15 people; revisit only if staleness actually becomes a complaint.
- **Sessions (Phase 3) are a separate data model, not bolted onto the grid:** recurring availability (`DayDefault`/`DateOverride`) and one-off session planning (`Venue`/`Session`/`Rsvp`) don't share state, by design — see the Gap analysis section of the overview doc.
- **Portfolio/demo safety without auth:** a seeded `/team/demo` team with fake data, reset daily, is the actual fix for "a recruiter could break real team data" — not a login wall. The real team's URL is simply never posted publicly.

---

## Conventions

- Components: PascalCase (`ItemCard.tsx`)
- Hooks: `useCamelCase`, file `use-camel-case.ts`
- Files: kebab-case for non-component files, match component name for components
- Functions: camelCase
- Types/interfaces: PascalCase, no `I` prefix
- Named exports only — no default exports
- Server Components by default; `'use client'` only for interactivity/hooks/browser APIs

---

## Do NOT

- [ ] Use `any` type in TypeScript
- [ ] Build real auth (NextAuth) before Phase 5's trigger is actually met
- [ ] Merge the Sessions/Venue data model into the availability grid's tables — they're deliberately separate
- [ ] Add real-time sync (websockets/polling) — manual pull-to-refresh is the intentional V1/V2 choice
- [ ] Open venue submission to all players — admin-added only for now
- [ ] Hardcode `Session.minPlayers` — it's an open team decision, kept editable per session
- [ ] Add stat-sheet consolidation or push notifications — explicitly out of scope for now

---

## Current Status

**V1 scope (Phases 1–2):** Core availability grid — Usual Schedule tap-to-edit, then This Week overrides plus the live team-window overlap calculation.
**Done when:** the grid alone beats the spreadsheet on friction, and This Week/Usual overrides plus per-day available-count and team window are all live.
**Next up (Phase 3):** Sessions & venues — propose a one-off session (rented gym/open gym/park), RSVP, live cost split and minimum-headcount check. Not fully blocked — INSZN is a usable first venue.
