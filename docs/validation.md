# Validation record

**Latest required names and high-score tables:** 182 unit tests pass. See [the current handover](HANDOVER.md) and README. Browser/server execution remains blocked; the previous 47 DOM checks do not verify the current high-score/name-entry UI.

**Current camera-game update:** see [champion delivery and verification](champion-delivery.md) and [the session handover](HANDOVER.md). The notes and 75-test count below are historical; the champion update passed 147 unit tests and 47 DOM/Canvas checks. Real browser/device acceptance for that update remains outstanding.

The 3D implementation has a separate, newer [benchmark validation record](3d-benchmark.md). The historical notes below describe the original game; their blanket download/browser restrictions are superseded where the newer record includes executed evidence. The full roster has not yet migrated to 3D.

Implementation date: 2 October 2026. The automated model/harness suite currently passes 75 tests. This is an implementation build, not a claim of completed release acceptance.

## Executed here

- TypeScript strict type checking and Vite production compilation.
- Deterministic model tests for difficulty boundaries, early/late arcs, automatic body-part selection, perfect streaks, floor detection, render-cadence independence, stale timestamps, rapid-tap resistance, speed ceiling, ability activation/charges, fever, signature/event sequencing, and alternating multiball windows.
- All 36 configured career challenges simulated to three-star completion.
- Progression tests for all twelve unlock routes, first/star rewards, replay deduplication, difficulty records, all thirty levels, shop deductions/gating and capped upgrades.
- Persistence tests for round-trip export/import, reload, corrupt primary recovery, invalid imports, unavailable storage, v1 migration and duplicate awards after reload.
- Service-worker logic tests using a controlled cache/fetch harness: scoped starter install, complete-manifest readiness, interrupted download/resume, offline navigation and assets, and explicit update activation.
- Original generated character artwork visually inspected together; all twelve full-body silhouettes, faces, hands, and footwear reviewed. All six venues reviewed together for distinct scenery and unobstructed playing surfaces; court art inspected at full size.
- Optimized artwork: twelve character WebPs plus six venue WebPs, with original masters kept separately. Source assets contain alpha channels; the apparent dark glow in the image tool preview is transparent outside each character.
- A standalone HTML build with embedded artwork/fonts. This is built, not browser-verified.

The final terminal test output is the authority for the exact passing test count. Run `npm test`, `npm run lint`, `npm run format:check`, and `npm run build` to reproduce checks.

## Blocked by this environment

| Check/action                | Observed limitation                                                                    | Consequence                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Fresh dependency download   | npm/curl DNS resolution fails; permission policy rejects elevation                     | Used installed local tooling. Fresh `npm ci` unverified.                                   |
| Vendoring Phaser 3.90.0     | Download blocked by the same network restriction                                       | Local artifact runs Canvas recovery renderer. Phaser adapter is authored but not executed. |
| Vite preview server         | `listen EPERM` on 127.0.0.1                                                            | Could not serve a local test URL.                                                          |
| Playwright Chromium startup | Browser sandbox-host syscall rejected (`Operation not permitted`)                      | Browser suite and screenshot capture are authored but not run successfully.                |
| GitHub publication          | No working Linux `gh`; Windows CLI interop cannot open its socket; network unavailable | No repository, live site, or deployed URL was created.                                     |
| Root Git metadata           | `.git` is a protected placeholder, not a readable repository                           | No root commit; publication helper uses isolated staging.                                  |

No visual/UI screenshots from a running browser are included or claimed. `output/character-review.jpg` is an art contact sheet, not a game screenshot. The replayable in-app guide creates scene snapshots from the real renderer at runtime and live career/shop examples. Real mobile screenshots remain outstanding.

## Required before release acceptance

- Run the included Playwright suite in Chromium, WebKit and Firefox, with locally vendored Phaser enabled.
- Run the screenshot capture command. Inspect 320/390 px phones, tablet, desktop and rotated landscape. Check all dialogs, legibility, horizontal overflow, touch target size and keyboard focus.
- Inspect every character in idle, foot, knee, header, recovery, signature, celebration and defeat motion. Confirm actual ball/limb contact and no cutout seams, floating limbs or clipping. Authored pivots are shared from the neutral-pose art template and may need per-character tuning after this review.
- Play for several minutes on physical mid-range Android Chrome and iOS Safari. Measure frame rate and memory after switching all legends/venues. Check 60 fps target, reduced effects, high contrast, optional vibration, muted play, audio permission, tab switching, screen lock and resume countdown.
- Run the real-browser offline checklist in `deployment.md`: fresh install, interrupted download, cache eviction, offline browser relaunch, old/new tabs and version updates, both on localhost and actual GitHub Pages subpaths. Harness tests do not prove real service-worker/browser integration.
- Verify economy pacing with human play across all difficulties; automated perfect play proves targets are possible, not that human difficulty is balanced.
- Verify the portable HTML by opening it directly in desktop browsers. Some mobile platforms preview HTML files rather than opening them as runnable pages; use the hosted site on those platforms.
- Run publication only after the visual/browser checks pass, and verify the final public URL.
