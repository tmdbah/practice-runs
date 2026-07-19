<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

- Fix: native time-picker clock icon renders black-on-dark in the edit drawer's From/To inputs — make it visible in dark mode
- Fix: editing Usual Schedule then toggling to This Week doesn't reflect the change until a manual page refresh — inherited (non-overridden) This Week cells must merge live `usualOverrides` optimistic state, not just the server snapshot
- Change: default grid mode on load from "usual" to "this-week" — going forward This Week is the more common thing a returning player checks
- Fix: This Week grid columns render uneven widths (e.g. Friday narrower than other days) — `table-layout: auto` was letting the browser size each column off its sparsest cell's content (the "no common time" window box)

## Notes

<!-- Any extra notes -->

- Team window calc logic (for reference, unchanged): computed independently per day (`src/lib/teams.ts`) as `[MAX(all non-UNAVAILABLE players' fromTime), MIN(...toTime)]`, ANYTIME treated as 00:00–23:59; invalid range (max ≥ min) → "no common time". Not a single "best day" calc — all 7 days always computed.
- Team Window *display* redesign (separate carousel card per mockup, replacing the table row) is scoped as its own feature — see `context/features/feature-team-window-carousel-spec.md`.

## History

<!-- Keep this updated. Earliest to latest -->

- 2026-07-19: Feature documented, scope clarified with user (Phase 1 schema only, no NextAuth, no Venue/Session/Rsvp), status set to In Progress
- 2026-07-19: Implemented on `feature/prisma-neon-setup`. Installed Prisma 7.8.0 + `@prisma/adapter-pg` + `pg`; ran `prisma init` with v7's `prisma.config.ts` format. Wrote `prisma/schema.prisma` (Team/Player/DayDefault/DateOverride, Status enum, cascade deletes, indexes). Since v7 removed `datasource.directUrl`, `prisma.config.ts` uses `DIRECT_URL` (Neon's unpooled connection, needed by the schema engine) while the runtime client in `src/lib/prisma.ts` uses `DATABASE_URL` (Neon's pooled connection) via `@prisma/adapter-pg`. Ran `prisma migrate dev --name init` against the user's Neon database successfully. Verified the pooled connection end-to-end with a temporary API route (create+delete round trip), then removed it. `npm run lint` and `npm run build` both pass. Status set to Completed — ready for commit per ai-interaction.md workflow.
- 2026-07-19: Phase 1 — Core Availability Grid completed on `phase-1-core-availability-grid`. Built seed script (demo team, 8 fake players), GET /api/teams/[slug] read API, localStorage identity with useSyncExternalStore, 7-col availability grid UI, bottom-sheet tap-to-edit drawer with optimistic saves, and PATCH /api/teams/[slug]/players/[playerId]/default write endpoint. 23 unit tests covering schedule-filling logic, PATCH validation, and identity hook. Merged to main.
- 2026-07-19: Phase 2 — This Week overrides + team window completed on `phase-2-this-week-overrides-team-window`. Extended GET API with thisWeek DayCell[] (effectiveStatus = DateOverride ?? DayDefault, isOverridden flag) and teamWindows[] per day; added PATCH /override endpoint; added Usual/This Week toggle with inherited (faded) vs overridden (dot) cell styling; added TeamWindowRow component with live optimistic window recalculation. 22 new unit tests. Merged to main.
- 2026-07-19: Post-Phase-2 fixes completed on `fix/this-week-sync-and-default`. Fixed dark-mode time-picker icon visibility, Usual→This Week optimistic sync (inherited cells and their team windows now merge live `usualOverrides` instead of the stale server snapshot), changed default grid mode to This Week, and fixed uneven column widths via `table-fixed`. `npm run lint`, `npm run build`, and all 45 existing unit tests pass. Merged to main.
