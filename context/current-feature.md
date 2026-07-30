<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Fix — optimistic grid edits vanish for other players after switching identity

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Live bug found mid-demo: user set their own This Week availability, saved it (cell updated correctly), then tapped "Switch" to view the app as a different player. The just-saved player's cell reverted to its pre-edit inherited value in the UI — but a full page refresh showed the edit correctly, proving the server-side save had actually succeeded. So this was a client-side display bug, not a data-loss bug.

## Notes

<!-- Context, decisions, tradeoffs -->

Root-caused via an Explore agent to `TeamGrid.tsx`: the "Switch player" button sets identity to empty (`setPlayerId("")`), which makes `TeamGrid` swap its returned tree from the grid subtree to `NamePicker` — unmounting `AvailabilityGrid` entirely. Picking a new name remounts a brand-new `AvailabilityGrid` instance. All of the optimistic-save state — `usualOverrides`, `weekOverrides` (what a This Week `PATCH .../override` writes to), and `windowOverrides` — lived in `useState` *inside* `AvailabilityGrid`, so the remount silently reset them to empty Maps. Since the grid renders every player's row from that same component (not just "your own"), whichever edit hadn't yet round-tripped through a full page reload just disappeared from view, even though it had already persisted server-side. The Maps were correctly keyed by playerId throughout (no cross-player attribution bug) — this was purely a state-lifetime problem caused by the remount.

Fix: lifted `usualOverrides`, `weekOverrides`, and `windowOverrides` (plus their setters) out of `AvailabilityGrid` into `TeamGrid`, which never unmounts across a player switch, and passed them down as props. `cellError` and `activeEdit` stayed local to `AvailabilityGrid` — losing an inline error flash or an open drawer across a switch isn't the reported bug and isn't worth the same treatment. No new infrastructure, no schema changes, no `router.refresh()` needed — this was purely about where the state lived.

## History

- 2026-07-30: User reported the bug via voice note after reproducing it live during a demo. Dispatched an Explore agent to investigate before touching any code; it isolated the exact root cause (`AvailabilityGrid` remount wiping locally-held optimistic state) with file:line citations. Implemented the state-lifting fix in `TeamGrid.tsx` and `AvailabilityGrid.tsx`. `npm run lint`, `npx vitest run` (238/238, no test changes needed — the only existing test file for this component covers pure helper functions unaffected by the change), and `npm run build` all pass. Verified live against `demo-team` via Playwright, reproducing the user's exact steps: set Amir's Monday cell to Anytime in This Week mode, saved (confirmed cell showed "Status: ANYTIME"), tapped Switch, picked Caden, confirmed — with no page reload — Amir's row still showed "Status: ANYTIME" instead of reverting to "UNAVAILABLE (inherited)". Status set to Completed — ready for commit per `ai-interaction.md` workflow.
