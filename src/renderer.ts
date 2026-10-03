import { CONTACT, FLOOR, type Ball, type Simulation } from './engine';
import { character, TRICK_MOTION } from './content';
import type { Preferences } from './types';
import {
  RIG,
  PLAYER,
  ease,
  legJoint,
  solveLeg,
  samplePlayerPose,
  type LegPose,
} from './illustrated-motion';
export { RIG } from './illustrated-motion';
export interface SceneImages {
  character: HTMLImageElement;
  venue: HTMLImageElement;
}
type Point = [number, number];
export class GameRenderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pieces = new Map<string, HTMLCanvasElement>();
  private slowFrames = 0;
  lowEffects = false;
  fps = 60;
  constructor(
    private parent: HTMLElement,
    private images: SceneImages,
    private settings: Preferences,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 1360;
    this.canvas.setAttribute(
      'aria-label',
      'Football court. Tap here or press Space when the ball reaches the timing ring.',
    );
    this.canvas.setAttribute('role', 'img');
    parent.append(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.prepareRig();
  }
  private cut(name: string, polygon: Point[]) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 768;
    const x = c.getContext('2d')!;
    x.scale(0.5, 0.5);
    x.beginPath();
    polygon.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    x.closePath();
    x.clip();
    x.drawImage(this.images.character, 0, 0, 1024, 1536);
    this.pieces.set(name, c);
  }
  private prepareRig() {
    this.cut('body', [
      [0, 0],
      [1024, 0],
      [1024, 320],
      [660, 320],
      [650, 500],
      [690, 740],
      [750, 960],
      [510, 978],
      [330, 978],
      [365, 735],
      [389, 502],
      [365, 320],
      [0, 320],
    ]);
    this.cut('leftArm', [
      [0, 320],
      [365, 320],
      [389, 502],
      [365, 735],
      [330, 895],
      [0, 895],
    ]);
    this.cut('rightArm', [
      [660, 320],
      [1024, 320],
      [1024, 908],
      [731, 908],
      [690, 740],
      [650, 500],
    ]);
    this.cut('leftThigh', [
      [0, 960],
      [510, 960],
      [510, 1140],
      [0, 1140],
    ]);
    this.cut('rightThigh', [
      [510, 960],
      [1024, 960],
      [1024, 1140],
      [510, 1140],
    ]);
    this.cut('leftCalf', [
      [0, 1136],
      [510, 1136],
      [510, 1536],
      [0, 1536],
    ]);
    this.cut('rightCalf', [
      [510, 1136],
      [1024, 1136],
      [1024, 1536],
      [510, 1536],
    ]);
  }
  resizeQuality(delta: number) {
    this.fps = this.fps * 0.95 + (1000 / Math.max(1, delta)) * 0.05;
    if (delta > 28) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 45 && !this.lowEffects) {
      this.lowEffects = true;
      if (!this.canvas.dataset.phaser) {
        this.canvas.width = 400;
        this.canvas.height = 680;
      }
    }
  }
  private part(name: string, pivot: readonly number[], angle = 0, dx = 0, dy = 0) {
    const x = this.ctx;
    x.save();
    x.translate(pivot[0] + dx, pivot[1] + dy);
    x.rotate(angle);
    x.drawImage(this.pieces.get(name)!, -pivot[0], -pivot[1], 1024, 1536);
    x.restore();
  }
  private drawLeg(side: 'left' | 'right', pose: LegPose) {
    const hip = RIG[`${side}Hip`],
      knee = RIG[`${side}Knee`];
    const joint = legJoint(side, pose.thigh);
    this.part(`${side}Thigh`, hip, pose.thigh);
    this.part(`${side}Calf`, knee, pose.calf, joint[0] - knee[0], joint[1] - knee[1]);
  }
  private player(sim: Simulation, idle: boolean) {
    const x = this.ctx;
    const pose = samplePlayerPose(sim, idle);
    const motion = TRICK_MOTION[sim.settings.character];
    const trickAge = 1.3 - (sim.trickUntil - sim.time);
    const flourish =
      !idle && !this.settings.reduced && sim.time < sim.trickUntil
        ? Math.sin(Math.PI * ease(trickAge / 1.3)) * (1 - pose.effort)
        : 0;
    const celebration = sim.ended && sim.reason === 'complete';
    const baseX = PLAYER.x + pose.x;
    const baseY = PLAYER.y + pose.y;
    x.save();
    x.translate(baseX, baseY);
    x.scale(PLAYER.scale, PLAYER.scale);
    // Keep the support boot on its original court position during header lean.
    this.drawLeg(
      'left',
      solveLeg('left', [
        RIG.leftBoot[0] - pose.x / PLAYER.scale,
        RIG.leftBoot[1] - pose.y / PLAYER.scale,
      ]),
    );
    this.drawLeg('right', {
      thigh: pose.thigh - flourish * Math.min(0.25, motion.heel * 0.15),
      calf: pose.calf + flourish * Math.min(0.45, motion.heel * 0.3),
    });
    const arms = pose.effort * 0.16 + flourish * motion.arms * 0.35;
    this.part('leftArm', RIG.leftArm, celebration ? 1.2 : arms);
    this.part('body', RIG.body);
    this.part('rightArm', RIG.rightArm, celebration ? -1.2 : -arms);
    if (sim.settings.kit !== 'original') {
      x.save();
      x.globalAlpha = 0.45;
      x.fillStyle =
        sim.settings.kit === 'kit-crimson'
          ? '#b42b3a'
          : sim.settings.kit === 'mastery'
            ? '#dfbb70'
            : '#141416';
      x.beginPath();
      x.moveTo(403, 348);
      x.lineTo(620, 348);
      x.lineTo(664, 732);
      x.lineTo(379, 732);
      x.closePath();
      x.fill();
      x.restore();
    }
    x.restore();
  }
  private ball(ball: Ball, bonus: boolean, sim: Simulation) {
    if (!ball.active) return;
    const x = this.ctx;
    const radius = bonus ? 12 : 14;
    const shadow = 0.15 + (Math.max(0, ball.y) / 680) * 0.2;
    x.fillStyle = `rgba(0,0,0,${shadow})`;
    x.beginPath();
    x.ellipse(ball.x, FLOOR, Math.max(5, 18 - (FLOOR - ball.y) * 0.014), 4, 0, 0, Math.PI * 2);
    x.fill();
    if (!this.settings.reduced && !this.lowEffects) {
      x.strokeStyle = bonus ? '#68e2dd55' : '#ffffff33';
      x.lineWidth = 8;
      x.beginPath();
      x.moveTo(ball.x, ball.y);
      x.lineTo(ball.x, ball.y - Math.sign(ball.vy) * Math.min(30, Math.abs(ball.vy) * 0.025));
      x.stroke();
    }
    x.save();
    x.translate(ball.x, ball.y);
    x.rotate(sim.time * (bonus ? -2 : 2));
    x.fillStyle = bonus
      ? '#67eee0'
      : sim.settings.ball === 'ball-gold'
        ? '#efc75b'
        : sim.settings.ball === 'ball-neon'
          ? '#68ddff'
          : '#fff8e8';
    x.strokeStyle = '#22282c';
    x.lineWidth = 1.4;
    x.beginPath();
    x.arc(0, 0, radius, 0, Math.PI * 2);
    x.fill();
    x.stroke();
    x.fillStyle = '#253139';
    x.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      if (i) x.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
      else x.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
    }
    x.closePath();
    x.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      x.beginPath();
      x.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      x.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      x.stroke();
    }
    x.restore();
  }
  draw(sim: Simulation, idle = false, countdown = '') {
    const x = this.ctx;
    const scale = this.canvas.width / 400;
    x.setTransform(scale, 0, 0, scale, 0, 0);
    x.clearRect(0, 0, 400, 680);
    const background = this.images.venue;
    const cover = Math.max(400 / background.naturalWidth, 680 / background.naturalHeight);
    x.drawImage(
      background,
      (400 - background.naturalWidth * cover) / 2,
      (680 - background.naturalHeight * cover) / 2,
      background.naturalWidth * cover,
      background.naturalHeight * cover,
    );
    const shade = x.createLinearGradient(0, 0, 0, 680);
    shade.addColorStop(0, '#080e18cc');
    shade.addColorStop(0.22, '#080e1810');
    shade.addColorStop(0.7, '#080e1800');
    shade.addColorStop(1, '#080e18b0');
    x.fillStyle = shade;
    x.fillRect(0, 0, 400, 680);
    // Independent foreground crowd motion: presentation only, never simulation.
    if (!this.settings.reduced && !this.lowEffects) {
      for (let i = 0; i < 12; i++) {
        const cx = 12 + i * 34;
        const cy = 286 + Math.sin(sim.time * 3 + i) * (sim.time < sim.feverUntil ? 4 : 1);
        x.fillStyle = i % 3 === 0 ? '#dfbb70' : '#283638';
        x.beginPath();
        x.arc(cx, cy, 3, 0, 7);
        x.fill();
        x.fillRect(cx - 3, cy + 3, 6, 10);
      }
    }
    x.fillStyle = '#11182735';
    x.beginPath();
    x.ellipse(180, 606, 61, 10, 0, 0, 7);
    x.fill();
    this.player(sim, idle);
    if (!idle && !sim.ended) {
      const b = sim.nextBall;
      const p = CONTACT[b.touch];
      const remaining = b.due - sim.time;
      const ready = Math.abs(remaining) <= sim.window;
      const radius = 22 + Math.max(0, Math.min(1.2, remaining)) * 52;
      x.strokeStyle = this.settings.contrast
        ? '#ffffff'
        : b === sim.bonus
          ? '#67eee0'
          : ready
            ? '#f5d582'
            : '#ffffffbb';
      x.lineWidth = ready ? 4 : 2;
      x.setLineDash(ready ? [] : [4, 5]);
      x.beginPath();
      x.arc(p.x, p.y, 22, 0, 7);
      x.stroke();
      x.setLineDash([]);
      x.lineWidth = 2;
      x.globalAlpha = 0.8;
      x.beginPath();
      x.arc(p.x, p.y, radius, 0, 7);
      x.stroke();
      x.globalAlpha = 1;
      x.font = '700 12px Inter';
      x.textAlign = 'center';
      x.fillStyle = ready ? '#fff4b0' : '#ffffff';
      x.shadowColor = '#111';
      x.shadowBlur = 5;
      x.fillText(
        ready ? 'TAP' : b === sim.bonus ? 'BONUS' : b.touch.toUpperCase(),
        p.x,
        p.y + radius + 19,
      );
      x.shadowBlur = 0;
    }
    this.ball(sim.main, false, sim);
    this.ball(sim.bonus, true, sim);
    const f = sim.feedback;
    if (f && sim.time - f.at < 0.65 && !idle) {
      x.textAlign = 'center';
      x.font = '700 22px "Barlow Condensed"';
      x.fillStyle = f.grade === 'perfect' ? '#ffe09a' : f.grade === 'miss' ? '#ffffff' : '#aef1e8';
      x.shadowColor = '#151719';
      x.shadowBlur = 5;
      x.fillText(f.text, 200, 226 - Math.min(10, (sim.time - f.at) * 15));
      x.shadowBlur = 0;
      if (f.grade === 'perfect' && !this.settings.reduced && !this.lowEffects) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const d = (sim.time - f.at) * 90;
          x.fillStyle =
            sim.settings.effect === 'effect-confetti'
              ? ['#e24d60', '#68e3dd', '#ffdc85'][i % 3]
              : '#ffdc85';
          x.fillRect(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 3, 3);
        }
      }
    }
    if (sim.announcementUntil > sim.time && !idle) {
      x.fillStyle = '#161719db';
      x.fillRect(22, 151, 356, 40);
      x.textAlign = 'center';
      x.fillStyle = '#f4d58c';
      x.font = '700 18px "Barlow Condensed"';
      x.fillText(sim.announcement, 200, 177);
    }
    if (sim.time < sim.trickUntil && !idle) {
      x.textAlign = 'center';
      x.font = '700 26px "Barlow Condensed"';
      x.fillStyle = '#f4d58c';
      x.fillText(character(sim.settings.character).trick.toUpperCase(), 200, 268);
    }
    if (countdown) {
      x.fillStyle = '#11131880';
      x.fillRect(0, 0, 400, 680);
      x.fillStyle = '#fff7e6';
      x.textAlign = 'center';
      x.font = '800 100px "Barlow Condensed"';
      x.fillText(countdown, 200, 325);
      x.font = '600 16px Inter';
      x.fillText('FIND YOUR RHYTHM', 200, 369);
    }
  }
  destroy() {
    this.canvas.remove();
    this.pieces.clear();
  }
}
