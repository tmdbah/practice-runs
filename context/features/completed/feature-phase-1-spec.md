# Feature Phase 1 Spec

## Overview

Phase 1 per `practiceRuns-ProjectOverview.md` → Build Phases: **"Core grid, Usual Schedule only."** Next.js scaffold, Prisma schema + Neon connection, `/team/[slug]` renders the grid, tap-to-edit works for the Usual Schedule. No This Week overrides, no team window math, no Sessions/Venues, no auth.

**Phase 1 is done when:** a real player can open `/team/[slug]` on a phone, pick their name, tap their own day, set Anytime / Specific hours / Unavailable, and see it persist after a refresh — for the Usual Schedule only.

Each numbered item below is scoped to be one feature branch, per the `ai-interaction.md` workflow (document → branch → implement → test → commit → merge). Work them in order — each depends on the ones before it. Load one into `context/current-feature.md` at a time; don't start the next until the current one is merged.

**Hard boundary — do not build in Phase 1:**
- `DateOverride` model, This Week toggle, or any override-write logic (Phase 2)
- Team window / overlap calculation (Phase 2)
- `Venue`, `Session`, `Rsvp` models or any session UI (Phase 3)
- Auth (Phase 5)
- The demo team's daily reset job and "you're viewing a demo" banner (Phase 4) — Phase 1 only needs the seed data itself, not that infrastructure

---

## Requirements for phase 1

### 1. Prisma schema + Neon connection

**Goal:** `Team`, `Player`, `DayDefault`, and the `Status` enum exist as real tables in a Neon Postgres database, migrated via Prisma.

```ts
model Team {
  id      String   @id @default(cuid())
  slug    String   @unique
  name    String
  players Player[]
}

model Player {
  id       String       @id @default(cuid())
  teamId   String
  team     Team         @relation(fields: [teamId], references: [id])
  name     String
  number   Int?         // jersey number, nullable — 0 is a valid value
  defaults DayDefault[]
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
  fromTime  String?  // "18:00", only when status = SPECIFIC
  toTime    String?
  note      String?  // e.g. "church," "work until 4:30"
  @@unique([playerId, dayOfWeek])
}
```

**Acceptance criteria:**
- `prisma migrate dev` runs clean against a Neon connection string in `.env.local`
- `prisma migrate status` reports in sync
- A seed script (`prisma/seed.ts`) creates one **demo** `Team` (fake slug, e.g. `demo-team`) with a handful of fake `Player` rows — fake names, fake jersey numbers — and 7 `DayDefault` rows per player defaulted to `UNAVAILABLE`. This is the same demo data Phase 4's `/team/demo` needs, just created now instead of later — see note below
- The seed script never creates or references the real `uncrowned-kings` team, its real player names, or real jersey numbers — nothing real-team-shaped is committed to the repo

**Note — real team is not seeded:** the real `uncrowned-kings` team gets created once, live, through the app's own add-player flow after Phase 1 ships (that flow itself doesn't land until Phase 4 — see `feature-phase-4-spec.md` → Add-player flow — so until then, real roster entry may require a one-off manual DB insert or an admin script kept out of the committed seed file). It is never committed to a seed script or migration, since this repo is public.

---

### 2. Read API — fetch roster + Usual Schedule

**Goal:** `GET /api/teams/[slug]` returns the team's roster and each player's 7-day Usual Schedule.

**Response shape:**
```ts
interface TeamGridResponse {
  team: { slug: string; name: string };
  players: Array<{
    id: string;
    name: string;
    number: number | null;
    schedule: Array<{ dayOfWeek: number; status: Status; fromTime: string | null; toTime: string | null; note: string | null }>;
  }>;
}
```

**Acceptance criteria:**
- 404 (or a typed error shape) when `slug` doesn't match a team
- Every player always returns exactly 7 schedule entries (0–6), even if `DayDefault` rows are somehow missing — missing rows resolve to `UNAVAILABLE`, not omitted
- No `DateOverride`, `Venue`, or `Session` data in the response — this endpoint is Usual Schedule only in Phase 1

---

### 3. Identity — name-based device identity

