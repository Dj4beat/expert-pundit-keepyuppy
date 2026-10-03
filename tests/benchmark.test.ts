import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AnimationMixer, LoopOnce, Vector3, Triangle, SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PoseOverrides } from '../src/benchmark/pose';
import {
  JugglingStudy,
  REACH,
  animationSample,
  distance,
  type PlayerManifest,
} from '../src/benchmark/simulation';

const manifest = JSON.parse(
  readFileSync('public/models/ronaldinho.contacts.json', 'utf8'),
) as PlayerManifest;
describe('3D anatomical study', () => {
  it('juggles for thirty seconds through both feet, both knees and headers before dropping', () => {
    const sim = new JugglingStudy(manifest);
    while (sim.due < 31 && !sim.ended) {
      const offset =
        sim.limb === 'header' ? 0 : sim.hits % 7 === 2 ? -0.025 : sim.hits % 7 === 4 ? 0.025 : 0;
      expect(sim.tap(sim.due + offset)).not.toBe('miss');
    }
    expect(sim.time).toBeGreaterThan(30);
    expect(new Set(sim.history.map((c) => c.limb)).size).toBe(5);
    expect(new Set(sim.history.map((c) => c.outcome))).toEqual(
      new Set(['perfect', 'early', 'late']),
    );
    sim.advanceTo(40);
    expect(sim.ended).toBe(true);
    expect(sim.ball[1]).toBe(manifest.ballRadius);
    expect(sim.history.at(-1)?.outcome).toBe('miss');
  });
  it('accepted contacts are inside the limb-specific anatomical correction budget', () => {
    for (const difficulty of ['casual', 'standard', 'expert'] as const) {
      const sim = new JugglingStudy(manifest, difficulty);
      for (let i = 0; i < 36; i++) {
        sim.tap(sim.due);
        const contact = sim.contact!;
        expect(distance(contact.point, manifest.clips[contact.limb].point)).toBeLessThanOrEqual(
          REACH[contact.limb],
        );
        expect(contact.actualTime).toBeCloseTo(contact.expectedTime, 2);
      }
    }
  });
  it('rejects temporal contacts that exceed reach instead of stretching the rig', () => {
    const sim = new JugglingStudy(manifest);
    sim.advanceTo(sim.due);
    sim.ball[0] += 1;
    expect(sim.tap()).toBe('miss');
    expect(sim.hits).toBe(0);
  });
  it('fixed-step state and clip phase agree across normal, paused and slow rendering', () => {
    const a = new JugglingStudy(manifest),
      b = new JugglingStudy(manifest);
    for (let i = 1; i <= 90; i++) a.advanceTo(i / 60);
    for (let i = 1; i <= 360; i++) b.advanceTo(i / 240);
    expect(a.ball).toEqual(b.ball);
    expect(animationSample(a)).toEqual(animationSample(b));
    const before = animationSample(a);
    a.advanceTo(a.time);
    expect(animationSample(a)).toEqual(before);
    a.tap();
    b.tap();
    expect(a.contact).toEqual(b.contact);
    expect(animationSample(a).time).toBe(manifest.contactTime);
  });
  it('ignores stale input and prevents a rapid second tap', () => {
    const sim = new JugglingStudy(manifest);
    expect(sim.tap(sim.due)).toBe('perfect');
    expect(sim.tap(0)).toBeNull();
    expect(sim.tap(sim.time + 0.02)).toBe('miss');
    expect(sim.hits).toBe(1);
  });
  it('a missed input continues the planned motion without rewinding the kick', () => {
    const sim = new JugglingStudy(manifest);
    sim.advanceTo(sim.due + sim.window + 0.02);
    expect(sim.contact?.outcome).toBe('miss');
    expect(animationSample(sim).clip).toBe(sim.limb);
    expect(animationSample(sim).time).toBeCloseTo(manifest.contactTime + sim.time - sim.due, 8);
    expect(animationSample(sim).weight).toBeGreaterThanOrEqual(0);
  });
});

