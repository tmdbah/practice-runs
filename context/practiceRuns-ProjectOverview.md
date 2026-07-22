# Practice Runs — Project Overview

> **Tagline:** See at a glance which day the crew has the most overlap — and lock in a run in a couple of taps.
> **Status:** Phases 1–3 (core availability grid, This Week overrides/team window, Sessions & venues) shipped. Phase 4 (polish) underway — the first-visit onboarding tour has shipped.
> **Version:** V1 — MVP (recurring availability grid) + Sessions & Venues

This is the enriched source of truth for **Practice Runs**, superseding `practiceRuns-ProjectSpec.md` (discarded). Keep this file and [`practiceRuns-ProjectPlan.html`](practiceRuns-ProjectPlan.html) in lockstep as phases complete or decisions change.

---

## Problem

**The problem:** The "Uncrowned Kings" pickup crew coordinates weekly availability and one-off sessions by hand in a group chat and a shared Google Sheet. The sheet proved the underlying data model (who's free, when) at zero build cost, but broke down once granularity increased — per-day time ranges, per-player notes, overrides. Sheets, especially on mobile, can't present that cleanly.

**Why existing solutions fall short:** A generic spreadsheet has no concept of "today's effective schedule = usual, unless overridden," no tap-to-edit-in-place interaction, and no way to model a one-off session (venue, cost, headcount threshold) without more copy-pasted lists in chat.

---

## Users

- **Any crew member (mobile-first):** wants to see, at a glance, which day has the most players free and what hours actually overlap, and to update their own (or someone else's) availability in a couple of taps — no account.
- **Any crew member:** can add, edit, or delete a venue (name, address, cost, hours) via a simple form — no longer admin-only, since a bottleneck routing every venue suggestion through one person wasn't worth it for a trust-based group of this size.

**Scope note:** Personal tool for one real-world team (~15 people) plus a seeded public demo team (`/team/demo`) for portfolio use. Not a public SaaS in V1 — see Future vision.

---

## Features

### V1 — Ship It (Phases 1–2)

| Feature | Description | Priority |
|---|---|---|
| Usual Schedule grid | Tap-to-edit weekly grid, per-player, per-day: Anytime / Specific hours / Unavailable | Must Have |
| This Week overrides | Same grid, toggle switches write target to a date-specific override; inherited cells render faded, overridden cells get a dot marker | Must Have |
| Team window calculation | Server-side overlap: `[MAX(all fromTimes), MIN(all toTimes)]` across non-unavailable players, per day | Must Have |
| Name-based identity | First visit: pick name from roster, stored in `localStorage`, no password | Must Have |

**MVP success criteria:** The grid alone beats the spreadsheet on friction for real weekly use.

### V2 — already folded into Phase 2 build

- This Week / Usual toggle, `DateOverride` writes, inherited-vs-overridden styling, live per-day available count + team window.

### V3 — Sessions & Venues (Phase 3, shipped)

- Propose a one-off session at a rented gym, open gym, or park — venue, date, and time range, embedded directly on the `/team/[slug]` grid page (no separate route)
- Edit an existing session in place (proposer-only in the UI; not server-enforced) and delete it (with an inline confirm step), without disturbing existing RSVPs
- RSVP in/out against a session, optimistic with revert-on-failure — one row per player per session (upsert)
- Live cost-per-person split and minimum-headcount check for `RENTED_GYM` sessions: RSVP'd count vs. `minPlayers`, cost/person now, and projected cost once `minPlayers` join
- Venues open to any player via `/venues` (list) + `/venues/new` (create) + `/venues/[venueId]/edit` + `/venues/[venueId]/delete` (`createVenue`/`updateVenue`/`deleteVenue` Server Actions) — no login wall, no ownership check, same trust model as every other write in the app. Optional hours-of-operation (`openTime`/`closeTime`) shown alongside address/cost. INSZN is seeded as the first entry (~$100/2hr, `RENTED_GYM`, 6am–9pm)
- **Game Day** (shipped ahead of Phase 4) — a `Session.kind` (`PRACTICE` | `GAME`) discriminator adds league-game coordination without a parallel data model. Surfaced as its own "Game Day" section above "Sessions" on `/team/[slug]`, with its own "+ Propose Game" button sharing the existing propose/edit form. Games are never rentals — cost UI (cost/person, cost-if-N-join) is hidden regardless of the venue picked — but `minPlayers` still applies, meaning "minimum to avoid forfeiting" rather than "worth booking," with distinct urgent red styling/copy ("Need N more to avoid forfeit") when short, vs. the neutral amber wording practice sessions keep. Defaults `minPlayers` to `5` (the real forfeit threshold) on a new Game proposal, still editable. "Mark as Booked" is hidden for games (nothing is booked); Cancel/Delete/RSVP reuse the existing `SessionStatus`/`Rsvp` machinery unchanged. Manual propose-one-at-a-time only — no bulk/season-schedule import (see Decisions log)

### V4 — Polish (Phase 4)

- **First-visit onboarding tour (shipped)** — a scripted, guide-to-tap tour (not a coach-marks library) that walks a brand-new player through the core loop, in causal order, by having them actually do it: spotlight their own Monday cell (grid forced into Usual mode) → they tap it, the real edit drawer opens, they save → spotlight the This Week toggle → they tap it → spotlight the *same* Monday cell, now shown faded/inherited, explaining the inherited-vs-overridden visual language and "Reset to Usual" → spotlight the Team Window card (copy references the actual gold-highlight/swipe UI) → spotlight the Game Day + Sessions section, explaining one-off practices/games and RSVP. A "Step X of 5" indicator and "Skip tour" appear at every step. Persisted via a `hasSeenTour` flag in `localStorage`, same mechanism as identity — no DB table, no accounts. Dismissed once (skip or the final "Got it"), never shown again on that device. See Decisions log.
- First-visit identity persistence, add-player flow, empty/error states, pull-to-refresh interaction
- Demo team + daily reset job + demo banner (portfolio safety, see Decisions log)

### Future / Deferred

- Auth (NextAuth v5) + per-team permissions — gated on a real trigger, see Decisions log
- Multi-tenant "teams register their own account" — someday, not committed
- Distance-from-player / Maps API venue filtering
- Stat sheet consolidation (a separate spreadsheet a player maintains)

---

## Data

### Storage Strategy

| Phase | Storage | Trigger to Upgrade |
|---|---|---|
| V1 (Phase 1) | Neon Postgres + Prisma from day one for grid data; player identity in `localStorage` | N/A — DB is used from the start since the sheet already proved multi-user, structured data is required |
| Phase 3 — done | Same DB, new tables (`Venue`, `Session`, `Rsvp`) | Sessions feature build |
| Phase 5 | Add NextAuth v5 + per-team permission logic | Opening the app to people outside TJ's direct trust circle |

### Models

```ts
// schema.prisma

model Team {
  id       String    @id @default(cuid())
  slug     String    @unique   // shareable URL, e.g. "uncrowned-kings"
  name     String
  players  Player[]
  sessions Session[]        // live from Phase 3
}

model Player {
  id        String         @id @default(cuid())
  teamId    String
  team      Team           @relation(fields: [teamId], references: [id])
  name      String
  number    Int?           // jersey number, nullable — 0 is a valid value — live from Phase 1
  defaults  DayDefault[]
  overrides DateOverride[]
  rsvps     Rsvp[]         // live from Phase 3
}

enum Status {
  ANYTIME
  SPECIFIC
  UNAVAILABLE
}

model DayDefault {
  id        String   @id @default(cuid())
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  dayOfWeek Int      // 0=Sun ... 6=Sat
  status    Status   @default(UNAVAILABLE)
  fromTime  String?  // "18:00", only set when status = SPECIFIC
  toTime    String?
  note      String?  // e.g. "church," "work until 4:30" — live from Phase 1
  @@unique([playerId, dayOfWeek])
}

model DateOverride {
  id       String   @id @default(cuid())
  playerId String
  player   Player   @relation(fields: [playerId], references: [id])
  date     DateTime // specific calendar date, not a day-of-week
  status   Status
  fromTime String?
  toTime   String?
  note     String?  // e.g. "church," "work until 4:30" — live from Phase 2
  @@unique([playerId, date])
}

// --- Phase 3, shipped. ---

enum VenueType {
  RENTED_GYM  // booked and paid for, exclusive access, worth it only above minPlayers
  OPEN_GYM    // public gym time, no booking, "got next"
  PARK        // free, no booking, open anytime
}

enum SessionStatus {
  PROPOSED   // default — still gathering RSVPs, nothing booked yet
  CONFIRMED  // proposer marked it booked for sure
  CANCELLED  // slot fell through (e.g. venue booked by someone else) — kept as a historical record, not deleted
}

enum SessionKind {
  PRACTICE   // default — a proposed practice session, optionally a paid rental
  GAME       // a league game — never a rental; minPlayers means "avoid forfeit," not "worth booking"
}

model Venue {
  id             String      @id @default(cuid())
  name           String
  type           VenueType
  address        String?
  bookingUrl     String?
  costPerHour    Int?        // cents — hourly rate, RENTED_GYM only
  openTime       String?     // "HH:MM" — informational hours-of-operation, not validated against Session times
  closeTime      String?     // "HH:MM"
  sessions       Session[]
}

model Session {
  id           String   @id @default(cuid())
  teamId       String
  team         Team     @relation(fields: [teamId], references: [id])
  venueId      String?
  venue        Venue?   @relation(fields: [venueId], references: [id])
  proposedById String?  // playerId of the proposer; null for legacy rows — gates the Edit/Delete buttons client-side only
  kind         SessionKind @default(PRACTICE)
  date         DateTime
  fromTime     String
  toTime       String
  costTotal    Int?     // cents — RENTED_GYM only, never set for GAME kind
  minPlayers   Int?     // "worth booking" threshold for RENTED_GYM practice sessions, "avoid forfeit" threshold for GAME kind
  status       SessionStatus @default(PROPOSED)
  rsvps        Rsvp[]
}

model Rsvp {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id])
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  status    Status   // reuse ANYTIME as "in", UNAVAILABLE as "out"
  @@unique([sessionId, playerId])
}
```

**Invariants:**
- Every day defaults to `UNAVAILABLE` — nobody is assumed free until they say so (carried over directly from the spreadsheet fix).
- A missing `DateOverride` row means "use the `DayDefault`" — the Effective view computes this fallback on read, not stored.
- Blank cells in the old spreadsheet evaluated to numeric `0`, breaking overlap MAX/MIN math and colliding with a valid `0` jersey number — worth remembering if any server logic ever imports/exports sheet-shaped data.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js (App Router, latest stable) | |
| Language | TypeScript — always | |
| Styling | Tailwind CSS v4 | Uncrowned Kings palette (teal, red, gold/amber, black) carried through from the brainstorm doc's theme |
| Database | Neon Postgres + Prisma | Used from Phase 1 — the spreadsheet already proved structured, multi-user data is required |
| Auth | None in V1 / NextAuth v5 deferred | No concrete trigger yet (see Decisions log) |
| Hosting | Vercel | |
| Client state | `localStorage` (identity) + local React state (optimistic cell edits, reconciled after PATCH) | |

**Key decisions & tradeoffs:**

- **Client-stored identity over accounts:** trust-based editing (same as the sheet) removes all auth/account build cost for a ~15-person group that doesn't need it yet.
- **Optimistic UI over confirmation flows:** the updated cell is the confirmation — no toast/modal — because save failures are rare and reversible.
- **Manual pull-to-refresh over real-time sync:** websockets/polling are unjustified complexity at this scale; revisit only if staleness becomes a real complaint.
- **Sessions as a separate model, not a Phase 1 feature:** validated the core tap-to-edit interaction on real usage first, then layered Sessions on top without reworking the grid (shipped in Phase 3).

---

## Monetization

**Model:** Personal tool — no monetization. If the concept proves out with real use, an "opens up as a small multi-tenant tool" future is possible but explicitly uncommitted (see Future vision).

---

## UI/UX

### Design Direction

- **Vibe:** Dark, clean, purpose-built — not a spreadsheet.
- **Theme:** Dark-navy background with amber and teal accents (matches Uncrowned Kings' logo palette: teal, red, gold/amber, black).
- **Layout:** Mobile-first single-column grid; bottom sheet for editing.
- **Typography feel:** Technical/dense enough for a data grid, but friendly — mono for data-ish labels, sans for body.

### Key Screens / Flows

| Screen | Purpose |
|---|---|
| First visit — name picker | Pick your name from the roster once; remembered on this device |
| Onboarding tour (Phase 4, shipped) | Scripted, guide-to-tap tour shown once, right after a brand-new player's first name pick, five steps in causal order: Usual Schedule (spotlight + real tap/save on their own Monday cell) → This Week toggle (real tap) → inherited-vs-overridden explanation (same Monday cell, now faded) → Team Window card → Games & practices (Game Day + Sessions). "Step X of 5" + "Skip tour" at every step. Dismiss = `hasSeenTour` in `localStorage`, never shown again on that device |
| Home — grid view | This Week / Usual toggle, 7-day grid, tap a cell to edit, live Team Window carousel card (defaults to best-availability day; arrows + swipe + dot indicators page through the rest) |
| Edit drawer (bottom sheet) | Anytime / Specific hours / Unavailable, optional time range + note, Save. This Week mode only, and only when the cell is already overridden: a "Reset to Usual" button clears the `DateOverride` and reverts the day to inheriting `DayDefault` |
| Sessions list (Phase 3, shipped) | Renders below the grid on the same `/team/[slug]` page — no separate route. "+ Propose" opens an inline form (venue select, date, from/to time, and for `RENTED_GYM` venues, total cost + min players). Each session card shows In/Out RSVP buttons, the RSVP'd list, and for `RENTED_GYM` sessions the live cost-split + headcount block. The proposer sees additional Edit (reopens the same form pre-filled) and Delete (inline "Delete this session?" confirm, no modal) actions |

### Grid Cell States

| State | Appearance | Meaning |
|---|---|---|
| Anytime / Specific | Solid teal fill | Player is available (full day or a time range) |
| Unavailable | Neutral/empty fill | Player is out that day |
| Inherited | Faded, no marker | This Week view, no override set — showing Usual's value |
| Overridden | Full opacity + dot marker | This Week view, explicitly changed for this week |

### Mobile / Responsive

Mobile-first. Test against iPhone SE (375×667), iPhone 14 Pro Max, Samsung Galaxy S20 Ultra (412×915), iPad Mini (768×1024, two-column breakpoint), Surface Pro 7 (912×1368) — see `context/ad-hoc/responsiveness-testing.md`.

---

## Architecture

### Routes & API

| Route | Purpose |
|---|---|
| `/team/[slug]` | Home — grid (This Week / Usual toggle, tap-to-edit) with the Sessions list rendered below it on the same page; also renders the first-visit `NamePicker` in place of the grid when no valid identity is stored |
| `/venues` | Venue list (Server Component, reads `Venue` directly), linked from `/team/[slug]`'s Sessions header. Open to any player |
| `/venues/new` | Add-venue form → `createVenue` Server Action |
| `/venues/[venueId]/edit` | Edit-venue form, pre-filled → `updateVenue` Server Action. No ownership check, matching the rest of V1's trust model |
| `/venues/[venueId]/delete` | Delete confirmation page → `deleteVenue` Server Action. Blocked (throws) if any `Session` still references the venue |
| `/team/[slug]/sessions/[sessionId]` | Shareable single-session page (Phase 4, first slice of session notifications) — session details are visible to anyone with the link, no identity required; RSVP In/Out prompts a compact inline name picker if no identity is stored yet for this team. No session-management actions (Edit/Confirm/Cancel/Delete) — those stay on the `/team/[slug]` list only. A "Share" button (Web Share API with clipboard fallback) on every session card, both here and in the inline list, builds this URL |

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/teams/[slug]` | GET | Fetch roster + resolved Effective grid + team window per day |
| `/api/teams/[slug]/players/[playerId]/default` | PATCH | Update a Usual Schedule day |
| `/api/teams/[slug]/players/[playerId]/override` | PATCH | Update a This Week override |
| `/api/teams/[slug]/players/[playerId]/override?date=YYYY-MM-DD` | DELETE | Clear a This Week override for a date ("Reset to Usual"), reverting that day to inherit `DayDefault`. Idempotent — no-op if no override exists |
| `/api/teams/[slug]/players` | POST | *Planned, Phase 4* — add a new player to the roster; not yet built |
| `/api/teams/[slug]/sessions` | GET | List all sessions for the team, with venue + RSVPs |
| `/api/teams/[slug]/sessions` | POST | Propose a new session (venue, date, time range, optional `kind` — defaults to `PRACTICE` — and for `RENTED_GYM` practice sessions, cost + minPlayers) |
| `/api/teams/[slug]/sessions/[sessionId]` | PATCH | Edit an existing session in place — whole-record replace, RSVPs untouched. No server-side proposer check (matches the DELETE/RSVP trust model; the UI only shows the button to the proposer) |
| `/api/teams/[slug]/sessions/[sessionId]` | DELETE | Delete a session; RSVPs cascade-delete via the schema relation |
| `/api/teams/[slug]/sessions/[sessionId]/rsvp` | PUT | Upsert the calling player's RSVP (`ANYTIME` = in, `UNAVAILABLE` = out); returns the full updated session |
| `/api/teams/[slug]/sessions/[sessionId]/confirm` | PATCH | Mark a session booked for sure (`status` → `CONFIRMED`). Idempotent when already confirmed; 400 when cancelled. No server-side proposer check (matches Edit/Delete/RSVP's trust model) |
| `/api/teams/[slug]/sessions/[sessionId]/cancel` | PATCH | Mark a session's slot as fallen through (`status` → `CANCELLED`) — reachable from `PROPOSED` or `CONFIRMED`, idempotent when already cancelled. Doesn't delete the session or its RSVPs; no server-side proposer check |

### Team Window Calculation

For each day: take every player who is not `UNAVAILABLE`, treat `ANYTIME` as `00:00–23:59`, then `teamWindow = [MAX(all fromTimes), MIN(all toTimes)]`. If the window is invalid (max ≥ min), show "No common time" rather than a broken range.

---

## Decisions Log

| Topic | Decision | Why |
|---|---|---|
| Identity | Name-based, remembered per device | No password/account; trust-based, same as the sheet |
| Save behavior | Optimistic, no confirmation screen | The updated cell is the confirmation; revert + inline error on failure |
| Sync | Manual pull-to-refresh | Right-sized for ~15 people; no websockets/polling until it's actually a complaint |
| Editing target | One grid, toggle changes write target | Avoids maintaining two separate views for Usual vs. This Week |
| Venues | Open to any player — add, edit, or delete, no approval step | The original "admin-added only" decision made TJ a bottleneck for venue info other players already had; opening it up matches the trust model every other write in this app already uses. `deleteVenue` blocks (throws) when sessions still reference the venue, rather than silently orphaning them |
| Auth | Deferred | Not built until there's a concrete trigger: opening this beyond TJ's trust circle. Auth alone wouldn't even fix portfolio exposure — see Portfolio row |
| Portfolio | Separate demo team (`/team/demo`), not a login wall | Seeded fake data, reset daily; the real team's URL is simply never posted publicly |
| Min players | Open question — kept as an editable per-session field | Team needs to agree on the real headcount threshold (8? 10?); varies by venue cost |
| Onboarding | First-visit tour, dismissible, `localStorage`-persisted (`hasSeenTour`, key `practice-runs:tour:${slug}`, mirroring `use-identity.ts`'s pattern exactly) | Mirrors the identity mechanism — no accounts, no DB table; new players shouldn't need to ask the group chat what to do |
| Onboarding tour approach | Scripted, guide-to-tap first-session state (spotlight the real UI, have the player perform the real action) over a coach-marks library (react-joyride/driver.js) | The player's own row starts all-`UNAVAILABLE`, so having them actually tap/save their own Monday cell during the tour doubles as their first real data entry, not just a passive lesson. Also avoids a new dependency and the CSS-theming work of re-skinning a third-party library's default look to match the app's dark/amber/teal theme |
| Onboarding tour sequence | Usual Schedule → This Week toggle → inherited-vs-overridden explanation → Team Window → Sessions/Game Day, in that causal order | An earlier build had the player create a This Week override first without ever explaining what Usual Schedule or This Week even meant, and never mentioned Sessions/Game Day at all — reordered after trying it so each step only depends on what the player already learned, and added a fifth step so the tour actually covers the app's second major feature area |
| Onboarding tour depth for Sessions/Game Day | One combined, non-interactive info step (not a guided tap, not two separate steps, not skipped) | There's no personal data to enter for these (unlike the grid steps), so a forced tap would be hollow; but leaving them out entirely would mean a new player never learns they exist. One step mentioning both by name is the middle ground |
| Team Window display | Single swipeable card (always-visible arrows + native touch swipe + tappable dot indicators), defaults to the best-availability day | Phase 2 shipped it as a row of tiny per-day boxes in the grid table; unreadable at mobile widths (the primary use case) and not interactive. A static single-best-day card (closer to the original mockup) was considered but rejected — it would hide the other 6 days' data the app already computes for free. Calculation (`computeWindowForDate`) is unchanged; this is a display-only change. See `context/features/completed/feature-team-window-carousel-spec.md` |
| Reset to Usual | `DELETE /override` clears a `DateOverride` row; edit drawer shows a "Reset to Usual" button only when the open cell is already overridden (This Week mode only) | Once a player has explicitly overridden a day, there was no way back to "just inherit Usual" short of manually re-entering Usual's exact values — error-prone and easy to get subtly wrong (times off by a few minutes, wrong status). Deleting the override row is the correct semantic "undo," matching the existing invariant that a missing `DateOverride` means "use the default" |
| Grid markup | Availability grid re-implemented with CSS Grid + explicit ARIA roles (`div[role=table/row/columnheader/rowheader/cell]`) instead of a semantic HTML `<table>` | Same screen-reader semantics as a real `<table>`, but CSS Grid gives the per-breakpoint column sizing (`lg:` widening at the iPad Mini breakpoint) that `table-fixed` couldn't do cleanly. Prompted by testing the grid with the demo roster expanded to a realistic ~15 rows |
| Sessions page | No dedicated `/team/[slug]/sessions` route — `SessionsView` renders directly below the availability grid on the existing `/team/[slug]` page | The two features share a device/identity context but not data; splitting into a second route would just add a navigation step for a single-page mobile app with room for both |
| Venue management | `/venues` (list) + `/venues/new` (create) + `/venues/[venueId]/edit` + `/venues/[venueId]/delete` (Server Actions) instead of POST/PATCH/DELETE API routes | No client outside these forms ever needs typed JSON create/edit/delete contracts, so a Server Action skips writing a request/response contract nothing else calls — same rationale as before, now serving all players instead of one |
| Session ownership | `Session.proposedById` records who proposed it; Edit/Delete buttons are shown in the UI only when `proposedById === currentPlayerId`, but the `PATCH`/`DELETE` endpoints don't check this server-side | Matches the existing trust model (any `PATCH`/`DELETE` on `DateOverride` already trusts the caller's `playerId`) — consistent rather than partially bolting on enforcement for one endpoint |
| Venue hours | `openTime`/`closeTime`, optional, informational only — not validated against a session's proposed time range | Knowing whether a venue is even open at a proposed slot matters when deciding whether to join, but enforcing it would add real complexity (holidays, exceptions) for a "worth knowing" field, not a "must enforce" one |
| Session delete confirmation | Inline "Delete this session? Yes, delete / Cancel" swap in place of the Edit/Delete buttons, not a modal | Consistent with the no-modals stance already set by optimistic saves; a inline confirm is enough friction to prevent a mis-tap without interrupting the page |
| Session status | Explicit `PROPOSED`/`CONFIRMED`/`CANCELLED` enum, driven by manual proposer actions (`/confirm`, `/cancel`) rather than auto-computed from RSVP count | Prompted by a real incident: a `RENTED_GYM` session never hit `minPlayers` and the venue slot got taken by another team before anyone could react — there was no way to signal "this fell through" so nobody accidentally RSVPs into a dead session. Hitting `minPlayers` doesn't mean anyone actually booked/paid for the venue, so confirmation has to be a deliberate action, not a threshold crossing |
| Cancelled sessions | `CANCELLED` sessions are kept, not deleted — RSVPs stay as a historical record of who committed to that slot — and a "Propose alternate time here" button pre-fills a *new* session from the cancelled one's venue/cost/minPlayers (date/time left blank) rather than editing the dead session's date in place | Rewriting a cancelled session's date out from under its existing RSVPs would be ambiguous (did they RSVP to the old slot or the new one?); spinning up a fresh session keeps that answer unambiguous. There's no push-notification system in this app, so the greyed-out card + "fell through" banner *is* the notification |
| Session notifications, layer 1 (shareable link) | Of three brainstormed layers (shareable link → Web Push → SMS), only the shareable link shipped now. It needs no new infrastructure and no reversal of an existing decision, unlike the other two | Web Push is explicitly listed in this doc's Out of Scope section ("push notifications — explicitly decided against for the current group size and use case") — reversing that is deferred to its own deliberate decision later, same treatment as the venue-admin-only reversal, once this link's actual adoption impact is visible. SMS/notification-provider choice is also deferred; if/when it's built, AWS (SNS/Pinpoint) is the preferred provider over Twilio |
| Game Day data model | Reuse the existing `Session`/`Rsvp` model with a new `kind` (`PRACTICE`/`GAME`) discriminator, rather than a parallel `Game`/`GameRsvp` model | Games and practice sessions share nearly everything (venue, date/time range, RSVP in/out, a headcount threshold) — mirrors how `SessionStatus` already extends `Session` with an enum. A separate model would duplicate the venue/date/time/RSVP plumbing, the propose form, and both display components for no benefit |
| Game Day cost gating | Cost UI is hidden whenever `kind === "GAME"`, regardless of the venue's rental type — not gated on venue type alone | The real game venue will be seeded as `OPEN_GYM`, but nothing stops a proposer from picking a `RENTED_GYM` venue while proposing a game. Gating strictly on kind (not venue) matches the stated intent that games never involve a cost split, and costs one extra condition to guarantee |
| Game Day scheduling | No "one game per week" or similar constraint enforced at the schema/API level, and no bulk/season-schedule import built (games are proposed one at a time, exactly like sessions) | Bye weeks and rare doubleheaders are real, so a per-week constraint would be actively wrong. Bulk import was explicitly discussed and deferred — revisit only if the manual "+ Propose Game" flow proves to be real friction once used |
| Shareable session link identity model | Viewing `/team/[slug]/sessions/[sessionId]` requires no stored identity; only tapping RSVP does, via a compact inline name picker scoped to just that action | Meets chat-first players where they already are — a link that forces a name pick before showing anything is more friction than the group chat message it's replacing. Matches the existing invariant that identity is never required to *read* data in this app, only to write it |

---

## Gap Analysis — Real Usage vs. the Plan

Surfaced from group chat transcripts (2026-07-17): the recurring weekly grid answers "when is everyone generally free," but the actual coordination bottleneck is proposing and locking in a *specific* one-off session — currently done by hand in chat.

| What's happening in chat | Covered by current model? |
|---|---|
| Propose a specific date + time slot (not recurring) | Shipped — `Session` model, propose form on `/team/[slug]` |
| Choosing between externally-offered slots (e.g. 7–9 vs 8–10) | Gap — Team Window only reflects internal overlap; a session's `fromTime`/`toTime` is a single proposed slot, not a set of options to compare. Editable after the fact via `PATCH`, but there's no side-by-side slot picker |
| "Need at least 10 of us" threshold (only matters when paying) | Shipped — `Session.minPlayers`, `RENTED_GYM` only, live RSVP-count-vs-threshold display |
| Cost split ($100 ÷ confirmed count) | Shipped — `Session.costTotal`, `RENTED_GYM` only, live cost/person now + cost at `minPlayers` |
| Three venue types (rented gym / open gym / park) | Shipped, one entry seeded — INSZN (~$50/hr, `RENTED_GYM`) via `prisma/seed.ts`; more venues addable through `/venues/new` as they come up |
| Who can add a venue | Decided and shipped — open to any player via `/venues/new`, `/venues/[venueId]/edit`, `/venues/[venueId]/delete`, no approval step |
| Skipping a venue because it's too far | Deferred — `Venue.address` field is live and shown on session cards; real distance/Maps API feature not scoped |
| Full roster accuracy (e.g. Trevor missing from an earlier list) | Action needed — pull the authoritative roster directly from the group |
| "I'm out this Sunday but otherwise usual" | Covered — This Week override falls back to Usual |
| Negotiating a day before committing | Covered — editable up until it's set; a proposed session can also be edited in place via the Edit button |

**Recommendation:** Phases 1–3 have shipped (recurring grid, then Sessions & venues). Next up is Phase 4 polish — see Build Phases.

---

## Build Phases

1. **Core grid, Usual Schedule only** — Next.js scaffold, Prisma schema + Neon connection, `/team/[slug]` renders the grid, tap-to-edit works for Usual Schedule. No overrides, no team window math yet.
2. **This Week overrides + team window** — This Week / Usual toggle, `DateOverride` writes, inherited-vs-overridden styling, live overlap calculation.
3. **Sessions & venues — done** — Propose, edit, and delete a one-off session; RSVP in/out; live cost split + minimum-headcount check for rented-gym sessions. INSZN seeded as the first venue; `/venues/new` adds more, open to any player.
4. **Polish (in progress)** — **First-visit onboarding tour — done**: scripted guide-to-tap tour, five steps (Usual Schedule → This Week toggle → inherited-vs-overridden → Team Window → Games & practices), gated on `hasSeenTour` in `localStorage`. Remaining: first-visit identity persistence, add-player flow, empty/error states, pull-to-refresh interaction, demo team + daily reset job + demo banner.
5. **Auth (gated, not scheduled)** — Google/email via NextAuth + per-team permissions. Triggered only by opening this up beyond TJ's direct trust circle.

---

## Future Vision (Not Committed)

If the concept proves out through real use, a plausible next step is a small multi-tenant version — teams register their own account, add their own players/venues, run their own Usual/This Week/Sessions independently. Depends entirely on Phase 5's auth trigger being met, and on this solving a real problem for people beyond TJ's own team.

---

## Out of Scope (For Now)

- **Stat sheet consolidation** — a separate spreadsheet a player maintains for stats; revisit after Practice Runs is in real use.
- **Real-time sync, accounts/auth, push notifications** — explicitly decided against for the current group size and use case.

---

## Document

### Project Context Files

| File | Purpose |
|---|---|
| `practiceRuns-ProjectOverview.md` | This file — full project context, source of truth |
| `practiceRuns-ProjectPlan.html` | Visual project plan / brainstorm artifact, kept in lockstep |
| `AGENTS.md` | Shared AI agent context (stack, commands, conventions, do-nots) |
| `ai-interaction.md` | Feature workflow (document → branch → implement → test → commit → merge) |
| `coding-standards.md` | TypeScript/React/Next.js/Prisma conventions |
| `current-feature.md` | Active feature tracker, reset after each merge |

### AI Working Rules

```
Project: Practice Runs
Stack: Next.js (App Router, latest stable), TypeScript, Tailwind CSS v4, Prisma + Neon
Current phase: Phase 4 — polish (onboarding tour shipped; add-player flow, empty/error states, demo team remaining). Phases 1–3 shipped.

Rules:
- Read practiceRuns-ProjectOverview.md before writing any code
- Do not add features beyond the current phase's scope
- Sessions/Venue data model (Phase 3) is live — do not merge it into the Usual/This Week tables
- TypeScript always — no plain JS, no `any`
- Tailwind only — no inline styles
- Every day defaults to UNAVAILABLE — never assume availability
```

### Open Questions

- [ ] Real minimum-headcount threshold for booking a rented gym (8? 10?) — needs an actual team conversation. `Session.minPlayers` stays editable per session either way
- [ ] Full authoritative roster — pull directly from the group, don't reconstruct from scattered chat messages
- [x] ~~Onboarding tour implementation~~ — resolved: scripted, guide-to-tap first-session state (spotlight the real cell/toggle/team-window/Sessions, player performs the real action where there's real data to enter) rather than a coach-marks library. Shipped as a five-step sequence — see the Decisions log
- [ ] Whether session Edit/Delete need a real server-side proposer check before this goes beyond the trust circle — currently UI-only, consistent with the rest of V1's trust model, but worth revisiting alongside the Phase 5 auth trigger

---

_Enriched from `practiceRuns-ProjectPlan.html` · Keep both files in lockstep as phases complete or decisions change._
