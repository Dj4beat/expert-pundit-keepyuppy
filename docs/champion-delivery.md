# Champion update delivery

This records the earlier champion update. The attempt-based character tour supersedes the level and results behavior below; see [the current handover](HANDOVER.md) and README. Its new UI still requires browser/device acceptance.

Open `KeepyUppy-Focus.html` for the self-contained camera game, or run `npm run dev` and open `/?focus`. The original `KeepyUppy.html` remains separately playable. No publication or online competition is included.

## Delivered behavior

- A first-visit 34-second cinematic with independent portrait and landscape framing, twelve legends, real camera-game rendering and an original synthesized soundtrack. Replay is available on menus and results. Permanent sound, skip and play controls cover autoplay restrictions and media failure; reduced motion starts on the poster.
- Level Challenge remains the opening mode. Score Challenge offers 2 Minutes, 5 Minutes and Unlimited. Only full timed survival qualifies; Unlimited banks on drop or Finish run. Introduction and pause time never consume challenge time.
- Remembered names are captured at run start. Duration and difficulty boards are separate from level boards; score, perfect touches and best chain determine ranking, with stable exact ties. Personal bests and board leaders are announced.
- Camera saves migrate from v1 to v2; old Endless entries become Unlimited records named “Earlier run.” Original-game saves are untouched. Blocked storage leaves session play available with a visible notice.
- Optional 45-second idle attract mode shows an unranked demonstration and real local boards. It never posts a record, and its dismissal input cannot reach gameplay.
- The Focus portable includes the trailer assets. The original portable excludes them. The hosted camera game supports an explicit full offline download; video is outside the initial service-worker cache (posters are included) and cached video is played as a Blob URL.

## Source and artifacts

See [trailer production](trailer-production.md) for editable sources, exact timing and reproduction commands. Runtime films and posters are in `public/trailer/`. Frame captures, silent masters, soundtrack, cue metadata and technical verification are in `output/trailer/`.

The main integration lives in `src/focus/index.ts`; presentation ownership and media lifecycle are isolated in `src/focus/presentation.ts`. Simulation and saved records live in `simulation.ts` and `progress.ts`. Offline/export regression tests ensure movies stay outside minimal installation and the original portable.

## Validation

All 147 automated unit tests pass. TypeScript, ESLint, Prettier and the production build pass. The build emits the existing large-bundle advisory; it is not a build failure. Unit tests cover deadline ordering, post-deadline input, early drops, manual finish, names, ranking ties, board separation, migration, failed storage and duplicate results. Dedicated Playwright checks cover trailer and attract lifecycle alongside the playable interface, but could not execute here: native Chromium aborts with a sandbox operation error, local server binding is blocked, and Windows PowerShell interop fails at the WSL socket layer. The browser escalation request was automatically rejected by the permission policy. All 47 checks in the local LinkeDOM/native-Canvas harness passed against the compiled UI, including complete 120/300-second runs, pause/countdown exclusion, real-board attract playback, reduced-motion changes, media retry and cached Blob playback; this is not a substitute for browser validation.

Separate visual review found and corrected two issues: partially hidden landscape branding and missing star glyphs in the native renderer. Stars now use drawn geometry so the five-star sequence is independent of font glyph support. A separate integration review also corrected stale prior-cache selection, media-error retries and reduced-motion propagation. Both final encoded streams decode without errors: landscape is 5,348,067 bytes and portrait 5,374,636 bytes; each contains 1,020 frames at 30 fps over exactly 34 seconds. Final AAC audio measures −17.0 LUFS and −1.2 dB true peak.

To reproduce the additional DOM checks with optional QA dependencies:

```sh
npm install --prefix /tmp/keepy-focus-qa linkedom @napi-rs/canvas
FOCUS_QA_MODULES=/tmp/keepy-focus-qa/package.json node scripts/verify-focus-dom.mjs
```

The machine-readable result is `output/focus-review/dom-checks.json`. `node scripts/verify-focus.mjs` regenerates the portable `output/focus-review/controls.html` for later browser interaction review. Neither harness reads or modifies real player saves.

The final Focus portable is 22,330,609 bytes including both videos and posters. The original portable is 7,386,057 bytes and contains no embedded MP4 data. Both final movie byte streams were checked against the embedded Focus assets; the full offline manifest includes both orientations.

## Outstanding acceptance

Normal-speed human listening and viewing with sound/muted, physical Android Chrome and iOS Safari, and hosted offline playback on those devices require an interactive browser/device environment. Automated full-stream decoding, signal measurements and sampled frame inspection do not substitute for those checks.