**Goal:** First-time visitor to `/team/[slug]` picks their name from the roster; it's remembered on that device for future visits.

**Acceptance criteria:**
- No name stored for this device + team → show the picker (route or modal, implementer's choice) listing players from requirement 2's roster
- Selecting a name stores `playerId` (and `slug`) in `localStorage`, scoped so multiple teams don't collide (e.g. keyed by slug)
- Returning visitor with a stored `playerId` for this slug skips the picker and lands directly on the grid
- No password, no server-side session, no cookie-based auth — this is intentionally not real identity/auth (see Decisions Log → Identity)

---

### 4. Home grid UI — render Usual Schedule

**Goal:** `/team/[slug]` renders a 7-column (Mon–Sun) grid, one row per player, using requirement 2's data.

**Cell states to render (Usual Schedule only — no inherited/overridden states, those are Phase 2):**
| Status | Appearance |
|---|---|
| `ANYTIME` / `SPECIFIC` | Solid teal fill |
| `UNAVAILABLE` | Neutral/empty fill |

**Acceptance criteria:**
- Mobile-first single-column-friendly layout; verify against iPhone SE (375×667) and iPhone 14 Pro Max at minimum (full device list in `context/ad-hoc/responsiveness-testing.md`)
- The signed-in player's own row is visually distinguishable (e.g. "you" label), matching the `TJ (you)` treatment in the Mockups section of the Plan doc
- Jersey numbers render on the grid (e.g. next to each player's name)
- A day with a note shows some indicator (e.g. a small dot or icon on the cell) — the note's content itself can be surfaced on tap, doesn't need to be visible at rest
- No This Week/Usual toggle in the UI yet — there's only one schedule to show
- No team window / "free" count row yet — that's Phase 2

---

### 5. Tap-to-edit — edit drawer + write API

**Goal:** Tapping any cell opens a bottom sheet to set that day's status; Save writes it optimistically.

**Edit drawer:**
- Options: Anytime / Specific hours / Unavailable
- When "Specific hours" is chosen, show `fromTime`/`toTime` inputs
- An optional note input (e.g. "church," "work until 4:30"), always available regardless of status
- Save button; no confirmation modal, no toast — per Decisions Log → Save behavior

**Write endpoint:**
```
PATCH /api/teams/[slug]/players/[playerId]/default
Body: { dayOfWeek: number; status: Status; fromTime?: string; toTime?: string; note?: string }
```

**Acceptance criteria:**
- Tapping Save updates the grid cell immediately (before the PATCH resolves), then closes the drawer
- On PATCH failure, the cell reverts to its prior state and shows a small inline error — no modal
- Any player can edit any other player's row (tapping their row directly) — this is intentional, not a bug (trust-based editing, see Decisions Log → Identity)
- `fromTime`/`toTime` are only persisted when `status = SPECIFIC`; switching to `ANYTIME` or `UNAVAILABLE` clears them
- `note` persists regardless of status and is not cleared by a status change

---

### 6. Phase 1 exit check

Before moving to Phase 2 (`context/features/feature-phase-2-spec.md`, once written):
- [ ] `npm run build` and `npm run lint` pass clean
- [ ] A real player can complete the full loop on a phone: open link → pick name → tap a cell → set a status → refresh → see it persisted
- [ ] No `DateOverride`, `Venue`, `Session`, or `Rsvp` code exists anywhere in the codebase yet
- [ ] `context/current-feature.md` history reflects each of the five features above as completed

---

## References

- [practiceRuns-ProjectOverview.md](../practiceRuns-ProjectOverview.md) — Data → Models, Architecture → Routes & API, Build Phases, Decisions Log
- [practiceRuns-ProjectPlan.html](../practiceRuns-ProjectPlan.html) — Mockups §1–2 (first visit, home grid), UX flow
- [ai-interaction.md](../ai-interaction.md) — per-feature branch/test/commit/merge workflow
- [coding-standards.md](../coding-standards.md) — TypeScript/Next.js/Prisma conventions
- `AGENTS.md` — Do NOT list (no auth, no `any`, Server Components by default)
