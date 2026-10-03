# KeepyUppy handover — 3 October 2026

## Latest request: publish to GitHub and add creator credit

Publication is explicitly authorized. The user successfully created and pushed `Dj4beat/expert-pundit-keepyuppy` using Windows PowerShell. The real release checkout is `output/github-pages-source` on `main`; `output/github-ready-source` is an older unused staging folder. GitHub Actions run `37130408355` failed in browser tests: 39 passed, 11 failed, one skipped (Firefox desktop has no touchscreen). Pages publication has **not** been confirmed. The Node.js action-runtime and Ubuntu migration annotations were warnings, not the failed step.

The user saved the failed-step log to `output/github-build-failure.log`. Fixes now prepared:

- Hide decorative original-game navigation icons from accessible names, so buttons have their visible text names.
- Assert the native `disabled` property on character options. Playwright's enabled/disabled matcher follows their enclosing label to the select instead of checking the option.
- Control browser time in the original-game input tests, await asynchronous run startup, and send actual mouse/touch/keyboard events without real-time contact-window races. Keep all browser checks, including a stronger keyboard-repeat assertion.
- Add `scripts/resume-publish.ps1` to push the reviewed existing checkout, watch the push run matching that exact commit, save failed-step logs automatically, and verify the deployed creator credit after success. The original `publish.ps1` is only for initial repository creation and must not be rerun against this existing repository.

Both editions contain “Created by Adrian Dane” linking to `https://whatchan.co.uk/about-whatchan-adrian-dane#stat-man`. The hosted homepage opens Focus; `?classic` retains the original. Both portable editions are CI artifacts.

Validation after these fixes: all 184 unit tests pass; lint, formatting, TypeScript and the production build pass. Browser execution remains pending on CI.

This terminal cannot resolve GitHub or launch Windows executables (WSL socket failure). Sandbox escalation was rejected by policy. Continue through the user's working Windows PowerShell and existing GitHub login; deployment permission is already given. The local browser attempt could not start its Vite server. CI must validate the revised browser suite before deployment is considered complete; do not report it as passing from unit-test results alone.

## High scores and required names

High-score tables now appear below the court and inside results. They show the top five qualifying runs for the selected level/difficulty (or score-challenge character/duration/difficulty), highlight the player’s entries and latest run, and report table rank and personal best. Personal bests are retained beyond the top five. Existing scores and unlocks are preserved; competition remains local to this device.

A name is required before every playable mode starts, including the trailer Play route. Blank and punctuation-only input is rejected and focused with a visible explanation. Names are limited to 12 characters, must include a letter or number, and are remembered. Old default `PLAYER` names require explicit entry; previously entered real names remain usable. Automated demos remain unranked without name entry.

The current suite passes **182 unit tests**, including ten new name/high-score checks. Browser tests now cover mandatory names and the result table. Browser/device verification remains outstanding in this restricted environment. Check the full results dialog on narrow/short screens and validate name entry from the menu and trailer.

## Attempt rounds and character venues

Tour rounds now have a fixed attempt budget, **12 in round 1, increasing by two to 34 in round 12**, with no timer. Each successful touch or drop consumes one attempt; stray taps do not skip attempts. The last ball always gets its full timing/save window. Land at least half the attempts and finish the round to unlock the next character. Drops reset the ball until the budget is exhausted. Results remain explicit and wait for Continue/Replay/menu.

**100% perfect on a completed round earns five stars and the 50% flawless bonus.** Every attempt must be perfect, with no drops or stray taps. Summary accuracy includes stray taps and drops; the displayed value is 100% only for a flawless run. All twelve rounds still increase in pace and retain their character skills.

Characters now select a venue image and label in Tour, Practice and Score Challenge. The six existing venues are shared by pairs of characters, with a different background at each consecutive tour stage. The README lists the assignments. Both character and venue images load before play.

Existing stars/unlocks are honored. Previous timed-tour scores (`rounds`) are retained under Earlier records; new attempt-tour scores use `attempts`. Character-specific `skills` boards are unchanged. The Focus v2 storage key remains; the original game save is untouched.

Previous attempt/venue verification: **172 unit tests passed**, including final late touches beyond 60 seconds, final drops, five-star accuracy, every round/difficulty, and renderer venue switching. TypeScript and the production build pass; both portable files and `dist/` are rebuilt. The Focus portable includes all six venue images and both trailers. Browser checks were attempted but the local test server could not start. Browser/device acceptance remains outstanding: this environment has previously blocked Vite binding (`listen EPERM`) and native Chromium (`Operation not permitted`). Prior DOM/visual evidence below predates this change.

