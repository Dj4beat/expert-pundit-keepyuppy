# Ronaldinho 3D review milestone

This is an implementation study, not an accepted visual-quality milestone or the completed twelve-player rebuild. Open `KeepyUppy.html`, then the gold 3D study link at the top of Play. On a server, use `/?benchmark` or the same query at the deployed subpath.

The original game remains available, including its complete roster, progression and version-2 saves. The study is isolated and never awards coins or writes progress. The old gameplay renderer and Phaser adapter are deliberately still present until the review gate is passed; switching the whole game now would falsely represent the remaining legends as rebuilt.

## Implemented

- Three.js 0.180.0, TypeScript and Vite. A 3D football, fixed three-quarter camera, real shadow-receiving ground and the retained neighbourhood illustration. A neutral side inspection camera avoids claiming the background matches two perspectives.
- A continuous anatomical MakeHuman core mesh, adult-male macro targets, customized proportions, weighted kit, boots, eyes, scalp, fitted headband and ponytail. Body geometry is not assembled from rigid primitives. Hidden body surfaces are removed underneath the kit to avoid intersections; the complete original topology remains in the source OBJ.
- A shared 53-joint deform skeleton with the core skin weights, baked ordinary-foot/knee/header clips, relaxed readiness, recovery/miss variants, celebration and defeat. The editable Blender file retains the rig, materials, weights and actions. These are an initial authored study and still need artistic review, especially likeness, garment finish and movement character.
- A deterministic 240 Hz simulation measured in metres. Every attempted scheduled contact records its limb, expected/actual time, actual world point and outcome. Feet alternate, both knees appear and headers use a smaller reach budget. Early/late input affects the next flight immediately. Out-of-reach touches are rejected.
- Preparation before the contact time, authored weight shift and counterbalancing arms. Runtime leg correction is limited to 0.24 radians per involved joint, never scales bones or moves the root, and leaves the supporting leg unchanged. Header reach is deliberately narrower. Small bounded head tracking follows the ball between touches; full head/neck IK remains unfinished.
- Tap/click/Space, three difficulty tiers, pause/resume countdown, side camera, quarter speed and a 30-second automatic replay ending in a drop. Replay scores cannot enter the existing economy. Video capture uses the actual WebGL canvas and browser MediaRecorder; no camera or microphone access is requested.
- GLB/contact-manifest preloading and GPU shader preparation before countdown. Models are included in both the hosted offline manifest and embedded portable HTML. Low-quality mode lowers shadow/resolution cost while retaining animation sampling.

## Asset sources and reproducibility

