<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Mobile time-input layout + missing Edit/Delete on open multi-slot options

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Three small bugs reported by the user from real mobile use, ahead of releasing the MVP to the team:

1. **From/To time inputs overlap/cut off on mobile.** In the availability edit drawer (and the session propose/edit form), the From and To time inputs sat side by side in equal-width flex columns. On a phone, iOS Safari's native inline time-picker popover — sized for two scroll wheels — doesn't shrink to fit a half-width column, so it visually overlapped and cut off the adjacent field.
2. **24-hour clock on mobile — open design question, not a bug.** The user's phone displays time in 24-hour format; they asked whether to force a 12-hour AM/PM display instead. Investigated but **not implemented** — see Notes.
3. **No Edit/Delete on an individual candidate slot while a multi-slot group is still open** (before anyone locks one in). A proposer who mis-typed a time, or wants to change their mind about one option, had no way to fix or remove it short of waiting for someone to lock in a winner — at which point Edit/Delete only appear on the confirmed/cancelled result, too late to matter.

## Notes

<!-- Context, decisions, tradeoffs -->

**Fix 1 (From/To layout):** changed the wrapping `flex gap-*` row to `flex flex-col sm:flex-row gap-*` in three places — `EditDrawer.tsx`'s Specific-hours fields, and both From/To rows in `SessionsView.tsx` (the main propose/edit form, and the per-slot fields inside "add another time option"). Stacks vertically on phones (full width per field, no squeeze), reverts to side-by-side at the `sm:` breakpoint (640px+) where there's room.

**Fix 2 (24-hour clock) — deliberately not implemented.** `<input type="time">`'s 12h/24h display is controlled entirely by the browser/OS locale, not by app code — confirmed the user's phone shows 24-hour time in its own status bar (visible in their screenshot), meaning this is their device's system-wide "24-Hour Time" setting being correctly respected by Safari, not a per-app bug. Most US phones default to 12-hour and would already show AM/PM with zero code changes. Forcing a consistent 12-hour display regardless of device setting would require replacing the native `<input type="time">` with a fully custom time-picker component — real scope (new component, new interaction/testing surface) that arguably makes the UX *worse* for anyone whose device is already set to 24-hour, since it overrides a preference they set deliberately. Left as-is pending the user's explicit decision.

**Fix 3 (Edit/Delete on open slots):** confirmed via investigation that the existing single-session `startEdit`/`handleDelete` plumbing (`SessionsView.tsx`) and their backend routes (`PATCH`/`DELETE .../sessions/[sessionId]`) were already safe to reuse unmodified on a slot that's part of a still-open `groupId` group — the edit `PATCH` only ever writes six specific fields and never touches `groupId`, and `DELETE` is a plain scoped `prisma.session.delete` with cascade cleanup of that slot's own `Rsvp`/`SlotVote` rows only, never reaching sibling slots. So this was a pure UI wiring gap, zero backend changes needed. Added proposer-only Edit/Delete buttons (Delete via the same inline confirm-swap UX used everywhere else in this app, no modal) to each slot inside `SlotGroupCard.tsx`, threaded through from `SessionsSection.tsx`'s already-existing `startEdit`/`handleDelete`/`deletingId`/`confirmDeleteId`/`setConfirmDeleteId` props (previously only passed to the ungrouped per-session branch). No Cancel button was added at the slot level — Cancel's existing meaning ("this was real, then fell through") doesn't apply to a still-undecided candidate slot; Delete ("this was a mistake, remove it") is the correct action, matching the project's own established Cancel-vs-Delete distinction. Verified that deleting a slot down to exactly one remaining sibling correctly and automatically falls through to a normal solo-session card (via `SessionsSection`'s existing `isOpenGroup = length > 1` check) with zero special-casing required.

## History

- 2026-07-30: Investigated three bugs from real mobile testing (via three phone screenshots), one bug-report voice note. Bug 1 root-caused to iOS Safari's native time-picker popover overlapping a squeezed half-width flex column; fixed with a responsive stack-on-mobile layout in `EditDrawer.tsx` and both time-input rows in `SessionsView.tsx`. Bug 2 investigated and found to be the user's own phone's system 24-hour-time setting, not app behavior — explained to the user rather than silently building a custom time-picker component, since that's real scope requiring their explicit go-ahead. Bug 3 (no Edit/Delete on an open multi-slot group's individual candidate slots) confirmed as a real, user-impacting gap via an Explore-agent-assisted safety check of the existing edit/delete plumbing, then fixed by wiring the already-existing single-session Edit/Delete handlers into `SlotGroupCard.tsx` with zero backend changes. `npm run lint`, `npx vitest run` (235/235, no test changes needed for these three files — none have dedicated unit test files; verified via Playwright per this project's convention), and `npm run build` all pass. Verified end-to-end via Playwright against `demo-team`: confirmed the From/To fields stack full-width at a 390px viewport; confirmed Edit on an open slot opens pre-filled with that exact slot's own data (not the sibling's) and cancels cleanly without saving; confirmed Delete's confirm-swap UX and that deleting one of two open slots correctly leaves the remaining slot rendering as a normal solo session card with full Edit/Confirm/Cancel/Delete. Used this pass to also clean up a pre-existing stale two-slot test group on `demo-team` (deleted both slots via the newly-fixed UI), leaving the demo team's Sessions list empty as intended. Status set to Completed — ready for commit per `ai-interaction.md` workflow.
