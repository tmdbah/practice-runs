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

**First attempt (insufficient):** removed the hardcoded `"start_url": "/"` key from `public/manifest.json`, reasoning that an absent `start_url` defaults to the referring document's URL per the Web App Manifest spec. Deployed and verified via `npm run build` + lint, but the user's on-device screenshot after the deploy showed Safari's "Add to Home Screen" sheet still pre-filling the bare site root (`https://practice-runs.vercel.app/`) instead of the real team URL they were on. This proved the bug wasn't the *value* of `start_url` — Safari/WebKit has a known quirk where a missing `start_url` resolves relative to the manifest file's own location (site root, since `manifest.json` lives at `/manifest.json`) rather than the referring page, unlike Chrome. No manifest content change could fix that; the manifest itself had to stop being linked for iOS purposes.

**Actual fix:** removed `manifest: "/manifest.json"` from `src/app/layout.tsx`'s metadata export entirely. Confirmed via grep that this was the only reference to the manifest anywhere in `src/`. iOS's home-screen icon and standalone (chrome-less) launch don't actually depend on the Web App Manifest at all — they come from `public/apple-touch-icon.png` (auto-discovered by Safari at its well-known path, no `<link>` tag needed) and the `appleWebApp: { capable: true, ... }` metadata field (generates the `apple-mobile-web-app-capable` meta tag, which doesn't reference any URL). Once Safari no longer sees a linked manifest, its buggy `start_url` resolution never triggers, and Add to Home Screen goes back to saving the literal current page URL — the pre-regression behavior — while the crest icon and standalone launch stay intact.

This touches `src/app/layout.tsx`, so per this project's Claude Code plan-mode rule it went through `/plan` (approved) before implementation, same as the original icon fix.

`public/manifest.json` and `public/icons/icon-192.png`/`icon-512.png` are left on disk, now unlinked/unused but harmless — not deleted, per the "don't delete files without confirmation" rule. `public/apple-touch-icon.png` stays in active use.

**Verification caveat (still applies):** iOS caches manifest/PWA data per already-installed home-screen icon. The user's existing "Practice Runs" bookmark won't self-correct — it needs to be deleted and re-added from the real team's URL after this deploy lands.

## History

- 2026-08-01: User reported Add to Home Screen was saving the demo team instead of the real team. First fix attempt removed `manifest.json`'s hardcoded `start_url: "/"`; passed lint/build, committed on `fix/home-icon-wrong-team-url`, merged to `main`, pushed, branch deleted. User re-tested on-device post-deploy and sent a screenshot showing the Add-to-Home-Screen sheet still resolving to the bare site root instead of `/team/uncrowned-kings` — the first fix didn't work.
- 2026-08-01: Re-diagnosed: the bug is a WebKit quirk in resolving an *absent* `start_url` (against the manifest's own site-root location, not the referring page), not the value written in the manifest. Entered plan mode (required for the `src/app/layout.tsx` change), plan approved, then removed `manifest: "/manifest.json"` from `layout.tsx`'s metadata entirely — iOS's icon/standalone behavior comes from `apple-touch-icon.png` (auto-discovered) and the `appleWebApp` capable meta tag, neither of which need the manifest link. `npm run lint` and `npm run build` both passed. Pending: commit, branch/merge/push, and user re-verification on-device (delete + re-add the stale home-screen icon, confirm the Add-to-Home-Screen sheet shows the real team URL before tapping Add).
