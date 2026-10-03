import { describe, expect, it } from 'vitest';
import { FocusRound } from '../src/focus/simulation';
import { LEVELS } from '../src/focus/modes';
import { FOCUS_SAVE_KEY, FocusProgress } from '../src/focus/progress';

function complete(level = 1, recoveries = 0, stray = false) {
  const round = new FocusRound('standard', { mode: 'levels', level });
  if (stray) round.tap(0);
  while (!round.ended)
    round.tap(round.due + (round.hits < recoveries ? round.perfectWindow + 0.01 : 0));
  return round;
}
function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
describe('Camera level goals and perfect runs', () => {
  it('finishes a substantial first level without needing a drop and rejects further input', () => {
    const round = complete();
    expect(round.hits).toBe(12);
    expect(round.time).toBeGreaterThan(58);
    expect(round.reason).toBe('complete');
    expect(round.perfects).toBe(12);
    expect(round.stars).toBe(5);
    expect(round.bonus).toBe(7500);
    expect(round.score).toBe(22500);
    expect(round.tap(round.due)).toBeNull();
    round.advanceTo(round.time + 99);
    expect(round.reason).toBe('complete');
  });
  it('requires every touch perfect and no stray taps for five stars', () => {
    const recovered = complete(1, 1);
    expect(recovered.stars).toBe(4);
    expect(recovered.bonus).toBe(0);
    const stray = complete(1, 0, true);
    expect(stray.perfects).toBe(12);
    expect(stray.stars).toBe(4);
    expect(stray.bonus).toBe(0);
  });
  it('awards lower stars for completion without blocking the next challenge', () => {
    expect(complete(1, 3).stars).toBe(3);
    expect(complete(1, 6).stars).toBe(2);
    expect(complete(1, 12).stars).toBe(1);
  });
  it('increases the pace and attempt count while allowing every ball to resolve', () => {
    let duration = Infinity;
    for (let level = 1; level <= LEVELS.length; level++) {
      const round = new FocusRound('standard', { mode: 'levels', level });
      expect(round.flightDuration).toBeLessThan(duration);
      expect(round.goal).toBe(LEVELS[level - 1].touches);
      duration = round.flightDuration;
      const result = complete(level);
      expect(result.attempts).toBe(LEVELS[level - 1].attempts);
      expect(result.reason).toBe('complete');
    }
  });
  it('gives practice a steady pace and fresh balls after drops until manually finished', () => {
    const round = new FocusRound('standard', { mode: 'practice' });
    for (let i = 0; i < 3; i++) round.tap(round.due);
    round.advanceTo(round.due + round.dropDelay);
    expect(round.ended).toBe(false);
    expect(round.drops).toBe(1);
    expect(round.streak).toBe(0);
    expect(round.remaining).toBe(5);
    for (let i = 0; i < 50; i++) round.tap(round.due);
    expect(round.flightDuration).toBe(5);
    round.finish();
    expect(round.reason).toBe('finish');
  });
  it('lets endless players bank their score while leaving a level never awards completion', () => {
    for (const mode of ['endless', 'levels'] as const) {
      const round = new FocusRound('standard', { mode, duration: 'unlimited' });
      round.tap(round.due);
      round.finish();
      expect(round.ended).toBe(true);
      expect(round.score).toBe(300);
      expect(round.stars).toBe(0);
      expect(round.reason).toBe('finish');
    }
  });
});
describe('Camera local progression and scoreboards', () => {
  it('persists stars, unlocks and records once, without changing the original save', () => {
    const storage = memory();
    storage.setItem('expert-pundit-keepyuppy-v2', 'original');
    const progress = new FocusProgress(storage);
    const round = complete();
    expect(progress.record(round)).toBe(true);
    expect(progress.record(round)).toBe(false);
    const restored = new FocusProgress(storage);
    expect(restored.unlocked('standard')).toBe(2);
    expect(restored.unlocked('expert')).toBe(1);
    expect(restored.stars('standard', 1)).toBe(5);
    expect(restored.board('standard', 'levels', 1)).toHaveLength(1);
    expect(storage.getItem('expert-pundit-keepyuppy-v2')).toBe('original');
  });
  it('keeps the five highest comparable runs and never downgrades earned stars', () => {
    const progress = new FocusProgress(memory());
    progress.record(complete());
    for (let i = 1; i <= 8; i++) progress.record(complete(1, i));
    progress.record(complete(2));
    expect(progress.board('standard', 'levels', 1)).toHaveLength(5);
    expect(progress.board('standard', 'levels', 1)[0].score).toBe(22500);
    expect(progress.stars('standard', 1)).toBe(5);
    expect(progress.board('standard', 'levels', 2)).toHaveLength(1);
    expect(progress.board('casual', 'levels', 1)).toHaveLength(0);
    expect(progress.board('standard', 'endless', 1)).toHaveLength(0);
  });
  it('excludes incomplete levels and practice but saves finished or dropped endless runs', () => {
    const progress = new FocusProgress(memory());
    for (const mode of ['levels', 'practice', 'endless'] as const) {
      const round = new FocusRound('standard', { mode, duration: 'unlimited' });
      round.tap(round.due);
      round.finish();
      expect(progress.record(round)).toBe(mode === 'endless');
    }
    const dropped = new FocusRound('standard', { duration: 'unlimited' });
    dropped.tap(dropped.due);
    dropped.advanceTo(dropped.due + dropped.dropDelay);
    expect(progress.record(dropped)).toBe(true);
    expect(progress.unlocked('standard')).toBe(1);
  });
  it('remains playable when storage is unavailable and does not overwrite corrupt saves', () => {
    const storage = memory();
    storage.setItem(FOCUS_SAVE_KEY, '{broken');
    const progress = new FocusProgress(storage);
    progress.record(complete());
    expect(progress.unlocked('standard')).toBe(2);
    expect(progress.warning).toContain('session only');
    expect(storage.getItem(FOCUS_SAVE_KEY)).toBe('{broken');
    const blocked = new FocusProgress(null);
    expect(blocked.record(complete())).toBe(true);
    expect(blocked.warning).toContain('session only');
  });
  it('discards invalid stored values rather than rendering untrusted content', () => {
    const storage = memory();
    storage.setItem(
      FOCUS_SAVE_KEY,
      JSON.stringify({
        version: 1,
        boards: {
          'standard:levels:1': [{ score: '<img>', hits: 12, perfects: 12, best: 12, stars: 5 }],
        },
        stars: { 'standard:levels:1': 500, 'expert:levels:99': 5 },
      }),
    );
    const progress = new FocusProgress(storage);
    expect(progress.board('standard', 'levels', 1)).toHaveLength(0);
    expect(progress.unlocked('standard')).toBe(1);
  });
});

