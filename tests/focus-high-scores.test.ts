import { describe, expect, it } from 'vitest';
import { cleanPlayerName } from '../src/focus/modes';
import { FocusRound } from '../src/focus/simulation';
import { FOCUS_SAVE_KEY, FocusProgress } from '../src/focus/progress';
import { highScoreTable } from '../src/focus/high-scores';

function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
function complete(name: string, recoveries = 0, level = 1) {
  const round = new FocusRound('standard', { mode: 'levels', playerName: name, level });
  while (!round.ended)
    round.tap(round.due + (round.hits < recoveries ? round.perfectWindow + 0.01 : 0));
  return round;
}

describe('Required player identity', () => {
  it.each(['', '   ', '---', " ._' ", '⚽'])(
    'rejects a name with no letters or numbers: %j',
    (name) => {
      const progress = new FocusProgress(memory());
      expect(progress.playerName).toBe('');
      expect(progress.setPlayerName(name)).toBe('');
      expect(cleanPlayerName(name)).toBe('');
    },
  );
  it('remembers an entered name, normalizes whitespace and accepts Unicode names', () => {
    const storage = memory();
    const progress = new FocusProgress(storage);
    expect(progress.setPlayerName('  José   7  ')).toBe('José 7');
    expect(new FocusProgress(storage).playerName).toBe('José 7');
    expect(progress.setPlayerName('abcdefghijklmnop')).toBe('abcdefghijkl');
  });
  it('requires the old automatic PLAYER placeholder to be replaced or explicitly entered', () => {
    const storage = memory();
    storage.setItem(
      FOCUS_SAVE_KEY,
      JSON.stringify({ version: 2, boards: {}, stars: {}, playerName: 'PLAYER' }),
    );
    const progress = new FocusProgress(storage);
    expect(progress.playerName).toBe('');
    progress.setPlayerName('PLAYER');
    expect(new FocusProgress(storage).playerName).toBe('PLAYER');
    progress.setPlayerName('');
    expect(new FocusProgress(storage).playerName).toBe('');
  });
});

describe('Replay high scores', () => {
  it('ranks each new qualifying run and keeps personal bests even outside the top five', () => {
    const storage = memory();
    const progress = new FocusProgress(storage);
    progress.setPlayerName('ALEX');
    const low = complete('ALEX', 12);
    progress.record(low);
    expect(progress.lastRank).toBe(1);
    for (let i = 2; i <= 6; i++) progress.record(complete(`RIVAL${i}`, i));
    expect(progress.board('standard', 'levels', 1).some((r) => r.playerName === 'ALEX')).toBe(
      false,
    );
    const restored = new FocusProgress(storage);
    expect(restored.personalBest('standard', 'levels', 1)?.score).toBe(low.score);
    restored.record(complete('ALEX', 1));
    expect(restored.lastRank).toBe(1);
    expect(restored.lastResult.personalBest).toBe(true);
    expect(restored.personalBest('standard', 'levels', 2)).toBeNull();
    expect(restored.personalBest('expert', 'levels', 1)).toBeNull();
    expect(restored.personalBest('standard', 'practice', 1)).toBeNull();
  });
  it('returns no table rank outside the top five or for unfinished rounds and does not duplicate results', () => {
    const progress = new FocusProgress(memory());
    for (let i = 0; i < 5; i++) progress.record(complete(`TOP${i}`));
    const low = complete('LOW', 12);
    expect(progress.record(low)).toBe(true);
    expect(progress.lastRank).toBeNull();
    expect(progress.record(low)).toBe(false);
    expect(progress.board('standard', 'levels', 1)).toHaveLength(5);
    const unfinished = new FocusRound('standard', { mode: 'levels', playerName: 'EARLY' });
    unfinished.tap(unfinished.due);
    unfinished.finish();
    expect(progress.record(unfinished)).toBe(false);
    expect(progress.lastRank).toBeNull();
  });
  it('renders rank, name, score and stars with current-run highlighting and escapes saved names', () => {
    const progress = new FocusProgress(memory());
    progress.record(complete('ALEX'));
    const rows = progress.board('standard', 'levels', 1);
    const html = highScoreTable(rows, true, 'alex', 1);
    expect(html).toContain('#1');
    expect(html).toContain('22,500');
    expect(html).toContain('5/5 ★');
    expect(html).toContain('focus-own-score');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('THIS RUN');
    rows[0].playerName = '<img src=x onerror=alert(1)>';
    const hostile = highScoreTable(rows, true, '');
    expect(hostile).not.toContain('<img');
    expect(hostile).toContain('&lt;img');
    expect(highScoreTable([], true, '')).toContain('Set the first record');
  });
});
