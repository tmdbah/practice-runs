# Practice Runs

A mobile-first tool for a pickup basketball crew to set weekly availability and see when enough people overlap to actually get a run together.

Built for the "Uncrowned Kings" pickup crew, who previously coordinated availability by hand in a group chat and a shared Google Sheet. The sheet proved the underlying idea — a weekly grid of who's free when — but broke down once granularity increased (per-day time ranges, notes, per-player overrides), especially on mobile. Practice Runs rebuilds that same logic as a small, purpose-built app, plus a real fix for planning one-off sessions (venue, cost split, headcount) that the sheet never covered.

**Status:** Planning complete, Phase 1 (core availability grid) not yet started.

## How it works

1. **First visit — pick your name.** No signup form: you choose your name from the team roster once, and the device remembers it (`localStorage`). No password. Anyone can edit anyone's row — trust-based, same as the spreadsheet it replaces. (Real accounts are a possible later phase, not a V1 requirement — see [Auth](#tech-stack) below.)
2. **Land on the home grid.** A 7-day grid, one row per player, defaulted to the **This Week** view. A toggle switches between **This Week** (this week only) and **Usual** (your standing weekly pattern) — same grid, same interaction, the toggle just changes which one taps write to.
3. **Tap a day to edit it.** Tapping your own cell (or anyone else's) opens a bottom sheet: **Anytime**, **Specific hours**, or **Unavailable**, plus an optional note (e.g. "work until 4:30"). Every day defaults to Unavailable — nobody's assumed free until they say so.
4. **Save is instant.** Tapping Save updates the cell immediately and closes the sheet — no confirmation dialog. If the write fails, the cell reverts and shows a small inline error.
5. **This Week falls back to Usual.** If you haven't set an override for a given day this week, the grid shows your Usual value for it, faded to mark it as inherited. Set an explicit override and it renders at full opacity with a dot marker. So "I'm out this Sunday but otherwise normal" is just one tap, not a whole week re-entered.
6. **See the team window.** For each day, the app computes the overlapping availability window across everyone who's marked in (`MAX` of everyone's start times, `MIN` of everyone's end times), so the crew can see at a glance which day has the most players free and what hours actually work — the same math the spreadsheet did, just readable on a phone.
7. **Pull to refresh.** No real-time sync or websockets — refetch on pull-to-refresh or when the tab regains focus is enough at this group's size (~15 people).

## Planned: Sessions & venues (Phase 3)

Beyond the recurring grid, the app will support proposing a specific one-off run at a venue (rented gym, open gym, or park), RSVPing, and — for rented gyms — a live cost-per-person split plus a minimum-headcount check before it's worth booking.

## Tech stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Neon (Postgres) + Prisma
- **Auth:** None in V1 — client-stored identity. Real accounts (NextAuth) are deferred, not ruled out — only built if the app opens up beyond the current trust circle
- **Hosting:** Vercel

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it.

## Project docs

Full context — data model, design decisions, build phases — lives in [`AGENTS.md`](./AGENTS.md) and [`context/practiceRuns-ProjectOverview.md`](./context/practiceRuns-ProjectOverview.md).

## Demo / portfolio note

A seeded `/team/demo` team with fake data (reset daily) will serve as the public-safe demo for portfolio use, once built. The real team's data lives at a URL that's never posted publicly.
