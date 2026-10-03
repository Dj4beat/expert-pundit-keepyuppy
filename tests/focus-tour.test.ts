import { describe, expect, it } from 'vitest';
import { FOCUS_CHARACTERS, characterForLevel } from '../src/focus/characters';
import { FocusRound } from '../src/focus/simulation';
import { FOCUS_SAVE_KEY, FocusProgress } from '../src/focus/progress';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
function finish(round: FocusRound) {
  while (!round.ended) round.tap(Math.min(round.due, round.deadline));
  return round;
}

describe('Attempt-based character tour', () => {
  it('finishes only after the final ball resolves, including a late final touch after 60 seconds', () => {
    const round = new FocusRound('casual', { mode: 'levels' });
    for (let i = 0; i < round.attemptLimit - 1; i++) round.tap(round.due);
    expect(round.timed).toBe(false);
    const lastDue = round.due;
    expect(lastDue).toBeGreaterThan(60);
    round.advanceTo(lastDue);
    expect(round.ended).toBe(false);
    expect(round.attempts).toBe(11);
    const at = lastDue + round.perfectWindow * 0.8;
    expect(round.tap(at)).toBe('perfect');
    expect(round.reason).toBe('complete');
    expect(round.attempts).toBe(12);
    expect(round.stars).toBe(5);
    expect(round.accuracy).toBe(1);
    expect(round.ball).toEqual(round.lastHit!.point);
    const score = round.score;
    round.tap(at + 1);
    round.advanceTo(600);
    expect(round.score).toBe(score);
    expect(round.elapsed).toBe(at);
  });
  it('counts a final drop as one attempt only after the entire save window has passed', () => {
    const round = new FocusRound('standard', { mode: 'levels' });
    for (let i = 0; i < round.attemptLimit - 1; i++) round.tap(round.due);
    round.advanceTo(round.due + round.window);
    expect(round.ended).toBe(false);
    const dropAt = round.due + round.dropDelay;
    round.advanceTo(dropAt);
    expect(round.ended).toBe(true);
    expect(round.attempts).toBe(12);
    expect(round.drops).toBe(1);
    expect(round.stars).toBe(4);
    expect(round.bonus).toBe(0);
    expect(round.time).toBe(dropAt);
  });
  it('does not spend attempts on stray taps or award five stars after an extra tap', () => {
    const round = new FocusRound('standard', { mode: 'levels' });
    round.tap(0);
    expect(round.attempts).toBe(0);
    finish(round);
    expect(round.perfects).toBe(12);
    expect(round.attempts).toBe(12);
    expect(round.accuracy).toBeLessThan(1);
    expect(round.stars).toBe(4);
  });
  it('recovers after a dropped ball, but requires the target and excludes drops from flawless awards', () => {
    const round = new FocusRound('standard', { mode: 'levels' });
    round.advanceTo(round.due + round.dropDelay);
    expect(round.ended).toBe(false);
    expect(round.drops).toBe(1);
    finish(round);
    expect(round.reason).toBe('complete');
    expect(round.hits).toBe(round.attemptLimit - 1);
    expect(round.attempts).toBe(round.attemptLimit);
    expect(round.flawless).toBe(false);
    expect(round.stars).toBeLessThan(5);
    expect(round.bonus).toBe(0);
  });
  it('does not unlock anything for inactivity, a missed target or an early exit', () => {
    const progress = new FocusProgress(memory());
    for (const kind of ['idle', 'missed', 'left']) {
      const round = new FocusRound('standard', { mode: 'levels' });
      if (kind !== 'idle') round.tap(round.due);
      if (kind === 'left') round.finish();
      else round.advanceTo(600);
      expect(round.reason).toBe(kind === 'left' ? 'finish' : 'target-missed');
      expect(round.stars).toBe(0);
      expect(progress.record(round)).toBe(false);
      expect(progress.characterUnlocked('okocha')).toBe(false);
    }
  });
  it.each(['casual', 'standard', 'expert'] as const)(
    'makes every target achievable on %s and unlocks the roster in order',
    (difficulty) => {
      const progress = new FocusProgress(memory());
      for (let level = 1; level <= 12; level++) {
        const round = finish(new FocusRound(difficulty, { mode: 'levels', level }));
        expect(round.character).toBe(characterForLevel(level).id);
        expect(round.reason).toBe('complete');
        expect(round.attempts).toBe(round.attemptLimit);
        expect(round.stars).toBe(5);
        expect(progress.record(round)).toBe(true);
        if (level < 12)
          expect(progress.characterUnlocked(characterForLevel(level + 1).id)).toBe(true);
      }
      expect(FOCUS_CHARACTERS.every((c) => progress.characterUnlocked(c.id))).toBe(true);
    },
  );
  it('persists new scores separately from historical records while honoring earned unlocks', () => {
    const storage = memory();
    storage.setItem(
      FOCUS_SAVE_KEY,
      JSON.stringify({
        version: 2,
        stars: { 'standard:levels:1': 5 },
        boards: {
          'standard:rounds:1': [
            {
              playerName: 'OLD',
              score: 22500,
              hits: 12,
              perfects: 12,
              best: 12,
              stars: 5,
              duration: 'unlimited',
              elapsed: 60,
              completed: true,
            },
          ],
        },
      }),
    );
    const progress = new FocusProgress(storage);
    expect(progress.characterUnlocked('okocha')).toBe(true);
    expect(progress.board('standard', 'levels', 1)).toHaveLength(0);
    expect(progress.earlierBoards()[0].records[0].score).toBe(22500);
    progress.record(finish(new FocusRound('standard', { mode: 'levels' })));
    const restored = new FocusProgress(storage);
    expect(restored.board('standard', 'levels', 1)[0].hits).toBe(12);
    expect(restored.earlierBoards()[0].records[0].elapsed).toBe(60);
    expect(restored.characterUnlocked('okocha')).toBe(true);
  });
  it('separates score challenge boards by character and keeps practice unranked', () => {
    const progress = new FocusProgress(memory());
    for (const character of ['ronaldinho', 'baggio']) {
      const round = new FocusRound('standard', { duration: 'unlimited', character });
      round.tap(round.due);
      round.finish();
      expect(progress.record(round)).toBe(true);
      expect(progress.board('standard', 'endless', 1, 'unlimited', character)[0].character).toBe(
        character,
      );
    }
    const practice = new FocusRound('standard', { mode: 'practice', character: 'baggio' });
    practice.tap(practice.due);
    practice.finish();
    expect(progress.record(practice)).toBe(false);
    expect(progress.board('standard', 'practice', 1, 'unlimited')).toHaveLength(0);
  });
});

