# Feature Phase 2 Spec

## Overview

Phase 2 per `practiceRuns-ProjectOverview.md` → Build Phases: **"This Week overrides + team window."** Adds the This Week / Usual toggle, `DateOverride` writes, inherited-vs-overridden cell styling, and the live per-day overlap calculation (available count + team window).

**Prerequisite:** `feature-phase-1-spec.md` fully merged — the Usual Schedule grid, identity, and tap-to-edit already work end to end.

**Phase 2 is done when:** the grid has a This Week/Usual toggle; toggling to This Week shows inherited cells faded and overridden cells with a dot marker; and each day shows a live available-player count and team window (or "No common time").

Work the items below in order — each depends on the ones before it. Load one into `context/current-feature.md` at a time.

**Hard boundary — do not build in Phase 2:**
- `Venue`, `Session`, `Rsvp` models or any session/RSVP UI (Phase 3)
- Auth, demo team (Phase 4/5)

---

## Requirements for phase 2

### 1. Prisma schema — add `DateOverride`

**Goal:** Add the `DateOverride` model and migrate.

```ts
model DateOverride {
  id       String   @id @default(cuid())
  playerId String
  player   Player   @relation(fields: [playerId], references: [id])
  date     DateTime // specific calendar date, not a day-of-week
  status   Status
  fromTime String?
  toTime   String?
  note     String?  // e.g. "church," "work until 4:30"
  @@unique([playerId, date])
}
```

**Acceptance criteria:**
- `prisma migrate dev` runs clean; `prisma migrate status` in sync
- No existing Phase 1 data or endpoints break

---

### 2. Read API — Effective view + team window

**Goal:** Extend `GET /api/teams/[slug]` to return, per player per day, the "Effective" status (override if one exists for that date, else the `DayDefault`), plus a per-day team window.

**Effective resolution rule:** a missing `DateOverride` row for a given player+date means "use `DayDefault`" — compute this fallback on read, never backfill/store it.

**Team window calculation:** for each of the next 7 calendar dates, take every player whose Effective status is not `UNAVAILABLE`; treat `ANYTIME` as `00:00–23:59`; `teamWindow = [MAX(all fromTimes), MIN(all toTimes)]`. If the window is invalid (max ≥ min), return a "no common time" indicator rather than a broken range.

**Response shape (extends Phase 1's):**
```ts
interface DayCell {
  date: string;           // ISO date for this occurrence of the day
  dayOfWeek: number;
  effectiveStatus: Status; // resolved: override ?? default
  fromTime: string | null;
  toTime: string | null;
  note: string | null;    // resolved: override's note ?? default's note
  isOverridden: boolean;  // true only if a real DateOverride row exists for this date
}

interface TeamWindow {
  date: string;
  availableCount: number;
  window: { from: string; to: string } | null; // null = "No common time"
}
```

**Acceptance criteria:**
- `isOverridden` is `true` only when an actual `DateOverride` row exists — never inferred
- Team window math matches the spreadsheet-proven logic exactly (see Lessons from the spreadsheet prototype in the Plan doc — don't let blank/zero values corrupt MAX/MIN)

---

### 3. This Week / Usual toggle + grid styling

**Goal:** Add a toggle to the home grid. It does not change which endpoint is called or add a second view — it changes what a tap writes to (Usual → `DayDefault`, This Week → `DateOverride`) and how cells render.

**Cell states to add (on top of Phase 1's Anytime/Unavailable fills):**
| State | Appearance | Meaning |
|---|---|---|
| Inherited | Faded, no marker | This Week view, no override set — showing Usual's value |
| Overridden | Full opacity + dot marker | This Week view, explicitly changed for this week |

**Acceptance criteria:**
- Usual view behaves exactly as it did at the end of Phase 1 — unchanged
- This Week view renders `effectiveStatus` for each cell, faded when `isOverridden` is false, full-opacity + dot when true
- Toggle state does not persist across reloads unless trivial to add — not a requirement

---

### 4. Write API — `DateOverride` PATCH

**Goal:** `PATCH /api/teams/[slug]/players/[playerId]/override` writes a `DateOverride` for a specific date, following the same optimistic-save pattern as Phase 1's `default` endpoint.

```
Body: { date: string; status: Status; fromTime?: string; toTime?: string; note?: string }
```

**Acceptance criteria:**
- Tapping a cell in This Week mode opens the same edit drawer from Phase 1 (including the note input); Save writes to this endpoint instead of the `default` one
- Optimistic update + revert-on-failure behavior matches Phase 1's — no new confirmation UI
- Writing an override does not modify the player's `DayDefault` row
- `note` on the override persists independently of the default's note — editing This Week's note does not change the Usual Schedule's note

---

### 5. Team window UI

> **Superseded:** the table-row layout built here was replaced by a swipeable single-card carousel — see [feature-team-window-carousel-spec.md](feature-team-window-carousel-spec.md). The calculation this section describes (`computeWindowForDate`, available count, "No common time") is unchanged; only the display below is historical.

**Goal:** Surface the per-day available count and team window on the grid (e.g. "Fri window: 7–9pm (3 free)" per the Plan doc's mockup).

**Acceptance criteria:**
- Shown per day, above or below that day's column
- Displays "No common time" (not a broken/negative range) when the window is invalid
- Recalculates after any optimistic edit, without waiting for a full page refetch

---

### 6. Phase 2 exit check

- [ ] `npm run build` and `npm run lint` pass clean
- [ ] Toggling Usual/This Week and editing both write to the correct table, verified by inspecting the DB
- [ ] Team window numbers match hand-calculated expectations for at least one test day with mixed availability
- [ ] No `Venue`, `Session`, or `Rsvp` code exists anywhere in the codebase yet
- [ ] `context/current-feature.md` history reflects each feature above as completed

---

## References

- [practiceRuns-ProjectOverview.md](../practiceRuns-ProjectOverview.md) — Data → Models, Team Window Calculation, Decisions Log → Editing target
- [practiceRuns-ProjectPlan.html](../practiceRuns-ProjectPlan.html) — Mockups §2 (home grid), Grid cell states, "Lessons from the sheet"
- [feature-phase-1-spec.md](feature-phase-1-spec.md) — prerequisite scope
- [ai-interaction.md](../ai-interaction.md) — per-feature branch/test/commit/merge workflow
