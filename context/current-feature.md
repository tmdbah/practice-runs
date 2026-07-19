<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Not Started

## Goals

<!-- Goals & requirements -->

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->

- 2026-07-19: Feature documented, scope clarified with user (Phase 1 schema only, no NextAuth, no Venue/Session/Rsvp), status set to In Progress
- 2026-07-19: Implemented on `feature/prisma-neon-setup`. Installed Prisma 7.8.0 + `@prisma/adapter-pg` + `pg`; ran `prisma init` with v7's `prisma.config.ts` format. Wrote `prisma/schema.prisma` (Team/Player/DayDefault/DateOverride, Status enum, cascade deletes, indexes). Since v7 removed `datasource.directUrl`, `prisma.config.ts` uses `DIRECT_URL` (Neon's unpooled connection, needed by the schema engine) while the runtime client in `src/lib/prisma.ts` uses `DATABASE_URL` (Neon's pooled connection) via `@prisma/adapter-pg`. Ran `prisma migrate dev --name init` against the user's Neon database successfully. Verified the pooled connection end-to-end with a temporary API route (create+delete round trip), then removed it. `npm run lint` and `npm run build` both pass. Status set to Completed — ready for commit per ai-interaction.md workflow.
- 2026-07-19: Phase 1 — Core Availability Grid completed on `phase-1-core-availability-grid`. Built seed script (demo team, 8 fake players), GET /api/teams/[slug] read API, localStorage identity with useSyncExternalStore, 7-col availability grid UI, bottom-sheet tap-to-edit drawer with optimistic saves, and PATCH /api/teams/[slug]/players/[playerId]/default write endpoint. 23 unit tests covering schedule-filling logic, PATCH validation, and identity hook. Merged to main.
- 2026-07-19: Phase 2 — This Week overrides + team window completed on `phase-2-this-week-overrides-team-window`. Extended GET API with thisWeek DayCell[] (effectiveStatus = DateOverride ?? DayDefault, isOverridden flag) and teamWindows[] per day; added PATCH /override endpoint; added Usual/This Week toggle with inherited (faded) vs overridden (dot) cell styling; added TeamWindowRow component with live optimistic window recalculation. 22 new unit tests. Merged to main.
- 2026-07-19: Post-Phase-2 fixes completed on `fix/this-week-sync-and-default`. Fixed dark-mode time-picker icon visibility, Usual→This Week optimistic sync (inherited cells and their team windows now merge live `usualOverrides` instead of the stale server snapshot), changed default grid mode to This Week, and fixed uneven column widths via `table-fixed`. `npm run lint`, `npm run build`, and all 45 existing unit tests pass. Merged to main.
- 2026-07-19: Team Window Carousel completed on `feature/team-window-carousel` (spec: `context/features/feature-team-window-carousel-spec.md`). Replaced the This Week grid's per-day table row (`TeamWindowRow`, deleted) with a standalone `TeamWindowCard`: defaults to the best-availability day (tie-break: earliest date; all-zero falls back to day 0), navigable via always-visible arrow buttons (disabled at the ends, no wraparound), native touch swipe (CSS scroll-snap), and 7 tappable dot indicators. Underlying `computeWindowForDate` calculation untouched — display-layer only. Also updated `practiceRuns-ProjectOverview.md`, `practiceRuns-ProjectPlan.html`, `AGENTS.md`, and `feature-phase-2-spec.md` (superseded note) to keep docs in lockstep with the new design, and corrected stale "Phase 2 not started" status text left over from prior merges. 4 new unit tests for the default-day selection logic; `npm run lint`, `npm run build`, and all 49 unit tests pass. Merged to main.
- 2026-07-19: TeamWindowCard positioning/style fix on `fix/team-window-card-position`, based on a mockup screenshot comparison. Moved the card above the grid table (was rendering below it) and restyled from a tall stacked card with large flanking arrows into a compact single-line box (label + day/time pill + "{count} free · best overlap" caption), matching the mockup's "Team window · Fri 7–9pm" look — carousel functionality (arrows, swipe, dots) unchanged. `bestIndex` now computed via a lazy `useState` initializer instead of a ref, since the `react-hooks/refs` lint rule disallows reading a ref during render. `npm run lint`, `npm run build`, and all 49 unit tests pass. Merged to main.
