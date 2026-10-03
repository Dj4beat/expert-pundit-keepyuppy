import { asset } from '../assets';
import { FocusRound } from './simulation';
import { FocusScene } from './scene';

export type PresentationState = 'menu' | 'playing' | 'paused' | 'results' | 'trailer' | 'attract';
export const INTRO_KEY = 'expert-pundit-keepyuppy-focus-intro-v1';

/** Exclusive input owner for the cinematic and the unranked arcade presentation. */
export class FocusPresentation {
  state: PresentationState = 'menu';
  private idleAt = performance.now();
  private startedAt = 0;
  private returnState: PresentationState = 'menu';
  private layer = document.createElement('section');
  private video: HTMLVideoElement | null = null;
  private blobURL = '';
  private generation = 0;
  private demo: FocusRound | null = null;
  private demoScene: FocusScene | null = null;
  private lastDemoTime = 0;
  private lastCard = '';
  private suppressClickUntil = 0;
  private seen = false;
  private previouslyFocused: HTMLElement | null = null;

  constructor(
    private main: HTMLElement,
    private storage: Pick<Storage, 'getItem' | 'setItem'> | null,
    private reduced: boolean,
    private images: { venue: HTMLImageElement; character: HTMLImageElement },
    private callbacks: {
      silence: () => void;
      play: () => void;
      enabled: () => boolean;
      boards: () => {
        label: string;
        rows: { playerName: string; score: number; perfects: number; best: number }[];
      }[];
    },
  ) {
    this.layer.className = 'focus-presentation';
    this.layer.hidden = true;
    this.layer.setAttribute('role', 'dialog');
    this.layer.setAttribute('aria-modal', 'true');
    document.body.append(this.layer);
    try {
      this.seen = storage?.getItem(INTRO_KEY) === 'seen';
    } catch {
      /* Session only. */
    }
    const deliberate = (event: Event) => {
      if (event instanceof KeyboardEvent && event.repeat) return;
      this.idleAt = performance.now();
      if (this.state === 'attract') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.suppressClickUntil = event.type === 'pointerdown' ? performance.now() + 800 : 0;
        this.close();
      } else if (
        this.state === 'trailer' &&
        event instanceof KeyboardEvent &&
        event.code === 'Escape'
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
      }
    };
    window.addEventListener('pointerdown', deliberate, true);
    window.addEventListener('keydown', deliberate, true);
    window.addEventListener(
      'click',
      (event) => {
        if (performance.now() > this.suppressClickUntil || !this.suppressClickUntil) return;
        this.suppressClickUntil = 0;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );
    for (const type of ['pointermove', 'input', 'focusin'])
      window.addEventListener(type, () => {
        this.idleAt = performance.now();
      });
    document.addEventListener('visibilitychange', () => {
      this.idleAt = performance.now();
      if (document.hidden && this.video && !this.video.paused) {
        this.video.pause();
        this.message('Paused while away. Watch again / resume when ready.');
      }
    });
    this.layer.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const buttons = [...this.layer.querySelectorAll<HTMLButtonElement>('button')];
      const first = buttons[0],
        last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
  }
  setReduced(value: boolean) {
    this.reduced = value;
    if (this.demoScene) this.demoScene.gentle = value;
    if (value && this.video && !this.video.paused) {
      this.video.pause();
      this.message('Reduced motion enabled. Play the trailer when ready.');
    }
  }
  firstVisit() {
    if (!this.seen) void this.trailer();
  }
  setState(state: PresentationState) {
    this.state = state;
    this.idleAt = performance.now();
  }
  private remember() {
    this.seen = true;
    try {
      this.storage?.setItem(INTRO_KEY, 'seen');
    } catch {
      /* Playback remains available. */
    }
  }
  private open(state: 'trailer' | 'attract') {
    this.returnState = this.state;
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.state = state;
    this.callbacks.silence();
    this.main.inert = true;
    this.layer.hidden = false;
  }
  close() {
    if (this.state === 'trailer') this.remember();
    this.generation++;
    this.video?.pause();
    this.video?.removeAttribute('src');
    this.video?.load();
    this.video = null;
    if (this.blobURL) URL.revokeObjectURL(this.blobURL);
    this.blobURL = '';
    this.demo = null;
    this.demoScene = null;
    this.layer.hidden = true;
    this.layer.replaceChildren();
    this.main.inert = false;
    this.state = this.returnState;
    this.idleAt = performance.now();
    this.previouslyFocused?.focus({ preventScroll: true });
  }
  private message(text: string) {
    const target = this.layer.querySelector('[role="status"]');
    if (target) target.textContent = text;
  }
  async trailer() {
    if (this.state !== 'menu' && this.state !== 'results') return;
    this.open('trailer');
    this.layer.setAttribute('aria-label', 'KeepyUppy trailer');
    const portrait = matchMedia('(orientation: portrait)').matches;
    this.layer.innerHTML = `<div class="focus-cinema"><video playsinline preload="metadata" poster="${asset('trailer/poster-' + (portrait ? 'portrait' : 'landscape') + '.jpg')}" aria-label="34 second KeepyUppy trailer"></video><div class="focus-cinema-controls"><p role="status">${this.reduced ? 'Your champion challenge awaits. Play the trailer when ready.' : 'Every legend starts with one touch.'}</p><div><button data-action="sound" aria-pressed="false">Sound on</button><button data-action="replay">${this.reduced ? 'Watch trailer' : 'Watch again / resume'}</button><button data-action="skip">Skip intro</button><button data-action="play" class="primary">Play now ↗</button></div></div></div>`;
    const video = this.layer.querySelector('video')!;
    this.video = video;
    video.muted = true;
    const playVideo = async () => {
      if (video.error) video.load();
      if (video.ended) video.currentTime = 0;
      try {
        await video.play();
        this.message('Are you the best KeepyUppy champion in the world?');
      } catch {
        this.message('Tap Watch trailer to play, or Play now to enter the game.');
      }
    };
    const replay = this.layer.querySelector<HTMLButtonElement>('[data-action="replay"]')!;
    replay.onclick = () => {
      if (video.ended) video.currentTime = 0;
      void playVideo();
    };
    this.layer.querySelector<HTMLButtonElement>('[data-action="sound"]')!.onclick = (event) => {
      video.muted = !video.muted;
      const button = event.currentTarget as HTMLButtonElement;
      button.textContent = video.muted ? 'Sound on' : 'Sound off';
      button.setAttribute('aria-pressed', String(!video.muted));
      void playVideo();
    };
    this.layer.querySelector<HTMLButtonElement>('[data-action="skip"]')!.onclick = () =>
      this.close();
    this.layer.querySelector<HTMLButtonElement>('[data-action="play"]')!.onclick = () => {
      this.close();
      this.callbacks.play();
    };
    video.onended = () => {
      this.remember();
      replay.textContent = 'Watch again';
      this.message('Are you the best KeepyUppy champion in the world?');
    };
    video.onerror = () => {
      this.message('Trailer unavailable. Your game is ready — Play now.');
      replay.textContent = 'Retry trailer';
    };
    this.layer.querySelector('button')?.focus();
    const generation = ++this.generation;
    let source = asset(`trailer/${portrait ? 'portrait' : 'landscape'}.mp4`);
    try {
      // Cached video uses a complete Blob, avoiding service-worker Range incompatibilities.
      const cached =
        !source.startsWith('data:') && 'caches' in window ? await caches.match(source) : null;
      if (cached) {
        // Old version caches deliberately survive upgrades. Fetch through the
        // controlling worker to get its current full response (without Range).
        let current = cached;
        if (navigator.serviceWorker?.controller) {
          try {
            const response = await fetch(source);
            if (response.ok) current = response;
          } catch {
            /* A prior complete copy is a useful offline fallback. */
          }
        }
        const blob = await current.blob();
        if (this.generation !== generation) return;
        this.blobURL = URL.createObjectURL(blob);
        source = this.blobURL;
      }
    } catch {
      /* Network or portable playback still works when Cache Storage is denied. */
    }
    if (this.generation !== generation) return;
    video.src = source;
    if (!this.reduced && !document.hidden) await playVideo();
  }
  tick(now: number) {
    if (document.hidden) {
      this.idleAt = now;
      return;
    }
    if (this.state === 'menu') {
      if (!this.callbacks.enabled() || document.activeElement?.matches('input,textarea')) {
        this.idleAt = now;
        return;
      }
      if (now - this.idleAt < 45000) return;
      this.open('attract');
      this.layer.setAttribute('aria-label', 'KeepyUppy arcade demonstration');
      this.startedAt = now;
      this.lastCard = '';
      this.layer.innerHTML =
        '<div class="focus-attract-card"></div><button class="focus-tap primary">Tap to play</button>';
      this.layer.querySelector('button')!.onclick = () => this.close();
      this.layer.querySelector('button')!.focus();
    }
    if (this.state !== 'attract') return;
    const elapsed = (now - this.startedAt) / 1000;
    const phase = elapsed % 24;
    const loop = Math.floor(elapsed / 24);
    const card = phase < 4 ? 'title' : phase < 16 ? 'demo' : phase < 22 ? 'board' : 'challenge';
    const key = `${loop}:${card}`;
    const panel = this.layer.querySelector<HTMLElement>('.focus-attract-card')!;
    if (key !== this.lastCard) {
      this.lastCard = key;
      this.demo = null;
      this.demoScene = null;
      if (card === 'title')
        panel.innerHTML = `<img class="focus-attract-hero" src="${asset('art/ronaldinho.webp')}" alt="Ronaldinho"/><div><span class="eyebrow">EXPERT PUNDIT</span><h1>KEEPY<span>UPPY</span></h1><p>Every legend starts with one touch.</p></div>`;
      if (card === 'demo') {
        panel.innerHTML =
          '<h2>MAKE EVERY TOUCH PERFECT.</h2><p>DEMONSTRATION · UNRANKED</p><div class="focus-attract-court"></div>';
        this.demo = new FocusRound('standard', { mode: 'endless', duration: 'unlimited' });
        this.demoScene = new FocusScene(
          panel.querySelector('div')!,
          this.images.venue,
          this.images.character,
        );
        this.demoScene.gentle = this.reduced;
        this.lastDemoTime = now;
        if (this.reduced) {
          this.demo.advanceTo(4.9);
          this.demoScene.draw(this.demo, 'PERFECT TIMING · ×5 POTENTIAL');
        }
      }
      if (card === 'board') {
        const boards = this.callbacks.boards();
        const board = boards.length ? boards[loop % boards.length] : null;
        panel.innerHTML =
          '<span class="eyebrow">ON THIS DEVICE</span><h1>THE HIGH SCORERS</h1><p class="focus-attract-board-label"></p><ol></ol>';
        panel.querySelector('p')!.textContent = board?.label ?? 'Set the first record';
        for (const row of board?.rows ?? []) {
          const item = document.createElement('li');
          item.textContent = `${row.playerName} · ${row.score.toLocaleString()} pts · ${row.perfects} perfect · chain ${row.best}`;
          panel.querySelector('ol')!.append(item);
        }
      }
      if (card === 'challenge')
        panel.innerHTML =
          '<span class="eyebrow">2 MINUTES · 5 MINUTES · UNLIMITED</span><h1>ARE YOU THE BEST KEEPYUPPY CHAMPION IN THE WORLD?</h1><p>Free to play. Your next record starts here.</p>';
    }
    if (card === 'demo' && this.demo && this.demoScene && !this.reduced) {
      const at = this.demo.time + Math.min(0.1, Math.max(0, (now - this.lastDemoTime) / 1000));
      this.lastDemoTime = now;
      while (this.demo.due <= at && !this.demo.ended) this.demo.tap(this.demo.due);
      this.demo.advanceTo(at);
      this.demoScene.draw(this.demo, 'DEMO · UNRANKED');
    }
  }
}
