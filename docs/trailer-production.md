# KeepyUppy trailer production

The film lasts exactly 34 seconds at 30 fps. Landscape is 1280 × 720; portrait is 720 × 1280. Both are composed separately, including the two-by-two portrait legend montage and landscape gameplay panel. All twelve existing character illustrations appear. No generated artwork or external music is required.

## Editable sources

- `scripts/trailer-composition.ts`: shot timings, typography, lighting, character layouts, camera-game edits, titles and end card.
- `scripts/trailer.html`: browser composition preview. Serve with `npm run dev`; open `/scripts/trailer.html?orientation=portrait` or `?orientation=landscape`. The preview displays the final frame; call `trailerRender(seconds)` in the console to scrub.
- `scripts/trailer-capture.mjs`: browser capture with a private local Vite server.
- `scripts/trailer-capture-offline.mjs`: the same composition rendered with native Canvas, without a browser or server.
- `scripts/trailer-audio.py`: original deterministic synthesized stadium noise, percussion, bass, swells and ball impacts.
- `scripts/render-trailer.py`: final H.264/AAC compression, frame extraction and technical verification.

Gameplay shots execute the application's actual `FocusRound` and `FocusScene` modules with deterministic perfect-touch inputs. Editorial time remapping slows the first contact and cuts between left-foot, knee and header contacts. The imagery is the actual camera-game renderer, not a separate animation that merely resembles the game. Capturing uses independent practice rounds and cannot alter player saves.

## Rebuild

Install the app dependencies with `npm ci`, and provide Python 3 with NumPy and Pillow plus FFmpeg/FFprobe on PATH. Then:

```sh
python3 scripts/trailer-audio.py
node scripts/trailer-capture.mjs
python3 scripts/render-trailer.py
```

On machines that cannot launch a browser, install the optional native capture dependency in a separate folder so app dependencies remain unchanged:

```sh
npm install --prefix /tmp/keepy-trailer-tools @napi-rs/canvas@0.1.95
TRAILER_CANVAS_MODULE=/tmp/keepy-trailer-tools/node_modules/@napi-rs/canvas node scripts/trailer-capture-offline.mjs
python3 scripts/render-trailer.py
```

`TRAILER_CANVAS_MODULE` can point to any existing compatible installation. The native backend runs the same Canvas composition, including the real game scene. Both capture scripts accept `portrait` or `landscape` to capture only one orientation, and `--stills` for a fast contact-sheet review. Temporary silent masters, the soundtrack, timing cues and review images go into `output/trailer/`. Only final `public/trailer/landscape.mp4`, `portrait.mp4` and `poster-*.jpg` are runtime assets.

## Editorial timing

| Seconds | Shot                                                                               |
| ------- | ---------------------------------------------------------------------------------- |
| 0–4     | Darkness, stadium light reveal, Ronaldinho: “Every legend…”                        |
| 4–8     | Close-up, full figure, approaching ball: “…starts with one touch.”                 |
| 8–12    | Actual camera-game preparation, slowed contact and launch: “Timing is everything.” |
| 12–17   | Three groups of four legends: “Greatness is earned.”                               |
| 17–22   | Actual foot, knee and header contacts; ×2, ×3, ×5                                  |
| 22–26   | Five stars on soundtrack cue times: 22.2, 22.9, 23.6, 24.3 and 25.2 seconds        |
| 26–29   | Two-minute, five-minute and Unlimited challenge cards                              |
| 29–34   | Hero roster, title, world-champion question, Play now / Watch again hold           |

The end-card button artwork is part of the film. The site's real keyboard-accessible controls provide interaction.

## Review limits

Both compositions were inspected through captured frames covering every scene, gameplay contact and final poster. FFmpeg/FFprobe validates the entire encoded streams and duration. A human normal-speed audiovisual watch, especially on physical Android Chrome and iOS Safari, remains necessary for subjective music review and real-device playback validation; automated frame inspection is not a substitute for that check.
