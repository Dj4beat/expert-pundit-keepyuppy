import { describe, it, expect } from 'vitest';
import { Simulation, STEP, FLOOR } from '../src/engine';
import { DIFFICULTIES, CHALLENGES } from '../src/content';
import type { Difficulty, RunSettings } from '../src/types';
export const cfg = (patch: Partial<RunSettings> = {}): RunSettings => ({
  mode: 'endless',
  difficulty: 'standard',
  character: 'ronaldinho',
  venue: 'court',
  power: 'focus',
  powerLevel: 0,
  pace: 1,
  seed: 43,
  ball: 'classic',
  kit: 'original',
  effect: 'spark',
  ...patch,
});
function touch(s: Simulation, offset = 0) {
  return s.tap({ type: 'tap', at: s.clock + Math.max(0, s.nextBall.due - s.time + offset) });
}
describe('ball contacts', () => {
  it.each(['casual', 'standard', 'expert'] as Difficulty[])(
    'accepts both boundaries and rejects outside on %s',
    (difficulty) => {
      const w = DIFFICULTIES[difficulty].window;
      for (const offset of [-w + 0.004, w - 0.004]) {
        const s = new Simulation(cfg({ difficulty }));
        expect(s.tap({ type: 'tap', at: 1.6 + offset })).toBe(offset < 0 ? 'early' : 'late');
      }
      for (const offset of [-w - 0.02, w + 0.02]) {
        const s = new Simulation(cfg({ difficulty }));
        expect(s.tap({ type: 'tap', at: 1.6 + offset })).toBe('miss');
      }
    },
  );
  it('produces a longer early arc and a shorter late arc', () => {
    const early = new Simulation(cfg()),
      perfect = new Simulation(cfg()),
      late = new Simulation(cfg());
    touch(early, -0.1);
    touch(perfect);
    touch(late, 0.1);
    expect(early.main.due - early.time).toBeGreaterThan(perfect.main.due - perfect.time);
    expect(late.main.due - late.time).toBeLessThan(perfect.main.due - perfect.time);
  });
  it('scores perfects, selects feet, knees and head, and performs signature moves', () => {
    const s = new Simulation(cfg());
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      seen.add(s.main.touch);
      expect(touch(s)).toBe('perfect');
    }
    expect(seen.size).toBe(3);
    expect(s.hits).toBe(10);
    expect(s.bestStreak).toBe(10);
    expect(s.tricks).toBe(2);
    expect(s.feverUntil).toBeGreaterThan(0);
  });
  it('ends immediately when the main ball reaches the floor', () => {
    const s = new Simulation(cfg());
    s.advanceTo(10);
    expect(s.ended).toBe(true);
    expect(s.main.y).toBe(FLOOR - 14);
    expect(s.time).toBeLessThan(10);
  });
  it('is independent of render cadence and ignores stale input', () => {
    const a = new Simulation(cfg()),
      b = new Simulation(cfg());
    for (let n = 0; n < 100; n++) a.advanceTo(n * 0.01);
    b.advanceTo(0.99);
    expect(a.main.y).toBeCloseTo(b.main.y, 10);
    expect(a.tap({ type: 'tap', at: 0.5 })).toBeNull();
  });
  it('does not let a 20 Hz tap stream sustain a run', () => {
    const s = new Simulation(cfg());
    for (let t = 0; t < 15 && !s.ended; t += 0.05) s.tap({ type: 'tap', at: t });
    expect(s.ended).toBe(true);
    expect(s.hits).toBeLessThan(3);
  });
  it('breaks the perfect streak on premature extra taps', () => {
    const s = new Simulation(cfg());
    touch(s);
    expect(s.streak).toBe(1);
    s.tap({ type: 'tap', at: s.clock + 0.2 });
    expect(s.streak).toBe(0);
  });
  it('has a playable speed ceiling after sustained play', () => {
    const s = new Simulation(cfg());
    s.hits = 500;
    for (let i = 0; i < 100; i++) {
      touch(s);
      expect(s.main.due - s.time).toBeGreaterThan(0.6);
    }
    expect(s.ended).toBe(false);
    expect(s.pace).toBe(1.2);
  });
});
describe('abilities and seeded events', () => {
  it('Second Wind rescues a miss once and then allows a drop', () => {
    const s = new Simulation(cfg({ power: 'second-wind' }));
    s.advanceTo(2);
    expect(s.rescued).toBe(true);
    expect(s.charges).toBe(0);
    expect(s.ended).toBe(false);
    s.advanceTo(10);
    expect(s.ended).toBe(true);
  });
  it('Focus activates after a late touch with limited charges', () => {
    const s = new Simulation(cfg());
    touch(s, 0.11);
    expect(s.charges).toBe(1);
    expect(s.focusUntil).toBeGreaterThan(s.time);
    const start = s.time;
    s.advanceTo(s.clock + 1);
    expect(s.time - start).toBeCloseTo(0.7, 2);
  });
  it('Golden Touch activates after five perfect touches and expires', () => {
    const s = new Simulation(cfg({ power: 'golden-touch' }));
    for (let i = 0; i < 5; i++) touch(s);
    expect(s.charges).toBe(1);
    expect(s.window).toBeCloseTo(DIFFICULTIES.standard.window * 1.5);
    const expiry = s.goldenUntil;
    while (s.time < expiry && !s.ended) {
      const delta = s.main.due - s.time - 0.09;
      while (s.time < s.main.due - 0.09 - STEP * 2 && !s.ended) s.advanceTo(s.clock + STEP);
      if (delta >= 0) s.tap({ type: 'tap', at: s.clock });
    }
    expect(s.window).toBe(DIFFICULTIES.standard.window);
  });
  it('queues signature effects and bonus events without overlapping them', () => {
    const s = new Simulation(cfg());
    s.hits = 11;
    touch(s);
    s.advanceTo(s.clock + 0.01);
    expect(s.event).toBe('golden-score');
    expect(s.multiplier).toBe(2);
  });
  it('schedules alternating bonus windows, and losing bonus keeps the main run alive', () => {
    const ch = CHALLENGES.find((c) => c.objectives[0].metric === 'bonusHits')!;
    const s = new Simulation(cfg({ mode: 'career', challenge: ch.id }));
    for (let i = 0; i < 4; i++) touch(s);
    s.advanceTo(s.clock + 0.02);
    expect(s.event).toBe('multiball');
    expect(s.bonus.active).toBe(true);
    for (let i = 0; i < 8; i++) {
      expect(Math.abs(s.main.due - s.bonus.due)).toBeGreaterThan(0.5);
      expect(touch(s)).toBe('perfect');
    }
    expect(s.bonusHits).toBeGreaterThan(2);
    expect(s.ended).toBe(false);
    while (s.bonus.active && !s.ended) {
      s.advanceTo(s.clock + 0.01);
      if (Math.abs(s.main.due - s.time) < 0.02) s.tap({ type: 'tap', at: s.clock });
    }
    expect(s.ended).toBe(false);
  });
});

