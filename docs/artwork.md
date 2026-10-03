# Artwork and provenance

All eighteen new assets were produced using the built-in image-generation tool, not the CLI/API fallback. The finished optimized game assets are in `public/art/`; original generated PNGs are in `assets/originals/`. `scripts/optimize-art.py` resizes originals to a maximum 768 × 1152 and encodes WebP at quality 85, preserving alpha. It requires Pillow (`python -m pip install Pillow`) only when re-encoding art, not to build or play.

## Inherited brand assets

The logo and Barlow Condensed/Inter font files were copied from the local Legends Duel project (`Top Trumps/src/assets`). The logo itself is unchanged and uses the same CSS crop of its white-padded artwork as Legends Duel. Font licenses are copied alongside the fonts. The palette matches its charcoal `#141416`, surface `#1e1e21`, red `#d62f3e`, gold `#dfbb70`, warm white `#f6f1e8`, and muted `#aaa8a7`.

Ronaldinho’s existing illustrated portrait was the explicit style/likeness reference for the first full-body asset. That generated body was the style reference for the next nine. Messi and Cristiano used named cartoon prompts without an attached reference. A longer Messi generation request was rejected by the image service; the final ordinary sports-cartoon request succeeded. No rejected output is included.

## Final prompt set

The exact prompt templates and substitutions used are listed below; the image tool was asked for genuine transparency for characters and an opaque background for venues.

### Ronaldinho

> Use case: stylized-concept. Create a production full-body 2D game character of football legend Ronaldinho inspired by the reference portrait, preserving his recognizable smile, dark curly ponytail, black headband and warm brown skin. Hand-painted cartoon illustration, bold readable outlines, warm gold highlights, Brazil yellow shirt green collar, blue shorts, white socks and black boots, no brands or text. Front three-quarter view facing slightly right. Neutral standing pose with arms held a little away from body and feet apart, all body parts entirely visible with generous transparent padding. This will be cut into head, torso, arms and legs for an articulated browser game; clean silhouette and clearly separated limbs essential. Transparent background, no ball, no ground or shadow. Portrait canvas.

### Nine further legends

> Use case: stylized-concept. Create a single production full-body 2D game character of football legend {name}. {features}. Recognizable expressive likeness, athletic anatomy, friendly slightly caricatured hand-painted cartoon, bold clean outlines and warm subtle highlights. Match the art style of the Ronaldinho reference. Front three-quarter view facing slightly right. EXACT NEUTRAL RIGGING POSE: straight upright torso, both arms held slightly away from sides, both legs straight and feet shoulder width apart, all limbs entirely visible. White socks, black football boots. Character entirely isolated on genuinely transparent background with NO glow, no shadow, no scenery, no halo, no ball, no text, no brand marks. Full head and both feet inside frame with padding. Composition centered in portrait 2:3 canvas.

| Output          | Name            | Features substitution                                                            |
| --------------- | --------------- | -------------------------------------------------------------------------------- |
| `okocha.webp`   | Jay-Jay Okocha  | Nigerian, very short black hair, green Nigeria shirt, white shorts               |
| `baggio.webp`   | Roberto Baggio  | Italian, curly brown hair with short ponytail, Italy blue shirt, white shorts    |
| `best.webp`     | George Best     | Northern Irish, 1960s long dark hair, red shirt, white shorts                    |
| `cruyff.webp`   | Johan Cruyff    | Dutch, long swept brown 1970s hair, orange shirt, white shorts                   |
| `zidane.webp`   | Zinedine Zidane | French, bald head, blue shirt, white shorts                                      |
| `pele.webp`     | Pelé            | Brazilian, short curly black hair, yellow shirt green collar, blue shorts        |
| `maradona.webp` | Diego Maradona  | Argentine, thick curly black hair, sky blue and white striped shirt, dark shorts |
| `henry.webp`    | Thierry Henry   | French, shaved head, red shirt with white sleeves, white shorts                  |
| `ronaldo.webp`  | Ronaldo Nazário | Brazilian, short black hair, yellow shirt, blue shorts                           |

### Cristiano Ronaldo

> A friendly hand-painted cartoon illustration of footballer Cristiano Ronaldo, full body, standing upright in a neutral pose with feet apart and arms relaxed slightly away from his sides. Short dark hair, Portugal red football shirt, green shorts, white socks and black boots. Bold outlines and warm painterly shading for a family-friendly football browser game. No text, no logos, no ball. Transparent background.

### Lionel Messi

> A friendly hand-painted cartoon illustration of footballer Lionel Messi for a football browser game. Full body, standing upright in a neutral pose with feet apart and arms relaxed slightly away from his sides. Short brown hair and beard, Argentina sky blue and white striped football shirt, black shorts, white socks and black boots. Bold clean outlines, warm painterly shading, athletic cartoon proportions. No text, no logos, no ball. Transparent background.

### Six venues

> Use case: stylized-concept. Production illustrated 2D football game background, portrait 2:3 composition. {detail} Hand-painted cartoon artwork, sophisticated rich charcoal outlines and golden lighting, textured brushwork, like an illustrated sports trading card. Camera at low front-on height. Horizon at 45 percent image height. Foreground lower half a large completely empty unobstructed playing surface for a full-body character and bouncing ball, strong perspective court markings, nothing in foreground. Layered scenery with skyline far back and architecture middle distance. No close people, no ball, no words, no logos, no interface. Detailed and polished.

| Output          | Detail substitution                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `court.webp`    | A neighbourhood futsal court in a colourful Brazilian hillside neighbourhood, faded terracotta and teal concrete, small goal and wire fence, palm leaves, warm sunset rooftops. |
| `beach.webp`    | A beach promenade football court, golden sand, turquoise sea, distant sailboats, tall palms, a sunset boardwalk and small goal.                                                 |
| `rooftop.webp`  | A rooftop football pitch high above a Mediterranean city, terracotta rooftops, muted violet sky, safety mesh and strings of warm lights.                                        |
| `cage.webp`     | A floodlit urban football cage at blue hour, brick buildings with street art, chainlink fence, bright white floodlights and wet teal concrete.                                  |
| `training.webp` | An immaculate football training ground, lush green practice pitch, trimmed hedges, cones by the sideline, modern pavilion, blue sky.                                            |
| `stadium.webp`  | A packed football stadium at night, glowing gold floodlights, red stands filled with tiny spectators, green pitch and distant goal.                                             |

## Animation preparation

`src/renderer.ts` cuts transparent artwork into clipped body, arm, thigh and calf pieces in memory. The authored pivot frame is 1024 × 1536; prepared texture pieces use 512 × 768 to reduce memory. Foot contact uses a two-bone solution, knee contact uses the knee joint, and headers position the head against the ball. Individual signature motion definitions live in `TRICK_MOTION`. Idle, touch, recovery, trick, celebration and defeat use those pieces without fetching extra assets.

This preparation is implemented, but live motion still requires the browser inspection described in `validation.md`. Static art review is not evidence that all articulated poses are anatomically correct.
