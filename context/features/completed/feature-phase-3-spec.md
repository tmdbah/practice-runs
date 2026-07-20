# Feature Phase 3 Spec

## Overview

Phase 3 per `practiceRuns-ProjectOverview.md` → Build Phases: **"Sessions & venues (partially unblocked)."** Propose a one-off session at a rented gym, open gym, or park; RSVP against it; for rented-gym sessions, show a live cost split and a minimum-headcount check before it's worth booking.

This is a genuinely separate data model from the recurring availability grid (Usual Schedule / This Week) — it does not share state with Phases 1–2, by design (see Gap Analysis in the Overview doc).

**Prerequisite:** `feature-phase-2-spec.md` fully merged.

**Phase 3 is done when:** a player can propose a session at a venue (INSZN is the seeded first entry), other players can RSVP, and everyone sees the live cost-per-person and whether the minimum headcount has been hit.

Work the items below in order — each depends on the ones before it. Load one into `context/current-feature.md` at a time.

**Hard boundary — do not build in Phase 3:**
- Open venue submission by non-admins (Decisions Log → Venues: admin-added only)
- A hardcoded `minPlayers` default — it stays an editable per-session field (Decisions Log → Min players)
- Distance-from-player / Maps API filtering (Future/Deferred — explicitly not scoped)
- Auth, demo team, jersey numbers, notes (Phase 4/5)

---

## Requirements for phase 3

### 1. Prisma schema — `Venue`, `Session`, `Rsvp`

**Goal:** Add the three new models and migrate. Reuses the existing `Status` enum for RSVP state (`ANYTIME` = "in", `UNAVAILABLE` = "out").

```ts
enum VenueType {
  RENTED_GYM  // booked and paid for, exclusive access, worth it only above minPlayers
  OPEN_GYM    // public gym time, no booking, "got next"
  PARK        // free, no booking, open anytime
}

model Venue {
  id             String      @id @default(cuid())
  name           String
  type           VenueType
  address        String?
  bookingUrl     String?
  costPerSession Int?        // cents — typical/last-used cost, RENTED_GYM only
  sessions       Session[]
}

model Session {
  id         String   @id @default(cuid())
  teamId     String
  team       Team     @relation(fields: [teamId], references: [id])
  venueId    String?
  venue      Venue?   @relation(fields: [venueId], references: [id])
  date       DateTime
  fromTime   String
  toTime     String
  costTotal  Int?     // cents — RENTED_GYM only, null for OPEN_GYM / PARK
  minPlayers Int?     // RENTED_GYM only — worth booking only above this count; editable, never a hardcoded default
  rsvps      Rsvp[]
}

model Rsvp {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id])
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  status    Status
  @@unique([sessionId, playerId])
}
```

**Acceptance criteria:**
- `prisma migrate dev` runs clean; `prisma migrate status` in sync
- Seed one real `Venue`: INSZN, `RENTED_GYM`, ~$100/2hr (`costPerSession` in cents), per the Plan doc's mockup
- No Phase 1/2 tables or endpoints are touched by this migration

---

### 2. Admin venue form

**Goal:** A simple, admin-only form to add a venue (name, type, address, cost, booking URL).

**Acceptance criteria:**
- Not gated by real auth (none exists yet) — a simple convention is fine (e.g. a route only the admin is told about), since open submission is explicitly out of scope, not "needs to be secured"
- Creates a `Venue` row via a POST endpoint or Server Action
- No approval/moderation workflow — admin input is trusted directly, per Decisions Log → Venues

---

### 3. Session proposal

**Goal:** A player can propose a session: pick a venue, date, and time slot(s).

**Acceptance criteria:**
- Form matches the Plan doc's mockup §4 shape: venue, date, available time slot(s)
- For `RENTED_GYM` venues, the proposer sets `costTotal` and `minPlayers` explicitly — neither is defaulted or hardcoded
- For `OPEN_GYM` / `PARK` venues, `costTotal` and `minPlayers` stay null — no cost/headcount UI shown for these types

---

### 4. RSVP

**Goal:** Any player can RSVP "in" or "out" on a proposed session.

**Acceptance criteria:**
- One `Rsvp` row per player per session (upsert on repeat taps, not duplicate rows)
- RSVP list / count updates immediately on tap (optimistic, consistent with Phases 1–2's save pattern)

---

### 5. Live cost split + minimum-headcount display

**Goal:** For `RENTED_GYM` sessions, show both the current cost-per-person and the projected cost if the session hits `minPlayers`.

**Display (per the Plan doc's mockup §4):**
- `RSVP'd: X / minPlayers`
- `Cost / person now = costTotal / current "in" count`
- `Cost if minPlayers join = costTotal / minPlayers`

**Acceptance criteria:**
- "Cost / person now" divides by current confirmed RSVP count, not by roster size
- Guard divide-by-zero (0 confirmed RSVPs) — show a sensible placeholder, not `Infinity` or a crash
- Nothing here decides whether the session is auto-booked — this is informational only; booking itself is a manual, off-app action for now

---

### 6. Phase 3 exit check

- [ ] `npm run build` and `npm run lint` pass clean
- [ ] A full loop works: admin adds a venue → a player proposes a session there → other players RSVP → cost split and headcount update live
- [ ] `RENTED_GYM` vs `OPEN_GYM`/`PARK` sessions render correctly different (cost/headcount UI only on the former)
- [ ] No changes leaked into Phase 1/2's `DayDefault`/`DateOverride` code paths
- [ ] `context/current-feature.md` history reflects each feature above as completed

---

## References

- [practiceRuns-ProjectOverview.md](../practiceRuns-ProjectOverview.md) — Gap Analysis, Data → Models, Decisions Log → Venues / Min players
- [practiceRuns-ProjectPlan.html](../practiceRuns-ProjectPlan.html) — Mockups §4 (session proposal), Gap analysis table
- [feature-phase-2-spec.md](feature-phase-2-spec.md) — prerequisite scope
- [ai-interaction.md](../ai-interaction.md) — per-feature branch/test/commit/merge workflow
