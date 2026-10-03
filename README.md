# Expert Pundit KeepyUppy

**Next session:** read [the current handover](docs/HANDOVER.md) for completed work, saved artifacts and remaining acceptance checks.

A mobile-first, local-save football timing game in the Expert Pundit arcade collection. The implementation includes Career, Endless, Practice, a first-play lesson, twelve legends, six illustrated venues, earned coins, thirty levels, mastery, cosmetic unlocks, automatic abilities and bonus events.

**Current review build:** open `KeepyUppy-Focus.html` for the camera-led level game described below. The original illustrated game remains in `KeepyUppy.html`; its previous animation pass was rejected in visual review. Existing roster, unlocks and saves remain in that original game.

The 3D experiment was declined in review. Its source remains available at `?benchmark` for reference, but it is no longer promoted in the game or the direction for further work. See [the archived study](docs/3d-benchmark.md) for its assets and limitations.

## Character tour: fixed attempts

Open **`KeepyUppy-Focus.html`**, or open the hosted/dev homepage (`?focus` remains supported; `?classic` opens the original). The default **Character tour** has twelve rounds, each starring a different legend. Tour rounds have **no time limit**. The attempt count and touch target stay above the court.

- Ronaldinho starts unlocked. Round 1 has **12 attempts**, increasing by two each round to **34 attempts** in round 12. A successful touch or dropped ball uses one attempt; stray taps do not use extra attempts. The final ball gets its full early/perfect/late window and only resolves on a touch or drop.
- Land at least half the attempts (6–17 touches) and finish the full round to unlock the next character. Reaching the target early does not end the round. Dropped balls reset automatically until the attempt count is exhausted and break the perfect chain. Each successive round starts faster.
- After the final attempt, a full-screen summary shows completion or target missed, attempts, perfect accuracy, score, stars, touches, drops, best chain and the next character’s skill. A completion sound plays if sound is enabled. **Continue** starts the next character with a fresh countdown; **Replay** retries the current round. Results stay until you choose an action, and idle attract mode cannot cover them.
- **100% perfect = five stars:** every attempt must be perfect, with no drops or stray taps. For example, a clean 12/12 perfect first round earns five stars and the 50% flawless bonus. Accuracy includes stray taps so it cannot show 100% with a lower star rating on a completed round.
- Missing the target or leaving early does not unlock the next round. Finishing round 12 completes the tour. One star is sufficient to advance; characters unlocked on any difficulty become selectable in Practice and Score Challenge. Round progression and star collections remain separate by difficulty. No coins or purchases are required in Focus.
- **Score Challenge** retains its explicit 2 Minutes, 5 Minutes and Unlimited options. Timed runs must survive without a drop to qualify; Unlimited banks on drop or Finish run. **Practice** runs at a steady pace with automatic ball resets and no ranked rewards. Both modes offer the unlocked-character selector.

Each character now selects both artwork and background, including the venue label, in Tour, Practice and Score Challenge. The six existing illustrated venues are reused as follows; every consecutive tour round changes scenery:

| Venue             | Characters                |
| ----------------- | ------------------------- |
| The Neighbourhood | Ronaldinho, Maradona      |
| Beach Promenade   | Okocha, Pelé              |
| Rooftop Pitch     | Baggio, Messi             |
| The Urban Cage    | Best, Ronaldo Nazário     |
| Training Ground   | Cruyff, Henry             |
| The Grand Stadium | Zidane, Cristiano Ronaldo |

### Character skills

Skills apply automatically in every Focus mode. They are arcade balancing choices, not ratings of the real players. The selected skill is explained above the court; the character’s artwork and court name change with the selection.