describe('Survival challenges', () => {
  it.each(['2-minutes', '5-minutes'] as const)(
    'completes %s exactly, without a level bonus or post-deadline scoring',
    (duration) => {
      const round = new FocusRound('standard', { duration });
      while (round.due < round.deadline) round.tap(round.due);
      const score = round.score;
      round.advanceTo(round.deadline - 0.001);
      expect(round.ended).toBe(false);
      expect(round.timeRemaining).toBeCloseTo(0.001);
      expect(round.tap(round.deadline)).toBeNull();
      expect(round.reason).toBe('timed-complete');
      expect(round.elapsed).toBe(duration === '2-minutes' ? 120 : 300);
      expect(round.bonus).toBe(0);
      expect(round.stars).toBe(0);
      expect(round.score).toBe(score);
      expect(round.tap(round.deadline + 2)).toBeNull();
    },
  );
  it('chooses the earliest event even when a frame jumps over both, with completion winning only an exact tie', () => {
    for (const offset of [-1e-7, 0, 1e-7]) {
      const round = new FocusRound();
      // dropDelay is 28% of this flight: construct a precise boundary.
      round.start = 88;
      round.due = 113 + offset;
      const dropAt = round.due + round.dropDelay;
      expect(dropAt).toBeCloseTo(120, 5);
      round.advanceTo(130);
      expect(round.reason).toBe(offset < 0 ? 'drop' : 'timed-complete');
      expect(round.elapsed).toBe(Math.min(120, dropAt));
    }
  });
  it('rejects timed early drops and manual finishes but accepts unlimited banking', () => {
    const progress = new FocusProgress(memory());
    for (const finish of [true, false]) {
      const round = new FocusRound();
      round.tap(round.due);
      if (finish) round.finish();
      else round.advanceTo(500);
      expect(progress.record(round)).toBe(false);
      expect(progress.lastResult.qualified).toBe(false);
      expect(round.elapsed).toBeLessThan(120);
    }
    const unlimited = new FocusRound('standard', { duration: 'unlimited' });
    unlimited.tap(unlimited.due);
    unlimited.finish();
    expect(progress.record(unlimited)).toBe(true);
    expect(progress.board('standard', 'endless', 1, 'unlimited')).toHaveLength(1);
    expect(progress.board('standard', 'endless', 1, '2-minutes')).toHaveLength(0);
  });
  it('keeps duration, difficulty, level and player identity separate and snapshots names', () => {
    const storage = memory();
    const progress = new FocusProgress(storage);
    progress.setPlayerName('  ALEX<script>123456789  ');
    expect(progress.playerName).toBe('ALEXscript12');
    for (const duration of ['2-minutes', '5-minutes'] as const) {
      const round = new FocusRound('casual', { duration, playerName: progress.playerName });
      progress.setPlayerName('OTHER');
      while (!round.ended) round.tap(round.due);
      expect(progress.record(round)).toBe(true);
      expect(progress.lastResult).toEqual({
        qualified: true,
        personalBest: true,
        boardLeader: true,
      });
    }
    const restored = new FocusProgress(storage);
    expect(restored.board('casual', 'endless', 1, '2-minutes')[0].playerName).toBe('ALEXscript12');
    expect(restored.board('casual', 'endless', 1, '5-minutes')[0].playerName).toBe('OTHER');
    expect(restored.board('standard', 'endless', 1, '2-minutes')).toHaveLength(0);
    expect(restored.board('casual', 'levels', 1)).toHaveLength(0);
    expect(restored.playerName).toBe('OTHER');
  });
  it('ranks by score, perfects, then chain and preserves exact posting ties', () => {
    const progress = new FocusProgress(memory());
    for (const [name, perfects, best] of [
      ['FIRST', 3, 2],
      ['SECOND', 3, 2],
      ['CHAIN', 3, 3],
      ['PERFECT', 4, 2],
    ] as const) {
      const round = new FocusRound('standard', { duration: 'unlimited', playerName: name });
      round.score = 500;
      round.hits = 8;
      round.perfects = perfects;
      round.best = best;
      round.finish();
      progress.record(round);
    }
    expect(progress.board('standard', 'endless', 1, 'unlimited').map((r) => r.playerName)).toEqual([
      'PERFECT',
      'CHAIN',
      'FIRST',
      'SECOND',
    ]);
  });
  it('retains personal bests after a player leaves the top five and does not celebrate ties', () => {
    const storage = memory();
    let progress = new FocusProgress(storage);
    const post = (name: string, score: number) => {
      const round = new FocusRound('standard', { duration: 'unlimited', playerName: name });
      round.tap(round.due);
      round.score = score;
      round.finish();
      progress.record(round);
      return round;
    };
    post('OLD', 500);
    for (let i = 0; i < 5; i++) post(`NEW${i}`, 1000);
    progress = new FocusProgress(storage);
    const round = post('OLD', 500);
    expect(progress.lastResult).toEqual({
      qualified: true,
      personalBest: false,
      boardLeader: false,
    });
    expect(progress.record(round)).toBe(false);
    post('OLD', 600);
    expect(progress.lastResult).toEqual({
      qualified: true,
      personalBest: true,
      boardLeader: false,
    });
  });
  it('migrates camera v1 scores and stars as Earlier run without modifying either legacy save', () => {
    const storage = memory();
    const legacy = JSON.stringify({
      version: 1,
      boards: {
        'standard:endless:0': [{ score: 300, hits: 1, perfects: 1, best: 1, stars: 0 }],
        'standard:levels:1': [{ score: 22500, hits: 12, perfects: 12, best: 12, stars: 5 }],
      },
      stars: { 'standard:levels:1': 5 },
    });
    storage.setItem('expert-pundit-keepyuppy-focus-v1', legacy);
    storage.setItem('expert-pundit-keepyuppy-v2', 'original');
    const progress = new FocusProgress(storage);
    expect(
      progress.earlierBoards().find((b) => b.key === 'standard:endless:unlimited')?.records[0],
    ).toMatchObject({
      playerName: 'Earlier run',
      duration: 'unlimited',
      score: 300,
    });
    expect(progress.board('standard', 'endless', 1)).toHaveLength(0);
    expect(progress.unlocked('standard')).toBe(2);
    expect(JSON.parse(storage.getItem(FOCUS_SAVE_KEY)!).version).toBe(2);
    expect(storage.getItem('expert-pundit-keepyuppy-focus-v1')).toBe(legacy);
    expect(storage.getItem('expert-pundit-keepyuppy-v2')).toBe('original');
  });
  it('persists attract preferences, returns isolated snapshots and survives write failures', () => {
    const storage = memory();
    const progress = new FocusProgress(storage);
    progress.setAttractEnabled(false);
    progress.record(complete());
    const snapshot = progress.populatedBoards();
    snapshot[0].records[0].score = 0;
    expect(progress.board('standard', 'levels', 1)[0].score).toBe(22500);
    expect(new FocusProgress(storage).attractEnabled).toBe(false);
    const blocked = new FocusProgress({
      getItem: () => null,
      setItem: () => {
        throw Error('quota');
      },
    });
    blocked.setPlayerName('LOCAL');
    blocked.setAttractEnabled(false);
    expect(blocked.record(complete())).toBe(true);
    expect(blocked.warning).toContain('session only');
    expect(blocked.playerName).toBe('LOCAL');
  });
});
