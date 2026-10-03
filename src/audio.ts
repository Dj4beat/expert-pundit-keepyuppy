import type { Grade, Preferences } from './types';
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private beat = 0;
  constructor(public settings: Preferences) {}
  unlock() {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
    } catch {
      /* Audio is optional. */
    }
    if (!this.musicTimer && this.settings.music) this.setMusic();
  }
  tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    delay = 0,
  ) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
  touch(grade: Grade) {
    if (!this.settings.sound) return;
    if (grade === 'perfect') {
      this.tone(660, 0.12, 0.07);
      this.tone(990, 0.17, 0.04, 'sine', 0.035);
    } else if (grade === 'miss') {
      this.tone(110, 0.06, 0.025);
    } else if (grade === 'rescue') {
      this.tone(330, 0.12, 0.06);
      this.tone(660, 0.2, 0.05, 'sine', 0.1);
    } else this.tone(grade === 'early' ? 440 : 280, 0.12, 0.06, 'triangle');
  }
  finish(success: boolean) {
    if (!this.settings.sound) return;
    [0, 1, 2].forEach((i) =>
      this.tone((success ? 440 : 220) * [1, 1.25, 1.5][i], 0.24, 0.05, 'sine', i * 0.12),
    );
  }
  setMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (!this.settings.music || !this.ctx) return;
    const notes = [130.81, 0, 196, 0, 164.81, 0, 196, 0, 110, 0, 164.81, 0, 146.83, 0, 196, 0];
    this.musicTimer = setInterval(() => {
      const f = notes[this.beat++ % notes.length];
      if (f) this.tone(f, 0.32, 0.022, 'triangle');
    }, 350);
  }
  pause() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    void this.ctx?.suspend();
  }
  destroy() {
    this.pause();
    void this.ctx?.close();
  }
}