| Round | Character         | Skill            | Gameplay effect                               |
| ----- | ----------------- | ---------------- | --------------------------------------------- |
| 1     | Ronaldinho        | Samba touch      | 25% wider perfect window on both feet         |
| 2     | Jay-Jay Okocha    | Rainbow control  | 40% wider perfect window on knees             |
| 3     | Roberto Baggio    | Divine touch     | 15% wider perfect window on every touch       |
| 4     | George Best       | Quick feet       | Perfect foot touches score 20% more           |
| 5     | Johan Cruyff      | Total control    | 25% wider early/late save window              |
| 6     | Zinedine Zidane   | Silky control    | Early/late saves earn 100 instead of 40       |
| 7     | Pelé              | King of the air  | Perfect headers score 50% more                |
| 8     | Diego Maradona    | Left-foot magic  | 50% wider perfect window on the left foot     |
| 9     | Thierry Henry     | Elegant finish   | Perfect right-foot touches score 35% more     |
| 10    | Ronaldo Nazário   | Phenomenon       | Perfect knee touches score 50% more           |
| 11    | Lionel Messi      | Close control    | 40% wider early/late save window on both feet |
| 12    | Cristiano Ronaldo | Aerial precision | 50% wider perfect window on headers           |

Base perfect touches award 300 × the current perfect-chain multiplier, capped at ×5. Early/late saves normally award 40 and reset the chain. Skills modify the stated timing windows or points. A completed round earns one star; perfect accuracy (perfect touches divided by accepted touches + stray taps + drops) earns two at 50%, three at 75% and four at 90%. Five stars requires every touch perfect, no stray taps and no drops, and adds a 50% score bonus. Best earned stars never decrease.

Enter a player name before starting any playable mode. Blank names and punctuation-only names are rejected; names can contain 1–12 characters and must include a letter or number. The field appears above the court, and the trailer’s Play button uses the same check. Entered names are remembered across visits; the old automatic `PLAYER` placeholder must be replaced or explicitly entered. Demos remain unranked and do not require a name.

The **High scores** table appears directly below the court and inside the results screen, showing rank, name, score and stars for each level. Your entries are highlighted, the newest entry is marked **THIS RUN**, and results show its table rank. Your personal best remains visible even if it falls outside the top five. Replay lets you challenge the top score; five-star results suggest trying the next character or a harder difficulty. These tables are local to this browser/device.

Named local scoreboards keep the top five qualifying runs, separated by tour round/difficulty or character/duration/difficulty. Ranking uses score, perfect touches, then best chain, preserving exact ties. Existing Focus stars and unlocks carry forward. Scores from the previous rules remain viewable under **Earlier records · previous rules**, including the prior timed-tour scores, separate from current attempt-round and character-skill boards. The save remains `expert-pundit-keepyuppy-focus-v2`, with `attempts`/`skills` board categories; camera v1 migration is retained. The original game’s `expert-pundit-keepyuppy-v2` save is separate. Storage failure leaves session-only play with a visible notice.

Tap/click the court or press Space at the centre of the timing ring. Escape pauses. The camera returns to a wide player view between foot/knee/header close-ups and settles at the perfect timing moment. Still camera supports reduced motion. All twelve characters reuse the existing artwork and cropped-detail renderer; this is not a new character-animation rebuild. Physical-phone and per-character close-up review remain outstanding.

Implementation: `src/focus/characters.ts` defines the perks, `simulation.ts` owns timing/scoring, `progress.ts` owns unlocks/records, and `index.ts` / `scene.ts` / `style.css` provide the interface and rendering. `tests/focus-tour.test.ts` covers resolved attempts, final late touches beyond 60 seconds, five-star accuracy, recovery, progression, old-record separation and all twelve skills. `tests/focus-venues.test.ts` checks bundled scenery and renderer background/label switching. `tests/focus-high-scores.test.ts` covers required-name validation/migration, ranking, personal-best retention and safe table rendering. `tests/browser/focus.spec.ts` covers mandatory name entry (including the trailer route), result tables, attempts, continuation, character/venue selection and media flows, but browser execution is blocked in this environment. `node scripts/verify-focus.mjs` generates an isolated portable interaction review at `output/focus-review/controls.html` for use in a normal browser.

## Champion trailer and arcade presentation

First visits attempt muted inline playback of the original 34-second trailer. **Sound on**, **Skip intro**, **Play now**, and manual replay remain available. Completion or dismissal is remembered; returning players enter the menu. **Watch trailer** works from menus and results. Reduced-motion users get the poster and manual playback. Blocked autoplay and missing media leave the controls available, and hiding the tab pauses playback.

The two films are independently composed at 720×1280 and 1280×720, 30 fps, H.264/AAC:

