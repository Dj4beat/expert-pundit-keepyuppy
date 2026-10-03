# Rules, content and balancing

All economy and challenge content lives in `src/content.ts`. Change that file, then run the complete model tests before rebuilding.

## Timing

The simulation advances in 1/240-second wall ticks with ballistic integration. Rendering cadence does not determine collision outcomes. Input carries its timestamp relative to the active run; stale or nonfinite timestamps are rejected. Input needs a descending, spatially reachable ball inside the timing window. Main-ball ground collision ends the run at that simulation tick.

| Difficulty | Contact half-window | Perfect half-window |
| ---------- | ------------------: | ------------------: |
| Casual     |              220 ms |               80 ms |
| Standard   |              155 ms |               52 ms |
| Expert     |              105 ms |               33 ms |

Early/perfect/late flights are nominally 1.65/1.35/1.08 seconds before pace and height constraints. Endless ramps to 1.2×. Practice ranges from 0.65× to 1.2×. Mayhem uses a stable alternating 720 ms spacing between windows, with 1.44-second paired cycles. A 260 ms quiet interval between taps prevents rapid-fire tapping from becoming a viable strategy. Invalid input resets the perfect streak.

Foot, knee and header contacts are selected automatically; all legends use identical physics. Articulated limbs aim at the measured point of accepted contact. Decorative effects may reduce under load; simulation timing stays fixed. Long stalls pause instead of silently dropping the ball.

## Rewards and mastery

- Every main touch: 6 XP and 2 coins; every perfect adds 4 XP.
- Perfect score: 120 + 10 per streak touch (streak contribution caps at 20); early 65, late 50.
- A signature move awards 250 points on each five-perfect streak outside another bonus event.
- Eight clean perfect touches build Crowd Fever: 1.5× points for eight seconds.
- Golden events last twelve simulation seconds and double score or earned touch XP. Signature/event announcements are sequenced.
- First career completion adds 80 coins and 100 XP. Each newly earned star adds 35 coins.
- Level threshold: `100*(level-1) + 35*(level-1)^2`; maximum level 30. Every new level grants 70 coins.
- Character mastery rises with rewarded main touches, one rank per 200, capped visually at rank 5. At 1,000 touches the character can equip mastery gold from Legends.
- Achievement milestones are configured by metric, target and coin reward in `ACHIEVEMENTS`.
- Practice and lesson runs grant no XP, coins, records or mastery.

## Career

Six chapters each contain six challenges. Each challenge publishes three independent metrics. The first is required for progression and for awarding any stars; additional achieved objectives add stars. A primary clear unlocks the next challenge immediately when results are banked, even if the attempt later ended in a drop. Challenges end when all three objectives are achieved, at their published touch cap, when banked, or on a drop.

Completing six challenges in a chapter awards Okocha, Baggio, Best, Cruyff, Zidane, then Pelé. The first five completed chapters also unlock the next venue. Ronaldinho and the neighbourhood court are starters. Maradona, Henry, Ronaldo Nazário, Messi and Cristiano Ronaldo become purchasable after chapters 1–5 respectively. Replays can improve missing stars; first-clear/star bonuses are never paid twice.

## Arcade abilities

One is equipped before a run. It activates automatically and restores charges on restart.

| Ability      | Trigger                           | Base                                 | Upgrade cap |
| ------------ | --------------------------------- | ------------------------------------ | ----------- |
| Second Wind  | Missed main contact, before floor | 1 rescue                             | 4 rescues   |
| Focus        | Late main touch                   | 2 charges, 3 seconds at 0.7×         | 6 seconds   |
| Golden Touch | Five consecutive perfects         | 2 charges, 4 seconds of 1.5× windows | 7 seconds   |

Three upgrades cost 180, 380 and 650 coins. Changing difficulty never locks collection content.

## Saves

Schema version 2 stores currency, XP, collection, three-bit star masks per challenge, mastery, per-difficulty records, capped ability levels, cosmetics, equipped selections, settings, reward IDs, achievements, total touches and tutorial status. Only known IDs/enums, finite bounded integers, booleans, valid selections and sequential career progress are accepted on import. Imports are size-limited to 8 MB. No imported string is rendered as HTML.

Version 1 is the minimal prototype schema: `{ "version": 1, "coins": 0, "xp": 0, "owned": ["ronaldinho"], "stars": {} }`. Its stars already use objective bitmasks. Migration fills all new fields with defaults and reconciles chapter awards. Unknown future versions are rejected without replacing existing progression.

Before each write, the previous valid save becomes a recovery backup. Storage failures preserve in-memory progress and enable JSON export. On browsers with Web Locks, purchases and reward payments are serialized and read the latest stored version before applying changes. Browsers without Web Locks should avoid simultaneous play in multiple tabs.