`assets/3d/source/provenance.json` records source URLs and SHA-256 hashes. MakeHuman [core assets are CC0](https://static.makehumancommunity.org/about/license.html), including the supplied mesh, macro targets and weights. This is separate from the applications' source-code licences. No third-party clothing, paid model or unverified community pack is included.

The custom authoring script is `scripts/build-player.py`. It creates `assets/3d/blender/ronaldinho.blend`, `public/models/ronaldinho.glb` and `public/models/ronaldinho.contacts.json`:

```sh
blender --background --factory-startup --python scripts/build-player.py
npm ci
npm test
npm run lint
npm run format:check
npm run build
```

Authoring was executed with Blender 4.5.3 LTS, obtained from the [official Blender distribution](https://download.blender.org/release/Blender4.5/). The installation in `/tmp` is disposable; the source assets and editable file are in the workspace. Three's [animation system](https://threejs.org/manual/pages/animation-system.html) drives the exported clips.

The existing dependency installation contains links outside the writable workspace. New Three packages were fetched as registry tarballs and installed locally; the checked-in manifest and lockfile use ordinary registry versions and integrity hashes. A clean network-backed `npm ci` should also be verified on the eventual deployment host.

## Review and recording

Use **Play a round** for manual input or **Watch 30-second benchmark** for the scripted contact sequence. **Record this benchmark** restarts the replay, records the visible canvas and exposes a download link after the drop. Camera and quarter-speed controls should be selected before recording. The displayed marker-gap metric measures animation contact markers; it cannot detect every mesh intersection or prove artistic quality.

For deterministic stills, append `&at=1.5` (first foot), `&at=4.36` (preparation for a knee), or `&side`. These are inspection controls, not unlock/progression cheats. Quarter speed uses the same simulation clock and clip samples.

To record with the screenshot CLI on a machine where it is installed:

```sh
playwright screenshot --browser chromium --viewport-size '1000,850' \
  --wait-for-selector 'body[data-capture="complete"]' --timeout 180000 \
  --user-data-dir /tmp/keepy-capture-profile \
  'file:///ABSOLUTE/PATH/KeepyUppy.html?benchmark&capture' /tmp/keepy-final.png
node scripts/extract-benchmark-capture.mjs /tmp/keepy-capture-profile
```

Use a fresh, dedicated capture profile for each recording; do not point this helper at your personal browser profile. The helper reads only the capture JSON from uncompressed Chromium storage; use the page’s download link if storage compression changes. Playwright `--save-storage` can be used for hosted URLs, but omits `file://` storage.

Add `&side` and/or `&slow` for the other camera and quarter speed. Only the explicit `capture` query writes the temporary `keepy-study-capture` recording key; ordinary play/recording does not. This key is separate from save data and can be removed after extraction. Videos and contact logs are written to `docs/recordings/`. Recorded FPS in this software-rendered environment is not a physical-device performance result.

## Validation and remaining gates

The automated suite covers the original simulation, powers, multiball, progression, saves and service-worker harness, plus the new 30-second mixed-touch sequence, limb reach, stale/rapid input, cadence independence, paused clip sampling, GLB contents, exported marker alignment and planted supporting ankles. A portable-export regression test runs the exporter on executable source containing JavaScript replacement tokens: this caught a real blank-page fault after adding Three.js.

Browser evidence and the final executed counts are recorded below after capture. The hosted Playwright suite cannot start its local web server in this environment. The screenshot CLI can open the embedded file, allowing genuine WebGL screenshots and recordings without a server. This does not substitute for the blocked server suite or real service-worker tests.

Before extending to the eleven other legends:

1. Review normal and quarter-speed gameplay/side recordings; assess Ronaldinho likeness and garment finish. The current model is an initial study, not a finished likeness.
2. Reject any sliding feet, joint collapse, snapping, contact gaps or ball penetration. Static ankle/marker tests alone cannot pass this gate. Recovery variants, anticipation and gaze need an animator's review; signature moves are intentionally deferred.
3. Complete manual-input browser tests, including pause, resume, lost focus, rotation and all difficulty tiers. Review actual model performance on Android Chrome and iOS Safari; software Chromium is not representative.
4. After approval, integrate anatomical contacts with the complete progression/power/multiball game, adapt all eleven remaining meshes and movement accents, replace the old renderer/Phaser host, and review every venue combination. Focus-power integration with the new rig is still pending; quarter-speed review is not a claim that this is done.
5. Verify real hosted offline install/update/relaunch and portable use on target devices, then publish and verify the deployed URL. No deployment is claimed for this study.

## Executed evidence — 2 October 2026

- **86 tests passed** across five files. TypeScript strict checking, ESLint, Prettier and the production/portable build passed. Vite reports a 667 kB uncompressed shared bundle; code splitting is deferred while the portable edition uses one embedded module.
- Final GLB: 1,407,304 bytes, SHA-256 `5709269f9b2d8a7579cd133734836bd8cc6a46f51edbfc86af68c8d3ffd55c23`. Editable compressed Blender source: approximately 1.83 MB. Twelve named clips and one shared deform skeleton are embedded in the GLB.
- Offline manifest `5bab91e5be8d31e4` includes 32 files, including the GLB and contact manifest. The deployed-output model files match their source hashes. The self-contained HTML is approximately 7 MB and loaded successfully from `file://` in Chromium.
- The exported contact markers match their manifest within 2 mm. Support ankles stay planted within 2 mm over every ordinary touch clip. Foot markers are projected onto the deformed boots and checked against exported skinned triangles within 4 mm.
- Actual browser video review caught procedural head/IK rotation accumulating when Three skipped unchanged animation tracks. The renderer now restores procedural edits before resampling; a regression test repeats a paused pose 240 times and verifies bounded rotations and exact restoration. Old recordings from before this fix were discarded.
- Missed touches continue at the expected animation phase instead of rewinding to a new contact. A separate regression test checks that continuation. The portable-export regression protects JavaScript containing `$&` and other replacement tokens.
- Dedicated browser-profile inspection confirmed that opening the isolated study does not create the legacy save key. The original menu still opens, including its roster and the new study entry.
- Chromium mobile and desktop screenshots are in `docs/screenshots/3d/`. These are browser viewport captures, not physical-phone screenshots. Frame sequences extracted from the actual recordings were inspected for contact and transition defects.
- Four current recordings are in `docs/recordings/`: `ronaldinho-gameplay-normal.webm`, `ronaldinho-gameplay-quarter.webm`, `ronaldinho-side-normal.webm` and `ronaldinho-side-quarter.webm`. Each runs the same 32.38-second simulation with 21 successful touches and a final drop, including both feet, both knees, headers and early/late outcomes. Quarter-speed recordings take longer in real time. Sampled marker gaps range up to 1.30 cm; they are not a mesh-penetration or visual-acceptance certificate. Adjacent JSON files contain contact logs; `manifest.json` records build/model/video hashes.
- `npm run test:browser -- --project=chromium` remains blocked because its configured local server cannot start. A WebKit screenshot attempt also failed because that tool's WebKit executable is absent. Neither iOS Safari nor physical Android performance has been tested. No hosted offline or deployed URL verification is claimed.

The remaining visual concerns are a rough likeness, angular garment hems/neckline, limited movement variety and an intentionally simple ready stance. These prevent a claim that the lifelike-stylized acceptance gate has passed. Signature footwork, all other legends and complete-game integration remain subsequent work after this review.