- [Portrait trailer](public/trailer/portrait.mp4)
- [Landscape trailer](public/trailer/landscape.mp4)

They use all twelve existing legends, the actual `FocusScene` camera renderer and deterministic `FocusRound` footage, plus original synthesized stadium ambience, percussion, bass, swells and football impacts. Gameplay cuts and slow motion are editorial; the film does not substitute an invented gameplay animation. Editable composition and capture live in `scripts/trailer-composition.ts`, `scripts/trailer-capture.mjs` and `scripts/trailer-capture-offline.mjs`; soundtrack and final encoding are in `scripts/trailer-audio.py` and `scripts/render-trailer.py`. See [production and validation notes](docs/champion-delivery.md) for reproduction and review evidence.

After 45 seconds without interaction on menus, optional attract mode repeats a 24-second sequence: title (4s), unranked gameplay (12s), real device records (6s), and champion challenge (2s). Populated boards rotate across loops. Empty devices invite the first record. A key or pointer press dismisses without starting or scoring a run. Attract never runs during gameplay, results, pause, trailer or name editing; reduced motion uses static cards. Toggle it beside the player name.

The challenge clock advances only during simulation: intros, pauses, hidden tabs and resume countdowns consume no survival time. Completion wins an exact drop/deadline tie, and inputs at or after the deadline cannot score. Flawless bonuses remain exclusive to levels.

The Focus portable file embeds both trailers; the original portable file does not embed trailer media. Hosted playback requests only its selected orientation. The camera game registers offline support; **Download full offline game** explicitly downloads the full manifest, including both films. Initial service-worker installation excludes trailer video but includes posters. Cached films play through Blob URLs. All play remains free and competition stays on this device; online competition is a future addition.

## Run and build

Use Node.js 22 and npm 10 or later:

```sh
npm ci
npm run vendor:phaser
npm run dev
```

`vendor:phaser` downloads pinned Phaser 3.90.0 into `public/vendor/`. There are no CDN requests during play. Vite detects the local distribution at startup/build time. Phaser owns a responsive scene and presents the articulated renderer through a canvas texture, with `Phaser.AUTO` providing WebGL/Canvas selection. If the distribution is absent, the same simulation and scene renderer work directly on Canvas. Restart Vite after vendoring Phaser.

```sh
npm test                  # Deterministic simulation, progression, storage, service-worker tests
npm run lint              # ESLint / TypeScript rules
npm run format:check      # Reproducible formatting
npm run build             # Typecheck, static site, versioned offline manifest, portable HTML
npm run preview           # Serve the production build, including service worker
```

The supplied lockfile is reproducible. In this restricted workspace, verification used an existing local dependency installation matching the lockfile; a fresh network-backed `npm ci` remains to be verified.

```sh
npx playwright install --with-deps chromium webkit firefox
npm run test:browser
```

For screenshots, run `npx vite --mode test --port 4173`, then `npm run screenshots` in a second terminal. The capture script records phone/desktop menus, gameplay and all eight guide views. Test-only controls are excluded from production builds. Screenshot files will be saved in `docs/screenshots/` and `public/guide/`; none are claimed as captured in this delivery.

## Play

Tap anywhere on the court, click, or press Space once when the contracting ring reaches the contact spot and the **TAP** cue appears. Escape pauses. Visibility loss and window blur also pause; resume starts a three-second countdown.

- Perfect: controlled lift, maximum touch score, perfect streak.
- Early: a higher, longer arc. Late: a shorter, quicker arc.
- Out-of-window taps do not kick. Extra taps break the streak; rapid repeated taps also fail the required quiet interval.
- Main ball on the floor ends a run. Practice resets automatically and gives no progression rewards.
- White/gold/neon is the main ball. The smaller cyan ball is a bonus with alternating windows.

Casual, Standard and Expert change timing tolerances, not unlock eligibility. Records are separate. See [rules and balance](docs/rules.md).

## Project structure

