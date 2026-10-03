import { characterForLevel, focusCharacter, skillFor } from './characters';
import type { Difficulty } from '../types';
import {
  DURATION_SECONDS,
  LEVELS,
  playerName,
  type ChallengeDuration,
  type FocusMode,
} from './modes';

export type FocusLimb = 'right-foot' | 'left-foot' | 'knee' | 'head';
export type FocusGrade = 'perfect' | 'early' | 'late' | 'miss';
export interface Point {
  x: number;
  y: number;
}
export const TARGETS: Record<FocusLimb, Point> = {
  'right-foot': { x: 273, y: 504 },
  'left-foot': { x: 150, y: 510 },
  knee: { x: 233, y: 420 },
  head: { x: 201, y: 173 },
};
export const LABELS: Record<FocusLimb, string> = {
  'right-foot': 'RIGHT FOOT',
  'left-foot': 'LEFT FOOT',
  knee: 'KNEE TOUCH',
  head: 'HEADER',
};
export const SEQUENCE: FocusLimb[] = [
  'right-foot',
  'left-foot',
  'knee',
  'right-foot',
  'head',
  'left-foot',
];
export const WINDOWS: Record<Difficulty, number> = { casual: 0.2, standard: 0.14, expert: 0.09 };
// First four touches stay relaxed; the next 36 build speed smoothly.
export const PACING: Record<Difficulty, { opening: number; fastest: number }> = {
  casual: { opening: 5.6, fastest: 3.5 },
  standard: { opening: 5, fastest: 2.9 },
  expert: { opening: 4.6, fastest: 2.5 },
};
export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
export const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const SCORE = { perfect: 300, recovery: 40, maxMultiplier: 5 } as const;
export interface StrikePose {
  lift: number;
  rotation: number;
}
export interface FocusFeedback {
  at: number;
  grade: FocusGrade;
  limb: FocusLimb;
  point: Point;
  offset: number;
  points: number;
  multiplier: number;
  camera: CameraPose;
  strike: StrikePose;
}
/** All positions, scoring and camera movement use this authoritative clock. */
export class FocusRound {
  time = 0;
  start = 0;
  due: number;
  hits = 0;
  streak = 0;
  best = 0;
  score = 0;
  ended = false;
  reason: 'complete' | 'timed-complete' | 'target-missed' | 'drop' | 'finish' | null = null;
  perfects = 0;
  mistakes = 0;
  drops = 0;
  bonus = 0;
  readonly mode: FocusMode;
  readonly stage: number;
  readonly duration: ChallengeDuration;
  readonly playerName: string;
  readonly character: string;
  feedback: FocusFeedback | null = null;
  lastHit: FocusFeedback | null = null;
  private from: Point = { x: 200, y: 70 };
  private lastTap = -Infinity;
  private terminalBall: Point | null = null;
  constructor(
    readonly difficulty: Difficulty = 'standard',
    options: {
      mode?: FocusMode;
      level?: number;
      duration?: ChallengeDuration;
      playerName?: string;
      character?: string;
    } = {},
  ) {
    this.mode = options.mode ?? 'endless';
    this.duration = options.duration ?? '2-minutes';
    this.playerName = playerName(options.playerName ?? 'PLAYER');
    this.stage = Number.isInteger(options.level)
      ? Math.max(1, Math.min(LEVELS.length, options.level!))
      : 1;
    this.character =
      this.mode === 'levels'
        ? characterForLevel(this.stage).id
        : focusCharacter(options.character ?? 'ronaldinho').id;
    this.due = this.flightDuration;
  }
  get deadline() {
    return this.mode === 'endless' ? DURATION_SECONDS[this.duration] : Infinity;
  }
  get timed() {
    return Number.isFinite(this.deadline);
  }
  get elapsed() {
    return this.time;
  }
  get timeRemaining() {
    return Math.max(0, this.deadline - this.time);
  }
  get ramp() {
    if (this.mode === 'practice') return 0;
    if (this.mode === 'levels')
      return clamp((this.stage - 1) * 0.07 + (Math.max(0, this.hits - 4) / this.goal) * 0.12);
    return clamp((this.hits - 4) / 36);
  }
  get goal() {
    return LEVELS[this.stage - 1].touches;
  }
  get attemptLimit() {
    return LEVELS[this.stage - 1].attempts;
  }
  get attempts() {
    return this.hits + this.drops;
  }
  get accuracy() {
    const total = this.attempts + this.mistakes;
    return total ? this.perfects / total : 0;
  }
  private completeAttempts() {
    if (this.mode !== 'levels' || this.attempts < this.attemptLimit) return false;
    this.ended = true;
    this.reason = this.hits >= this.goal ? 'complete' : 'target-missed';
    this.bonus = this.reason === 'complete' && this.flawless ? Math.round(this.score * 0.5) : 0;
    this.score += this.bonus;
    return true;
  }
  get flawless() {
    return this.hits > 0 && this.perfects === this.hits && this.mistakes === 0 && this.drops === 0;
  }
  get stars() {
    if (this.reason !== 'complete') return 0;
    if (this.flawless) return 5;
    const accuracy = this.accuracy;
    return accuracy >= 0.9 ? 4 : accuracy >= 0.75 ? 3 : accuracy >= 0.5 ? 2 : 1;
  }
  finish() {
    if (this.ended) return;
    this.ended = true;
    this.reason = 'finish';
  }
  get level() {
    return 1 + Math.floor(Math.min(this.hits, 40) / 6);
  }
  get flightDuration() {
    const pace = PACING[this.difficulty];
    return lerp(pace.opening, pace.fastest, this.ramp);
  }
  get timeScale() {
    return (this.due - this.start) / 2.5;
  }
  get dropDelay() {
    return 0.7 * this.timeScale;
  }
  get perfectWindow() {
    return 0.045 * lerp(1.6, 1, this.ramp) * (skillFor(this.character, this.limb).perfect ?? 1);
  }
  get limb() {
    return SEQUENCE[(this.mode === 'levels' ? this.attempts : this.hits) % SEQUENCE.length];
  }
  get target() {
    return TARGETS[this.limb];
  }
  get window() {
    return (
      WINDOWS[this.difficulty] *
      lerp(1.5, 1, this.ramp) *
      (skillFor(this.character, this.limb).save ?? 1)
    );
  }
  get multiplier() {
    return Math.max(1, Math.min(SCORE.maxMultiplier, this.streak));
  }
  get isPerfectMoment() {
    return Math.abs(this.remaining) <= this.perfectWindow + 1e-9;
  }
  get remaining() {
    return this.due - this.time;
  }
  get ball(): Point {
    if (this.terminalBall) return { ...this.terminalBall };
    const u = clamp((this.time - this.start) / (this.due - this.start));
    const p = this.target;
    if (this.time > this.due) {
      const late = (this.time - this.due) / this.timeScale;
      return { x: p.x, y: p.y + 250 * late + 480 * late ** 2 };
    }
    // A long aerial arc, followed by a slower final approach for the close-up.
    const travel = smooth(u);
    const y = lerp(this.from.y, p.y, travel) - 420 * Math.sin(Math.PI * u) ** 1.25;
    return { x: lerp(this.from.x, p.x, travel), y };
  }
  advanceTo(at: number) {
    if (!Number.isFinite(at) || at < this.time || this.ended) return;
    // Consume every reset when a frame crosses several missed flights.
    while (!this.ended) {
      const dropAt = this.due + this.dropDelay;
      this.time = Math.min(at, dropAt, this.deadline);
      if (this.deadline <= dropAt && at >= this.deadline) {
        this.ended = true;
        this.reason = 'timed-complete';
        return;
      }
      if (this.time < dropAt) return;
      const droppedBall = this.ball;
      this.drops++;
      this.streak = 0;
      if (this.completeAttempts()) {
        this.terminalBall = droppedBall;
        return;
      }
      if (this.mode === 'practice' || this.mode === 'levels') {
        this.from = { x: 200, y: 70 };
        this.start = this.time;
        this.due = this.time + this.flightDuration;
        this.lastHit = null;
        this.feedback = null;
        if (at <= this.time) return;
      } else {
        this.ended = true;
        this.reason = 'drop';
      }
    }
  }
  tap(at: number): FocusGrade | null {
    if (!Number.isFinite(at) || at < this.time || this.ended) return null;
    this.advanceTo(at);
    if (this.ended) return null;
    const offset = this.time - this.due;
    const allowed = Math.abs(offset) <= this.window + 1e-9 && this.time - this.lastTap >= 0.24;
    this.lastTap = this.time;
    const grade: FocusGrade = !allowed
      ? 'miss'
      : Math.abs(offset) <= this.perfectWindow + 1e-9
        ? 'perfect'
        : offset < 0
          ? 'early'
          : 'late';
    this.feedback = {
      at: this.time,
      grade,
      limb: this.limb,
      point: this.ball,
      offset,
      points: 0,
      multiplier: 1,
      camera: cameraPose(this),
      strike: strikePose(this, this.limb),
    };
    if (grade === 'miss') {
      this.mistakes++;
      this.streak = 0;
      return grade;
    }
    this.lastHit = this.feedback;
    this.hits++;
    if (grade === 'perfect') this.perfects++;
    this.streak = grade === 'perfect' ? this.streak + 1 : 0;
    this.best = Math.max(this.best, this.streak);
    this.feedback.multiplier = this.multiplier;
    const skill = skillFor(this.character, this.feedback.limb);
    this.feedback.points =
      grade === 'perfect'
        ? Math.round(SCORE.perfect * this.multiplier * (skill.points ?? 1))
        : (skill.recovery ?? SCORE.recovery);
    this.score += this.feedback.points;
    if (this.completeAttempts()) {
      this.terminalBall = { ...this.feedback.point };
      return grade;
    }
    this.from = { ...this.feedback.point };
    this.start = this.time;
    // Speed grows with the rally, never suddenly because a beginner tapped late.
    this.due = this.time + this.flightDuration;
    return grade;
  }
}
export interface CameraPose {
  x: number;
  y: number;
  zoom: number;
  close: number;
  limb: FocusLimb;
}
export function cameraPose(round: FocusRound, reduced = false): CameraPose {
  const wide = { x: 200, y: 340 };
  const scale = round.timeScale;
  const approaching = smooth((1.15 - round.remaining / scale) / 1.15);
  const age = round.lastHit ? round.time - round.lastHit.at : Infinity;
  // Stay on the strike until the ball has left the close-up, then pull back.
  const outgoing = 1 - smooth((age / scale - 0.57) / 0.46);
  if (outgoing > approaching && round.lastHit) {
    const hit = round.lastHit.camera;
    if (reduced) return { ...wide, zoom: 1, close: hit.close * outgoing, limb: round.lastHit.limb };
    // Preserve the exact input-time frame, including early/late touches.
    return {
      x: lerp(wide.x, hit.x, outgoing),
      y: lerp(wide.y, hit.y, outgoing),
      zoom: lerp(1, hit.zoom, outgoing),
      close: hit.close * outgoing,
      limb: round.lastHit.limb,
    };
  }
  const limb = round.limb,
    close = approaching;
  const point = TARGETS[limb];
  const zoom = reduced ? 1 : lerp(1, limb === 'head' ? 2.75 : 3.1, close);
  if (reduced) return { ...wide, zoom: 1, close, limb };
  const goal = { x: point.x, y: point.y - 105 / zoom };
  return { x: lerp(wide.x, goal.x, close), y: lerp(wide.y, goal.y, close), zoom, close, limb };
}
export function project(point: Point, camera: CameraPose): Point {
  return {
    x: 200 + (point.x - camera.x) * camera.zoom,
    y: 340 + (point.y - camera.y) * camera.zoom,
  };
}

/** The limb reaches its contact pose at remaining=0; it never follows the falling ball. */
export function strikePose(round: FocusRound, limb: FocusLimb): StrikePose {
  const restLift = limb === 'head' ? 28 : limb === 'knee' ? 45 : 60;
  const restRotation = limb === 'head' ? -0.07 : limb === 'knee' ? 0.05 : -0.16;
  const hit = round.lastHit;
  if (hit && hit.limb === limb && round.time - hit.at < 1.05 * round.timeScale) {
    const recovery = smooth((round.time - hit.at) / (0.55 * round.timeScale));
    return {
      lift: lerp(hit.strike.lift, restLift, recovery),
      rotation: lerp(hit.strike.rotation, restRotation, recovery),
    };
  }
  const progress = clamp((0.6 - round.remaining / round.timeScale) / 0.6);
  // Accelerate into contact: easing to rest early made the limb look finished
  // while the scoring centre was still approaching.
  const preparation = progress * progress;
  const missed = smooth((-round.remaining - round.window) / (0.35 * round.timeScale));
  const rest = 1 - preparation * (1 - missed);
  return { lift: restLift * rest, rotation: restRotation * rest };
}
