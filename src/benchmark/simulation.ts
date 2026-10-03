import type { Difficulty } from '../types';

export type Vec3 = [number, number, number];
export type Limb = 'foot_l' | 'foot_r' | 'knee_l' | 'knee_r' | 'header';
export type Outcome = 'perfect' | 'early' | 'late' | 'miss';
export interface ContactProfile {
  point: Vec3;
  limb: string;
  contactTime: number;
}
export interface PlayerManifest {
  duration: number;
  contactTime: number;
  ballRadius: number;
  clips: Record<Limb, ContactProfile>;
}
export interface AnimationContact {
  serial: number;
  limb: Limb;
  expectedTime: number;
  actualTime: number;
  point: Vec3;
  outcome: Outcome;
}
const STEP = 1 / 240;
const GRAVITY = 3.2;
const ORDER: Limb[] = ['foot_r', 'foot_l', 'knee_r', 'foot_l', 'knee_l', 'header'];
export const WINDOWS: Record<Difficulty, number> = { casual: 0.075, standard: 0.05, expert: 0.03 };
export const REACH: Record<Limb, number> = {
  foot_l: 0.14,
  foot_r: 0.14,
  knee_l: 0.12,
  knee_r: 0.12,
  header: 0.045,
};
export const distance = (a: Vec3, b: Vec3) => Math.hypot(...a.map((v, i) => v - b[i]));

/** The study uses metres and simulation time; it never reads animation or render state. */
export class JugglingStudy {
  time = 0;
  hits = 0;
  ended = false;
  endedAt = 0;
  due = 1.5;
  start = 0;
  limb: Limb = ORDER[0];
  ball: Vec3;
  from: Vec3;
  target: Vec3;
  velocity = 0;
  contact: AnimationContact | null = null;
  history: AnimationContact[] = [];
  private tick = 0;
  private lastTap = -Infinity;
  private reportedMiss = false;
  constructor(
    readonly manifest: PlayerManifest,
    readonly difficulty: Difficulty = 'casual',
  ) {
    this.target = [...manifest.clips[this.limb].point];
    this.from = [this.target[0], this.target[1] + 0.9, this.target[2]];
    this.ball = [...this.from];
    this.velocity = (this.target[1] - this.from[1] + 0.5 * GRAVITY * this.due ** 2) / this.due;
  }
  get window() {
    return WINDOWS[this.difficulty];
  }
  get descending() {
    return this.velocity - GRAVITY * (this.time - this.start) < 0;
  }
  get reachable() {
    return (
      this.descending &&
      Math.abs(this.time - this.due) <= this.window + STEP / 2 &&
      distance(this.ball, this.target) <= REACH[this.limb]
    );
  }
  advanceTo(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < this.time || this.ended) return;
    const endTick = Math.floor((seconds + 1e-9) / STEP);
    while (this.tick < endTick && !this.ended) {
      this.time = ++this.tick * STEP;
      const t = this.time - this.start;
      const u = Math.min(1, t / (this.due - this.start));
      const ease = u * u * (3 - 2 * u);
      this.ball = [
        this.from[0] + (this.target[0] - this.from[0]) * ease,
        this.from[1] + this.velocity * t - 0.5 * GRAVITY * t * t,
        this.from[2] + (this.target[2] - this.from[2]) * ease,
      ];
      if (this.time > this.due + this.window && !this.reportedMiss) {
        this.reportedMiss = true;
        this.record('miss');
      }
      if (this.ball[1] <= this.manifest.ballRadius) {
        this.ball[1] = this.manifest.ballRadius;
        this.ended = true;
        this.endedAt = this.time;
      }
    }
  }
  tap(at = this.time): Outcome | null {
    if (!Number.isFinite(at) || at < this.time - STEP || this.ended) return null;
    this.advanceTo(at);
    if (this.ended) return null;
    if (!this.reachable || this.time - this.lastTap < 0.26) {
      this.lastTap = this.time;
      return 'miss';
    }
    this.lastTap = this.time;
    const offset = this.time - this.due;
    const outcome = Math.abs(offset) <= 0.012 ? 'perfect' : offset < 0 ? 'early' : 'late';
    this.record(outcome);
    this.hits++;
    this.limb = ORDER[this.hits % ORDER.length];
    this.from = [...this.ball];
    this.target = [...this.manifest.clips[this.limb].point];
    const rise = this.target[1] - this.ball[1];
    const duration = Math.max(
      outcome === 'early' ? 1.6 : outcome === 'late' ? 1.3 : 1.45,
      Math.sqrt(Math.max(0, (2 * rise) / GRAVITY)) + 0.65,
    );
    this.start = this.time;
    this.due = this.time + duration;
    this.velocity = (rise + 0.5 * GRAVITY * duration * duration) / duration;
    this.reportedMiss = false;
    return outcome;
  }
  private record(outcome: Outcome) {
    this.contact = {
      serial: this.history.length + 1,
      limb: this.limb,
      expectedTime: this.due,
      actualTime: this.time,
      point: [...this.ball],
      outcome,
    };
    this.history.push(this.contact);
  }
}

/** Same sample at any frame cadence, paused time or playback speed. */
export function animationSample(sim: JugglingStudy): {
  clip: string;
  time: number;
  weight: number;
} {
  const prior = sim.contact;
  if (prior && sim.time - prior.actualTime < 0.65) {
    const age = sim.time - (prior.outcome === 'miss' ? prior.expectedTime : prior.actualTime);
    const side = prior.limb.endsWith('_l') ? 'l' : 'r';
    // Recovery clips have matching contact poses and a distinct weight-transfer exit.
    const clip = prior.limb.startsWith('foot')
      ? prior.outcome === 'early' || prior.outcome === 'late'
        ? 'recover_' + side
        : prior.limb
      : prior.limb;
    return {
      clip,
      time: sim.manifest.contactTime + age,
      weight: Math.max(0, 1 - Math.max(0, (age - 0.38) / 0.27)),
    };
  }
  const until = sim.due - sim.time;
  if (until > 0.64) return { clip: 'ready', time: sim.time % sim.manifest.duration, weight: 0 };
  return { clip: sim.limb, time: Math.min(sim.manifest.duration, 0.64 - until), weight: 1 };
}