- `src/engine.ts`: rendering-independent 240 Hz fixed-step simulation, timestamped input, seeded event order, powers and results.
- `src/benchmark/`: isolated Three.js review scene, skeletal animation/limited IK, deterministic anatomical contacts, playback and capture controls. It does not write progression or saves.
- `assets/3d/`: CC0 source mesh, macro targets, rig, weights, provenance hashes, and editable `blender/ronaldinho.blend`.
- `scripts/build-player.py`: reproducible Blender asset authoring and GLB/contact-manifest export.
- `public/models/`: exported skinned model, twelve clips and contact metadata. Included in hosted offline and portable builds.
- `src/content.ts`: roster, venues, all 36 challenges, prices, XP curves, achievements and signature motion definitions.
- `src/progress.ts`: versioned save validation/migration, unlocks, purchases, idempotent reward transactions and recovery backups.
- `src/renderer.ts`: articulated artwork, scenery/crowds, cues, effects and frame-rate adaptation.
- `src/illustrated-motion.ts`: eased preparation/recovery, shared pivots, connected leg solving and bounded contact poses driven by simulation time.
- `src/phaser-host.ts`: optional locally vendored Phaser scene host; identical Canvas recovery path.
- `src/main.ts` / `style.css`: responsive HTML menus, play controls, lesson, result dialogs, settings and the replayable playbook.
- `src/audio.ts`: original synthesized effects and optional music. No external recordings; music starts off.
- `src/offline.ts` and `scripts/sw-template.js`: progressive download, truthful completion reporting and between-run updates.
- `public/art/`: optimized WebP character/venue artwork and the inherited logo. `public/fonts/`: inherited Barlow Condensed/Inter and their licenses.
- `assets/originals/`: generated artwork masters; excluded from deployed assets.
- `tests/`: automated model tests and browser test definitions.
- `scripts/`: artwork encoding, pinned Phaser provisioning, portable export, capture and publication utilities.
- `docs/`: balancing, validation, artwork provenance and deployment instructions.

The guide captures frames from the actual game renderer locally in the browser, including contact and multiball examples. The progression/shop pages use live UI examples. This avoids broken screenshot dependencies while browser-based capture remains pending; it is not a substitute for the outstanding mobile screenshot acceptance check.

## Illustrated movement review

```sh
node scripts/review-illustrated.mjs
```

Open `output/illustrated-review/review.html` for eight automatic touches followed by a drop, using the real renderer and simulation without accessing saves. Add `?timing` for early/late touches, `?speed=0.25` for slow playback, `?sheet` for a frame grid, or `?character=okocha&venue=court` for a different player/venue. `?at=2.95` renders a fixed snapshot. The review page is a development artifact, separate from the playable game.

The polish pass includes regression tests for touch-pose continuity, the former 240 ms recovery snap, stray taps, fixed limb lengths, knee reach, and pause/focus playback. Chromium frame captures are in `output/illustrated-review/`. This remains articulated 2D artwork, with its existing limits on depth and extreme poses; physical-phone and hosted deployment checks remain outstanding.

## Saves and offline use

Save data stays on the device in `expert-pundit-keepyuppy-v2`. Successful runs and purchases persist immediately. Reward IDs and objective bitmasks prevent duplicate payments after reload. Web Locks serialize transactions across supported tabs. Settings includes validated JSON import/export and recovery of the previous valid save. Import replaces progress, retaining a recovery copy. Version 1 migration is documented in [rules](docs/rules.md).

If storage is denied or full, a session-only notice asks players to export. An export works across browser profiles and future domains. Practice has no economic rewards.

For the hosted build, initial installation caches the application, fonts and starter art. Remaining content downloads in the background and can be retried from Settings. “Ready offline” is shown only after the complete versioned manifest is present. Required character and venue images decode before gameplay. Updates wait for installation from a menu. The portable HTML embeds the complete assets and needs no service worker.

## Deployment

The intended repository is `expert-pundit-keepyuppy` under the existing GitHub account. A GitHub Pages workflow and a Windows publication helper are included. Publication is authorized but blocked by the current environment’s GitHub access. It has **not** occurred. Both editions now include the linked “Created by Adrian Dane” credit. See [deployment](docs/deployment.md) for the concrete steps and checks, including the future Expert Pundit domain move.

Technical references: [Phaser’s scene/rendering introduction](https://phaser.io/tutorials/making-your-first-phaser-3-game/part1), [MDN service-worker lifecycle and caching](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
