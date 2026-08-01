<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Roster-based RSVP count for sessions without a minPlayers threshold

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

User reported that plain proposed sessions (practices at `OPEN_GYM`/`PARK`/`RECREATION_CENTER` venues, which never set `minPlayers` since there's no "worth booking" threshold for a free venue) showed only a raw ✅/❌ name list — no numeric count — forcing them to manually count names to know how many people were in. `RENTED_GYM` sessions and Games already showed a count ("RSVP'd: X / minPlayers") because those set a real threshold, so the ask was to add an equivalent simple count for the sessions that don't: "8 of 15" (in of full roster), not "in vs. explicitly out" — anyone who hasn't responded or said out both count toward the "not in" side. Explicitly out of scope: any "maybe"/tentative RSVP state — the app only has binary In/Out, and the user confirmed that's fine, calling it added complexity not worth doing.

Also confirmed with the user (via `AskUserQuestion`) that the identical gap in the multi-slot voting cards (candidate time slots without `minPlayers` set showed a bare `"{count} can make it"` with no denominator) should get the same treatment for consistency — user chose to fix both.

## Notes

<!-- Context, decisions, tradeoffs -->

Root cause (found via an Explore agent before making any changes): `SessionCostAndRsvps` in `SessionSummary.tsx` only rendered any headcount box at all when `session.minPlayers != null` — the numerator (`inRsvps.length`, i.e. `ANYTIME` RSVPs) was always computed, but the denominator was always `minPlayers`, with no fallback. Same shape of gap in `SlotGroupCard.tsx` (per-slot turnout) and a duplicated inline block in `SessionDetailView.tsx` (the shareable single-session page's open-slot voting view).

Fix: added a `rosterSize: number` prop to `SessionCostAndRsvps`/`SessionSummary` (threaded from the existing `players: PlayerRow[]` array already available at both call sites — `SessionsSection.tsx` and `SessionDetailView.tsx` — via `players.length`, no new data fetching needed). When `minPlayers` is set, behavior is unchanged (`RSVP'd: X / minPlayers` + the existing green/amber/red status badge). When it's not set, the box still always renders (previously it was hidden entirely unless a threshold or cost box applied) showing `RSVP'd: X of {rosterSize}` with no status badge, since there's no threshold to compare against — purely informational. The same `X of {rosterSize}` denominator was added to the two multi-slot "can make it" fallback spots (`SlotGroupCard.tsx`, `SessionDetailView.tsx`'s open-slot branch) which already had `players`/roster in scope via `computeSlotTally`'s existing roster-wide accounting.

Cancelled sessions still show no count box at all (unchanged) — a cancelled session doesn't need a live headcount; the "This slot fell through" banner already communicates that.

## History

- 2026-08-01: User requested a roster-based headcount for sessions lacking a minPlayers threshold, explicitly ruling out any "maybe" RSVP state as unnecessary complexity. Dispatched an Explore agent to map every existing count/headcount code path first (RENTED_GYM, OPEN_GYM/PARK/RECREATION_CENTER, Game Day, and the multi-slot voting cards) before touching anything. Asked the user via `AskUserQuestion` whether to also fix the identical gap in multi-slot voting cards — confirmed yes. Implemented across `SessionSummary.tsx` (new `rosterSize` prop, box always renders now, denominator falls back to roster size when `minPlayers` is null), `SessionsSection.tsx` and `SessionDetailView.tsx` (pass `rosterSize={players.length}`), and `SlotGroupCard.tsx` + `SessionDetailView.tsx`'s open-slot branch (roster denominator on the "can make it" fallback). `npm run lint`, `npx vitest run` (238/238, no test changes needed — `headcountStatus`, the only tested piece, is unchanged), and `npm run build` all pass. Verified live against `demo-team` via Playwright: proposed a real Open Gym session (no minPlayers), confirmed it rendered "RSVP'd: 0 of 15", RSVP'd one player in, confirmed it live-updated to "RSVP'd: 1 of 15" with a screenshot. Cleaned up the test session from the database afterward. Status set to Completed — ready for commit per `ai-interaction.md` workflow.
