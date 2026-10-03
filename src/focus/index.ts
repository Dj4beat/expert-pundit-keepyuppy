import { escapeHTML, highScoreTable } from './high-scores';
import { FOCUS_CHARACTERS, characterForLevel, focusCharacter } from './characters';
import './style.css';
import { asset, loadImage, preloadRun } from '../assets';
import { AudioEngine } from '../audio';
import type { Difficulty } from '../types';
import { FocusRound } from './simulation';
import { FocusScene } from './scene';
import { LEVELS, MODE_NAMES, cleanPlayerName, type FocusMode } from './modes';
import { FocusProgress } from './progress';
import { DURATION_NAMES, type ChallengeDuration } from './modes';
import { FocusPresentation } from './presentation';
import { OfflineManager } from '../offline';

export async function startFocusGame(app: HTMLElement) {
  const query = new URLSearchParams(location.search);
  const back = window.__KEEPY_FOCUS__ ? './KeepyUppy.html' : `${location.pathname}?classic`;
  app.innerHTML = `<main class="focus-app" id="focus-app-root"><header class="focus-header"><a href="${back}" aria-label="Back to original game"><img src="${asset('art/logo.png')}" alt="Expert Pundit"/><strong>KEEPY<span>UPPY</span></strong></a><span>CHASE THE CHAMPION</span></header>
  <div class="focus-layout"><section class="focus-play">
  <label class="focus-name">YOUR NAME · REQUIRED<input id="focus-name" maxlength="12" value="" placeholder="Enter your name" required autocomplete="nickname" aria-label="Player name" aria-describedby="focus-name-hint"/></label><p id="focus-name-hint" class="focus-name-hint">Enter 1–12 characters, including a letter or number. Your name is remembered on this device.</p>
  <div class="focus-options"><label>MODE<select id="focus-mode"><option value="levels">Character tour · fixed attempts</option><option value="endless">Score challenge</option><option value="practice">Practice · no pressure</option></select></label><label>DIFFICULTY<select id="focus-difficulty"><option value="casual">Casual</option><option value="standard" selected>Standard</option><option value="expert">Expert</option></select></label><label id="focus-level-choice">ROUND / CHARACTER<select id="focus-stage-select"></select></label><label id="focus-duration-choice" hidden>DURATION<select id="focus-duration"><option value="2-minutes">2 Minutes</option><option value="5-minutes">5 Minutes</option><option value="unlimited">Unlimited</option></select></label><label id="focus-character-choice" hidden>CHARACTER<select id="focus-character"></select></label></div>
  <div class="focus-skill" id="focus-skill"></div>
  <div class="focus-objective"><strong id="focus-goal"></strong><span id="focus-goal-detail"></span><progress id="focus-progress" max="12" value="0" aria-label="Attempts completed"></progress></div>
  <div class="focus-stage" id="focus-stage" tabindex="0" aria-label="Game court. Tap or press Space to touch the ball."><div class="focus-overlay focus-welcome" id="focus-overlay" tabindex="-1" aria-labelledby="focus-result-title"><span class="eyebrow">BRAZIL · NUMBER 10</span><h1 id="focus-result-title">RONALDINHO</h1><p id="focus-intro"></p><section id="focus-results-board" class="focus-scoreboard" aria-label="High scores for this round" hidden><h2>HIGH SCORES</h2><p id="focus-results-rank" role="status"></p><div id="focus-results-table"></div><p id="focus-results-best"></p></section><button id="focus-start" class="primary" disabled>LOADING THE COURT…</button><button id="focus-next" class="primary" hidden>NEXT CHARACTER ↗</button><button id="focus-menu" hidden>Choose mode / character</button></div></div>
  <div class="focus-toolbar"><button id="focus-pause" disabled>Pause</button><button id="focus-finish" disabled>Leave round</button><button id="focus-demo" disabled>Demo</button><button id="focus-sound" aria-pressed="false">Sound off</button></div>
  <section class="focus-scoreboard" aria-labelledby="focus-board-title"><h3 id="focus-board-title">HIGH SCORES · THIS LEVEL</h3><p id="focus-board-label"></p><div id="focus-board"></div><p id="focus-personal-best"></p><p id="focus-collection"></p><small>Top five runs on this device · separate boards for each character, duration, difficulty and round. Practice and demos are unranked.</small></section></section>
  <aside class="focus-info"><span class="eyebrow">12 LEGENDS. EVERY ATTEMPT COUNTS.</span><h2>CHASE THE<br/><span>PERFECT RUN.</span></h2><p>Play every attempt with each legend. Land at least half to unlock the next character. A touch or drop uses one attempt; dropped balls restart automatically. Review your results, then choose when to continue.</p><div class="focus-steps"><span><b>01</b> Follow the ball into the close-up</span><span><b>02</b> Tap as the movement finishes</span><span><b>03</b> Build your perfect chain to ×5</span></div>
  <label class="focus-check"><input id="focus-attract-enabled" type="checkbox" checked/> Arcade attract mode</label><button id="focus-trailer">Watch trailer</button><label class="focus-check"><input id="focus-gentle" type="checkbox"/> Still camera / reduced motion</label><div class="focus-result"><span>PERFECT TOUCHES <b id="focus-perfects">0</b></span><span>SCORE <b id="focus-score">0</b></span><span>PERFECT CHAIN <b id="focus-multiplier">×1</b></span><span>BEST PERFECT STREAK <b id="focus-streak">0</b></span></div><p class="focus-note">Perfect: 300 × your chain, up to 1,500 per touch. Early or late: 40 and a chain reset. Character skills modify timing or points. A flawless tour round adds a 50% score bonus.</p>
  <details class="focus-star-guide"><summary>How to earn your stars</summary><p>Finish every attempt and land at least half for ★. Perfect accuracy earns ★★ at 50%, ★★★ at 75%, and ★★★★ at 90%. Stray taps and drops count against accuracy. ★★★★★ = 100% perfect: every attempt perfect, no stray taps and no drops.</p></details>
<details id="focus-earlier" class="focus-star-guide" hidden><summary>Earlier records · previous rules</summary><div id="focus-earlier-records"></div></details>
  <p class="focus-note" id="focus-status" role="status"></p><p class="focus-note" id="focus-storage" role="status"></p><button id="focus-offline">Download full offline game</button><p class="focus-note" id="focus-offline-status" role="status"></p><button id="focus-update" hidden>Install game update</button><a href="${back}">← Back to the original game</a><a id="focus-recording" hidden>Download demo recording</a></aside></div><footer class="creator-credit"><a href="https://whatchan.co.uk/about-whatchan-adrian-dane#stat-man" target="_blank" rel="noopener noreferrer">Created by Adrian Dane</a></footer></main>`;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const stage = el('focus-stage'),
    overlay = el('focus-overlay');
  let storage: Storage | null = null;
  try {
    storage = localStorage;
  } catch {
    /* Session-only play is still available. */
  }
  const progress = new FocusProgress(storage);
  const offline = new OfflineManager((text) => {
    el('focus-offline-status').textContent = text;
  }, false);
  void offline.init();
  el('focus-offline').onclick = () => {
    void offline.download();
  };
  el('focus-update').onclick = () => offline.activateUpdate();
  el<HTMLInputElement>('focus-name').value = progress.playerName;
  el<HTMLInputElement>('focus-attract-enabled').checked = progress.attractEnabled;
  const duration = () => el<HTMLSelectElement>('focus-duration').value as ChallengeDuration;
  const timeLabel = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const difficulty = () => el<HTMLSelectElement>('focus-difficulty').value as Difficulty;
  const mode = () => el<HTMLSelectElement>('focus-mode').value as FocusMode;
  const selectedLevel = () => Number(el<HTMLSelectElement>('focus-stage-select').value) || 1;
  const selectedCharacter = () =>
    mode() === 'levels'
      ? characterForLevel(selectedLevel()).id
      : el<HTMLSelectElement>('focus-character').value || 'ronaldinho';
  function updateCharacters() {
    const preferred = el<HTMLSelectElement>('focus-character').value;
    el('focus-character').innerHTML = FOCUS_CHARACTERS.map(
      (c, i) =>
        `<option value="${c.id}" ${progress.characterUnlocked(c.id) ? '' : 'disabled'}>${c.name}${progress.characterUnlocked(c.id) ? '' : ' · finish round ' + i + ' to unlock'}</option>`,
    ).join('');
    el<HTMLSelectElement>('focus-character').value = progress.characterUnlocked(preferred)
      ? preferred
      : 'ronaldinho';
  }
  function updateLevels(preferred = selectedLevel()) {
    const unlocked = progress.unlocked(difficulty());
    el('focus-stage-select').innerHTML = LEVELS.map(
      (_, i) =>
        `<option value="${i + 1}" ${i + 1 > unlocked ? 'disabled' : ''}>${i + 1}. ${characterForLevel(i + 1).name}${i + 1 > unlocked ? ' · locked' : progress.stars(difficulty(), i + 1) ? ' · ' + progress.stars(difficulty(), i + 1) + '/5 ★' : ''}</option>`,
    ).join('');
    el<HTMLSelectElement>('focus-stage-select').value = String(Math.min(preferred, unlocked));
  }
  function updateBoard() {
    const rows = progress.board(
      difficulty(),
      mode(),
      selectedLevel(),
      duration(),
      selectedCharacter(),
    );
    el('focus-board-label').textContent =
      `${MODE_NAMES[mode()]}${mode() === 'levels' ? ' · Round ' + selectedLevel() : mode() === 'endless' ? ' · ' + DURATION_NAMES[duration()] : ''} · ${focusCharacter(selectedCharacter()).name} · ${difficulty()}`;
    el('focus-board-title').textContent =
      mode() === 'levels'
        ? 'HIGH SCORES · THIS LEVEL'
        : mode() === 'practice'
          ? 'PRACTICE · UNRANKED'
          : 'HIGH SCORES · THIS CHALLENGE';
    el('focus-board').innerHTML =
      mode() === 'practice'
        ? '<p>Take your time. Practice does not post scores.</p>'
        : highScoreTable(rows, mode() === 'levels', progress.playerName);
    const best = progress.personalBest(
      difficulty(),
      mode(),
      selectedLevel(),
      duration(),
      selectedCharacter(),
    );
    el('focus-personal-best').textContent =
      mode() === 'practice'
        ? ''
        : `${best ? 'YOUR BEST: ' + best.score.toLocaleString() + ' points. ' : ''}${rows.length ? 'TOP SCORE: ' + rows[0].score.toLocaleString() + ' · ' + rows[0].playerName + '. Replay this round to challenge the table.' : 'Finish a qualifying round to put your name on the table.'}`;
    const stars = LEVELS.reduce((sum, _, i) => sum + progress.stars(difficulty(), i + 1), 0);
    el('focus-collection').textContent =
      `${stars} / 60 stars · ${difficulty()} · ${FOCUS_CHARACTERS.filter((c) => progress.characterUnlocked(c.id)).length} / 12 characters unlocked`;
    el('focus-storage').textContent = progress.warning;
    const earlier = progress.earlierBoards();
    el('focus-earlier').hidden = !earlier.length;
    el('focus-earlier-records').innerHTML = earlier
      .map(
        ({ key, records }) =>
          `<p>${escapeHTML(key.replaceAll(':', ' · '))}<br/>${records.map((r) => `${escapeHTML(r.playerName)} · ${r.score.toLocaleString()} points`).join('<br/>')}</p>`,
      )
      .join('');
  }
  updateLevels(progress.unlocked(difficulty()));
  updateCharacters();
  updateBoard();
  let scene: FocusScene;
  const portraits = new Map<string, HTMLImageElement>();
  const venues = new Map<string, HTMLImageElement>();
  let images: Awaited<ReturnType<typeof preloadRun>>;
  try {
    images = await preloadRun('ronaldinho', 'court', () => {});
    await Promise.all(
      FOCUS_CHARACTERS.map(async (c) => portraits.set(c.id, await loadImage(`art/${c.id}.webp`))),
    );
    await Promise.all(
      [...new Set(FOCUS_CHARACTERS.map((c) => c.venue.id))].map(async (id) =>
        venues.set(id, await loadImage(`art/${id}.webp`)),
      ),
    );
    scene = new FocusScene(stage, images.venue, images.character);
  } catch {
    el('focus-status').textContent =
      'The character or venue artwork could not load. Reload to try again.';
    el('focus-start').textContent = 'COURT UNAVAILABLE';
    return;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el<HTMLInputElement>('focus-gentle').checked = reduced;
  scene.gentle = reduced;
  const audio = new AudioEngine({
    sound: false,
    music: false,
    reduced,
    contrast: false,
    vibration: false,
  });
  const presentation = new FocusPresentation(el('focus-app-root'), storage, reduced, images, {
    silence: () => audio.pause(),
    play: () => {
      menu();
      start();
    },
    enabled: () => progress.attractEnabled,
    boards: () => {
      const boards = [];
      for (const diff of ['casual', 'standard', 'expert'] as const) {
        for (const category of ['2-minutes', '5-minutes', 'unlimited'] as const) {
          for (const c of FOCUS_CHARACTERS) {
            const rows = progress.board(diff, 'endless', 1, category, c.id);
            if (rows.length)
              boards.push({ label: `${c.name} · ${DURATION_NAMES[category]} · ${diff}`, rows });
          }
        }
        for (let level = 1; level <= LEVELS.length; level++) {
          const rows = progress.board(diff, 'levels', level);
          if (rows.length)
            boards.push({
              label: `Round ${level} · ${characterForLevel(level).name} · ${diff}`,
              rows,
            });
        }
      }
      return boards;
    },
  });
  let round = new FocusRound(),
    running = false,
    paused = false,
    automatic = false,
    countdown = 0;
  let announcedFeedback: FocusRound['feedback'] = null;
  let previous = performance.now(),
    finished = false;
  let recorder: MediaRecorder | null = null;
  let recordingURL: string | null = null;
  const chunks: BlobPart[] = [];
  function record() {
    if (!query.has('capture') || !('MediaRecorder' in window)) return;
    scene.canvas.width = 400;
    scene.canvas.height = 680;
    chunks.length = 0;
    recorder = new MediaRecorder(scene.canvas.captureStream(30), {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 600000,
    });
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      if (recordingURL) URL.revokeObjectURL(recordingURL);
      recordingURL = URL.createObjectURL(blob);
      const link = el<HTMLAnchorElement>('focus-recording');
      link.href = recordingURL;
      link.download = 'keepyuppy-touch-camera.webm';
      link.hidden = false;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          localStorage.setItem(
            'keepy-focus-capture',
            JSON.stringify({ video: reader.result, duration: round.time, hits: round.hits }),
          );
          document.body.dataset.capture = 'complete';
        } catch {
          el('focus-status').textContent = 'Recording ready. Use the download link.';
          document.body.dataset.capture = 'download';
        }
      };
      reader.readAsDataURL(blob);
    };
    recorder.start(1000);
  }
  function lockControls(locked: boolean) {
    for (const id of [
      'focus-character',
      'focus-mode',
      'focus-difficulty',
      'focus-stage-select',
      'focus-duration',
      'focus-name',
      'focus-demo',
      'focus-trailer',
    ])
      el<HTMLSelectElement>(id).disabled = locked;
    el<HTMLButtonElement>('focus-finish').disabled = !locked;
    offline.inRun = locked;
    el<HTMLButtonElement>('focus-offline').disabled = locked;
  }
  function updateObjective() {
    const currentMode = running ? round.mode : mode();
    const level = running ? round.stage : selectedLevel();
    const timed = running ? round.timed : currentMode === 'endless' && duration() !== 'unlimited';
    const remaining = running ? round.timeRemaining : duration() === '5-minutes' ? 300 : 120;
    const hits = running ? round.hits : 0;
    const attempts = running ? round.attempts : 0;
    const { touches: goal, attempts: limit } = LEVELS[level - 1];
    el('focus-goal').textContent =
      automatic && running
        ? 'DEMO · UNRANKED'
        : currentMode === 'levels'
          ? `ROUND ${level} · ${attempts} / ${limit} ATTEMPTS COMPLETE`
          : `${MODE_NAMES[currentMode].toUpperCase()} · ${timed ? timeLabel(Math.ceil(remaining)) + ' LEFT' : hits + ' TOUCHES'}`;
    el('focus-goal-detail').textContent =
      currentMode === 'levels'
        ? `${hits} / ${goal} touches to qualify · ${attempts === limit - 1 ? 'FINAL ATTEMPT · ' : ''}${hits >= goal ? 'Target reached. Finish every attempt for your rating.' : 'A touch or drop uses one attempt.'} 100% perfect = five stars.`
        : currentMode === 'endless'
          ? timed
            ? 'Survive without a drop. Only full completions reach the board.'
            : 'Build speed. Beat your best. Finish run to bank your score.'
          : 'Relaxed pace. Drops reset the ball. Finish whenever you like.';
    const bar = el<HTMLProgressElement>('focus-progress');
    bar.hidden = currentMode !== 'levels' || automatic;
    bar.max = limit;
    bar.value = attempts;
    el('focus-goal').classList.toggle(
      'focus-last-seconds',
      timed && remaining <= 10 && remaining > 0,
    );
  }
  function menu() {
    presentation.setState('menu');
    overlay.removeAttribute('role');
    overlay.removeAttribute('aria-modal');
    el('focus-results-board').hidden = true;
    updateCharacters();
    running = false;
    paused = false;
    automatic = false;
    round = new FocusRound(difficulty(), {
      mode: mode(),
      level: selectedLevel(),
      duration: duration(),
      playerName: progress.playerName,
      character: selectedCharacter(),
    });
    lockControls(false);
    el<HTMLButtonElement>('focus-pause').disabled = true;
    overlay.classList.add('focus-welcome');
    overlay.hidden = false;
    const character = focusCharacter(round.character);
    scene.setCharacter(portraits.get(character.id)!);
    scene.setVenue(venues.get(character.venue.id)!, character.venue.name);
    stage.dataset.venue = character.venue.id;
    el('focus-skill').textContent =
      `${character.name} · ${character.venue.name} · ${character.skill.name}: ${character.skill.description}`;
    overlay.querySelector('h1')!.textContent = character.name.toUpperCase();
    overlay.querySelector('.eyebrow')!.textContent =
      `${character.country} · ${character.skill.name}`;
    el('focus-next').hidden = true;
    el('focus-menu').hidden = true;
    el('focus-start').hidden = false;
    el('focus-start').textContent =
      mode() === 'levels'
        ? `PLAY ROUND ${selectedLevel()} · ${round.attemptLimit} ATTEMPTS ↗`
        : `PLAY ${MODE_NAMES[mode()].toUpperCase()} ↗`;
    el('focus-intro').textContent =
      mode() === 'levels'
        ? `${round.attemptLimit} attempts. Land at least ${round.goal} touches ${round.stage === 12 ? 'to complete the tour' : 'to unlock ' + characterForLevel(round.stage + 1).name}. Every attempt perfect = five stars.`
        : mode() === 'endless'
          ? duration() === 'unlimited'
            ? 'How far can you go? Bank your score with Finish run.'
            : `Survive ${DURATION_NAMES[duration()]} without dropping to qualify.`
          : 'No pressure. Keep practising, even after a drop.';
    el('focus-character-choice').hidden = mode() === 'levels';
    el('focus-duration-choice').hidden = mode() !== 'endless';
    el('focus-level-choice').hidden = mode() !== 'levels';
    el('focus-finish').textContent =
      mode() === 'levels'
        ? 'Leave round'
        : mode() === 'endless' && duration() !== 'unlimited'
          ? 'Leave challenge'
          : 'Finish run';
    el('focus-status').textContent = 'Tap, click or press Space at the centre of the timing ring.';
    updateObjective();
    updateBoard();
  }
  function start(auto = false) {
    if (presentation.state === 'trailer' || presentation.state === 'attract') return;
    if (!auto) {
      const input = el<HTMLInputElement>('focus-name');
      const name = cleanPlayerName(input.value);
      if (!name) {
        menu();
        input.setAttribute('aria-invalid', 'true');
        el('focus-name-hint').textContent =
          'Please enter your name before playing. Include at least one letter or number.';
        input.focus();
        input.scrollIntoView({ block: 'center', behavior: 'auto' });
        return;
      }
      if (progress.playerName !== name) progress.setPlayerName(name);
      input.value = name;
      input.removeAttribute('aria-invalid');
      updateBoard();
    }
    el('focus-results-board').hidden = true;
    presentation.setState('playing');
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    round = new FocusRound(difficulty(), {
      mode: auto ? 'endless' : mode(),
      level: selectedLevel(),
      duration: auto ? 'unlimited' : duration(),
      playerName: progress.playerName,
      character: selectedCharacter(),
    });
    scene.setCharacter(portraits.get(round.character)!);
    const venue = focusCharacter(round.character).venue;
    scene.setVenue(venues.get(venue.id)!, venue.name);
    stage.dataset.venue = venue.id;
    overlay.removeAttribute('role');
    overlay.removeAttribute('aria-modal');
    running = true;
    paused = false;
    automatic = auto;
    countdown = 3;
    finished = false;
    announcedFeedback = null;
    previous = performance.now();
    overlay.hidden = true;
    el('focus-pause').textContent = 'Pause';
    el<HTMLButtonElement>('focus-pause').disabled = false;
    lockControls(true);
    el('focus-finish').textContent = auto
      ? 'Stop demo'
      : mode() === 'levels'
        ? 'Leave round'
        : round.timed
          ? 'Leave challenge'
          : 'Finish run';
    el('focus-status').textContent = auto
      ? 'Demo playing · six touches, then a drop.'
      : `${MODE_NAMES[mode()]} · ${mode() === 'levels' ? 'Play all ' + round.attemptLimit + ' attempts and land at least ' + round.goal + ' touches.' : mode() === 'practice' ? 'Drops reset the ball; finish whenever you like.' : round.timed ? 'Survive the full duration to qualify.' : 'Finish run to bank your score.'}`;
    stage.focus({ preventScroll: true });
    audio.unlock();
    if (auto) record();
  }
  function pause() {
    if (presentation.state !== 'playing' && presentation.state !== 'paused') return;
    if (!running || round.ended) return;
    paused = !paused;
    presentation.setState(paused ? 'paused' : 'playing');
    previous = performance.now();
    el('focus-pause').textContent = paused ? 'Resume' : 'Pause';
    if (!paused) countdown = 1.5;
    if (paused) {
      audio.pause();
      if (recorder?.state === 'recording') recorder.pause();
    } else {
      audio.unlock();
      if (recorder?.state === 'paused') recorder.resume();
      stage.focus({ preventScroll: true });
    }
  }
  function advance(now: number) {
    const delta = Math.max(0, Math.min(0.1, (now - previous) / 1000));
    previous = now;
    if (presentation.state !== 'playing' || !running || paused || round.ended) return;
    if (countdown > 0) {
      countdown = Math.max(0, countdown - delta);
      return;
    }
    const at = round.time + delta;
    if (automatic) {
      while (round.hits < 6 && !round.ended && round.due <= at) round.tap(round.due);
    }
    round.advanceTo(at);
  }
  function tap() {
    if (
      presentation.state !== 'playing' ||
      !running ||
      paused ||
      automatic ||
      countdown > 0 ||
      round.ended
    )
      return;
    advance(performance.now());
    if (countdown > 0) return;
    const result = round.tap(round.time);
    if (result) audio.touch(result);
    scene.draw(round);
  }
  el<HTMLButtonElement>('focus-start').disabled = false;
  menu();
  el('focus-start').onclick = () => start();
  el<HTMLButtonElement>('focus-demo').disabled = false;
  el('focus-demo').onclick = () => start(true);
  el('focus-pause').onclick = pause;
  el('focus-menu').onclick = menu;
  el('focus-finish').onclick = () => {
    if (!running || round.ended) return;
    advance(performance.now());
    round.finish();
    paused = false;
    countdown = 0;
  };
  el('focus-next').onclick = () => {
    updateLevels(round.stage + 1);
    updateBoard();
    menu();
    start();
  };
  el('focus-character').onchange = menu;
  el('focus-mode').onchange = menu;
  el('focus-difficulty').onchange = () => {
    updateLevels(progress.unlocked(difficulty()));
    menu();
  };
  el('focus-stage-select').onchange = menu;
  el('focus-duration').onchange = menu;
  el('focus-trailer').onclick = () => {
    void presentation.trailer();
  };
  el<HTMLInputElement>('focus-name').oninput = () => {
    el('focus-name').removeAttribute('aria-invalid');
    el('focus-name-hint').textContent =
      'Enter 1–12 characters, including a letter or number. Your name is remembered on this device.';
  };
  el<HTMLInputElement>('focus-name').onchange = () => {
    progress.setPlayerName(el<HTMLInputElement>('focus-name').value);
    el<HTMLInputElement>('focus-name').value = progress.playerName;
    updateBoard();
  };
  el<HTMLInputElement>('focus-attract-enabled').onchange = () => {
    progress.setAttractEnabled(el<HTMLInputElement>('focus-attract-enabled').checked);
    updateBoard();
  };
  el('focus-sound').onclick = () => {
    audio.settings.sound = !audio.settings.sound;
    audio.unlock();
    el('focus-sound').textContent = audio.settings.sound ? 'Sound on' : 'Sound off';
    el('focus-sound').setAttribute('aria-pressed', String(audio.settings.sound));
  };
  el<HTMLInputElement>('focus-gentle').onchange = (e) => {
    scene.gentle = (e.target as HTMLInputElement).checked;
    presentation.setReduced(scene.gentle);
  };
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
    el<HTMLInputElement>('focus-gentle').checked = event.matches;
    scene.gentle = event.matches;
    presentation.setReduced(event.matches);
  });
  stage.onpointerdown = (e) => {
    if (overlay.getAttribute('role') === 'dialog' || (e.target as HTMLElement).closest('button'))
      return;
    e.preventDefault();
    stage.focus({ preventScroll: true });
    tap();
  };
  window.addEventListener('keydown', (e) => {
    if (overlay.getAttribute('aria-modal') === 'true' && e.code === 'Tab') {
      const buttons = ['focus-next', 'focus-start', 'focus-menu']
        .map((id) => el<HTMLButtonElement>(id))
        .filter((b) => !b.hidden && !b.disabled);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        index < 0
          ? e.shiftKey
            ? buttons.length - 1
            : 0
          : (index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      e.preventDefault();
      buttons[next]?.focus();
      return;
    }
    if (e.code === 'Escape') {
      e.preventDefault();
      pause();
      return;
    }
    if (
      e.code === 'Space' &&
      !e.repeat &&
      !(e.target as HTMLElement).closest('button,input,select,a')
    ) {
      e.preventDefault();
      tap();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running && !paused && !query.has('capture')) pause();
  });
  window.addEventListener('blur', () => {
    if (running && !paused && !query.has('capture')) pause();
  });
  function frame(now: number) {
    presentation.tick(now);
    el('focus-update').hidden = !offline.updateAvailable || (running && !round.ended);
    advance(now);
    scene.draw(
      round,
      paused
        ? 'PAUSED · RESUME WHEN READY'
        : countdown > 0
          ? `STARTING IN ${Math.ceil(countdown)}`
          : !running
            ? 'READY WHEN YOU ARE'
            : '',
      running,
    );
    updateObjective();
    el('focus-perfects').textContent = `${round.perfects} / ${round.hits}`;
    el('focus-score').textContent = round.score.toLocaleString();
    el('focus-streak').textContent = String(round.best);
    el('focus-multiplier').textContent = `×${round.multiplier}`;
    if (round.feedback && round.feedback !== announcedFeedback) {
      announcedFeedback = round.feedback;
      const f = round.feedback;
      el('focus-status').textContent =
        f.grade === 'perfect'
          ? `Perfect! +${f.points} points · ×${f.multiplier} multiplier · ${round.streak} in a row.`
          : `${f.grade === 'miss' ? 'Miss' : f.grade === 'early' ? 'Early' : 'Late'} · +${f.points} points · perfect chain reset.`;
    }
    if (round.ended && !finished) {
      finished = true;
      presentation.setState('results');
      const saved = !automatic && progress.record(round);
      lockControls(false);
      el<HTMLButtonElement>('focus-pause').disabled = true;
      overlay.classList.remove('focus-welcome');
      overlay.hidden = false;
      const complete = round.reason === 'complete';
      audio.finish(complete || round.reason === 'timed-complete');
      const character = focusCharacter(round.character);
      const nextCharacter = round.stage < LEVELS.length ? characterForLevel(round.stage + 1) : null;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.querySelector('.eyebrow')!.textContent = automatic
        ? 'DEMO · UNRANKED'
        : `${character.name} · ${round.difficulty}${round.mode === 'levels' ? ' · Round ' + round.stage + ' / 12' : ''}`;
      overlay.querySelector('h1')!.textContent = complete
        ? round.stage === LEVELS.length
          ? 'TOUR COMPLETE!'
          : 'ROUND COMPLETE!'
        : round.reason === 'target-missed'
          ? 'ROUND FINISHED!'
          : round.reason === 'timed-complete'
            ? 'CHALLENGE COMPLETE!'
            : automatic
              ? 'DEMO COMPLETE'
              : round.reason === 'drop'
                ? 'BALL DROPPED'
                : round.mode === 'levels'
                  ? 'ROUND LEFT'
                  : 'RUN FINISHED';
      const outcome =
        round.mode === 'levels'
          ? complete
            ? nextCharacter
              ? `${nextCharacter.name} unlocked · ${nextCharacter.skill.name}: ${nextCharacter.skill.description}`
              : 'All 12 rounds cleared! Replay to earn all 60 stars.'
            : round.reason === 'finish'
              ? 'Round left early. Finish all attempts and reach the touch target to unlock the next character.'
              : `Target missed by ${Math.max(0, round.goal - round.hits)} touches. Try again to unlock the next character.`
          : round.timed
            ? round.reason === 'timed-complete'
              ? 'Full survival completed. Score qualifies.'
              : 'Complete the full duration to reach the scoreboard.'
            : round.mode === 'practice' || automatic
              ? 'Unranked · no progress or scores posted.'
              : saved
                ? 'Score posted to your local scoreboard.'
                : 'No score posted. Land a touch to start scoring.';
      el('focus-intro').innerHTML =
        `${complete ? `<span class="focus-stars" aria-label="${round.stars} out of 5 stars">${'★'.repeat(round.stars)}${'☆'.repeat(5 - round.stars)}</span>` : ''}<strong class="focus-summary-score">${round.score.toLocaleString()} points</strong><br/>${saved && progress.lastResult.personalBest ? 'PERSONAL BEST · ' : ''}${saved && progress.lastResult.boardLeader ? 'NEW BOARD LEADER' : ''}<br/>${round.mode === 'levels' ? round.attempts + ' / ' + round.attemptLimit + ' attempts completed' : timeLabel(round.elapsed) + ' played'} · ${round.hits} touches<br/>${round.flawless ? '100' : Math.min(99, Math.floor(round.accuracy * 100))}% perfect accuracy${round.mode === 'levels' ? ' · ' + round.goal + ' touches needed' : ''}<br/>${round.perfects} perfect · ${round.drops} drops · best chain ${round.best}${round.bonus ? `<br/>FLAWLESS BONUS +${round.bonus.toLocaleString()} (50%)` : ''}<span class="focus-unlock">${outcome}</span>`;
      el('focus-start').textContent = automatic
        ? 'PLAY YOUR SELECTED MODE ↗'
        : complete
          ? round.stars === 5
            ? 'REPLAY ROUND'
            : 'REPLAY · CHASE A HIGH SCORE'
          : 'TRY AGAIN ↗';
      el('focus-next').hidden = !complete || !nextCharacter;
      el('focus-next').textContent = nextCharacter
        ? `CONTINUE · ${nextCharacter.name.toUpperCase()} ↗`
        : '';
      el('focus-menu').hidden = false;
      updateLevels();
      updateCharacters();
      updateBoard();
      el('focus-results-board').hidden = automatic || round.mode === 'practice';
      if (!automatic && round.mode !== 'practice') {
        const rows = progress.board(
          round.difficulty,
          round.mode,
          round.stage,
          round.duration,
          round.character,
        );
        el('focus-results-table').innerHTML = highScoreTable(
          rows,
          round.mode === 'levels',
          round.playerName,
          saved ? progress.lastRank : null,
        );
        el('focus-results-rank').textContent = saved
          ? progress.lastRank
            ? `#${progress.lastRank} on this ${round.mode === 'levels' ? 'level' : 'challenge'} · ${round.playerName}`
            : 'Score saved. Replay to break into the top five.'
          : 'This run did not qualify. Finish the challenge to enter the table.';
        const best = progress.personalBest(
          round.difficulty,
          round.mode,
          round.stage,
          round.duration,
          round.character,
          round.playerName,
        );
        el('focus-results-best').textContent =
          `${best ? 'YOUR BEST: ' + best.score.toLocaleString() + ' points. ' : ''}${complete && round.stars === 5 ? 'Five stars secured! Try the next character or a harder difficulty.' : 'Replay to improve your score and climb the table.'}`;
        el('focus-results-board').querySelector('h2')!.textContent =
          round.mode === 'levels'
            ? `LEVEL ${round.stage} HIGH SCORES · ${round.difficulty.toUpperCase()}`
            : 'CHALLENGE HIGH SCORES';
      }
      el('focus-status').textContent = `${overlay.querySelector('h1')!.textContent} ${outcome}`;
      overlay.focus({ preventScroll: true });
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    }
    requestAnimationFrame(frame);
  }
  // Reproducible visual review of this isolated prototype, including portable files.
  if (query.has('frame')) {
    round = new FocusRound();
    const at = Math.max(0, Math.min(60, Number(query.get('frame')) || 0));
    while (round.due <= at && round.hits < 6) round.tap(round.due);
    round.advanceTo(at);
    overlay.hidden = true;
    scene.draw(round);
  } else {
    if (query.has('demo') || query.has('capture')) start(true);
    else presentation.firstVisit();
    requestAnimationFrame(frame);
  }
  document.body.dataset.focusReady = 'true';
}
