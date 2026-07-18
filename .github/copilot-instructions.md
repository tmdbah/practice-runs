# Practice Runs

No-login, mobile-first tool for a pickup basketball crew to set weekly availability, see overlapping free hours, and (Phase 3+) plan one-off sessions with cost splitting. Replaces a Google Sheets prototype.

## Stack

- Next.js (App Router, latest stable)
- TypeScript
- Tailwind CSS v4
- Neon Postgres + Prisma
- No auth in V1 — identity is client-stored (`localStorage`), no accounts

## Key Directories

- `src/app/` — App Router pages and layouts
- `src/app/api/` — Route handlers (`/api/teams/[slug]`, etc.)
- `src/components/` — UI components
- `src/hooks/` — Custom React hooks
- `src/lib/` — Utilities and API clients
- `prisma/schema.prisma` — Team / Player / DayDefault / DateOverride (+ Venue/Session/Rsvp from Phase 3)

## Commands

- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm test`

## Code Style

- TypeScript strict mode — no `any`
- Named exports only — no default exports
- Prefer `const` over `let`
- Tailwind for all styling — no inline styles
- Server Components by default — `'use client'` only when interactivity/hooks/browser APIs are needed

## Domain Rules

- One grid, two write targets: the "Usual"/"This Week" toggle changes whether a tap writes to `DayDefault` or `DateOverride` — it is not two separate views.
- Every day defaults to `UNAVAILABLE` — never assume a player is free.
- Saves are optimistic (update the cell before the network call resolves, revert + inline error on failure) — no confirmation modals or toasts.
- Sessions/Venues (Phase 3) are a separate data model from the recurring availability grid — do not merge their state.

## Do NOT Generate

- Class components (use functional components only)
- `var` declarations
- Default exports
- `any` type
- Real auth/NextAuth code (deferred to Phase 5 — see AGENTS.md)
- Real-time sync (websockets/polling) — manual pull-to-refresh is intentional
