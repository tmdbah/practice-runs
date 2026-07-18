# Feature Phase 4 Spec

## Overview

Phase 4 per `practiceRuns-ProjectOverview.md` → Build Phases: **"Polish."** First-visit identity persistence hardening, add-player flow, empty/error states, pull-to-refresh interaction, and the demo team + daily reset job + demo banner for portfolio use.

**Prerequisite:** `feature-phase-3-spec.md` fully merged — the real product loop (grid + sessions) already works end to end.

**Phase 4 is done when:** the app is safe to link publicly as a portfolio piece (`/team/demo` only), and the real team's day-to-day rough edges (adding a player, empty states, stale data) are gone.

Work the items below in order where there's a real dependency (4 must come after 1–3); items 1–3 are otherwise independent and can be reordered. Load one into `context/current-feature.md` at a time.

**Hard boundary — do not build in Phase 4:**
- Real auth / NextAuth (Phase 5 — gated on its own trigger, not this phase)
- Any multi-tenant "teams register themselves" capability (Future/Deferred, uncommitted)

---

## Requirements for phase 4

### 1. Add-player flow

**Goal:** A simple way to add a new player to the roster (the `POST /api/teams/[slug]/players` endpoint referenced in the Overview's Routes & API already exists as a stub target from Phase 1 planning — wire it to real UI now).

**Acceptance criteria:**
- New player gets 7 `DayDefault` rows created defaulted to `UNAVAILABLE`, same invariant as every other player
- No approval workflow — same trust model as everything else in the app
- New player immediately appears in the grid without a full page reload being required (or, at minimum, appears after the existing refetch-on-focus behavior)

---

### 2. Empty / error / loading states

**Goal:** Every screen has a real state for zero-data and failure, not just the happy path.

**Acceptance criteria:**
- Team with zero players: grid shows an empty-state message + path to add the first player, not a blank grid or crash
- API fetch failure on initial load: a retry-able error state, not a silent blank screen
- Session list with zero proposed sessions: an empty state, not a blank section

---

### 3. Pull-to-refresh

**Goal:** Manual pull-to-refresh on the grid and session list, per the Decisions Log's "Manual pull-to-refresh, not real-time sync" choice.

**Acceptance criteria:**
- Pull-to-refresh refetches the current view's data
- Refetch also happens on page focus (tab/app switch back), as already specified in the Overview's Client state section
- Still no websockets, no polling interval — confirm this doesn't get silently added while "just polishing"

---

### 4. Demo team + daily reset + demo banner

**Goal:** A second seeded `Team` at `/team/demo` with fake players and sessions, reset daily via a scheduled job, with a visible "You're viewing a demo — data resets daily" banner. This — not auth — is the actual fix for portfolio exposure (see Decisions Log → Portfolio).

**Acceptance criteria:**
- `/team/demo` seed data is entirely separate from the real team's rows — resetting it must never be able to touch the real team's data (guard the reset job's scope explicitly, e.g. by `teamId`/`slug`, not "all teams")
- Daily reset job re-seeds fake players, fake schedules, and at least one fake session with RSVPs
- Banner renders only on `/team/demo`, not on the real team's route
- The real team's slug/URL is never referenced anywhere in code comments, seed scripts, or docs destined for a public repo

---

### 5. Phase 4 exit check

- [ ] `npm run build` and `npm run lint` pass clean
- [ ] `/team/demo` is safe to link publicly: resets daily, clearly banner-labeled, cannot mutate real team data
- [ ] Adding a player, hitting an empty team, and a failed fetch all produce a real UI state (screenshot each before merging)
- [ ] `context/current-feature.md` history reflects each feature above as completed

---

## References

- [practiceRuns-ProjectOverview.md](../practiceRuns-ProjectOverview.md) — Decisions Log → Portfolio, Users → Scope note
- [practiceRuns-ProjectPlan.html](../practiceRuns-ProjectPlan.html) — Decisions log (Portfolio), Lessons from the spreadsheet prototype
- [feature-phase-3-spec.md](feature-phase-3-spec.md) — prerequisite scope
- [ai-interaction.md](../ai-interaction.md) — per-feature branch/test/commit/merge workflow
