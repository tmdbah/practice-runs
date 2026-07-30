<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Auto-hide expired sessions/games from the list

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

User reported that a test game proposal from a prior date was still showing up on `/team/[slug]` days after it happened — with no accounts/single-admin cleanup habit to rely on, expired sessions/games (especially ones nobody ever confirmed or cancelled) will otherwise just accumulate as clutter indefinitely. Asked whether "self delete" once a session's date+time passes is feasible.

Presented the user a real design fork before building: **hard-delete the row** (needs a new scheduled job — Vercel Cron, a new API route, real infra) vs. **hide expired sessions from the list without deleting anything** (a filter on the existing read path, no new infra, non-destructive, matches how this app already treats cancelled sessions — kept, not deleted). User picked hide-not-delete.

## Notes

<!-- Context, decisions, tradeoffs -->

Implemented as a filter in `src/lib/sessions.ts`'s `getSessionsForTeam` — the single place `/team/[slug]` reads its session list from (`page.tsx` calls it directly; the GET `/api/teams/[slug]/sessions` route previously duplicated the same query independently, so it was refactored to call `getSessionsForTeam` too, eliminating that duplication and inheriting the filter for free with no separate copy of the logic to keep in sync). `getSessionForTeam` (singular — the shareable-link route `/team/[slug]/sessions/[sessionId]`) deliberately does **not** get this filter: a shared link to an already-completed session should still open, not 404.

A session counts as expired once its calendar `date` + `toTime` has passed **in the team's local timezone** (`America/New_York` — Charlotte, NC, same constant/rationale as the earlier `getNext7Dates()` timezone fix, duplicated locally in this file rather than shared since it's one small constant and this file has no other dependency on `teams.ts`). Comparison is done as plain `"YYYY-MM-DD"`/`"HH:MM"` string comparisons (via `Intl.DateTimeFormat.formatToParts`, mirroring `teams.ts`'s `getLocalToday` style) rather than constructing real timezone-aware `Date` instants — sidesteps DST-offset math entirely, consistent with how the rest of this codebase already treats calendar dates as UTC-midnight-anchored strings.

Filter applies uniformly to every `SessionStatus` (`PROPOSED`/`CONFIRMED`/`CANCELLED`) and both `SessionKind`s (`PRACTICE`/`GAME`) once expired — not just unresolved `PROPOSED` ones. Reasoning: the list's job is "what needs my attention or is coming up," and once something is in the past none of those statuses need further action from a player; the row (and its RSVPs/votes) is still safely in the database if a future history/stats view is ever built, this only changes what's rendered. A still-open multi-slot group where one candidate slot has expired but a sibling hasn't degrades gracefully via `SessionsSection.tsx`'s existing `isOpenGroup = length > 1` check — same mechanism already verified for slot deletion earlier this session, no new special-casing needed.

## History

- 2026-07-30: Discussed the request, presented the delete-vs-hide fork via `AskUserQuestion`, user chose hide (no deletion, no cron). Implemented: `hasSessionEnded`/`getLocalNowParts`/`TEAM_TIMEZONE` added to `src/lib/sessions.ts`, `getSessionsForTeam` filters through it; `src/app/api/teams/[slug]/sessions/route.ts`'s GET handler refactored to call `getSessionsForTeam` instead of duplicating the `prisma.session.findMany` query (pre-existing duplication, fixed incidentally while touching this exact logic). Updated two test files whose fixtures/mocks assumed the old unfiltered behavior: `src/lib/sessions.test.ts`'s `getSessionsForTeam` tests now pin system time via `vi.useFakeTimers()` (mirroring the pattern from the earlier This-Week timezone fix) since the fixture's session date had since become "in the past" relative to real time, plus three new tests for the filter itself (past-date excluded, today-but-not-ended-yet included, today-and-ended excluded, using the same DST-aware Eastern/UTC offset reasoning as the earlier fix); `src/app/api/teams/[slug]/sessions/route.test.ts`'s GET tests updated to mock `getSessionsForTeam` directly instead of `prisma.session.findMany`, matching the refactored route. `npm run lint`, `npx vitest run` (238/238), and `npm run build` all pass. Verified live against `demo-team`: the seeded Game Day session (Thu Jul 23, 7:15–9:00pm — already past relative to today) correctly disappeared from the list on page load, "No games proposed yet." shown instead, with the row still present in the database (nothing was deleted). Status set to Completed — ready for commit per `ai-interaction.md` workflow.
