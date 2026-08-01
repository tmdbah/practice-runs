<!-- When updating this file, follow the format below and don't remove the comments -->

# Current Feature: Fix "Add to Home Screen" always launching the demo team

## Merge Target

main

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

User reported that visiting the real team URL in Safari and tapping "Add to Home Screen" was saving/launching the **demo** team instead of the real one — despite the browser tab itself showing the real team correctly. This regressed after the PWA manifest work shipped (see prior completed entry: home screen icon now shows the team logo). Previously (before that manifest existed), Add to Home Screen just bookmarked whatever URL was in the address bar and worked correctly.

## Notes

<!-- Context, decisions, tradeoffs -->

Root cause: `public/manifest.json` had a hardcoded `"start_url": "/"` combined with `"display": "standalone"`. `src/app/page.tsx` (the `/` route) does `redirect("/team/demo-team")`. Once Safari sees a linked manifest with `display: standalone`, "Add to Home Screen" installs a mini standalone web app and launches it at the manifest's `start_url` on every subsequent tap — regardless of which page you tapped "Add to Home Screen" from. Since `start_url` was fixed to `/`, every home-screen icon launched into `/` → redirected straight to `/team/demo-team`, even when added from the real team's URL.

Before the manifest existed, there was no `start_url` to override the browser's default behavior of bookmarking the literal current URL — that's why it "used to work."

Fix: removed the hardcoded `"start_url": "/"` key from `public/manifest.json` entirely. Per the Web App Manifest spec, when `start_url` is absent, it defaults to the address of the referring document (the page the manifest was linked from at Add-to-Home-Screen time) — i.e. whichever team URL the user actually added. This is a one-line removal in a static public asset, not `src/app/`, DB schema, or auth, so it didn't require plan mode under this project's Claude Code rules.

No code elsewhere hardcodes a start URL — `layout.tsx`'s `appleWebApp`/`manifest` metadata fields don't reference a URL, only `manifest.json` did.

**Important caveat for verification:** iOS caches the manifest for icons already added to the home screen. Existing "Practice Runs" bookmarks on the user's phone won't self-correct — they need to be deleted and re-added from the real team's URL after this fix is deployed, to pick up the manifest change.

## History

- 2026-08-01: User reported Add to Home Screen was saving the demo team instead of the real team, despite the browser tab showing the real team. Traced to `public/manifest.json`'s `start_url: "/"` (added in the prior home-screen-icon fix) combined with `src/app/page.tsx` redirecting `/` to `/team/demo-team` — Safari now launches standalone web-app icons at the manifest's fixed `start_url` rather than the page they were added from. Removed the `start_url` key so it falls back to the referring page's URL per spec. `npm run lint` and `npm run build` both passed. Committed on `fix/home-icon-wrong-team-url`, merged to `main`, pushed (Vercel auto-deploys from `main`); branch deleted locally and on remote. Real team URL confirmed by user: `https://practice-runs.vercel.app/team/uncrowned-kings`. Still pending: user re-verification on-device after deploy, including deleting and re-adding the existing stale home-screen icon (iOS caches the manifest per already-installed icon, so the old one won't self-correct).
