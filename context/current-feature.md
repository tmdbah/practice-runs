<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Clickable Google Maps links for venue addresses

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

User noticed a venue's address used to be tappable on their phone (opening Maps), then it stopped, and asked why — and asked for it to reliably work again, either as a tap-to-open-GPS link or as copyable text.

## Notes

<!-- Context, decisions, tradeoffs -->

Investigated before writing any code: confirmed via `git log -p` on `src/app/venues/page.tsx` that this app has never rendered an address as an `<a>` link — no commit ever added one. What the user saw was Safari's own automatic address detection ("Data Detectors"), a browser-only heuristic that turns plain text resembling a full address (street + city + state + zip) into a tappable Maps link — not app behavior, not present on Chrome/Android, and not controlled by any code or meta tag here (confirmed no `format-detection` meta anywhere in the codebase). It "went away" simply because that heuristic is fragile, not because anything broke.

Confirmed with the user (via `AskUserQuestion`) that the fix should apply everywhere a venue address renders, not just `/venues`: also the venue address shown on session cards (`SessionSummary.tsx`'s `SessionHeader`, e.g. "Open Gym · Charlotte, NC"), since that's arguably more useful — it's where people decide whether to head to a specific game/practice.

Added a small reusable `AddressLink` component (`src/components/AddressLink.tsx`) rather than duplicating the anchor/URL logic at both call sites. It links to Google's documented Maps "search" URL format (`google.com/maps/search/?api=1&query=<address>`), which deep-links into the Google Maps app on mobile if installed or opens Google Maps in-browser otherwise — works identically on iOS and Android, unlike Safari's native detector. Opens in a new tab (`target="_blank" rel="noopener noreferrer"`); the address text itself stays fully selectable/copyable, covering the user's "or they can copy and paste it" fallback too. No `'use client'` needed — it's a plain anchor, renders fine from a Server Component.

This touches `src/app/venues/page.tsx` directly, so per this project's Claude Code plan-mode rule (`src/app/` requires `/plan` before modifying), the change was planned and approved before implementation.

Noted but explicitly out of scope tonight: while verifying, found that the session-propose form's "Min players" field shows a default value of "10" in the UI but the session actually saves with `minPlayers: null` — pre-existing, unrelated to this change (confirmed by checking the saved row directly). Worth a look in a future session.

## History

- 2026-08-01: User asked why a venue address used to open Google Maps when tapped and no longer does. Investigated via `git log -p` on the venues page before touching anything, confirmed this was never app-built functionality but Safari's own fragile address auto-detection. Asked the user via `AskUserQuestion` whether the fix should also cover session cards (not just `/venues`) — confirmed yes. Entered plan mode (required for the `src/app/venues/page.tsx` change), wrote and got approval on the plan, then implemented: new `AddressLink` component, wired into `src/app/venues/page.tsx` and `src/components/SessionSummary.tsx`. `npm run lint`, `npx vitest run` (238/238), and `npm run build` all pass. Verified live against `demo-team` via Playwright: confirmed the correct `href`/`target`/`rel` on both venue-list addresses, then proposed a real session and confirmed the same link renders on the session card. Cleaned up the test session afterward. Status set to Completed — ready for commit per `ai-interaction.md` workflow.
