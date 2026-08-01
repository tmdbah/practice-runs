<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Home screen icon (apple-touch-icon + manifest) shows the team logo

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

User noticed that when saving Practice Runs to the phone home screen ("Add to Home Screen"), the Uncrowned Kings team logo doesn't appear — a generic single-letter icon shows instead. NoBadBite, another project of the user's, shows its real logo in this flow. Goal: make the Uncrowned Kings crest (`public/UK_logo.PNG`, already in the repo) show up as the home screen icon.

## Notes

<!-- Context, decisions, tradeoffs -->

Compared against NoBadBite's working setup (`nobadbite/src/app/layout.tsx`, `nobadbite/public/manifest.json`) and found the root cause: `src/app/layout.tsx`'s `metadata` export had no `manifest` or `appleWebApp` fields, and there was no `public/manifest.json` or generated icon files — iOS has nothing to read for the home-screen icon and falls back to a generic glyph.

A prior commit (`chore/favicon-uk-logo`) had already added `src/app/icon.png` (Next.js's file-convention browser-tab favicon), which is a separate mechanism from the home-screen icon — that's why the Safari share-sheet preview already showed the crest correctly while "Add to Home Screen" still didn't.

Fix: generated `public/icons/icon-192.png`, `public/icons/icon-512.png`, and `public/apple-touch-icon.png` from the existing 1024×1024 `public/UK_logo.PNG` via `sips`; added `public/manifest.json` (name, standalone display, theme colors pulled from `globals.css`'s `--color-bg`/`--color-gold`, icons array); added `manifest: "/manifest.json"` and `appleWebApp: { capable, statusBarStyle, title }` to `layout.tsx`'s `metadata` export — mirroring NoBadBite's exact pattern rather than inventing a new one. This touches `src/app/layout.tsx`, so per this project's Claude Code plan-mode rule, the change was planned and approved before implementation.

First verification attempt (`npm run build`, `curl` against a local dev server) confirmed the manifest and icon files serve correctly, but the fix initially appeared not to work on the user's phone — turned out the changes were still uncommitted locally and the phone was testing the deployed production site (`practice-runs.vercel.app`), which had none of this yet. No CI workflow or `vercel.json` exists in this repo — Vercel's default GitHub integration auto-deploys on push to `main`, so a push was required, not just a local build pass.

## History

- 2026-08-01: User reported NoBadBite shows its logo when bookmarked to the home screen but Practice Runs doesn't. Diagnosed by comparing `nobadbite/src/app/layout.tsx` + `nobadbite/public/manifest.json` against Practice Runs' equivalents — confirmed Practice Runs had no manifest/appleWebApp metadata at all. Entered plan mode (required for the `src/app/layout.tsx` change), wrote and got approval on the plan, then implemented: generated icon files from `public/UK_logo.PNG` via `sips`, added `public/manifest.json`, updated `layout.tsx` metadata. `npm run build` passed; verified `/manifest.json`, `/apple-touch-icon.png`, and both icon sizes served 200 via a local dev server, and confirmed the `<link rel="manifest">` tag rendered in the page head. User tested on-device and the fix didn't appear — screenshots showed the deployed `practice-runs.vercel.app` still serving the old behavor (generic "U" glyph on Add to Home Screen, even though the separate `src/app/icon.png` favicon — from an earlier, unrelated commit — was already showing correctly in the share-sheet preview, which uses a different mechanism). Root cause: the fix was only committed to the local working tree, never pushed — deployment pending.
