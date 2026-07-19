<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Phase 1 — Core Availability Grid

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

In Progress

## Goals

<!-- Goals & requirements -->

- **1. Prisma schema + Neon connection** — `Team`, `Player`, `DayDefault`, and `Status` enum exist as real tables in Neon, migrated via Prisma; seed script creates demo team with fake players and 7 `DayDefault` rows per player (all `UNAVAILABLE`); no real team data committed
- **2. Read API** — `GET /api/teams/[slug]` returns roster + 7-day Usual Schedule per player; 404 on unknown slug; always returns exactly 7 entries per player (missing rows → `UNAVAILABLE`)
- **3. Identity** — first visit shows name picker from roster; `playerId` stored in `localStorage` keyed by slug; returning visitor skips picker; no auth, no server-side session
- **4. Home grid UI** — `/team/[slug]` renders 7-column (Mon–Sun) grid, one row per player; `ANYTIME`/`SPECIFIC` = teal fill, `UNAVAILABLE` = neutral; signed-in player's row is visually distinguished; jersey numbers shown; note indicator on cell; mobile-first (iPhone SE 375px minimum)
- **5. Tap-to-edit** — tapping a cell opens a bottom-sheet drawer; options: Anytime / Specific hours (shows time inputs) / Unavailable; optional note field; `PATCH /api/teams/[slug]/players/[playerId]/default`; optimistic save (update cell immediately, revert + inline error on failure); any player can edit any row (trust-based)

## Notes

<!-- Any extra notes -->

- **Hard boundary — do NOT build in Phase 1:** `DateOverride` model, This Week toggle, team window/overlap calc, `Venue`/`Session`/`Rsvp`, auth, demo team's daily reset job or "viewing demo" banner
- Schema already exists from the prior Prisma setup feature — requirement 1 mainly needs the seed script
- `fromTime`/`toTime` only persisted when `status = SPECIFIC`; switching to `ANYTIME`/`UNAVAILABLE` must clear them; `note` persists regardless of status
- Save behavior: no confirmation modals, no toasts — cell updates optimistically, reverts inline on failure
- Full spec: `context/features/feature-phase-1-spec.md`
- Real `uncrowned-kings` team + real roster are **out of scope for Goal 1** — the seed script here is demo-only (fake players, safe to commit). When the real team is added later, use a local-only script reading from a git-ignored file (e.g. `roster.local.json`), not a hardcoded/committed seed — keeps real names out of git history even if the repo is ever made public, consistent with the "real URL never posted publicly" portfolio-safety model in the architecture doc

## History

<!-- Keep this updated. Earliest to latest -->

- 2026-07-19: Feature documented, scope clarified with user (Phase 1 schema only, no NextAuth, no Venue/Session/Rsvp), status set to In Progress
- 2026-07-19: Implemented on `feature/prisma-neon-setup`. Installed Prisma 7.8.0 + `@prisma/adapter-pg` + `pg`; ran `prisma init` with v7's `prisma.config.ts` format. Wrote `prisma/schema.prisma` (Team/Player/DayDefault/DateOverride, Status enum, cascade deletes, indexes). Since v7 removed `datasource.directUrl`, `prisma.config.ts` uses `DIRECT_URL` (Neon's unpooled connection, needed by the schema engine) while the runtime client in `src/lib/prisma.ts` uses `DATABASE_URL` (Neon's pooled connection) via `@prisma/adapter-pg`. Ran `prisma migrate dev --name init` against the user's Neon database successfully. Verified the pooled connection end-to-end with a temporary API route (create+delete round trip), then removed it. `npm run lint` and `npm run build` both pass. Status set to Completed — ready for commit per ai-interaction.md workflow.
