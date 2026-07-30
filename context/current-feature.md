<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Replace default favicon with the UK logo

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

The browser tab was showing Next.js's default scaffold favicon (leftover from `create-next-app`) instead of the team's actual logo. User asked to use the existing logo already in `public/UK_logo.PNG` (already used in the app header via `TeamGrid.tsx`) as the favicon instead.

## Notes

<!-- Context, decisions, tradeoffs -->

Used Next.js App Router's file-based metadata convention rather than hand-wiring `metadata.icons` in `layout.tsx`: any `icon.{ico,png,jpg,jpeg,svg}` placed directly in `src/app/` is auto-detected at build time and Next.js generates the `<link rel="icon">` tag itself. Copied (not moved) `public/UK_logo.PNG` to `src/app/icon.png` — copied because the original is still referenced directly by the header `<Image>` in `TeamGrid.tsx` and needed to stay in place — and deleted the stale `src/app/favicon.ico` so there's only one icon `<link>` tag instead of two competing ones.

This touches a file directly under `src/app/`, so per this project's Claude Code plan-mode rule (`src/app/` requires `/plan` before modifying), the change was planned and approved before implementation even though it's a single static asset swap with no routing/layout logic involved.

## History

- 2026-07-30: User asked for the logo as favicon. Entered plan mode per the `src/app/` rule, confirmed the logo file (1024×1024 PNG) and the current default `favicon.ico`, wrote and got approval on a two-step plan (add `src/app/icon.png`, remove `src/app/favicon.ico`, no `layout.tsx` changes needed). Implemented, then verified: fresh `npm run dev` restart, confirmed via Playwright that exactly one `<link rel="icon">` tag renders pointing at `/icon.png` (`image/png`, 1024x1024) with no leftover default, and `npm run build` passes clean with `/icon.png` appearing as a static route. Status set to Completed — ready for commit per `ai-interaction.md` workflow.