Next acceptance: open the rebuilt `KeepyUppy-Focus.html`; check the attempt counter, final ball, result accuracy/stars, Continue/Replay/menu, venue switching and character close-ups on phones. Run `npm run test:browser` in a browser-capable environment. The earlier attempt/venue update was not published; publication is now authorized as described above.

## Previous champion update

The champion update is implemented and built locally. Documentation and artifacts are saved in this workspace; continuing does not require the previous chat. Start with this file, [delivery and verification](champion-delivery.md), [trailer production](trailer-production.md), and the root [README](../README.md).

The active direction remains the camera-led Focus game. Open `KeepyUppy-Focus.html` directly, or run `npm run dev` and visit `/?focus`. The original illustrated game remains in `KeepyUppy.html`. The rejected 3D benchmark is retained for reference; do not restart that direction.

## Completed

- Both 34-second trailers, independently composed at 720p and 30 fps, with all twelve legends, actual camera-game footage and an original synthesized soundtrack. Final H.264/AAC files are `public/trailer/landscape.mp4` (5.35 MB) and `portrait.mp4` (5.37 MB); posters are alongside them.
- First-visit trailer, remembered dismissal/completion, replay, sound/skip/play controls, autoplay failure handling, reduced motion and hidden-tab pause.
- Score Challenge: 2 Minutes, 5 Minutes and Unlimited. Level Challenge remains the initial mode. Only full timed survival qualifies; pause/countdown time is excluded, and deadline/drop ties favor completion.
- Player names, duration/difficulty boards, stable score/perfect/chain ranking, personal-best and board-leader notices, and camera v1-to-v2 save migration. Old Endless entries are labelled “Earlier run.” Original saves remain separate.
- Optional 45-second idle attract mode, real local records, safe dismissal and independent unranked demonstration.
- Full offline download and cached-video Blob playback. The Focus portable embeds both movies; the original portable excludes them. Both portables and `dist/` have been rebuilt.

## Verification already performed

147 unit tests and 47 compiled DOM/native-Canvas interaction checks passed. TypeScript, ESLint, formatting and production build passed. Both films fully decoded without errors and contain exactly 1,020 frames over 34 seconds. Independent visual and code reviews were completed; their fixes are included in the final build.

Evidence is in `output/focus-review/dom-checks.json`, `output/trailer/media-verification.json`, `output/trailer/audio-verification.json`, and the source/encoded review images under `output/trailer/`. Older Focus screenshots are historical and are not evidence of current browser verification.

## Additional acceptance still outstanding

1. Watch both final films completely at normal speed, with sound and muted. Review music, timing, titles and portrait framing. Editable composition/audio/render sources and exact reproduction commands are in `trailer-production.md`.
2. In an environment that permits browser execution, run `npm run test:browser`. The new `tests/browser/focus.spec.ts` includes name entry, high-score results and tour scenarios across three configured browsers. Check actual media playback and responsive UI in addition to the tests, which mock media playback.
3. Test the Focus portable and hosted `/?focus` flow: first/return visits, skip/replay/sound, hidden tabs, reduced motion, name editing, timed runs, scoreboards and attract dismissal.
4. Verify production offline download, disconnected replay, and update behavior. Test physical Android Chrome and iOS Safari when devices are available.
5. Record those acceptance results before treating this as a release. The repository exists, but successful Pages publication is unconfirmed; do not assume a live URL. The latest request authorizes publication once access is available.

## Environment and safeguards

Native Chromium and local server binding were blocked by sandbox restrictions; browser escalation was automatically rejected. Windows PowerShell interop also failed at the WSL socket layer. The 47-check DOM harness is useful evidence, not browser/device acceptance. Optional harness dependencies and its invocation are documented in `champion-delivery.md`.

The root workspace Git metadata remains protected. The separate `output/github-pages-source` checkout contains the repository published by the user; its first commit is backed up remotely. Successful Pages deployment remains unconfirmed. Keep all source, `public/trailer/`, generated portable files and `output/trailer/` when moving the project. Do not delete or reset player saves to verify the application; the test harnesses use isolated storage.

Camera save: `expert-pundit-keepyuppy-focus-v2`; legacy camera migration source: `expert-pundit-keepyuppy-focus-v1`; remembered intro: `expert-pundit-keepyuppy-focus-intro-v1`. The original game uses `expert-pundit-keepyuppy-v2` and must remain untouched. All play stays free; online competition is a future addition.
