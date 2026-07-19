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
