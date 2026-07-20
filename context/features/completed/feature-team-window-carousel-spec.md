# Feature: Team Window Carousel

## Overview

Replaces the This Week grid's "Window" table row (a row of tiny per-day boxes) with a standalone, swipeable Team Window card — closer to the original mockup's single separate box (`practiceRuns-ProjectPlan.html` Mockups §2: "Fri window: 7–9pm (3 free)"), while still surfacing all 7 days instead of only one.

**Why this exists:** the table-row version (built in Phase 2) is hard to read at mobile widths — text wraps into 7px font, and it isn't tappable/interactive. Since most usage is mobile-first per the project's design direction, a single focused card that pages through days (arrows + swipe + dot indicators) trades "see all 7 at a glance" for "read one day clearly," while a jump-to-day control keeps the rest reachable in one tap.

**Prerequisite:** Phase 2 (`feature-phase-2-spec.md`) merged — `teamWindows[]` per-day data and the optimistic `computeWindowForDate` recalculation already work.

**Done when:** the This Week grid shows one Team Window card (not a table row) that defaults to the best-availability day, pages through all 7 days via always-visible arrow buttons, native touch swipe, and tappable dot indicators, and stays live after any optimistic edit exactly as the table row did.

**Hard boundary — do not build in this feature:**
- No changes to the team window *calculation* (`computeWindowForDate` / `src/lib/teams.ts`) — this is a presentation-layer change only
- No changes to Usual mode (no window UI there, unchanged)
- No Session/Venue/RSVP work (Phase 3)

---

## Requirements

### 1. `TeamWindowCard` component

**Goal:** A new component rendering one day's team window as a standalone card (day label, date, time range or "No common time", available count), replacing `TeamWindowRow`'s per-cell rendering.

**Card content (per mockup wording):**
- Day name (e.g. "Friday") + short date
- `"{availableCount} free"` (e.g. "3 free")
- Time range formatted like the existing `fmt()` helper (e.g. "7:00pm – 9:00pm"), or "No common time" when `window` is `null`
- `0` available renders a clear empty state (e.g. "Nobody's free yet"), not a bare "0"

**Acceptance criteria:**
- Only rendered when `mode === "this-week"` — Usual mode is unchanged (no window card)
- Card re-renders live after any optimistic edit (Usual or This Week) — reuses the existing `getTeamWindow(dayOfWeek)` / `windowOverrides` data flow unchanged

---

### 2. Day navigation — default, arrows, swipe, dots

**Goal:** Let the user page through all 7 days from one card.

**Default day on mount / on switching into This Week mode:** the day with the highest `availableCount`. Tie-break: earliest date among the tied days. If every day has `availableCount === 0`, default to the first day (today).

**Navigation controls (all three, not either/or):**
- Left/right chevron arrow buttons, **always visible** on both mobile and desktop (not hover-only — hover doesn't exist on touch). Disabled/dimmed at the first and last day — no wraparound.
- Native touch swipe via CSS scroll-snap (`overflow-x-auto`, `scroll-snap-type: x mandatory`, each card `scroll-snap-align: center`) — no custom touch-event handling.
- A row of 7 small dots below the card, one per day, each independently tappable to jump straight to that day. Reflects the current position regardless of whether it was reached by arrow, dot, or swipe.

**Acceptance criteria:**
- Arrow clicks and dot taps scroll the card container programmatically (`scrollTo`/`scrollIntoView`, smooth)
- Swiping the card updates the active dot and arrow disabled-state (listen for scroll settling, not every scroll event)
- Keyboard/mouse-only users (no touch) can reach every day via the arrow buttons alone

---

### 3. Cleanup

**Goal:** Remove the now-unused table-row rendering.

**Acceptance criteria:**
- `TeamWindowRow.tsx` deleted (approved — no longer referenced anywhere)
- The `<tr>`/`<td>` "Window" row block removed from `AvailabilityGrid.tsx`'s table
- `npm run lint` reports no unused imports

---

### 4. Exit check

- [ ] `npm run build` and `npm run lint` pass clean
- [ ] `npm test` passes (existing 45 tests + any new ones for default-day tie-break logic)
- [ ] Manually verified (or explicitly flagged as unverified, if no browser tool available) at a mobile viewport width that the card is readable and all three navigation methods work
- [ ] `context/current-feature.md` history reflects this feature as completed

---

## References

- [practiceRuns-ProjectOverview.md](../practiceRuns-ProjectOverview.md) — UI/UX → Key Screens, Decisions Log → Team Window display
- [practiceRuns-ProjectPlan.html](../practiceRuns-ProjectPlan.html) — Mockups §2 (home grid, "Fri window: 7–9pm (3 free)" box)
- [feature-phase-2-spec.md](feature-phase-2-spec.md) §5 — original Team Window UI requirement, now superseded by this spec
- [ai-interaction.md](../ai-interaction.md) — per-feature branch/test/commit/merge workflow
