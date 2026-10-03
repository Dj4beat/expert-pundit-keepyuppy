import './style.css';
import {
  ACHIEVEMENTS,
  BALANCE,
  CHARACTERS,
  CHALLENGES,
  DIFFICULTIES,
  POWERS,
  SHOP,
  VENUES,
  character,
  levelForXP,
  venue,
  xpForLevel,
} from './content';
import { asset, preloadRun } from './assets';
import { Simulation } from './engine';
import { GameRenderer } from './renderer';
import { AudioEngine } from './audio';
import {
  award,
  challengeUnlocked,
  completedChapters,
  defaultSave,
  purchase,
  SaveStore,
  starCount,
} from './progress';
import { OfflineManager } from './offline';
import { phaserAvailable, mountPhaser } from './phaser-host';
declare const __PHASER_AVAILABLE__: boolean;
let phaserHost: ReturnType<typeof mountPhaser> | null = null;
import type { Difficulty, Mode, PlayerSave, Power, RunSettings } from './types';
export function startLegacyGame() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    /* Private or restricted context. */
  }
  const store = new SaveStore(storage);
  if (!store.save.lessonDone && matchMedia('(prefers-reduced-motion: reduce)').matches)
    store.save.settings.reduced = true;
  const sound = new AudioEngine(store.save.settings);
  let page = 'Play',
    mode: Mode = 'endless',
    challengeId = 1,
    practicePace = 0.85,
    shopFilter = 'all',
    guideStep = 0;
  let sim: Simulation | null = null,
    renderer: GameRenderer | null = null,
    frame = 0,
    lastFrame = 0,
    elapsed = 0,
    paused = false,
    countdown = 0,
    ending = false,
    lastFeedback = 0,
    practiceReset = 0;
  let offlineText = 'Preparing offline play…',
    lastFocus: HTMLElement | null = null;
  const offline = new OfflineManager((text) => {
    offlineText = text;
    document.querySelectorAll('[data-offline-status]').forEach((el) => (el.textContent = text));
  });
  const icons = { Play: '◉', Career: '⚑', Legends: '♜', Shop: '◇', 'How to Play': '?' };
  const stars = (mask: number) =>
    [1, 2, 4].map((b) => `<span class="${mask & b ? 'gold' : 'dim'}">★</span>`).join('');
  const btn = (label: string, action: string, cls = 'secondary', attrs = '') =>
    `<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
  const selected = (a: unknown, b: unknown) => (a === b ? 'selected' : '');
  function toast(message: string) {
    const el = document.querySelector('#toast')!;
    el.textContent = message;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 4000);
  }
  function persist() {
    store.persist();
    sound.settings = store.save.settings;
    document.documentElement.classList.toggle('reduce', store.save.settings.reduced);
    document.documentElement.classList.toggle('contrast', store.save.settings.contrast);
  }
  function shell(content: string) {
    const s = store.save;
    const level = levelForXP(s.xp);
    const next = xpForLevel(Math.min(30, level + 1));
    app.innerHTML = `<div class="app-shell"><header class="topbar"><a href="#play" class="brand" aria-label="Expert Pundit home"><span class="publisher-wordmark"><img src="${asset('art/logo.png')}" alt="Expert Pundit"/></span><span class="brand-divider"></span><span class="game-wordmark">KEEPY<span>UPPY</span></span></a><div class="top-actions"><span class="coin-pill"><span>◈</span> ${s.coins.toLocaleString()}<span class="sr-only">coins</span></span>${btn('⚙', 'settings', 'icon-button', 'aria-label="Settings and save backups"')}</div></header><nav class="main-nav" aria-label="Main navigation">${Object.entries(
      icons,
    )
      .map(
        ([name, icon]) =>
          `<button data-action="nav" data-value="${name}" ${page === name ? 'aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${icon}</span>${name}</button>`,
      )
      .join(
        '',
      )}<div class="level-mini"><span>LVL ${level}</span><div class="meter"><i style="width:${level === 30 ? 100 : (100 * (s.xp - xpForLevel(level))) / Math.max(1, next - xpForLevel(level))}%"></i></div></div></nav><main id="main">${content}</main><footer><span>EXPERT PUNDIT <b>ARCADE</b></span><button data-action="offline" class="text-button"><i class="status-dot"></i><span data-offline-status>${offlineText}</span></button><a class="creator-credit" href="https://whatchan.co.uk/about-whatchan-adrian-dane#stat-man" target="_blank" rel="noopener noreferrer">Created by Adrian Dane</a></footer>${store.notice ? `<div class="storage-notice" role="status">${store.notice}</div>` : ''}</div>`;
    persist();
  }
  function render() {
    if (sim) return;
    if (page === 'Play') renderPlay();
    else if (page === 'Career') renderCareer();
    else if (page === 'Legends') renderLegends();
    else if (page === 'Shop') renderShop();
    else renderGuide();
  }
  function renderPlay() {
    const s = store.save,
      c = character(s.selected.character),
      v = venue(s.selected.venue),
      ch = CHALLENGES.find((ch) => !((s.stars[ch.id] ?? 0) & 1)) ?? CHALLENGES[35];
    challengeId = ch.id;
    shell(
      `<section class="home-intro"><div><span class="eyebrow"><i></i> THE BEAUTIFUL GAME. REIMAGINED.</span><h1>ONE BALL.<br/><span>ALL THE LEGENDS.</span></h1><p>Find your rhythm. Own your touch.<br class="mobile-break"/> Keep greatness in the air.</p></div><div class="edition"><span>THE EXPERT PUNDIT</span><strong>ARCADE COLLECTION</strong><span>VOL. 01 &nbsp; / &nbsp; KEEP IT UP</span></div></section><div class="play-layout"><section class="hero-court" aria-label="Selected legend and venue"><img class="hero-background" src="${asset(`art/${v.id}.webp`)}" alt="${v.name}"/><div class="hero-vignette"></div><div class="venue-badge"><i></i> ${v.name}<span>VENUE ${VENUES.indexOf(v) + 1} / 06</span></div><span class="vertical-word">JOGA BONITO</span><img class="hero-player" src="${asset(`art/${c.id}.webp`)}" alt="${c.name}"/><div class="hero-ball">⚽</div><div class="hero-caption"><span class="eyebrow">YOUR LEGEND. YOUR MOMENT.</span><h2>${c.name}</h2><span>${c.country} <i>✦</i> ${c.trick}</span></div><span class="hero-number">${String(c.number).padStart(2, '0')}</span></section><section class="play-panel"><div class="panel-heading"><span class="eyebrow">STEP ONTO THE COURT</span><h2>LET’S KEEP IT UP.</h2></div><div class="segmented" aria-label="Game mode">${(['endless', 'career', 'practice'] as const).map((m) => `<button data-action="mode" data-value="${m}" aria-pressed="${mode === m}">${m === 'endless' ? '∞ ' : m === 'career' ? '⚑ ' : '◎ '}${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div><div class="mode-info"><h3>${mode === 'endless' ? 'NO LIMITS. JUST YOU & THE BALL.' : mode === 'career' ? `CHAPTER ${ch.chapter + 1} · ${ch.name.toUpperCase()}` : 'A LITTLE PRACTICE. A LOT OF MAGIC.'}</h3><p>${mode === 'endless' ? 'Build your combo, find your flow, and chase a new personal best.' : mode === 'career' ? ch.objectives[0].label + '. Three objectives. Three stars.' : 'Adjust the pace, try a trick, and bounce back from every drop. No rewards or pressure.'}</p></div><div class="field"><label for="difficulty">DIFFICULTY <span>Separate personal bests</span></label><select id="difficulty" data-setting="difficulty">${Object.entries(
        DIFFICULTIES,
      )
        .map(
          ([id, d]) =>
            `<option value="${id}" ${selected(s.selected.difficulty, id)}>${d.name}</option>`,
        )
        .join(
          '',
        )}</select><small>${DIFFICULTIES[s.selected.difficulty].description}</small></div>${mode === 'practice' ? `<label class="pace-label" for="pace">Practice pace <b>${practicePace.toFixed(2)}×</b></label><input id="pace" type="range" min="0.65" max="1.2" step="0.05" value="${practicePace}"/>` : ''}<div class="field"><label for="power">YOUR ARCADE ABILITY <span>Auto-activates</span></label><select id="power" data-setting="power">${Object.entries(
        POWERS,
      )
        .map(
          ([id, p]) =>
            `<option value="${id}" ${selected(s.selected.power, id)}>${p.icon} ${p.name} · Lv ${s.upgrades[id as Power] + 1}</option>`,
        )
        .join(
          '',
        )}</select><small>${POWERS[s.selected.power].description}</small></div>${btn('LET’S PLAY <span>↗</span>', 'start', 'primary play-button')}<div class="input-hint"><span>☝ TAP ANYWHERE</span><i></i><span>OR PRESS <kbd>SPACE</kbd></span></div><div class="personal-best"><span>YOUR ${s.selected.difficulty.toUpperCase()} BEST</span><b>${s.records[s.selected.difficulty].toLocaleString()} <small>PTS</small></b></div></section></div><section class="home-bottom"><button class="feature-tile" data-action="nav" data-value="Career"><span class="feature-icon">⚑</span><div><h3>FROM STREET TO STADIUM</h3><p>36 challenges. One legendary journey.</p></div><b>↗</b></button><button class="feature-tile" data-action="nav" data-value="Legends"><span class="feature-icon">♜</span><div><h3>PLAY WITH THE GREATS</h3><p>${s.owned.length} of 12 legends in your collection.</p></div><b>↗</b></button><button class="feature-tile" data-action="lesson"><span class="feature-icon">◎</span><div><h3>IT’S ALL IN THE TIMING</h3><p>A quick lesson. A lifelong obsession.</p></div><b>↗</b></button></section>`,
    );
  }
  function renderCareer() {
    const s = store.save;
    const completed = CHALLENGES.filter((c) => (s.stars[c.id] ?? 0) & 1).length;
    const total = Object.values(s.stars).reduce((sum, mask) => sum + starCount(mask), 0);
    shell(
      `<div class="page-heading"><span class="eyebrow">YOUR ROAD TO GREATNESS</span><h1>STREET TO <span>STADIUM.</span></h1><p>Six chapters. 36 challenges. A legend at every finish line.</p><div class="summary-pills"><span>${completed} / 36 CLEARED</span><span class="gold">★ ${total} / 108 STARS</span><span>LVL ${levelForXP(s.xp)} / 30</span></div></div><div class="chapters">${VENUES.map(
        (v, i) =>
          `<section class="chapter"><div class="chapter-cover" style="background-image:linear-gradient(90deg,#141416ee,#14141633),url('${asset(`art/${v.id}.webp`)}')"><span class="chapter-number">0${i + 1}</span><div><span class="eyebrow">${v.name}</span><h2>${v.chapter}</h2><p>Complete all six to unlock <b>${CHARACTERS.find((c) => c.price === 0 && c.unlock === i + 1)!.name}</b>${i < 5 ? ` and ${VENUES[i + 1].name}` : ''}.</p></div></div><div class="challenge-grid">${CHALLENGES.filter(
            (ch) => ch.chapter === i,
          )
            .map(
              (ch) =>
                `<button class="challenge ${challengeUnlocked(s, ch.id) ? '' : 'locked'}" data-action="challenge" data-value="${ch.id}" ${challengeUnlocked(s, ch.id) ? '' : 'disabled'}><span class="challenge-top"><b>${String(ch.id).padStart(2, '0')}</b><span>${stars(s.stars[ch.id] ?? 0)}</span></span><h3>${ch.name}</h3><p>${ch.objectives[0].label}</p><span class="challenge-bottom">${challengeUnlocked(s, ch.id) ? 'VIEW CHALLENGE ↗' : 'LOCKED'}</span></button>`,
            )
            .join('')}</div></section>`,
      ).join(
        '',
      )}</div><section class="milestones"><span class="eyebrow">THE LITTLE WINS ADD UP</span><h2>ACHIEVEMENT MILESTONES</h2><div class="milestone-grid">${ACHIEVEMENTS.map((a) => `<article><span class="${s.achievements.includes(a.id) ? 'gold' : 'muted'}">${s.achievements.includes(a.id) ? '★ EARNED' : '☆ IN PROGRESS'}</span><h3>${a.id}</h3><p>${a.target} ${a.metric === 'totalHits' ? 'total touches' : a.metric === 'bestStreak' ? 'perfects in a row' : a.metric === 'tricks' ? 'signature moves in one run' : 'bonus touches in one run'}</p><small>◈ ${a.coins} coin reward</small></article>`).join('')}</div><p>Level ${levelForXP(s.xp)} · ${s.xp.toLocaleString()} XP${levelForXP(s.xp) < 30 ? ` · ${xpForLevel(levelForXP(s.xp) + 1) - s.xp} XP to the next level` : ''}. Every new level earns ${BALANCE.levelCoins} coins.</p></section>`,
    );
  }
  function renderLegends() {
    const s = store.save;
    const chapters = completedChapters(s);
    shell(
      `<div class="page-heading"><span class="eyebrow">THE BEAUTIFUL GAME’S FINEST</span><h1>YOUR <span>LEGENDS.</span></h1><p>Same fair timing. Twelve unmistakable styles.</p><div class="summary-pills"><span>${s.owned.length} / 12 COLLECTED</span><span>MASTERY IS EARNED WITH EVERY TOUCH</span></div></div><div class="legend-grid">${CHARACTERS.map(
        (c) => {
          const owned = s.owned.includes(c.id);
          const mastery = s.mastery[c.id] ?? 0;
          return `<button class="legend-card ${owned ? '' : 'locked'} ${s.selected.character === c.id ? 'equipped' : ''}" data-action="legend" data-value="${c.id}"><span class="legend-top"><span>${c.country}</span><b>${owned ? (s.selected.character === c.id ? 'SELECTED' : 'UNLOCKED') : 'LOCKED'}</b></span><div class="legend-art" style="--legend-accent:${c.accent}"><span>${c.number}</span><img src="${asset(`art/${c.id}.webp`)}" loading="lazy" alt="${c.name}"/></div><div class="legend-info"><h2>${c.name}</h2><span class="gold">✦ ${c.trick}</span><p>${owned ? `Mastery ${Math.min(5, Math.floor(mastery / BALANCE.masteryStep))} / 5 · ${mastery} touches` : c.price ? `${c.price} coins · ${chapters >= c.unlock ? 'Available in Shop' : `After chapter ${c.unlock}`}` : `Complete chapter ${c.unlock}`}</p><div class="meter"><i style="width:${Math.min(100, mastery / 10)}%"></i></div></div></button>`;
        },
      ).join(
        '',
      )}</div><div class="section-heading"><div><span class="eyebrow">CHANGE YOUR SCENERY</span><h2>SIX PLACES TO FIND YOUR FLOW.</h2></div></div><div class="venue-grid">${VENUES.map((v, i) => `<button class="venue-card ${s.selected.venue === v.id ? 'equipped' : ''}" data-action="venue" data-value="${v.id}" ${i > chapters ? 'disabled' : ''}><img src="${asset(`art/${v.id}.webp`)}" alt="" loading="lazy"/><div><h3>${v.name}</h3><span>${i > chapters ? `Complete chapter ${i}` : s.selected.venue === v.id ? 'SELECTED' : 'SELECT VENUE ↗'}</span></div></button>`).join('')}</div>`,
    );
  }
  function renderShop() {
    const s = store.save;
    const chapters = completedChapters(s);
    shell(
      `<div class="page-heading"><span class="eyebrow">EARN IT. OWN IT. MAKE IT YOURS.</span><h1>A LITTLE <span>EXTRA MAGIC.</span></h1><p>Every coin earned on the court. Every purchase yours to keep.</p><div class="summary-pills"><span class="gold">◈ ${s.coins} COINS</span><span>NO PURCHASES. JUST PLAY.</span></div></div><div class="shop-filters" aria-label="Shop category">${['all', 'legend', 'ball', 'kit', 'effect', 'upgrade'].map((f) => `<button class="${shopFilter === f ? 'active' : ''}" data-action="filter" data-value="${f}">${{ all: 'Everything', legend: 'Legends', ball: 'Balls', kit: 'Kits', effect: 'Celebrations', upgrade: 'Abilities' }[f]}</button>`).join('')}</div><div class="shop-grid">${SHOP.filter(
        (i) => shopFilter === 'all' || i.type === shopFilter,
      )
        .map((i) => {
          const level = i.type === 'upgrade' ? s.upgrades[i.id as Power] : 0;
          const owned =
            i.type === 'legend'
              ? s.owned.includes(i.id)
              : i.type === 'upgrade'
                ? level >= 3
                : s.cosmetics.includes(i.id);
          const price = i.type === 'upgrade' ? (BALANCE.upgradePrices[level] ?? 0) : i.price;
          const equipped =
            ['ball', 'kit', 'effect'].includes(i.type) &&
            s.selected[i.type as 'ball' | 'kit' | 'effect'] === i.id;
          return `<article class="shop-card"><div class="shop-art ${i.type}" data-item="${i.id}">${i.type === 'legend' ? `<img src="${asset(`art/${i.id}.webp`)}" loading="lazy" alt=""/>` : i.type === 'ball' ? '<span class="shop-ball">⚽</span>' : i.type === 'kit' ? '<span>♜</span>' : i.type === 'effect' ? '<span>✧</span>' : `<span>${POWERS[i.id as Power].icon}</span>`}</div><div class="shop-info"><span class="eyebrow">${i.type}${i.type === 'upgrade' ? ` · LEVEL ${level + 1} / 4` : ''}</span><h3>${i.name}</h3><p>${i.description}</p>${owned ? (['kit', 'ball', 'effect'].includes(i.type) ? btn(equipped ? 'EQUIPPED' : 'EQUIP', 'equip', 'secondary', `data-value="${i.id}" ${equipped ? 'disabled' : ''}`) : '<span class="owned-label">✓ IN YOUR COLLECTION</span>') : btn(chapters < i.chapter ? `CHAPTER ${i.chapter} REQUIRED` : `◈ ${price} &nbsp; UNLOCK`, 'buy', 'secondary', `data-value="${i.id}" ${chapters < i.chapter || s.coins < price ? 'disabled' : ''}`)}</div></article>`;
        })
        .join(
          '',
        )}</div><div class="panel cosmetic-reset"><h3>BACK TO THE CLASSICS</h3><p>Switch back to the original ball, kit, and celebration at any time.</p>${btn('Equip original look', 'reset-cosmetics')}</div>`,
    );
  }
  const guide = [
    [
      'Watch the drop',
      'The ball sets the rhythm. Tap anywhere on the court, click, or press Space when the outer ring meets the inner ring. The cue changes to TAP.',
      'timing',
    ],
    [
      'Make it a perfect touch',
      'Perfects build your streak and score. Every five perfects can trigger your legend’s signature move. A premature extra tap breaks the streak.',
      'perfect',
    ],
    [
      'Early, late, and the floor',
      'Early touches send the ball higher. Late touches make a shorter, faster arc. A floor drop ends the attempt; Practice automatically resets.',
      'timing',
    ],
    [
      'A little helping hand',
      'Second Wind rescues a miss. Focus slows play after a late touch. Golden Touch widens the window after five perfects. All activate automatically; charges refill each run.',
      'powers',
    ],
    [
      'Two balls. One rhythm.',
      'The white ball is your main ball. The smaller cyan ball is a bonus. Their windows alternate. Losing cyan ends the bonus; losing the main ball ends the run.',
      'multiball',
    ],
    [
      'Feel the atmosphere',
      'Clean play builds Crowd Fever for a 1.5× score boost. Golden Moments announce 2× score or 2× XP. Read the banner and follow the ball.',
      'perfect',
    ],
    [
      'Your road to greatness',
      'Each challenge publishes three star objectives. Meet the first to unlock the next challenge. Finish all six in a chapter to earn a legend and the next venue.',
      'career',
    ],
    [
      'Make it yours',
      'Spend earned coins on legends, ball designs, kits, celebrations, and capped ability upgrades. Legend mastery reaches a gold kit at 1,000 touches. Export backups from Settings.',
      'shop',
    ],
  ];
  function renderGuide() {
    const g = guide[guideStep];
    shell(
      `<div class="page-heading"><span class="eyebrow">A LITTLE KNOW-HOW GOES A LONG WAY</span><h1>FIND YOUR <span>RHYTHM.</span></h1><p>One simple input. A world of beautiful touches.</p></div><div class="guide-layout"><div class="guide-image"><div id="guide-preview" aria-label="Game scene demonstrating ${g[0].toLowerCase()}"></div></div><div class="guide-copy"><span class="eyebrow">THE PLAYBOOK &nbsp; ${guideStep + 1} / ${guide.length}</span><h2>${g[0]}</h2><p>${g[1]}</p><div class="guide-dots">${guide.map((_, i) => `<button data-action="guide-step" data-value="${i}" aria-label="Guide page ${i + 1}" aria-current="${guideStep === i ? 'step' : 'false'}">${i + 1}</button>`).join('')}</div><div class="button-row">${btn('← Previous', 'guide-prev', 'secondary', guideStep === 0 ? 'disabled' : '')}${btn(guideStep === guide.length - 1 ? 'PLAY THE LESSON ↗' : 'Next →', guideStep === guide.length - 1 ? 'lesson' : 'guide-next', 'primary')}</div><div class="guide-tip"><span>GOOD TO KNOW</span><p>Music is optional and starts off. You’re timing the ball, not the beat. All difficulty settings unlock the full collection.</p></div></div></div>`,
    );
    void renderGuidePreview(guideStep);
  }
  async function renderGuidePreview(step: number) {
    const host = document.querySelector<HTMLElement>('#guide-preview');
    if (!host) return;
    if (step === 6) {
      host.innerHTML = `<div class="preview-card"><span class="eyebrow">CHAPTER 01</span><h2>FIRST TOUCH</h2><img src="${asset('art/court.webp')}" alt="The neighbourhood court"/><ul class="objectives">${CHALLENGES[0].objectives.map((o) => `<li><span class="gold">★</span>${o.label}</li>`).join('')}</ul><p>Earn the first star to unlock Find your feet.</p></div>`;
      return;
    }
    if (step === 7) {
      host.innerHTML = `<div class="preview-card"><span class="eyebrow">THE EARNED-COIN SHOP</span><h2>GOLDEN ERA</h2><div class="preview-ball">⚽</div><p>A little gold at your feet.</p><span class="primary">◈ 160 COINS</span><p>Earn coins in Career and Endless. Equip your new look before the next run.</p></div>`;
      return;
    }
    try {
      const images = await preloadRun('ronaldinho', 'court', () => {});
      if (!host.isConnected) return;
      const preview = new Simulation({
        mode: 'practice',
        difficulty: 'casual',
        character: 'ronaldinho',
        venue: 'court',
        power: step === 3 ? 'golden-touch' : 'second-wind',
        powerLevel: 0,
        pace: 1,
        seed: 1,
        ball: 'classic',
        kit: 'original',
        effect: 'spark',
      });
      if (step === 1 || step === 5) {
        for (let i = 0; i < 5; i++)
          preview.tap({ type: 'tap', at: preview.clock + preview.main.due - preview.time });
      } else preview.advanceTo(1.55);
      if (step === 4) {
        preview.bonus.active = true;
        preview.bonus.y = 310;
        preview.bonus.x = 236;
        preview.bonus.due = preview.time + 0.74;
        preview.event = 'multiball';
        preview.eventUntil = 99;
        preview.announcement = 'MULTIBALL · CYAN IS THE BONUS';
        preview.announcementUntil = 99;
      }
      if (step === 3) {
        preview.goldenUntil = 99;
        preview.announcement = 'GOLDEN TOUCH · WIDER WINDOW';
        preview.announcementUntil = 99;
      }
      const view = new GameRenderer(host, images, { ...store.save.settings, reduced: true });
      view.draw(preview);
      const snapshot = document.createElement('img');
      snapshot.src = view.canvas.toDataURL('image/webp', 0.9);
      snapshot.alt = 'Captured game scene: ' + guide[step][0];
      view.destroy();
      host.append(snapshot);
    } catch {
      host.textContent = 'Connect once to download this scene.';
    }
  }
  function openDialog(html: string, label: string) {
    closeDialog();
    lastFocus = document.activeElement as HTMLElement;
    const d = document.createElement('dialog');
    d.className = 'modal';
    d.setAttribute('aria-label', label);
    d.innerHTML = `<button class="modal-close icon-button" data-action="close" aria-label="Close dialog">×</button>${html}`;
    document.body.append(d);
    d.addEventListener('close', () => {
      d.remove();
      lastFocus?.focus();
    });
    d.showModal();
  }
  function closeDialog() {
    document.querySelector('dialog')?.close();
  }
  function settings() {
    const s = store.save;
    openDialog(
      `<span class="eyebrow">YOUR GAME. YOUR WAY.</span><h2>SETTINGS & SAVES</h2><div class="settings-list">${Object.entries(
        {
          sound: 'Sound effects',
          music: 'Background music',
          reduced: 'Reduced effects',
          contrast: 'High-contrast timing cues',
          vibration: 'Vibration (supported devices)',
        },
      )
        .map(
          ([key, label]) =>
            `<label>${label}<input type="checkbox" data-pref="${key}" ${s.settings[key as keyof typeof s.settings] ? 'checked' : ''}/></label>`,
        )
        .join(
          '',
        )}</div><h3>KEEP YOUR PROGRESS</h3><p class="small muted">Saved on this device. Export a JSON backup to move to another browser or domain. Import replaces current progress; your previous save becomes a recovery backup.</p><div class="button-row">${btn('Export backup', 'export')}${btn('Import backup', 'import')}${btn('Recover previous save', 'recover')}</div><input id="import-file" type="file" accept="application/json,.json" hidden/><p class="small muted">${store.persistent ? '✓ Local saving is available.' : store.notice}</p><h3>PLAY ANYWHERE</h3><p class="small" data-offline-status>${offlineText}</p>${btn('Download complete offline game', 'offline')}${offline.updateAvailable ? btn('Install update & reload', 'update') : ''}<p class="small muted">Updates install between runs. All artwork is loaded before you play.</p>`,
      'Settings and save backups',
    );
  }
  function showChallenge(id: number) {
    const ch = CHALLENGES[id - 1];
    if (!ch || !challengeUnlocked(store.save, id)) return;
    challengeId = id;
    openDialog(
      `<span class="eyebrow">CHAPTER ${ch.chapter + 1} · CHALLENGE ${id}</span><h2>${ch.name.toUpperCase()}</h2><p>${ch.description}</p><ul class="objectives">${ch.objectives.map((o, i) => `<li><span class="gold">★</span><div>${o.label}<small>${i === 0 ? 'PRIMARY · UNLOCKS NEXT CHALLENGE' : 'BONUS STAR'}</small></div></li>`).join('')}</ul><p class="small muted">Play until you drop, bank the attempt, or reach ${ch.maxHits} main-ball touches. Stars are awarded when the primary objective is met.</p>${btn('START CHALLENGE ↗', 'start-challenge', 'primary play-button')}`,
      ch.name,
    );
  }
  function legendDetails(id: string) {
    const c = character(id),
      s = store.save;
    const owned = s.owned.includes(id);
    openDialog(
      `<span class="eyebrow">${c.country} · NUMBER ${c.number}</span><h2>${c.name.toUpperCase()}</h2><p>${c.description}</p><div class="legend-detail"><img src="${asset(`art/${c.id}.webp`)}" alt="${c.name}"/><div><h3 class="gold">✦ ${c.trick}</h3><p>Trigger a signature move with five consecutive perfect touches while no bonus event is active.</p><p>Mastery: ${s.mastery[id] ?? 0} / 1,000 touches</p><small>Five ranks. A golden kit at mastery rank 5.</small></div></div>${owned ? btn('SELECT LEGEND', 'select-legend', 'primary', `data-value="${id}"`) : `<p>${c.price ? `${c.price} coins in the Shop after chapter ${c.unlock}.` : `Complete chapter ${c.unlock} to unlock.`}</p>`}${owned && (s.mastery[id] ?? 0) >= 1000 ? btn('Equip mastery gold', 'mastery', 'secondary', `data-value="${id}"`) : ''}`,
      c.name,
    );
  }
  async function startRun(runMode: Mode, lessonOverride = false) {
    closeDialog();
    if (sim) return;
    if (!store.save.lessonDone && runMode !== 'lesson' && !lessonOverride) {
      openDialog(
        `<span class="eyebrow">WELCOME TO THE COURT</span><h2>EVERY LEGEND STARTS SOMEWHERE.</h2><p>Try a short interactive lesson to feel the timing before your first run.</p>${btn('FIND MY RHYTHM', 'lesson', 'primary play-button')}${btn('I know the controls · play now', 'skip-lesson', 'text-button')}`,
        'First-play lesson',
      );
      return;
    }
    sound.unlock();
    const s = store.save;
    const settings: RunSettings = {
      mode: runMode,
      difficulty: runMode === 'lesson' ? 'casual' : s.selected.difficulty,
      character: s.selected.character,
      venue:
        runMode === 'career' ? VENUES[CHALLENGES[challengeId - 1].chapter].id : s.selected.venue,
      power: s.selected.power,
      powerLevel: s.upgrades[s.selected.power],
      pace: runMode === 'lesson' ? 0.75 : practicePace,
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
      challenge: runMode === 'career' ? challengeId : undefined,
      ball: s.selected.ball,
      kit: s.selected.kit,
      effect: s.selected.effect,
    };
    app.innerHTML = `<div class="loading-screen"><span class="eyebrow">LACING UP</span><h1>YOUR COURT <span>IS CALLING.</span></h1><div class="meter"><i id="load-progress"></i></div><p id="load-label" role="status">Loading your legend and venue…</p></div>`;
    try {
      await document.fonts.ready;
      if (__PHASER_AVAILABLE__) await phaserAvailable();
      const images = await preloadRun(settings.character, settings.venue, (p) => {
        document.querySelector<HTMLElement>('#load-progress')!.style.width = p * 100 + '%';
      });
      sim = new Simulation(settings);
      elapsed = 0;
      paused = false;
      ending = false;
      countdown = 3;
      lastFeedback = 0;
      practiceReset = 0;
      offline.inRun = true;
      app.innerHTML = `<div class="game-page"><header class="game-header"><span class="game-wordmark">KEEPY<span>UPPY</span></span><span>${runMode.toUpperCase()} · ${DIFFICULTIES[settings.difficulty].name}</span>${btn('Ⅱ', 'pause', 'icon-button', 'aria-label="Pause game"')}</header><div class="game-layout"><div class="game-frame"><div id="court" tabindex="0" role="application" aria-label="KeepyUppy court. Press Space or tap to kick. Press Escape to pause."></div><div class="game-hud"><div><span>SCORE</span><strong id="score">0</strong></div><div class="combo"><strong id="combo">0</strong><span>PERFECT STREAK</span></div></div><div class="fever-hud"><span>CROWD FEVER</span><div class="meter"><i id="fever"></i></div></div><div class="game-bottom"><span id="touches">0 TOUCHES</span><span id="power-status">${POWERS[settings.power].icon} ${POWERS[settings.power].name} · ${sim.charges}</span></div></div><aside class="run-info"><span class="eyebrow">${character(settings.character).country} · ${venue(settings.venue).name}</span><h2>${character(settings.character).name.toUpperCase()}</h2><p id="run-instruction">${runMode === 'lesson' ? 'Watch the falling ball. Wait for TAP, then tap anywhere on the court.' : 'Let the ring come to you. Tap when it closes around the contact spot.'}</p>${runMode === 'career' ? `<ul class="run-objectives">${CHALLENGES[challengeId - 1].objectives.map((o, i) => `<li id="objective-${i}">☆ ${o.label}</li>`).join('')}</ul>` : ''}<p class="power-help">${POWERS[settings.power].description}</p><div class="run-buttons">${btn(runMode === 'lesson' ? 'Exit lesson' : 'Bank attempt', 'finish', 'secondary')}${btn('How to time a touch', 'run-help', 'text-button')}</div><span class="small muted">Tap · Click · Space &nbsp; / &nbsp; Esc to pause</span></aside></div></div>`;
      renderer = new GameRenderer(document.querySelector('#court')!, images, s.settings);
      if (__PHASER_AVAILABLE__ && (window as any).Phaser)
        phaserHost = mountPhaser(document.querySelector('#court')!, renderer.canvas);
      document.querySelector('#court')!.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        tap(e.timeStamp);
      });
      document.querySelector<HTMLElement>('#court')!.focus();
      lastFrame = performance.now();
      frame = requestAnimationFrame(loop);
    } catch (error) {
      sim = null;
      offline.inRun = false;
      page = 'Play';
      render();
      toast(
        `Could not load the court. Reconnect and try again. ${error instanceof Error ? error.message : ''}`,
      );
    }
  }
  function tap(timestamp = performance.now()) {
    if (!sim || paused || countdown > 0 || ending) return;
    sound.unlock();
    const normalized = timestamp > 1e12 ? timestamp - performance.timeOrigin : timestamp;
    const inputTime = Math.min(performance.now(), Math.max(lastFrame, normalized));
    if (inputTime - lastFrame > 600) {
      pause();
      return;
    }
    elapsed += Math.max(0, (inputTime - lastFrame) / 1000);
    lastFrame = inputTime;
    sim.tap({ type: 'tap', at: elapsed });
    updateHUD();
  }
  function loop(now: number) {
    if (!sim || !renderer) return;
    const dt = Math.max(0, (now - lastFrame) / 1000);
    lastFrame = now;
    renderer.resizeQuality(dt * 1000);
    if (!paused && !ending) {
      if (dt > 0.6 && countdown <= 0) {
        pause();
      } else if (countdown > 0) {
        countdown = Math.max(0, countdown - dt);
      } else {
        elapsed += dt;
        sim.advanceTo(elapsed);
      }
      updateHUD();
      if (sim.ended) {
        if (sim.settings.mode === 'practice' || sim.settings.mode === 'lesson') {
          practiceReset += dt;
          if (practiceReset > 1.1) {
            const cfg = sim.settings;
            sim = new Simulation(cfg);
            elapsed = 0;
            practiceReset = 0;
            countdown = 1;
            lastFeedback = 0;
          }
        } else void endRun();
      }
      if (sim?.settings.mode === 'lesson' && sim.hits >= 5) void endRun();
    }
    renderer.draw(sim, false, countdown > 0 ? String(Math.ceil(countdown)) : '');
    phaserHost?.refresh();
    frame = requestAnimationFrame(loop);
  }
  function updateHUD() {
    if (!sim) return;
    document.querySelector('#score')!.textContent = sim.score.toLocaleString();
    document.querySelector('#combo')!.textContent = String(sim.streak);
    document.querySelector<HTMLElement>('#fever')!.style.width = sim.fever + '%';
    document.querySelector('#touches')!.textContent = sim.hits + ' TOUCHES';
    document.querySelector('#power-status')!.textContent =
      `${POWERS[sim.settings.power].icon} ${POWERS[sim.settings.power].name} · ${sim.charges} left`;
    if (sim.settings.mode === 'career')
      CHALLENGES[(sim.settings.challenge ?? 1) - 1].objectives.forEach((o, i) => {
        const el = document.querySelector(`#objective-${i}`)!;
        el.textContent = `${sim![o.metric] >= o.target ? '★' : '☆'} ${o.label} (${sim![o.metric]}/${o.target})`;
        el.classList.toggle('gold', sim![o.metric] >= o.target);
      });
    if (sim.feedback && sim.feedback.serial !== lastFeedback) {
      lastFeedback = sim.feedback.serial;
      sound.touch(sim.feedback.grade);
      if (store.save.settings.vibration && sim.feedback.grade === 'perfect')
        navigator.vibrate?.(12);
      if (sim.settings.mode === 'lesson') {
        document.querySelector('#run-instruction')!.textContent =
          sim.feedback.grade === 'miss'
            ? 'A little patience. Extra taps break your streak. Wait for the ball to drop into the ring.'
            : sim.hits < 3
              ? 'Nice touch! Early taps lift it higher. Late taps bring it back sooner. Keep watching the ball.'
              : `You’ve got the rhythm. ${5 - sim.hits} more touches to finish the lesson.`;
      }
    }
  }
  function pause() {
    if (!sim || paused || ending) return;
    paused = true;
    sound.pause();
    openDialog(
      `<span class="eyebrow">TAKE A BREATHER</span><h2>YOUR BALL CAN WAIT.</h2><p>Resume with a countdown whenever you’re ready.</p>${btn('BACK TO THE COURT', 'resume', 'primary play-button')}${btn('Bank attempt & leave', 'finish', 'secondary')}`,
      'Game paused',
    );
    const d = document.querySelector('dialog')!;
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      resume();
    });
    d.querySelector('[data-action="close"]')?.setAttribute('data-action', 'resume');
  }
  function resume() {
    if (!sim) return;
    closeDialog();
    paused = false;
    countdown = 3;
    lastFrame = performance.now();
    sound.unlock();
  }
  async function endRun() {
    if (!sim || ending) return;
    ending = true;
    const result = sim.finish();
    sound.finish(result.hits >= 5);
    const lesson = result.settings.mode === 'lesson';
    if (lesson && result.hits >= 5) {
      store.save.lessonDone = true;
      persist();
    }
    const reward = await store.transaction((s) => award(s, result));
    const challenge =
      result.settings.mode === 'career' ? CHALLENGES[(result.settings.challenge ?? 1) - 1] : null;
    const cleared =
      !!challenge && result[challenge.objectives[0].metric] >= challenge.objectives[0].target;
    openDialog(
      `<span class="eyebrow">${lesson ? 'LESSON COMPLETE' : cleared ? 'CHALLENGE CLEARED' : result.reason === 'drop' ? 'ONE MORE TOUCH NEXT TIME' : 'NICELY PLAYED'}</span><h2>${lesson ? 'YOU’VE FOUND YOUR RHYTHM.' : cleared ? 'A STEP CLOSER TO GREATNESS.' : 'THAT’S YOUR GAME.'}</h2><div class="result-score">${result.score.toLocaleString()}<span>POINTS</span></div><div class="result-stats"><div><b>${result.hits}</b><span>TOUCHES</span></div><div><b>${result.bestStreak}</b><span>BEST STREAK</span></div><div><b>${result.tricks}</b><span>SIGNATURES</span></div></div>${challenge ? `<div class="result-stars">${stars(store.save.stars[challenge.id] ?? 0)}</div>` : ''}${!lesson && result.settings.mode !== 'practice' ? `<div class="reward-row"><span class="gold">+${reward.coins} COINS</span><span>+${reward.xp} XP</span></div>` : '<p>Practice builds skill. Career and Endless earn rewards.</p>'}${reward.unlocked.length ? `<p class="gold">NEW LEGEND · ${reward.unlocked.map((id) => character(id).name).join(', ')}</p>` : ''}<div class="button-row">${cleared && challenge!.id < 36 ? btn('NEXT CHALLENGE ↗', 'next-challenge', 'primary') : btn(lesson ? 'LET’S PLAY ↗' : 'GO AGAIN ↗', lesson ? 'lesson-finished' : 'retry', 'primary')}${btn('Back to menu', 'leave')}</div>`,
      lesson ? 'Lesson complete' : 'Run results',
    );
    document.querySelector('dialog')!.addEventListener('cancel', (e) => {
      e.preventDefault();
      leave();
    });
    document.querySelector('[data-action="close"]')?.setAttribute('data-action', 'leave');
  }
  function leave() {
    cancelAnimationFrame(frame);
    phaserHost?.destroy();
    phaserHost = null;
    renderer?.destroy();
    renderer = null;
    sim = null;
    ending = false;
    paused = false;
    offline.inRun = false;
    closeDialog();
    page = 'Play';
    render();
    void offline.download();
  }
  const actions: Record<string, (value: string) => void | Promise<void>> = {
    nav: (value) => {
      page = value;
      render();
      window.scrollTo(0, 0);
    },
    mode: (value) => {
      mode = value as Mode;
      render();
    },
    settings,
    close: closeDialog,
    start: () => startRun(mode),
    lesson: () => startRun('lesson', true),
    'skip-lesson': () => {
      store.save.lessonDone = true;
      persist();
      return startRun(mode, true);
    },
    'start-challenge': () => startRun('career'),
    challenge: (value) => showChallenge(Number(value)),
    legend: legendDetails,
    'select-legend': (value) => {
      store.save.selected.character = value;
      if (store.save.selected.kit === 'mastery' && (store.save.mastery[value] ?? 0) < 1000)
        store.save.selected.kit = 'original';
      persist();
      closeDialog();
      render();
    },
    mastery: (value) => {
      store.save.selected.character = value;
      store.save.selected.kit = 'mastery';
      persist();
      closeDialog();
      render();
    },
    venue: (value) => {
      if (VENUES.findIndex((v) => v.id === value) <= completedChapters(store.save)) {
        store.save.selected.venue = value;
        persist();
        render();
      }
    },
    filter: (value) => {
      shopFilter = value;
      render();
    },
    buy: async (value) => {
      const message = await store.transaction((s) => purchase(s, value));
      render();
      toast(message);
    },
    equip: (value) => {
      const item = SHOP.find((i) => i.id === value);
      if (item && store.save.cosmetics.includes(value)) {
        store.save.selected[item.type as 'ball' | 'kit' | 'effect'] = value;
        persist();
        render();
      }
    },
    'reset-cosmetics': () => {
      Object.assign(store.save.selected, { ball: 'classic', kit: 'original', effect: 'spark' });
      persist();
      render();
    },
    'guide-step': (value) => {
      guideStep = Number(value);
      render();
    },
    'guide-prev': () => {
      guideStep = Math.max(0, guideStep - 1);
      render();
    },
    'guide-next': () => {
      guideStep = Math.min(guide.length - 1, guideStep + 1);
      render();
    },
    pause,
    resume,
    finish: async () => {
      if (sim?.settings.mode === 'lesson' && sim.hits < 5) {
        leave();
        return;
      }
      closeDialog();
      await endRun();
    },
    leave,
    retry: async () => {
      const m = sim?.settings.mode ?? mode;
      const retryChallenge = sim?.settings.challenge;
      leave();
      if (retryChallenge) challengeId = retryChallenge;
      await startRun(m, true);
    },
    'next-challenge': async () => {
      challengeId = Math.min(36, challengeId + 1);
      const next = challengeId;
      leave();
      challengeId = next;
      await startRun('career', true);
    },
    'lesson-finished': async () => {
      leave();
      await startRun(mode, true);
    },
    'run-help': () => {
      pause();
      const p = document.querySelector('dialog p');
      if (p)
        p.textContent =
          'Wait for the outer ring to meet the inner ring and the TAP cue to appear. Tap once. Feet, knees, and headers are selected automatically. The smaller cyan ball is a bonus.';
    },
    export: () => {
      const blob = new Blob([store.export()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'keepyuppy-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Backup exported. Keep it somewhere safe.');
    },
    import: () => document.querySelector<HTMLInputElement>('#import-file')?.click(),
    recover: () => {
      try {
        store.recover();
        closeDialog();
        render();
        toast('Previous save recovered.');
      } catch (e) {
        toast((e as Error).message);
      }
    },
    offline: async () => {
      await offline.download();
    },
    update: () => offline.activateUpdate(),
  };
  document.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (button && !button.hasAttribute('disabled')) {
      sound.unlock();
      void actions[button.dataset.action!]?.(button.dataset.value ?? '');
    }
  });
  document.addEventListener('change', async (e) => {
    const target = e.target as HTMLInputElement;
    if (target.dataset.setting) {
      const k = target.dataset.setting as 'difficulty' | 'power';
      if (k === 'difficulty') store.save.selected.difficulty = target.value as Difficulty;
      else store.save.selected.power = target.value as Power;
      persist();
      render();
    }
    if (target.id === 'pace') {
      practicePace = Number(target.value);
      render();
    }
    if (target.dataset.pref) {
      store.save.settings[target.dataset.pref as keyof PlayerSave['settings']] = target.checked;
      persist();
      sound.setMusic();
    }
    if (target.id === 'import-file' && target.files?.[0]) {
      try {
        store.import(await target.files[0].text());
        closeDialog();
        render();
        toast('Backup imported successfully.');
      } catch (e) {
        toast('Import rejected: ' + (e as Error).message);
      }
    }
  });
  window.addEventListener('keydown', (e) => {
    if (!sim) return;
    if (e.code === 'Space' && !e.repeat && !document.querySelector('dialog')) {
      e.preventDefault();
      tap(e.timeStamp);
    }
    if (e.code === 'Escape' && !document.querySelector('dialog')) {
      e.preventDefault();
      pause();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (sim) pause();
      else sound.pause();
    }
  });
  window.addEventListener('blur', () => {
    if (sim) pause();
  });
  window.addEventListener('storage', () => {
    if (!sim && !document.querySelector('dialog')) {
      store.load();
      render();
    }
  });
  window.addEventListener('hashchange', () => {
    if (!sim) {
      page = 'Play';
      render();
    }
  });
  // Read-only state exposure in explicit test builds; never grants progress in production.
  if (import.meta.env.MODE === 'test')
    Object.assign(window, {
      keepyTest: {
        get sim() {
          return sim;
        },
        get store() {
          return store;
        },
        startRun,
        tap,
        actions,
      },
    });
  void defaultSave;
  render();
  void offline.init();
}
