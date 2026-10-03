import { BALANCE, CHALLENGES, DIFFICULTIES } from './content';
import type { EventKind, Grade, InputAction, RunResult, RunSettings, Touch } from './types';
export const STEP = 1 / 240;
export const FLOOR = 604;
export const CONTACT = {
  foot: { x: 258, y: 490 },
  knee: { x: 218, y: 461 },
  head: { x: 186, y: 337 },
};
const G = 300;
export interface Ball {
  x: number;
  y: number;
  vy: number;
  fromX: number;
  targetX: number;
  start: number;
  due: number;
  touch: Touch;
  active: boolean;
}
export interface Feedback {
  serial: number;
  grade: Grade;
  text: string;
  at: number;
  x: number;
  y: number;
  touch: Touch;
  bonus: boolean;
}
export class Simulation {
  readonly settings: RunSettings;
  readonly id: string;
  time = 0;
  clock = 0;
  hits = 0;
  perfects = 0;
  streak = 0;
  bestStreak = 0;
  score = 0;
  tricks = 0;
  bonusHits = 0;
  fever = 0;
  xpBonus = 0;
  ended = false;
  reason: RunResult['reason'] = 'drop';
  rescued = false;
  charges: number;
  focusUntil = 0;
  goldenUntil = 0;
  feverUntil = 0;
  trickUntil = 0;
  event: EventKind | null = null;
  eventUntil = 0;
  announcement = '';
  announcementUntil = 0;
  main: Ball;
  bonus: Ball;
  feedback: Feedback | null = null;
  // Last accepted touch survives stray taps so visual recovery stays continuous.
  lastContact: Feedback | null = null;
  private tick = 0;
  private randomState: number;
  private serial = 0;
  private lastTap = -Infinity;
  private nextEvent = 12;
  private eventIndex = 0;
  private clean = 0;
  constructor(
    settings: RunSettings,
    id = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2),
  ) {
    this.settings = {
      ...settings,
      pace: Math.max(0.65, Math.min(1.2, settings.pace)),
      powerLevel: Math.max(0, Math.min(3, settings.powerLevel)),
    };
    this.id = id;
    this.randomState = settings.seed || 1234;
    if (settings.mode === 'endless') this.eventIndex = Math.floor(this.random() * 3);
    this.charges = settings.power === 'second-wind' ? 1 + this.settings.powerLevel : 2;
    this.main = this.makeBall('foot', 1.6, 300);
    this.bonus = this.makeBall('knee', 2.3, 180);
    this.bonus.active = false;
    if (
      settings.mode === 'career' &&
      CHALLENGES[(settings.challenge ?? 1) - 1]?.objectives[0].metric === 'bonusHits'
    )
      this.nextEvent = 4;
  }
  private makeBall(touch: Touch, delay: number, y: number): Ball {
    const p = CONTACT[touch];
    return {
      x: p.x,
      y,
      vy: (p.y - y - 0.5 * G * delay * delay) / delay,
      fromX: p.x,
      targetX: p.x,
      start: this.time,
      due: this.time + delay,
      touch,
      active: true,
    };
  }
  random() {
    this.randomState = (Math.imul(1664525, this.randomState) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }
  get window() {
    return DIFFICULTIES[this.settings.difficulty].window * (this.time < this.goldenUntil ? 1.5 : 1);
  }
  get multiplier() {
    return (this.time < this.feverUntil ? 1.5 : 1) * (this.event === 'golden-score' ? 2 : 1);
  }
  get nextBall() {
    return this.bonus.active && this.bonus.due < this.main.due ? this.bonus : this.main;
  }
  get pace() {
    return this.settings.mode === 'practice' || this.settings.mode === 'lesson'
      ? this.settings.pace
      : Math.min(1.2, 1 + this.hits * 0.0025);
  }
  advanceTo(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < this.clock || this.ended) return;
    // Integer wall ticks keep identical results regardless of render cadence.
    const target = Math.floor((seconds + 1e-9) / STEP);
    while (this.tick < target && !this.ended) {
      this.tick++;
      this.clock = this.tick * STEP;
      this.step(STEP * (this.time < this.focusUntil ? 0.7 : 1));
    }
  }
  private step(dt: number) {
    this.time += dt;
    for (const ball of [this.main, this.bonus]) {
      if (!ball.active) continue;
      ball.y += ball.vy * dt + 0.5 * G * dt * dt;
      ball.vy += G * dt;
      const t = Math.min(1, Math.max(0, (this.time - ball.start) / (ball.due - ball.start)));
      ball.x = ball.fromX + (ball.targetX - ball.fromX) * (t * t * (3 - 2 * t));
      if (
        ball === this.main &&
        this.time > ball.due + this.window &&
        this.settings.power === 'second-wind' &&
        this.charges > 0 &&
        ball.y < FLOOR - 14
      ) {
        this.charges--;
        this.rescued = true;
        this.streak = 0;
        this.clean = 0;
        this.notify('rescue', 'SECOND WIND', ball);
        this.launch(ball, 'late');
      }
      if (ball.y >= FLOOR - 14) {
        ball.y = FLOOR - 14;
        if (ball === this.main) {
          this.ended = true;
          this.reason = 'drop';
        } else {
          ball.active = false;
          this.event = null;
          this.announce('BONUS OVER · KEEP GOING');
        }
      }
    }
    if (this.event && this.time >= this.eventUntil) {
      this.event = null;
      this.bonus.active = false;
    }
    if (!this.event && this.hits >= this.nextEvent && this.time >= this.trickUntil) {
      this.startEvent();
    }
  }
  private startEvent() {
    const allowed =
      this.settings.mode === 'career'
        ? (CHALLENGES[(this.settings.challenge ?? 1) - 1]?.events ?? [])
        : this.settings.mode === 'lesson'
          ? []
          : (['golden-score', 'golden-xp', 'multiball'] as EventKind[]);
    this.nextEvent = this.hits + BALANCE.eventInterval;
    if (!allowed.length) return;
    this.event = allowed[this.eventIndex++ % allowed.length];
    this.eventUntil = this.time + 12;
    if (this.event === 'multiball') {
      // The bonus lands halfway between main-ball windows. A fixed paired cadence
      // during mayhem prevents trajectories from drifting into overlapping windows.
      this.bonus = this.makeBall('knee', Math.max(0.68, this.main.due - this.time + 0.72), 190);
      this.announce('MULTIBALL · CYAN IS THE BONUS');
    } else
      this.announce(
        this.event === 'golden-score' ? 'GOLDEN MOMENT · 2× SCORE' : 'GOLDEN MOMENT · 2× XP',
      );
  }
  private announce(text: string) {
    this.announcement = text;
    this.announcementUntil = this.time + 2.5;
  }
  private notify(grade: Grade, text: string, ball: Ball) {
    this.feedback = {
      serial: ++this.serial,
      grade,
      text,
      at: this.time,
      x: ball.x,
      y: ball.y,
      touch: ball.touch,
      bonus: ball === this.bonus,
    };
    if (grade === 'perfect' || grade === 'early' || grade === 'late') {
      this.lastContact = this.feedback;
    }
  }
  tap(action: InputAction): Grade | null {
    if (action.at < this.clock - STEP || !Number.isFinite(action.at) || this.ended) return null;
    this.advanceTo(action.at);
    if (this.ended) return null;
    // Contact requires a descending ball inside its time AND spatial reach window.
    const ball = [this.main, this.bonus]
      .filter((b) => b.active)
      .sort((a, b) => Math.abs(this.time - a.due) - Math.abs(this.time - b.due))[0];
    const offset = this.time - ball.due;
    const reachable =
      ball.vy > 0 &&
      Math.abs(offset) <= this.window + STEP / 2 &&
      Math.abs(ball.y - CONTACT[ball.touch].y) < 155;
    if (!reachable || this.time - this.lastTap < 0.26) {
      this.streak = 0;
      this.clean = 0;
      this.fever = Math.max(0, this.fever - 15);
      this.lastTap = this.time;
      this.notify('miss', offset < 0 ? 'WAIT FOR THE DROP' : 'OUT OF REACH', ball);
      return 'miss';
    }
    this.lastTap = this.time;
    const grade: Grade =
      Math.abs(offset) <= DIFFICULTIES[this.settings.difficulty].perfect
        ? 'perfect'
        : offset < 0
          ? 'early'
          : 'late';
    if (ball === this.bonus) {
      this.bonusHits++;
      this.score += Math.round((grade === 'perfect' ? 120 : 70) * this.multiplier);
      this.notify(grade, 'BONUS +' + (grade === 'perfect' ? 120 : 70), ball);
      this.launch(ball, grade);
      return grade;
    }
    this.hits++;
    if (grade === 'perfect') {
      this.perfects++;
      this.streak++;
      this.clean++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    } else {
      this.streak = 0;
      this.clean = Math.max(0, this.clean - 1);
    }
    this.fever = Math.min(100, (this.clean / BALANCE.feverHits) * 100);
    if (this.clean >= BALANCE.feverHits && this.time >= this.feverUntil) {
      this.feverUntil = this.time + 8;
      this.clean = 0;
      this.announce('CROWD FEVER · 1.5× SCORE');
    }
    const points = Math.round(
      (grade === 'perfect' ? 120 + Math.min(this.streak, 20) * 10 : grade === 'early' ? 65 : 50) *
        this.multiplier,
    );
    this.score += points;
    if (this.event === 'golden-xp')
      this.xpBonus += BALANCE.hitXP + (grade === 'perfect' ? BALANCE.perfectXP : 0);
    if (
      grade === 'late' &&
      this.settings.power === 'focus' &&
      this.charges > 0 &&
      this.time >= this.focusUntil
    ) {
      this.charges--;
      this.focusUntil = this.time + 3 + this.settings.powerLevel;
      this.announce('FOCUS · SLOW IT DOWN');
    }
    if (this.streak > 0 && this.streak % BALANCE.trickStreak === 0) {
      if (!this.event) {
        this.tricks++;
        this.trickUntil = this.time + 1.3;
        this.score += 250;
        this.announce('SIGNATURE MOVE · +250');
      }
      if (
        this.settings.power === 'golden-touch' &&
        this.charges > 0 &&
        this.time >= this.goldenUntil
      ) {
        this.charges--;
        this.goldenUntil = this.time + 4 + this.settings.powerLevel;
      }
    }
    this.notify(
      grade,
      grade === 'perfect'
        ? `PERFECT +${points}`
        : grade === 'early'
          ? 'EARLY · HIGHER ARC'
          : 'LATE · QUICK RECOVERY',
      ball,
    );
    this.launch(ball, grade);
    if (this.settings.mode === 'career') {
      const ch = CHALLENGES[(this.settings.challenge ?? 1) - 1];
      if (
        ch &&
        (ch.objectives.every((o) => this[o.metric] >= o.target) || this.hits >= ch.maxHits)
      ) {
        this.ended = true;
        this.reason = 'complete';
      }
    }
    if (this.hits >= BALANCE.maxRunHits) {
      this.ended = true;
      this.reason = 'complete';
    }
    return grade;
  }
  private launch(ball: Ball, grade: Grade) {
    const sequence: Touch[] = ['foot', 'knee', 'foot', 'head'];
    const next = ball === this.bonus ? 'knee' : sequence[this.hits % sequence.length];
    const target = CONTACT[next];
    let duration = (grade === 'early' ? 1.65 : grade === 'late' ? 1.08 : 1.35) / this.pace;
    if (this.bonus.active) {
      duration = 1.44;
      const other = ball === this.main ? this.bonus : this.main;
      let due = other.due + 0.72;
      while (due < this.time + 0.85) due += 1.44;
      duration = due - this.time;
    }
    // Long enough to rise and descend even when switching from feet to head.
    duration = Math.max(duration, Math.sqrt(Math.max(0, (2 * (ball.y - target.y)) / G)) + 0.3);
    ball.fromX = ball.x;
    ball.targetX = target.x;
    ball.start = this.time;
    ball.due = this.time + duration;
    ball.touch = next;
    ball.vy = (target.y - ball.y - 0.5 * G * duration * duration) / duration;
  }
  finish() {
    if (!this.ended) {
      this.ended = true;
      this.reason = 'finish';
    }
    return this.result();
  }
  result(): RunResult {
    return {
      id: this.id,
      settings: this.settings,
      hits: this.hits,
      perfects: this.perfects,
      bestStreak: this.bestStreak,
      score: this.score,
      tricks: this.tricks,
      bonusHits: this.bonusHits,
      duration: this.time,
      xpBonus: this.xpBonus,
      rescued: this.rescued,
      reason: this.reason,
    };
  }
}
