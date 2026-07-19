# Practice Runs — Project Overview

> **Tagline:** See at a glance which day the crew has the most overlap — and lock in a run in a couple of taps.
> **Status:** Phases 1–2 (core availability grid + This Week overrides/team window) shipped. Phase 3 not started.
> **Version:** V1 — MVP (recurring availability grid)

This is the enriched source of truth for **Practice Runs**, superseding `practiceRuns-ProjectSpec.md` (discarded). Keep this file and [`practiceRuns-ProjectPlan.html`](practiceRuns-ProjectPlan.html) in lockstep as phases complete or decisions change.

---

## Problem

**The problem:** The "Uncrowned Kings" pickup crew coordinates weekly availability and one-off sessions by hand in a group chat and a shared Google Sheet. The sheet proved the underlying data model (who's free, when) at zero build cost, but broke down once granularity increased — per-day time ranges, per-player notes, overrides. Sheets, especially on mobile, can't present that cleanly.

**Why existing solutions fall short:** A generic spreadsheet has no concept of "today's effective schedule = usual, unless overridden," no tap-to-edit-in-place interaction, and no way to model a one-off session (venue, cost, headcount threshold) without more copy-pasted lists in chat.

---

## Users

- **Any crew member (mobile-first):** wants to see, at a glance, which day has the most players free and what hours actually overlap, and to update their own (or someone else's) availability in a couple of taps — no account.
- **Admin (TJ):** adds venues (name, address, cost, hours) via a simple form; not open submission.

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

### V3 — Sessions & Venues (Phase 3, partially unblocked)

- Propose a one-off session at a rented gym, open gym, or park
- RSVP against a session
- Live cost-per-person split and minimum-headcount check for rented-gym sessions
- Admin-added venues (INSZN is a usable first entry: ~$100/2hr, `RENTED_GYM`)

### V4 — Polish (Phase 4)

- **First-visit onboarding walkthrough** — a short, dismissible tour that guides a brand-new player through the core loop (pick your name → tap a cell → This Week/Usual toggle → team window readout) so they know what to do without asking in the group chat. Persisted via a `hasSeenTour` flag in `localStorage`, same mechanism as identity — no DB table, no accounts. Dismissed once, never shown again on that device. See Decisions log and Open Questions for approach.
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
| Phase 3 | Same DB, new tables (`Venue`, `Session`, `Rsvp`) | Sessions feature build |
| Phase 5 | Add NextAuth v5 + per-team permission logic | Opening the app to people outside TJ's direct trust circle |

### Models

```ts
// schema.prisma

model Team {
  id      String   @id @default(cuid())
  slug    String   @unique   // shareable URL, e.g. "uncrowned-kings"
  name    String
  players Player[]
}

model Player {
  id        String         @id @default(cuid())
  teamId    String
  team      Team           @relation(fields: [teamId], references: [id])
  name      String
  number    Int?           // jersey number, nullable — 0 is a valid value — live from Phase 1
  defaults  DayDefault[]
  overrides DateOverride[]
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

// --- Not in Phase 1/2. Phase 3 — see Gap analysis below. ---

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
  minPlayers Int?     // RENTED_GYM only — worth booking only above this count
  rsvps      Rsvp[]
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
- **Sessions as a separate model, not a Phase 1 feature:** validates the core tap-to-edit interaction on real usage first, then layers Sessions on top without reworking the grid.

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
| Onboarding walkthrough (Phase 4) | Short, dismissible tour shown once on first visit after the name picker — spotlights the grid, a cell tap, the This Week/Usual toggle, and the team window readout. Dismiss = `hasSeenTour` in `localStorage`, never shown again on that device |
| Home — grid view | This Week / Usual toggle, 7-day grid, tap a cell to edit, live Team Window carousel card (defaults to best-availability day; arrows + swipe + dot indicators page through the rest) |
| Edit drawer (bottom sheet) | Anytime / Specific hours / Unavailable, optional time range + note, Save |
| Session proposal (Phase 3) | Venue + date + time slots, RSVP count vs. minPlayers, live cost/person now vs. at threshold, "I'm in" |

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
| `/team/[slug]` | Home grid — This Week / Usual toggle, tap-to-edit |
| `/team/[slug]/whoami` | First-visit identity picker (may be a modal instead of a route) |

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/teams/[slug]` | GET | Fetch roster + resolved Effective grid + team window per day |
| `/api/teams/[slug]/players/[playerId]/default` | PATCH | Update a Usual Schedule day |
| `/api/teams/[slug]/players/[playerId]/override` | PATCH | Update a This Week override |
| `/api/teams/[slug]/players` | POST | Add a new player to the roster |

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
| Venues | Admin-added only, not open submission | Open submission needs approval/moderation this group doesn't need yet |
| Auth | Deferred | Not built until there's a concrete trigger: opening this beyond TJ's trust circle. Auth alone wouldn't even fix portfolio exposure — see Portfolio row |
| Portfolio | Separate demo team (`/team/demo`), not a login wall | Seeded fake data, reset daily; the real team's URL is simply never posted publicly |
| Min players | Open question — kept as an editable per-session field | Team needs to agree on the real headcount threshold (8? 10?); varies by venue cost |
| Onboarding | First-visit walkthrough, dismissible, `localStorage`-persisted (`hasSeenTour`) | Mirrors the identity mechanism — no accounts, no DB table; new players shouldn't need to ask the group chat what to do |
| Team Window display | Single swipeable card (always-visible arrows + native touch swipe + tappable dot indicators), defaults to the best-availability day | Phase 2 shipped it as a row of tiny per-day boxes in the grid table; unreadable at mobile widths (the primary use case) and not interactive. A static single-best-day card (closer to the original mockup) was considered but rejected — it would hide the other 6 days' data the app already computes for free. Calculation (`computeWindowForDate`) is unchanged; this is a display-only change. See `feature-team-window-carousel-spec.md` |

---

## Gap Analysis — Real Usage vs. the Plan

Surfaced from group chat transcripts (2026-07-17): the recurring weekly grid answers "when is everyone generally free," but the actual coordination bottleneck is proposing and locking in a *specific* one-off session — currently done by hand in chat.

| What's happening in chat | Covered by current model? |
|---|---|
| Propose a specific date + time slot (not recurring) | Gap — addressed by `Session` model |
| Choosing between externally-offered slots (e.g. 7–9 vs 8–10) | Gap — Team Window only reflects internal overlap, not venue options |
| "Need at least 10 of us" threshold (only matters when paying) | Gap — addressed by `Session.minPlayers`, `RENTED_GYM` only |
| Cost split ($100 ÷ confirmed count) | Gap — addressed by `Session.costTotal`, `RENTED_GYM` only |
| Three venue types (rented gym / open gym / park) | Partially unblocked — INSZN known (~$100/2hrs, `RENTED_GYM`); more addresses/hours needed over time |
| Who can add a venue | Decided — admin-added only for now |
| Skipping a venue because it's too far | Deferred — `Venue.address` field added now; real distance/Maps API feature not scoped |
| Full roster accuracy (e.g. Trevor missing from an earlier list) | Action needed — pull the authoritative roster directly from the group |
| "I'm out this Sunday but otherwise usual" | Covered — This Week override falls back to Usual |
| Negotiating a day before committing | Covered — editable up until it's set |

**Recommendation:** ship Phases 1–2 (recurring grid) first to validate the core tap-to-edit interaction on real usage, then Sessions (Phase 3) — it's higher-value than further grid polish, and no longer fully blocked.

---

## Build Phases

1. **Core grid, Usual Schedule only** — Next.js scaffold, Prisma schema + Neon connection, `/team/[slug]` renders the grid, tap-to-edit works for Usual Schedule. No overrides, no team window math yet.
2. **This Week overrides + team window** — This Week / Usual toggle, `DateOverride` writes, inherited-vs-overridden styling, live overlap calculation.
3. **Sessions & venues (partially unblocked)** — Propose a one-off session, RSVP, live cost split + minimum-headcount check for rented-gym sessions. INSZN is a usable first venue.
4. **Polish** — First-visit identity persistence, **first-visit onboarding walkthrough** (dismissible tour of grid/toggle/team-window, gated on `hasSeenTour` in `localStorage`), add-player flow, empty/error states, pull-to-refresh interaction, demo team + daily reset job + demo banner.
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
Current phase: Phase 1 — core Usual Schedule grid, no overrides, no auth

Rules:
- Read practiceRuns-ProjectOverview.md before writing any code
- Do not add features beyond the current phase's scope
- Sessions/Venue data model is Phase 3 — do not build or wire it early
- TypeScript always — no plain JS, no `any`
- Tailwind only — no inline styles
- Every day defaults to UNAVAILABLE — never assume availability
```

### Open Questions

- [ ] Real minimum-headcount threshold for booking a rented gym (8? 10?) — needs an actual team conversation
- [ ] Full authoritative roster — pull directly from the group, don't reconstruct from scattered chat messages
- [ ] Address/hours for venues beyond INSZN
- [ ] Onboarding tour implementation — coach-marks library (e.g. `driver.js`, `react-joyride`) spotlighting real UI vs. a scripted first-session state (auto-opening the edit drawer, pre-highlighting a cell) that has the player perform the real action instead of watching a fake demo; decide when Phase 4 starts

---

_Enriched from `practiceRuns-ProjectPlan.html` · Keep both files in lockstep as phases complete or decisions change._