describe('complete career balance', () => {
  it.each(CHALLENGES.map((c) => [c.id, c.name] as const))(
    'allows three stars in challenge %i: %s',
    (id) => {
      const challenge = CHALLENGES[id - 1];
      const s = new Simulation(cfg({ mode: 'career', challenge: id }));
      for (let i = 0; i < 300 && !s.ended; i++) touch(s);
      expect(s.ended).toBe(true);
      expect(s.reason).toBe('complete');
      for (const objective of challenge.objectives)
        expect(s[objective.metric], objective.label).toBeGreaterThanOrEqual(objective.target);
    },
  );
});

describe('trajectory reach and safety under loadouts', () => {
  it.each(['casual', 'standard', 'expert'] as Difficulty[])(
    'keeps full normal late windows playable across all touch heights on %s',
    (difficulty) => {
      const s = new Simulation(cfg({ mode: 'practice', difficulty, power: 'golden-touch' }));
      for (let i = 0; i < 25; i++) {
        const offset = i % 2 === 0 ? -0.9 * s.window : 0.9 * s.window;
        expect(touch(s, offset)).toBe(offset < 0 ? 'early' : 'late');
        expect(s.ended).toBe(false);
      }
    },
  );
  it('restores charges on a new attempt', () => {
    const s = new Simulation(cfg({ power: 'second-wind', powerLevel: 3 }));
    s.advanceTo(2);
    expect(s.charges).toBe(3);
    expect(new Simulation(s.settings).charges).toBe(4);
  });
});
