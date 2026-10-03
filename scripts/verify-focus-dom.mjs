/** Compiled application interaction checks in a DOM/canvas harness.
 * This does not substitute for browser, media/audio or physical-device QA.
 * Run from the repository root; no user saves are read or modified.
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
// Optional QA-only dependencies. Point FOCUS_QA_MODULES at a package.json that
// can resolve linkedom and @napi-rs/canvas, or install them locally without saving.
const external = process.env.FOCUS_QA_MODULES
  ? createRequire(resolve(process.env.FOCUS_QA_MODULES))
  : require;
const { parseHTML } = external('linkedom');
const { createCanvas, Image: NativeImage } = external('@napi-rs/canvas');
const { build } = require('esbuild');
const root = process.cwd();
const built = await build({
  entryPoints: [root + '/src/focus/index.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'FocusBundle',
  loader: { '.css': 'empty' },
  define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'true' },
});
let count = 0;
const check = (value, message) => {
  assert(value, message);
  count++;
};
async function create({
  first = false,
  reduced = false,
  blocked = false,
  cached = false,
  initial = {},
} = {}) {
  const { window } = parseHTML('<!doctype html><html><body><div id="app"></div></body></html>');
  const { document } = window;
  const storage = new Map(Object.entries(initial));
  if (!first) storage.set('expert-pundit-keepyuppy-focus-intro-v1', 'seen');
  let now = 0,
    frames = [],
    plays = 0,
    pauses = 0,
    loads = 0,
    fetches = 0;
  const focusState = { active: null };
  const mediaListeners = [];
  const canvases = new WeakMap();
  window.HTMLCanvasElement.prototype.getContext = function () {
    let c = canvases.get(this);
    if (!c) {
      c = createCanvas(this.width || 800, this.height || 1360);
      canvases.set(this, c);
    }
    return c.getContext('2d');
  };
  window.HTMLCanvasElement.prototype.toDataURL = function () {
    this.getContext();
    return canvases.get(this).toDataURL();
  };
  window.HTMLElement.prototype.focus = function () {
    focusState.active = this;
  };
  window.HTMLElement.prototype.blur = function () {
    focusState.active = null;
  };
  Object.defineProperty(document, 'activeElement', { get: () => focusState.active });
  Object.defineProperty(document, 'hidden', { value: false, writable: true });
  Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
    get() {
      return (
        this._value ??
        this.querySelector('option[selected]')?.value ??
        this.querySelector('option')?.value ??
        ''
      );
    },
    set(value) {
      this._value = value;
    },
    configurable: true,
  });
  Object.defineProperty(window.HTMLSelectElement.prototype, 'options', {
    get() {
      return [...this.querySelectorAll('option')];
    },
  });
  const originalCreate = document.createElement.bind(document);
  document.createElement = (name, ...args) => {
    const e = originalCreate(name, ...args);
    if (name === 'video') {
      e.paused = true;
      e.play = async () => {
        plays++;
        if (blocked) throw Error('Autoplay blocked');
        e.paused = false;
      };
      e.pause = () => {
        pauses++;
        e.paused = true;
      };
      e.load = () => {};
    }
    return e;
  };
  // innerHTML creates elements internally, so video playback methods also live on generic elements.
  window.HTMLElement.prototype.play = async function () {
    plays++;
    if (blocked) throw Error('Autoplay blocked');
    this.paused = false;
  };
  window.HTMLElement.prototype.pause = function () {
    pauses++;
    this.paused = true;
  };
  window.HTMLElement.prototype.load = function () {
    loads++;
  };
  class Image extends NativeImage {
    set src(value) {
      super.src = readFileSync(root + '/public' + value);
    }
    get src() {
      return super.src;
    }
  }
  class KeyboardEvent extends window.Event {
    constructor(type, options = {}) {
      super(type, options);
      Object.assign(this, options);
    }
  }
  class PointerEvent extends window.Event {
    constructor(type, options = {}) {
      super(type, options);
      Object.assign(this, options);
    }
  }
  Object.defineProperty(window, 'navigator', { value: {}, configurable: true, writable: true });
  Object.assign(window, {
    window,
    document,
    Image,
    KeyboardEvent,
    PointerEvent,
    location: { search: '?focus', pathname: '/' },
    navigator: {},
    performance: { now: () => now },
    requestAnimationFrame: (cb) => frames.push(cb),
    matchMedia: (q) => ({
      matches: q.includes('reduced') ? reduced : true,
      addEventListener: (_type, fn) => mediaListeners.push(fn),
    }),
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
    URLSearchParams,
    URL,
    console,
    setTimeout,
    clearTimeout,
  });
  const cache = cached
    ? { match: async () => ({ blob: async () => new Blob(['cached'], { type: 'video/mp4' }) }) }
    : undefined;
  window.caches = cache;
  const context = vm.createContext({
    window,
    document,
    Image,
    KeyboardEvent,
    PointerEvent,
    Event: window.Event,
    caches: cache,
    fetch: async () => {
      fetches++;
      return { ok: true, blob: async () => new Blob(['current'], { type: 'video/mp4' }) };
    },
    location: window.location,
    navigator: cached ? { serviceWorker: { controller: {} } } : {},
    performance: { now: () => now },
    requestAnimationFrame: (cb) => frames.push(cb),
    matchMedia: window.matchMedia,
    localStorage: window.localStorage,
    URLSearchParams,
    URL,
    console,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(built.outputFiles[0].text, context);
  await context.FocusBundle.startFocusGame(document.getElementById('app'));
  await Promise.resolve();
  const get = (id) => document.getElementById(id);
  const tick = (seconds, step = 0.1) => {
    let left = seconds;
    do {
      const dt = Math.min(step, left);
      now += dt * 1000;
      left -= dt;
      const callbacks = frames;
      frames = [];
      for (const cb of callbacks) cb(now);
    } while (left > 1e-8);
  };
  const click = (id) => {
    get(id).click();
    tick(0);
  };
  const action = (name) => {
    document.querySelector(`[data-action="${name}"]`).click();
    tick(0);
  };
  const choose = (id, value) => {
    get(id).value = value;
    get(id).dispatchEvent(new window.Event('change'));
    tick(0);
  };
  const tap = () => {
    get('focus-stage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tick(0);
  };
  choose('focus-name', 'TESTER');
  const saved = () => JSON.parse(storage.get('expert-pundit-keepyuppy-focus-v2') ?? 'null');
  return {
    window,
    document,
    get,
    tick,
    click,
    choose,
    tap,
    saved,
    storage,
    action,
    plays: () => plays,
    pauses: () => pauses,
    loads: () => loads,
    fetches: () => fetches,
    mediaChange: (value) => mediaListeners.forEach((fn) => fn({ matches: value })),
  };
}
{
  const q = await create({ first: true, blocked: true });
  const { document, get, tick, action } = q;
  check(!document.querySelector('.focus-presentation').hidden, 'First visit opens trailer');
  check(document.querySelector('video').src.endsWith('portrait.mp4'), 'Portrait media chosen');
  check(document.querySelector('[role=status]').textContent !== undefined, 'Status exists');
  check(
    document.querySelector('.focus-cinema [role=status]').textContent.includes('Tap Watch trailer'),
    'Blocked autoplay fallback',
  );
  action('sound');
  await Promise.resolve();
  check(!document.querySelector('video').muted, 'Sound action unmutes');
  action('skip');
  check(document.querySelector('.focus-presentation').hidden, 'Skip closes');
  check(q.storage.get('expert-pundit-keepyuppy-focus-intro-v1') === 'seen', 'Skip remembered');
  q.click('focus-trailer');
  await Promise.resolve();
  check(!document.querySelector('.focus-presentation').hidden, 'Replay opens');
  action('play');
  check(get('focus-overlay').hidden, 'Play now starts run');
  check(get('focus-name').disabled, 'Name locked in run');
  tick(10);
  check(
    document.querySelector('.focus-presentation').hidden,
    'No attract over active/result transition before idle threshold',
  );
}
{
  const q = await create({ first: true, reduced: true });
  check(q.plays() === 0, 'Reduced motion no autoplay');
  q.action('replay');
  await Promise.resolve();
  check(q.plays() === 1, 'Reduced motion manual playback');
  q.document.hidden = true;
  q.document.dispatchEvent(new q.window.Event('visibilitychange'));
  check(q.pauses() === 1, 'Hidden tab pauses trailer');
  q.document.hidden = false;
  q.action('skip');
  q.tick(45.1);
  check(q.document.querySelector('.focus-attract-card') !== null, 'Attract starts after idle');
  q.tick(4.1);
  const canvas = q.document.querySelector('.focus-attract-court canvas');
  const frozen = canvas.toDataURL();
  q.tick(2);
  check(canvas.toDataURL() === frozen, 'Reduced motion demo is static');
}
{
  const q = await create();
  const { get, tick, click, choose, tap, saved, document } = q;
  check(document.querySelector('.focus-presentation').hidden, 'Return skips intro');
  check(get('focus-mode').value === 'levels', 'Levels initial mode');
  get('focus-name').focus();
  tick(46);
  check(document.querySelector('.focus-presentation').hidden, 'Name editing blocks attract');
  get('focus-name').blur();
  choose('focus-name', 'ALEX');
  choose('focus-mode', 'endless');
  check(get('focus-duration').value === '2-minutes', '2-minute default');
  click('focus-start');
  tick(8.02, 0.01);
  tap();
  check(get('focus-score').textContent === '300', 'First touch scores');
  click('focus-pause');
  const before = get('focus-goal').textContent;
  tick(60);
  check(get('focus-goal').textContent === before, 'Pause freezes challenge');
  check(document.querySelector('.focus-presentation').hidden, 'Pause blocks attract');
  click('focus-pause');
  tick(1);
  tap();
  check(get('focus-score').textContent === '300', 'Resume countdown rejects touch');
  check(get('focus-goal').textContent === before, 'Resume countdown freezes challenge');
  tick(10);
  check(get('focus-overlay').querySelector('h1').textContent === 'BALL DROPPED', 'Early drop ends');
  check(!saved().boards['standard:skills:ronaldinho:2-minutes'], 'Early drop unranked');
  click('focus-menu');
  choose('focus-duration', 'unlimited');
  click('focus-start');
  tick(8.02, 0.01);
  tap();
  click('focus-finish');
  check(
    saved().boards['standard:skills:ronaldinho:unlimited'][0].playerName === 'ALEX',
    'Unlimited banks identity',
  );
  check(get('focus-intro').textContent.includes('NEW BOARD LEADER'), 'Leader celebrated');
  const snapshot = JSON.stringify(saved());
  tick(60);
  check(document.querySelector('.focus-presentation').hidden, 'Results remain until dismissed');
  click('focus-menu');
  tick(44.9);
  check(document.querySelector('.focus-presentation').hidden, 'No early attract');
  tick(0.2);
  check(!document.querySelector('.focus-presentation').hidden, 'Menu attract active');
  tick(16.1);
  check(
    document.querySelector('.focus-attract-card').textContent.includes('ALEX · 300'),
    'Attract uses real score',
  );
  check(JSON.stringify(saved()) === snapshot, 'Attract never changes save');
  q.window.dispatchEvent(new q.window.KeyboardEvent('keydown', { code: 'Space' }));
  check(document.querySelector('.focus-presentation').hidden, 'Key dismisses attract');
  check(!get('focus-overlay').hidden, 'Dismiss does not start run');
}
for (const [duration, deadline] of [
  ['2-minutes', 120],
  ['5-minutes', 300],
]) {
  const q = await create();
  q.choose('focus-mode', 'endless');
  q.choose('focus-duration', duration);
  q.click('focus-start');
  q.tick(8.02, 0.01);
  q.tap();
  let elapsed = 5;
  for (let hits = 1; ; hits++) {
    const flight = 5 - 2.1 * Math.max(0, Math.min(1, (hits - 4) / 36));
    if (elapsed + flight >= deadline) break;
    q.tick(flight);
    q.tap();
    elapsed += flight;
  }
  q.tick(deadline - elapsed + 0.1);
  check(
    q.get('focus-overlay').querySelector('h1').textContent === 'CHALLENGE COMPLETE!',
    duration + ' completes',
  );
  const score = q.get('focus-score').textContent;
  q.tap();
  q.tick(1);
  check(q.get('focus-score').textContent === score, 'Postdeadline scoring blocked');
  const board = q.saved().boards['standard:skills:ronaldinho:' + duration];
  check(
    board.length === 1 && board[0].elapsed === deadline && board[0].completed,
    'Completion exactly once with correct metadata',
  );
}
{
  const q = await create({ first: true, cached: true });
  await new Promise((resolve) => setTimeout(resolve, 0));
  check(
    q.document.querySelector('video').src.startsWith('blob:'),
    'Cached media plays through Blob URL',
  );
  check(q.fetches() === 1, 'Current service worker response wins over old cache');
  const video = q.document.querySelector('video');
  video.error = { code: 2 };
  video.dispatchEvent(new q.window.Event('error'));
  check(
    q.document
      .querySelector('.focus-cinema [role=status]')
      .textContent.includes('Trailer unavailable'),
    'Media error has playable fallback',
  );
  q.action('replay');
  await Promise.resolve();
  check(q.loads() === 1, 'Media retry reloads errored source');
  q.mediaChange(true);
  check(video.paused, 'Live reduced-motion change pauses trailer');
  q.action('skip');
  const plays = q.plays();
  q.click('focus-trailer');
  await new Promise((resolve) => setTimeout(resolve, 0));
  check(q.plays() === plays, 'Reduced preference persists across trailer replay');
}
mkdirSync(root + '/output/focus-review', { recursive: true });
writeFileSync(
  root + '/output/focus-review/dom-checks.json',
  JSON.stringify(
    { kind: 'LinkeDOM plus native canvas (not a browser)', checks: count, status: 'passed' },
    null,
    2,
  ),
);
console.log(
  count + ' compiled Focus DOM/canvas interaction checks passed (not browser validation).',
);