describe('authored player asset', () => {
  const file = readFileSync('public/models/ronaldinho.glb');
  const gltf = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString());
  it('repeated paused rendering cannot accumulate gaze or IK on unchanged animation tracks', async () => {
    const gltf = await new GLTFLoader().parseAsync(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
      '',
    );
    const mixer = new AnimationMixer(gltf.scene);
    const action = mixer.clipAction(gltf.animations.find((c) => c.name === 'foot_r')!).play();
    action.paused = true;
    action.time = 0.64;
    const overrides = new PoseOverrides();
    const head = gltf.scene.getObjectByName('head')!;
    const calf = gltf.scene.getObjectByName('calf_r')!;
    mixer.update(0);
    const baseHead = head.quaternion.clone(),
      baseCalf = calf.quaternion.clone();
    for (let frame = 0; frame < 240; frame++) {
      overrides.restore();
      mixer.update(0);
      overrides.remember(head);
      overrides.remember(calf);
      head.rotateX(0.18);
      calf.rotateX(0.12);
      expect(head.quaternion.angleTo(baseHead)).toBeCloseTo(0.18, 5);
      expect(calf.quaternion.angleTo(baseCalf)).toBeCloseTo(0.12, 5);
    }
    overrides.restore();
    expect(head.quaternion.toArray()).toEqual(baseHead.toArray());
    expect(calf.quaternion.toArray()).toEqual(baseCalf.toArray());
  });
  it('contains a skinned anatomical mesh, deform joints and every required animation', () => {
    expect(gltf.skins[0].joints.length).toBeGreaterThan(40);
    const clips = gltf.animations.map((a: { name: string }) => a.name);
    for (const name of [
      'ready',
      'foot_l',
      'foot_r',
      'knee_l',
      'knee_r',
      'header',
      'recover_l',
      'recover_r',
      'miss_l',
      'miss_r',
      'celebrate',
      'defeat',
    ])
      expect(clips).toContain(name);
    for (const name of Object.keys(manifest.clips))
      expect(gltf.nodes.some((n: { name: string }) => n.name === 'contact_' + name)).toBe(true);
    expect(file.length).toBeLessThan(3_000_000);
  });
  it('exported contacts match the manifest and support ankles remain planted', async () => {
    const gltf = await new GLTFLoader().parseAsync(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
      '',
    );
    const mixer = new AnimationMixer(gltf.scene);
    for (const name of ['foot_l', 'foot_r', 'knee_l', 'knee_r', 'header'] as const) {
      mixer.stopAllAction();
      const clip = gltf.animations.find((c) => c.name === name)!;
      const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
      action.paused = true;
      const support = gltf.scene.getObjectByName('foot_' + (name.endsWith('_l') ? 'r' : 'l'))!;
      const start = new Vector3();
      for (let frame = 0; frame <= 84; frame++) {
        action.time = frame / 60;
        mixer.update(0);
        gltf.scene.updateMatrixWorld(true);
        const at = support.getWorldPosition(new Vector3());
        if (frame === 0) start.copy(at);
        expect(at.distanceTo(start), `${name} support frame ${frame}`).toBeLessThan(0.002);
      }
      action.time = manifest.contactTime;
      mixer.update(0);
      gltf.scene.updateMatrixWorld(true);
      const point = gltf.scene.getObjectByName('contact_' + name)!.getWorldPosition(new Vector3());
      point.y += manifest.ballRadius;
      expect(point.distanceTo(new Vector3(...manifest.clips[name].point)), name).toBeLessThan(
        0.002,
      );
    }
  });
  it('instep markers touch the actual deformed boot surfaces', async () => {
    const gltf = await new GLTFLoader().parseAsync(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
      '',
    );
    const mixer = new AnimationMixer(gltf.scene);
    for (const name of ['foot_l', 'foot_r']) {
      mixer.stopAllAction();
      const action = mixer.clipAction(gltf.animations.find((c) => c.name === name)!).play();
      action.paused = true;
      action.time = manifest.contactTime;
      mixer.update(0);
      gltf.scene.updateMatrixWorld(true);
      const marker = gltf.scene.getObjectByName('contact_' + name)!.getWorldPosition(new Vector3());
      let gap = Infinity;
      gltf.scene.traverse((mesh) => {
        if (!(mesh instanceof SkinnedMesh) || !mesh.name.includes('boots')) return;
        mesh.skeleton.update();
        const index = mesh.geometry.index!,
          triangle = new Triangle(),
          closest = new Vector3();
        for (let i = 0; i < index.count; i += 3) {
          [triangle.a, triangle.b, triangle.c].forEach((point, j) =>
            mesh.getVertexPosition(index.getX(i + j), point).applyMatrix4(mesh.matrixWorld),
          );
          triangle.closestPointToPoint(marker, closest);
          gap = Math.min(gap, closest.distanceTo(marker));
        }
      });
      expect(gap, name + ' surface gap').toBeLessThan(0.004);
    }
  });
});
