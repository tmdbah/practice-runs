# Feature Phase 5 Spec

## Overview

Phase 5 per `practiceRuns-ProjectOverview.md` → Build Phases: **"Auth (gated, not scheduled)."** Google/email login via NextAuth v5, plus per-team permissions.

**This phase is gated, not queued.** Do not start any item below without confirming the actual trigger has been met: *opening this app up to people outside TJ's direct trust circle* — e.g. another team wants to register and run its own roster independently. Phase 4 shipping, or this doc existing, is not that trigger. If asked to "do Phase 5," confirm the trigger explicitly before branching.

**Prerequisite:** `feature-phase-4-spec.md` fully merged, **and** the trigger condition above confirmed by the project owner.

**Also note:** auth alone does not solve portfolio exposure — that's already handled by Phase 4's demo-team approach (Decisions Log → Portfolio). Don't justify starting this phase on portfolio-safety grounds.

---

## Requirements for phase 5

### 1. NextAuth v5 setup

**Goal:** Add real account creation via Google and/or email, replacing nothing from the existing `localStorage`-based identity by default — this is additive until permissions (item 2) actually require enforcement.

**Acceptance criteria:**
- NextAuth v5 configured per current stable docs at implementation time (breaking changes are common across major versions — check `node_modules/next-auth` docs before writing config)
- Session/account data lives in the existing Neon Postgres DB via the Prisma adapter
- Existing `/team/[slug]` routes for the current trust-circle team continue to work unauthenticated until item 2 is scoped and approved

---

### 2. Per-team permission model

**Goal:** Real permission logic — who can view/edit which team's data — since auth alone doesn't provide this.

**Acceptance criteria:**
- Explicit design confirmation before implementation: what does "own a team" mean (creator? invited member?), and is trust-based any-player-edits-any-row (current model) being replaced or layered on top?
- This is real added scope per the Overview's Decisions Log → Auth note — treat it as its own sub-spec, written and confirmed before coding, not inferred from this file alone

---

### 3. Multi-team registration (only if Future Vision is being pursued)

**Goal:** Teams register their own account and run their own roster/venues/sessions independently.

**Note:** This item is explicitly **Future Vision, not committed** per the Overview doc. Do not build this as part of "finishing Phase 5" — it requires its own separate go/no-go decision after Phase 5's auth + permissions are live and validated.

---

## References

- [practiceRuns-ProjectOverview.md](../practiceRuns-ProjectOverview.md) — Decisions Log → Auth, Future Vision (Not Committed)
- [practiceRuns-ProjectPlan.html](../practiceRuns-ProjectPlan.html) — Decisions log (Auth, Portfolio), Future vision
- [feature-phase-4-spec.md](feature-phase-4-spec.md) — prerequisite scope
- `stack-spec.md` — NextAuth v5 is the project's default auth choice when this phase is actually triggered
