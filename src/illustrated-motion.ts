import { CONTACT, type Feedback, type Simulation } from './engine';
import type { Touch } from './types';

export type Point = readonly [number, number];
// Source-space pivots shared by the twelve illustrated players (1024 × 1536).
export const RIG = {
  head: [505, 305],
  body: [520, 740],
  leftArm: [354, 360],
  rightArm: [663, 360],
  leftHip: [429, 939],
  rightHip: [616, 939],
  leftKnee: [366, 1130],
  rightKnee: [652, 1130],
  leftBoot: [307, 1420],
  rightBoot: [710, 1420],
} as const;
export const PLAYER = { x: 90, y: 337, scale: 0.175 };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const ease = (n: number) => {
  const v = clamp(n, 0, 1);
  return v * v * (3 - 2 * v);
};
const mix = (a: number, b: number, weight: number) => a + (b - a) * weight;
const angle = (a: Point, b: Point) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const length = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export interface LegPose {
  thigh: number;
  calf: number;
}
export function legJoint(side: 'left' | 'right', thigh: number): Point {
  const hip = RIG[`${side}Hip`],
    knee = RIG[`${side}Knee`];
  const a = angle(hip, knee) + thigh,
    l = length(hip, knee);
  return [hip[0] + Math.cos(a) * l, hip[1] + Math.sin(a) * l];
}
// Clamp the destination before solving BOTH segments. Never disconnect the calf
// or extend a limb to reach a generous timing-window contact.
export function solveLeg(side: 'left' | 'right', target: Point): LegPose {
  const hip = RIG[`${side}Hip`],
    knee = RIG[`${side}Knee`],
    boot = RIG[`${side}Boot`];
  const l1 = length(hip, knee),
    l2 = length(knee, boot);
  const d = clamp(length(hip, target), Math.abs(l2 - l1) + 0.001, l1 + l2 - 0.001);
  const direction = angle(hip, target);
  const end: Point = [hip[0] + Math.cos(direction) * d, hip[1] + Math.sin(direction) * d];
  const bend = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const thigh = direction + (side === 'left' ? bend : -bend) - angle(hip, knee);
  return { thigh, calf: angle(legJoint(side, thigh), end) - angle(knee, boot) };
}
export interface PlayerPose extends LegPose {
  x: number;
  y: number;
  effort: number;
}
const rest: PlayerPose = { x: 0, y: 0, thigh: 0, calf: 0, effort: 0 };
function blend(a: PlayerPose, b: PlayerPose, weight: number): PlayerPose {
  return {
    x: mix(a.x, b.x, weight),
    y: mix(a.y, b.y, weight),
    thigh: mix(a.thigh, b.thigh, weight),
    calf: mix(a.calf, b.calf, weight),
    effort: mix(a.effort, b.effort, weight),
  };
}
function contactPose(touch: Touch, x: number, y: number): PlayerPose {
  if (touch === 'head') {
    const yOffset = clamp(y - CONTACT.head.y, 0, 8);
    return {
      ...rest,
      ...solveLeg('right', [RIG.rightBoot[0], RIG.rightBoot[1] - yOffset / PLAYER.scale]),
      y: yOffset,
      effort: 0.7,
    };
  }
  const target: Point = [(x - PLAYER.x) / PLAYER.scale, (y + 14 - PLAYER.y) / PLAYER.scale];
  if (touch === 'knee') {
    return {
      ...rest,
      thigh: clamp(angle(RIG.rightHip, target) - angle(RIG.rightHip, RIG.rightKnee), -2.45, 0),
      calf: -0.25,
      effort: 1,
    };
  }
  return { ...rest, ...solveLeg('right', target), effort: 1 };
}
export function recoveryWeight(age: number) {
  return 1 - ease((age - 0.055) / 0.46);
}
export function samplePlayerPose(sim: Simulation, idle = false): PlayerPose {
  if (idle) return { ...rest };
  const next = sim.nextBall,
    remaining = next.due - sim.time;
  const preparation = ease((0.85 - remaining) / 0.5);
  // Track the descending ball across early/late windows, including golden touch.
  const tracking = ease((0.5 - remaining) / 0.15);
  const nominal = CONTACT[next.touch];
  const anticipation = blend(
    rest,
    contactPose(next.touch, mix(nominal.x, next.x, tracking), mix(nominal.y, next.y, tracking)),
    preparation * (1 - ease((-remaining - sim.window) / 0.32)),
  );
  const f: Feedback | null = sim.lastContact;
  if (!f) return anticipation;
  return blend(anticipation, contactPose(f.touch, f.x, f.y), recoveryWeight(sim.time - f.at));
}
