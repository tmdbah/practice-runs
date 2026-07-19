<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature

Neon PostgreSQL + Prisma Setup

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

- Set up Prisma ORM (v7) against Neon PostgreSQL (serverless)
- Scoped to Phase 1 data only: `Team`, `Player`, `DayDefault` (`DateOverride` may be included now since Phase 2 follows immediately, but no writes to it happen until Phase 2)
- Do NOT include NextAuth models (Account/Session/VerificationToken) — auth is gated on the Phase 5 trigger, not met yet (see AGENTS.md Do-NOT list)
- Do NOT include Venue/Session/Rsvp — that's Phase 3, deliberately not wired early (see AGENTS.md Do-NOT list)
- Add appropriate indexes and cascade deletes
- Always use `prisma migrate dev` to create migrations — never `db push`
- Two Neon branches: a development branch (`DATABASE_URL`) and a production branch — migrations only, no direct pushes to either unless explicitly told otherwise

## Notes

<!-- Any extra notes -->

- Full requirements: `@context/features/database-spec.md`
- database-spec.md also asks for NextAuth models and the full data model (incl. Phase 3 tables) — user confirmed (2026-07-19) to scope this feature to Phase 1 only per AGENTS.md, deferring both to their respective phases
- Prisma 7 has breaking changes vs. earlier versions — read the upgrade guide before writing schema/config: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
- User has an existing free-tier Neon account; connection strings (pooled `DATABASE_URL` + direct `DIRECT_URL`) still need to be added to `.env`
- **Confirmed (2026-07-19) via Neon API:** `.env` points at the Neon `development` branch (`br-fancy-cloud-awzo0bbh`, compute `ep-ancient-unit-awcp927u`), not `production` (`br-cold-sound-aw4ltgma`, compute `ep-weathered-rice-awm0hsm7`). The initial migration (`20260719042059_init`) is applied there with no drift (`prisma migrate status` → up to date). `db push` was never run — only `prisma migrate dev`, which is the only schema-sync path `prisma.config.ts` supports (v7 dropped `directUrl`, so there's no accidental push route wired in). This is how dev/production stay in sync: migrations generated on `development` get replayed on `production` via `prisma migrate deploy`, never pushed directly.

## History

<!-- Keep this updated. Earliest to latest -->

- 2026-07-19: Feature documented, scope clarified with user (Phase 1 schema only, no NextAuth, no Venue/Session/Rsvp), status set to In Progress
- 2026-07-19: Implemented on `feature/prisma-neon-setup`. Installed Prisma 7.8.0 + `@prisma/adapter-pg` + `pg`; ran `prisma init` with v7's `prisma.config.ts` format. Wrote `prisma/schema.prisma` (Team/Player/DayDefault/DateOverride, Status enum, cascade deletes, indexes). Since v7 removed `datasource.directUrl`, `prisma.config.ts` uses `DIRECT_URL` (Neon's unpooled connection, needed by the schema engine) while the runtime client in `src/lib/prisma.ts` uses `DATABASE_URL` (Neon's pooled connection) via `@prisma/adapter-pg`. Ran `prisma migrate dev --name init` against the user's Neon database successfully. Verified the pooled connection end-to-end with a temporary API route (create+delete round trip), then removed it. `npm run lint` and `npm run build` both pass. Status set to Completed — ready for commit per ai-interaction.md workflow.
