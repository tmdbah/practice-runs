<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Phase 2 — This Week Overrides + Team Window

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

In Progress

## Goals

<!-- Goals & requirements -->

- Add `DateOverride` Prisma model and run migration
- Extend `GET /api/teams/[slug]` to return effective view (override ?? default per player per day) and per-day team window calculation
- Add This Week / Usual toggle to the grid; cells render inherited (faded) vs overridden (dot marker) in This Week mode; Usual mode behavior unchanged
- Add `PATCH /api/teams/[slug]/players/[playerId]/override` write endpoint; same optimistic-save pattern as Phase 1's default endpoint
- Surface per-day available count and team window in the grid UI; recalculates after any optimistic edit; shows "No common time" when window is invalid

## Notes

<!-- Any extra notes -->

- **Hard boundary:** do not build `Venue`, `Session`, `Rsvp` models or any session/RSVP UI (Phase 3), and no auth/demo team (Phase 4/5)
- Effective resolution rule: missing `DateOverride` row means "use `DayDefault`" — compute fallback on read, never backfill/store it
- `isOverridden` must be `true` only when a real `DateOverride` row exists — never inferred
- Team window: for each of the next 7 calendar dates, take players not `UNAVAILABLE`; treat `ANYTIME` as `00:00–23:59`; window = [MAX(fromTimes), MIN(toTimes)]; invalid if max ≥ min → return null
- `DateOverride.note` persists independently of `DayDefault.note` — editing This Week's note must not change Usual Schedule's note
- Toggle state does not need to persist across reloads

## History

<!-- Keep this updated. Earliest to latest -->

- 2026-07-19: Feature documented, scope clarified with user (Phase 1 schema only, no NextAuth, no Venue/Session/Rsvp), status set to In Progress
- 2026-07-19: Implemented on `feature/prisma-neon-setup`. Installed Prisma 7.8.0 + `@prisma/adapter-pg` + `pg`; ran `prisma init` with v7's `prisma.config.ts` format. Wrote `prisma/schema.prisma` (Team/Player/DayDefault/DateOverride, Status enum, cascade deletes, indexes). Since v7 removed `datasource.directUrl`, `prisma.config.ts` uses `DIRECT_URL` (Neon's unpooled connection, needed by the schema engine) while the runtime client in `src/lib/prisma.ts` uses `DATABASE_URL` (Neon's pooled connection) via `@prisma/adapter-pg`. Ran `prisma migrate dev --name init` against the user's Neon database successfully. Verified the pooled connection end-to-end with a temporary API route (create+delete round trip), then removed it. `npm run lint` and `npm run build` both pass. Status set to Completed — ready for commit per ai-interaction.md workflow.
- 2026-07-19: Phase 1 — Core Availability Grid completed on `phase-1-core-availability-grid`. Built seed script (demo team, 8 fake players), GET /api/teams/[slug] read API, localStorage identity with useSyncExternalStore, 7-col availability grid UI, bottom-sheet tap-to-edit drawer with optimistic saves, and PATCH /api/teams/[slug]/players/[playerId]/default write endpoint. 23 unit tests covering schedule-filling logic, PATCH validation, and identity hook. Merged to main.
