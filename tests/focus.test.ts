import { describe, expect, it } from 'vitest';
import {
  cameraPose,
  FocusRound,
  project,
  SEQUENCE,
  TARGETS,
  PACING,
  strikePose,
} from '../src/focus/simulation';
import type { Difficulty } from '../src/types';

describe('touch camera timing prototype', () => {
  it.each(['casual', 'standard', 'expert'] as Difficulty[])(
    'accepts both timing boundaries on %s and rejects taps outside',
    (difficulty) => {
      for (const offset of [
        -new FocusRound(difficulty, { duration: 'unlimited' }).window,
        new FocusRound(difficulty, { duration: 'unlimited' }).window,
      ]) {
        const round = new FocusRound(difficulty, { duration: 'unlimited' });
        expect(round.tap(round.due + offset)).toBe(offset < 0 ? 'early' : 'late');
        expect(round.hits).toBe(1);
      }
      for (const offset of [
        -new FocusRound(difficulty, { duration: 'unlimited' }).window - 0.001,
        new FocusRound(difficulty, { duration: 'unlimited' }).window + 0.001,
      ]) {
        const round = new FocusRound(difficulty, { duration: 'unlimited' });
        expect(round.tap(round.due + offset)).toBe('miss');
        expect(round.hits).toBe(0);
      }
    },
  );
  it('cycles through both feet, knees and headers with instant scoring and continuous ball position', () => {
    const round = new FocusRound('standard', { duration: 'unlimited' });
    for (const limb of SEQUENCE) {
      expect(round.limb).toBe(limb);
      round.advanceTo(round.due);
      const point = round.ball,
        hits = round.hits;
      expect(point.x).toBeCloseTo(TARGETS[limb].x, 8);
      expect(point.y).toBeCloseTo(TARGETS[limb].y, 8);
      expect(round.tap(round.time)).toBe('perfect');
      expect(round.hits).toBe(hits + 1);
      expect(round.ball).toEqual(point);
    }
    expect(round.score).toBe(6000);
  });
  it('finishes the camera movement at the optimal click time and holds the input-time frame', () => {
    const round = new FocusRound('casual', { duration: 'unlimited' });
    for (let i = 0; i < 6; i++) {
      round.advanceTo(round.due - 0.3);
      const before = cameraPose(round);
      round.advanceTo(round.due);
      expect(before.close).toBeLessThan(1);
      const contact = cameraPose(round);
      expect(contact.close).toBe(1);
      const point = project(round.target, contact);
      expect(point.x).toBeCloseTo(200);
      expect(point.y).toBeCloseTo(445);
      round.tap(round.due);
      expect(cameraPose(round)).toEqual(contact);
    }
  });
  it('lets the ball leave the close-up, pulls wide, then closes for the next body point', () => {
    const round = new FocusRound('standard', { duration: 'unlimited' });
    round.tap(round.due);
    const impact = round.time,
      scale = round.timeScale;
    round.advanceTo(impact + 0.56 * scale);
    expect(cameraPose(round).close).toBe(1);
    expect(project(round.ball, cameraPose(round)).y).toBeLessThan(-13 * cameraPose(round).zoom);
    round.advanceTo(impact + 1.05 * scale);
    expect(cameraPose(round).zoom).toBe(1);
    round.advanceTo(round.due - 0.8 * scale);
    expect(cameraPose(round).zoom).toBeGreaterThan(1);
    expect(cameraPose(round).zoom).toBeLessThan(3.1);
    round.advanceTo(round.due - 0.35 * scale);
    expect(cameraPose(round).zoom).toBeLessThan(3.1);
    round.advanceTo(round.due);
    expect(cameraPose(round).zoom).toBeCloseTo(3.1);
  });
  it.each([-0.14, 0, 0.14])(
    'keeps the strike view until the ball exits for every limb at offset %s',
    (offset) => {
      const round = new FocusRound('standard', { duration: 'unlimited' });
      for (let i = 0; i < SEQUENCE.length; i++) {
        round.tap(round.due + offset);
        round.advanceTo(round.time + 0.56 * round.timeScale);
        const camera = cameraPose(round);
        expect(camera.close).toBe(round.lastHit!.camera.close);
        expect(project(round.ball, camera).y).toBeLessThan(-13 * camera.zoom);
      }
    },
  );
  it('does not teleport the camera between targets during the pullback', () => {
    const round = new FocusRound('standard', { duration: 'unlimited' });
    round.tap(round.due);
    const impact = round.time;
    let previous = cameraPose(round);
    for (let i = 1; i <= 120; i++) {
      round.advanceTo(impact + i / 60);
      const current = cameraPose(round);
      expect(Math.abs(current.zoom - previous.zoom)).toBeLessThan(0.15);
      expect(Math.hypot(current.x - previous.x, current.y - previous.y)).toBeLessThan(15);
      previous = current;
    }
  });
  it('respects spam protection and keeps the previous hit when a stray tap misses', () => {
    const round = new FocusRound('standard', { duration: 'unlimited' });
    round.tap(round.due);
    const hit = round.lastHit;
    expect(round.tap(round.time + 0.01)).toBe('miss');
    expect(round.lastHit).toBe(hit);
    expect(round.hits).toBe(1);
    expect(round.streak).toBe(0);
  });
  it('drops without input, ignores invalid timestamps and cannot score after ending', () => {
    const round = new FocusRound('standard', { duration: 'unlimited' });
    expect(round.tap(NaN)).toBeNull();
    round.advanceTo(1);
    expect(round.tap(0.5)).toBeNull();
    round.advanceTo(Infinity);
    expect(round.time).toBe(1);
    round.advanceTo(100);
    expect(round.ended).toBe(true);
    expect(round.tap(100)).toBeNull();
    expect(round.hits).toBe(0);
  });
  it('is independent of rendering cadence and stays frozen when the clock is paused', () => {
    const fast = new FocusRound('standard', { duration: 'unlimited' }),
      slow = new FocusRound('standard', { duration: 'unlimited' });
    fast.tap(fast.due);
    slow.tap(slow.due);
    const impact = fast.time;
    for (let i = 1; i <= 90; i++) fast.advanceTo(impact + i / 60);
    slow.advanceTo(impact + 1.5);
    expect(fast.ball).toEqual(slow.ball);
    expect(cameraPose(fast)).toEqual(cameraPose(slow));
    const frozen = cameraPose(fast);
    for (let i = 0; i < 60; i++) expect(cameraPose(fast)).toEqual(frozen);
  });
  it.each(['casual', 'standard', 'expert'] as Difficulty[])(
    'starts gently, ramps smoothly and caps speed on %s',
    (difficulty) => {
      const round = new FocusRound(difficulty, { duration: 'unlimited' });
      const profile = PACING[difficulty];
      expect(round.due).toBe(profile.opening);
      expect(round.due).toBeGreaterThanOrEqual(4.6);
      let previous = round.flightDuration;
      for (let hits = 1; hits <= 70; hits++) {
        round.tap(round.due);
        const duration = round.due - round.start;
        if (hits <= 4) expect(duration).toBeCloseTo(profile.opening);
        if (hits > 4 && hits <= 40) expect(duration).toBeLessThan(previous);
        expect(previous - duration).toBeLessThan(0.07);
        expect(duration).toBeGreaterThanOrEqual(profile.fastest - 1e-9);
        if (hits >= 40) expect(duration).toBeCloseTo(profile.fastest);
        previous = duration;
      }
    },
  );
  it('gives the opening portrait a wide view before the slower zoom begins', () => {
    const round = new FocusRound('standard', { duration: 'unlimited' });
    round.advanceTo(2.5);
    expect(cameraPose(round)).toMatchObject({ zoom: 1, close: 0 });
    round.advanceTo(3.3);
    expect(cameraPose(round).zoom).toBeGreaterThan(1);
    expect(cameraPose(round).zoom).toBeLessThan(3.1);
    round.advanceTo(round.due - 0.7);
    expect(cameraPose(round).zoom).toBeLessThan(3.1);
    round.advanceTo(round.due);
    expect(cameraPose(round).zoom).toBeCloseTo(3.1);
  });
  it('does not punish an early or late beginner touch with a sudden speed change', () => {
    for (const offset of [-0.18, 0, 0.18]) {
      const round = new FocusRound('standard', { duration: 'unlimited' });
      expect(round.tap(round.due + offset)).not.toBe('miss');
      expect(round.due - round.start).toBeCloseTo(5);
    }
  });
  it('keeps camera transitions separate even at the fastest pace on every difficulty', () => {
    for (const difficulty of ['casual', 'standard', 'expert'] as const) {
      const round = new FocusRound(difficulty, { duration: 'unlimited' });
      for (let i = 0; i < 40; i++) round.tap(round.due);
      round.advanceTo(round.start + 1.08 * round.timeScale);
      expect(cameraPose(round).zoom).toBe(1);
      round.advanceTo(round.due - round.window);
      expect(cameraPose(round).close).toBeLessThan(1);
      round.advanceTo(round.due);
      expect(cameraPose(round).close).toBe(1);
    }
  });
  it.each(['casual', 'standard', 'expert'] as Difficulty[])(
    'ends every limb movement exactly at the scoring centre on %s, at opening and top speed',
    (difficulty) => {
      for (const warmup of [0, 40]) {
        const round = new FocusRound(difficulty, { duration: 'unlimited' });
        for (let i = 0; i < warmup; i++) round.tap(round.due);
        for (let i = 0; i < SEQUENCE.length; i++) {
          round.advanceTo(round.due - 0.5 * round.timeScale);
          let lift = strikePose(round, round.limb).lift;
          expect(lift).toBeGreaterThan(0);
          for (const remaining of [0.25, 0.1, 0.01]) {
            round.advanceTo(round.due - remaining * round.timeScale);
            const pose = strikePose(round, round.limb);
            expect(pose.lift).toBeLessThan(lift);
            expect(pose.lift).toBeGreaterThan(0);
            expect(cameraPose(round).close).toBeLessThan(1);
            lift = pose.lift;
          }
          round.advanceTo(round.due);
          const limb = round.limb;
          expect(strikePose(round, limb).lift).toBe(0);
          expect(strikePose(round, limb).rotation).toBeCloseTo(0, 12);
          expect(round.isPerfectMoment).toBe(true);
          expect(round.tap(round.time)).toBe('perfect');
          expect(strikePose(round, limb).lift).toBe(0);
          expect(strikePose(round, limb).rotation).toBeCloseTo(0, 12);
        }
      }
    },
  );
  it.each([-0.18, 0, 0.18])(
    'keeps the limb and camera continuous on input at offset %s',
    (offset) => {
      const round = new FocusRound('standard', { duration: 'unlimited' });
      round.advanceTo(round.due + offset);
      const limb = round.limb,
        pose = strikePose(round, limb),
        camera = cameraPose(round);
      round.tap(round.time);
      expect(strikePose(round, limb)).toEqual(pose);
      expect(cameraPose(round)).toEqual(camera);
    },
  );
  it('awards a sevenfold-plus advantage for a perfect, with a capped chain multiplier', () => {
    const round = new FocusRound('standard', { duration: 'unlimited' });
    for (const [i, points] of [300, 600, 900, 1200, 1500, 1500, 1500].entries()) {
      round.tap(round.due);
      expect(round.feedback!.points).toBe(points);
      expect(round.feedback!.multiplier).toBe(Math.min(5, i + 1));
    }
    expect(round.score).toBe(7500);
    for (const offset of [-0.18, 0.18]) {
      const recovery = new FocusRound('standard', { duration: 'unlimited' });
      recovery.tap(recovery.due + offset);
      expect(recovery.feedback!.points).toBe(40);
      expect(300 / recovery.feedback!.points).toBeGreaterThan(7);
    }
  });
  it.each(['early', 'late', 'miss', 'drop'] as const)(
    'resets the perfect multiplier on %s, retaining the best streak',
    (outcome) => {
      const round = new FocusRound('standard', { duration: 'unlimited' });
      for (let i = 0; i < 5; i++) round.tap(round.due);
      expect(round.multiplier).toBe(5);
      const score = round.score;
      if (outcome === 'drop') round.advanceTo(round.due + round.dropDelay);
      else round.tap(round.due + (outcome === 'early' ? -0.18 : outcome === 'late' ? 0.18 : -1));
      expect(round.streak).toBe(0);
      expect(round.multiplier).toBe(1);
      expect(round.best).toBe(5);
      expect(round.score - score).toBe(outcome === 'early' || outcome === 'late' ? 40 : 0);
      if (outcome !== 'drop') {
        round.tap(round.due);
        expect(round.feedback!.points).toBe(300);
        expect(round.multiplier).toBe(1);
      }
    },
  );
  it('uses the same perfect band for the displayed cue and the awarded grade', () => {
    for (const direction of [-1, 1]) {
      for (const delta of [-0.001, 0, 0.001]) {
        const round = new FocusRound('standard', { duration: 'unlimited' });
        round.advanceTo(round.due + direction * (round.perfectWindow + delta));
        const cue = round.isPerfectMoment;
        expect(cue).toBe(delta <= 0);
        expect(round.tap(round.time) === 'perfect').toBe(cue);
      }
    }
  });
  it('offers a genuinely fixed camera for reduced motion', () => {
    const round = new FocusRound('standard', { duration: 'unlimited' });
    for (const at of [0, 1, 2.4, 2.5]) {
      round.advanceTo(at);
      expect(cameraPose(round, true)).toMatchObject({ x: 200, y: 340, zoom: 1 });
    }
  });
});