describe('Character gameplay skills', () => {
  // These offsets are outside the unmodified opening perfect window (0.072s),
  // but inside the named specialist's window for that body part.
  it.each([
    ['ronaldinho', 0, 0.085],
    ['okocha', 2, 0.095],
    ['baggio', 0, 0.08],
    ['maradona', 1, 0.1],
    ['cristiano', 4, 0.1],
  ] as const)(
    '%s turns a specialist timing offset into a perfect touch',
    (character, hit, offset) => {
      const specialist = new FocusRound('standard', { mode: 'practice', character });
      const ordinary = new FocusRound('standard', { mode: 'practice', character: 'zidane' });
      for (let i = 0; i < hit; i++) {
        specialist.tap(specialist.due);
        ordinary.tap(ordinary.due);
      }
      expect(ordinary.tap(ordinary.due + offset)).toBe('late');
      expect(specialist.tap(specialist.due + offset)).toBe('perfect');
    },
  );
  it.each([
    ['best', 0, 360],
    ['pele', 4, 2250],
    ['henry', 0, 405],
    ['ronaldo', 2, 1350],
  ] as const)('%s awards its advertised bonus on the matching touch', (character, hit, points) => {
    const round = new FocusRound('standard', { mode: 'practice', character });
    for (let i = 0; i <= hit; i++) round.tap(round.due);
    expect(round.feedback?.points).toBe(points);
  });
  it.each([
    ['cruyff', 0.25],
    ['messi', 0.28],
  ] as const)('%s can save a touch outside the normal window', (character, offset) => {
    const round = new FocusRound('standard', { mode: 'practice', character });
    const ordinary = new FocusRound('standard', { mode: 'practice' });
    expect(ordinary.tap(ordinary.due + offset)).toBe('miss');
    expect(round.tap(round.due + offset)).toBe('late');
    expect(round.feedback?.points).toBe(40);
  });
  it('gives Zidane more recovery points and resets the perfect chain', () => {
    const round = new FocusRound('standard', { character: 'zidane' });
    round.tap(round.due);
    expect(round.tap(round.due + 0.15)).toBe('late');
    expect(round.feedback?.points).toBe(100);
    expect(round.score).toBe(400);
    expect(round.streak).toBe(0);
  });
  it('limits specialist effects to the stated body parts', () => {
    const round = new FocusRound('standard', { mode: 'practice', character: 'pele' });
    round.tap(round.due);
    expect(round.feedback?.points).toBe(300);
    const foot = new FocusRound('standard', { mode: 'practice', character: 'cristiano' });
    expect(foot.tap(foot.due + 0.1)).toBe('late');
  });
});
