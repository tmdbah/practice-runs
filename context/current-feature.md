<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: This Week / Usual grid desync after Reset to Usual

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Fix a core-loop bug the user hit while recording an MVP tutorial video: after tapping "Reset to Usual" on a This Week cell, that cell would never again reflect further Usual edits made later in the same browser session — This Week kept showing whatever Usual's value was at the moment of Reset, permanently stuck, until a full page reload. User's own description ("I kept trying to remove the usual, but then every time I flip over to this week, I'll see the faded box will return, and then I went back over to the usual to make the adjustment") matches this exactly.

## Notes

<!-- Context, decisions, tradeoffs -->

Root cause, in `AvailabilityGrid.tsx`'s `getWeekCell`: the client keeps two optimistic maps — `usualOverrides` (live Usual edits) and `weekOverrides` (live This Week overrides). `getWeekCell` returned any `weekOverrides` entry unconditionally, without checking whether it actually represented an override. `handleReset` (the "Reset to Usual" handler) stored a `{ isOverridden: false, ...snapshot of Usual's value at that moment }` entry into `weekOverrides` — a legitimate need, since it has to override a stale `base.isOverridden: true` baked into the page-load snapshot. But because `getWeekCell` returned that entry verbatim, the snapshot became a permanent, un-refreshing cache: any further Usual edit updated `usualOverrides` correctly, but `getWeekCell` never looked at `usualOverrides` again for that cell, since the `weekOverrides` entry short-circuited first.

Fix: `getWeekCell` now derives `isOverridden` from the `weekOverrides` entry when one exists (else falls back to `base.isOverridden`), and only returns the override's own field values when `isOverridden` is actually `true`. Whenever the cell is not overridden — whether because there's no local `weekOverrides` entry, or because there is one with `isOverridden: false` (a Reset marker) — it now always recomputes the displayed value live via `getUsualEntry` (which already prefers a live `usualOverrides` edit over the static page-load snapshot), instead of trusting whatever was baked into the `weekOverrides` entry at Reset-time.

While investigating, also found and fixed a second, independent bug in `src/lib/teams.ts`: `getNext7Dates()` computed "today" by truncating the server's wall-clock instant to UTC midnight, not the team's actual local calendar day. The real team is based in Charlotte, NC (`America/New_York`) — during the vulnerable window (~8pm–midnight Eastern, when UTC has already rolled to tomorrow but it's still today locally), the entire This Week 7-day window would silently shift forward by a full calendar day, and any `DateOverride` written just before crossing that boundary could drop out of the visible window entirely on the next page load. Fixed by anchoring `getNext7Dates()`'s "today" to `America/New_York` via `Intl.DateTimeFormat`, added as a new `TEAM_TIMEZONE` constant (previously no timezone handling existed anywhere in the codebase). This is a secondary, lower-frequency bug — real but not the one directly reproduced from the user's report; the `getWeekCell` fix above is the one that reproduces their exact symptom deterministically, with no timing/reload dependency.

The override-precedence design itself (an explicit This Week override should persist over a later Usual edit, until reset) was verified correct via a clean Playwright reproduction of the user's exact reported steps — Reset to Usual and the "no reset button" symptom did NOT reproduce in a fresh session; the real bug is the "sticky after Reset" case above, which the user's own account of repeatedly bouncing between Usual and This Week during testing (rather than a single linear pass) lines up with far better.

## History

- 2026-07-30: Investigated a bug report — user described a confusing This Week/Usual sync issue while recording an MVP tutorial video, with a "no Reset to Usual button" symptom and general "changes don't stick" confusion when repeatedly editing Usual and checking This Week. Full static analysis of `AvailabilityGrid.tsx`/`TeamGrid.tsx`/`EditDrawer.tsx`/`src/lib/teams.ts` via an Explore agent found the override-precedence merge logic internally consistent by inspection, but flagged `getNext7Dates()`'s UTC-midnight "today" computation as a real defect. Reproduced the user's reported steps live via Playwright against a fresh `demo-team` identity (Devon) on a freshly restarted dev server (killed a multi-day-stale one first, per this project's recurring history of that exact gotcha): the override-persists-over-Usual-edit behavior and the Reset button's visibility both worked correctly in a clean, linear pass — but continuing to test by editing Usual again *after* clicking Reset caught the real bug directly: This Week silently stopped reflecting further Usual edits for that cell, stuck on the value from the moment of Reset. Root-caused to `getWeekCell` in `AvailabilityGrid.tsx` unconditionally trusting a stale `weekOverrides` entry instead of re-deriving "not overridden" cells live. Fixed both this and the independently-discovered UTC-day-boundary bug in `src/lib/teams.ts` (`getNext7Dates`), adding a `TEAM_TIMEZONE` constant (`America/New_York`, matching the real team's Charlotte, NC location) and a regression test (`teams.test.ts`) pinned to the exact UTC/Eastern boundary instant, confirmed to fail against the pre-fix code and pass against the fix. `npm run lint`, `npx vitest run` (235/235), and `npm run build` all pass. Verified end-to-end via Playwright: reproduced the sticky-after-Reset bug pre-fix, confirmed it's gone post-fix (This Week correctly showed the second Usual edit), and reverted all test data on `demo-team` (Devon's Usual + This Week rows) back to the seeded all-`UNAVAILABLE` baseline via the app's own UI actions. Status set to Completed — on branch `fix/this-week-usual-resync`, ready for commit per `ai-interaction.md` workflow, pending user go-ahead.
