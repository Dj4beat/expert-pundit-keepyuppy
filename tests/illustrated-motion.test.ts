import { describe, expect, it } from 'vitest';
import { CONTACT, Simulation } from '../src/engine';
import {
  legJoint,
  PLAYER,
  recoveryWeight,
  RIG,
  samplePlayerPose,
  solveLeg,
} from '../src/illustrated-motion';
import type { RunSettings } from '../src/types';
const settings: RunSettings = {
  mode: 'practice',
  difficulty: 'casual',
  character: 'ronaldinho',
  venue: 'court',
  power: 'golden-touch',
  powerLevel: 0,
  pace: 1,
  seed: 43,
  ball: 'classic',
  kit: 'original',
  effect: 'spark',
};
describe('illustrated movement', () => {
  it.each([-0.2, 0, 0.2])(
    'continues the prepared pose into an accepted touch at offset %s',
    (offset) => {
      const sim = new Simulation(settings);
      for (let i = 0; i < 4; i++) {
        sim.advanceTo(sim.clock + sim.nextBall.due - sim.time + offset);
        const before = samplePlayerPose(sim);
        expect(sim.tap({ type: 'tap', at: sim.clock })).not.toBe('miss');
        const after = samplePlayerPose(sim);
        for (const key of ['x', 'y', 'thigh', 'calf', 'effort'] as const)
          expect(after[key]).toBeCloseTo(before[key], 6);
      }
    },
  );
  it('recovers continuously through the former 240 ms snapping boundary', () => {
    const sim = new Simulation(settings);
    sim.tap({ type: 'tap', at: 1.6 });
    const poses = [1.8333333333, 1.8375, 1.8416666667, 1.8458333333].map((at) => {
      sim.advanceTo(at);
      return samplePlayerPose(sim);
    });
    for (let i = 1; i < poses.length; i++) {
      expect(Math.abs(poses[i].thigh - poses[i - 1].thigh)).toBeLessThan(0.05);
      expect(Math.abs(poses[i].calf - poses[i - 1].calf)).toBeLessThan(0.05);
    }
    expect(recoveryWeight(0.055)).toBe(1);
    expect(recoveryWeight(0.515)).toBe(0);
  });
  it('does not cancel follow-through when an extra tap misses', () => {
    const sim = new Simulation(settings);
    sim.tap({ type: 'tap', at: 1.6 });
    sim.advanceTo(1.7);
    const before = samplePlayerPose(sim);
    expect(sim.tap({ type: 'tap', at: sim.clock })).toBe('miss');
    expect(samplePlayerPose(sim)).toEqual(before);
  });
  it('uses simulation time for pause and focus, independently of rendering frequency', () => {
    const fast = new Simulation({ ...settings, power: 'focus' });
    const slow = new Simulation({ ...settings, power: 'focus' });
    for (const sim of [fast, slow]) sim.tap({ type: 'tap', at: 1.7 });
    const paused = samplePlayerPose(fast);
    for (let i = 0; i < 120; i++) expect(samplePlayerPose(fast)).toEqual(paused);
    for (let at = 1.71; at < 2; at += 1 / 120) {
      fast.advanceTo(at);
      samplePlayerPose(fast);
    }
    fast.advanceTo(2);
    slow.advanceTo(2);
    expect(fast.time).toBeLessThan(fast.clock);
    expect(samplePlayerPose(fast)).toEqual(samplePlayerPose(slow));
  });
  it.each(['left', 'right'] as const)(
    'keeps %s leg segments connected and at fixed length for unreachable targets',
    (side) => {
      const hip = RIG[`${side}Hip`],
        knee = RIG[`${side}Knee`],
        boot = RIG[`${side}Boot`];
      const l1 = Math.hypot(knee[0] - hip[0], knee[1] - hip[1]),
        l2 = Math.hypot(boot[0] - knee[0], boot[1] - knee[1]);
      for (const target of [[hip[0], hip[1]], [5000, -1000], boot] as const) {
        const pose = solveLeg(side, target),
          joint = legJoint(side, pose.thigh);
        const a = Math.atan2(boot[1] - knee[1], boot[0] - knee[0]) + pose.calf;
        const end = [joint[0] + Math.cos(a) * l2, joint[1] + Math.sin(a) * l2];
        expect(Math.hypot(joint[0] - hip[0], joint[1] - hip[1])).toBeCloseTo(l1, 8);
        expect(Math.hypot(end[0] - joint[0], end[1] - joint[1])).toBeCloseTo(l2, 8);
        expect(Math.hypot(end[0] - hip[0], end[1] - hip[1])).toBeLessThanOrEqual(l1 + l2);
        if (target === boot)
          expect(Math.hypot(end[0] - boot[0], end[1] - boot[1])).toBeLessThan(0.01);
      }
    },
  );
  it('places the knee touch within the thigh reach without lifting the body', () => {
    const sim = new Simulation(settings);
    sim.tap({ type: 'tap', at: 1.6 });
    sim.advanceTo(sim.main.due);
    const pose = samplePlayerPose(sim),
      joint = legJoint('right', pose.thigh);
    expect(pose.y).toBe(0);
    expect(
      Math.hypot(
        PLAYER.x + joint[0] * PLAYER.scale - CONTACT.knee.x,
        PLAYER.y + joint[1] * PLAYER.scale - (CONTACT.knee.y + 14),
      ),
    ).toBeLessThan(2);
  });
});
