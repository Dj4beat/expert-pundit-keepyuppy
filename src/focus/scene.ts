import { focusCharacter } from './characters';
import {
  cameraPose,
  clamp,
  LABELS,
  project,
  smooth,
  TARGETS,
  strikePose,
  type FocusLimb,
  type FocusRound,
  type Point,
} from './simulation';

export class FocusScene {
  readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  gentle = false;
  private venueName = 'The Neighbourhood';
  constructor(
    parent: HTMLElement,
    private court: HTMLImageElement,
    private portrait: HTMLImageElement,
  ) {
    this.canvas.width = 800;
    this.canvas.height = 1360;
    this.canvas.setAttribute(
      'aria-label',
      'Timing court. Tap or press Space when the ball reaches the gold ring.',
    );
    parent.append(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
  }
  setVenue(court: HTMLImageElement, name: string) {
    this.court = court;
    this.venueName = name;
  }
  setCharacter(portrait: HTMLImageElement) {
    this.portrait = portrait;
  }
  private detail(limb: FocusLimb, point: Point, alpha: number, rotation: number) {
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    c.translate(point.x, point.y + 13);
    const sx = this.portrait.naturalWidth / 1024,
      sy = this.portrait.naturalHeight / 1536;
    if (limb === 'right-foot' || limb === 'left-foot') {
      const left = limb === 'left-foot';
      c.rotate((left ? -1 : 1) * (2.75 + rotation));
      c.scale(left ? -0.24 : 0.24, 0.24);
      // A boot and sock only: the rest of the player remains outside the close-up.
      c.drawImage(
        this.portrait,
        560 * sx,
        1030 * sy,
        310 * sx,
        480 * sy,
        560 - 823,
        1030 - 1440,
        310,
        480,
      );
    } else if (limb === 'knee') {
      c.rotate(Math.PI + rotation);
      c.scale(0.28, 0.28);
      c.beginPath();
      c.roundRect(-128, -260, 235, 265, [0, 0, 60, 60]);
      c.clip();
      c.drawImage(
        this.portrait,
        525 * sx,
        820 * sy,
        235 * sx,
        265 * sy,
        525 - 653,
        820 - 1080,
        235,
        265,
      );
    } else {
      c.rotate(rotation);
      c.scale(0.27, 0.27);
      c.drawImage(this.portrait, 300 * sx, 0, 390 * sx, 330 * sy, 300 - 518, -25, 390, 330);
    }
    c.restore();
  }
  private football(p: Point, time: number) {
    const c = this.ctx,
      r = 13;
    c.save();
    c.translate(p.x, p.y);
    c.rotate(time * 1.7);
    const light = c.createRadialGradient(-5, -6, 1, 0, 0, r);
    light.addColorStop(0, '#fffef7');
    light.addColorStop(0.7, '#e9eadf');
    light.addColorStop(1, '#9ba8aa');
    c.fillStyle = light;
    c.strokeStyle = '#182729';
    c.lineWidth = 0.7;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.clip();
    c.fillStyle = '#1d3035';
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      c.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
    }
    c.closePath();
    c.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      c.beginPath();
      c.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      c.stroke();
      c.beginPath();
      c.arc(Math.cos(a) * r, Math.sin(a) * r, 3, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
  draw(round: FocusRound, overlay = '', showCues = true) {
    const c = this.ctx,
      cam = cameraPose(round, this.gentle);
    const resolution = this.canvas.width / 400;
    c.setTransform(resolution, 0, 0, resolution, 0, 0);
    c.fillStyle = '#111d20';
    c.fillRect(0, 0, 400, 680);
    c.save();
    c.translate(200, 340);
    c.scale(cam.zoom, cam.zoom);
    c.translate(-cam.x, -cam.y);
    const cover = Math.max(400 / this.court.naturalWidth, 680 / this.court.naturalHeight);
    c.drawImage(
      this.court,
      (400 - this.court.naturalWidth * cover) / 2,
      (680 - this.court.naturalHeight * cover) / 2,
      this.court.naturalWidth * cover,
      this.court.naturalHeight * cover,
    );
    const portraitAlpha = this.gentle ? 1 : 1 - smooth((cam.close - 0.08) / 0.5);
    if (portraitAlpha > 0) {
      c.save();
      c.globalAlpha = portraitAlpha;
      c.fillStyle = '#07171955';
      c.beginPath();
      c.ellipse(200, 532, 65, 8, 0, 0, Math.PI * 2);
      c.fill();
      c.drawImage(this.portrait, 80, 180, 240, 360);
      c.restore();
    }
    const beat = round.timeScale;
    const p = round.ball,
      focus = TARGETS[cam.limb];
    const age = round.lastHit ? round.time - round.lastHit.at : Infinity;
    const pose = strikePose(round, cam.limb);
    const detailPoint = { x: focus.x, y: focus.y + pose.lift };
    const bodyAlpha = this.gentle ? 0 : smooth((cam.close - 0.6) / 0.35);
    this.detail(cam.limb, detailPoint, bodyAlpha, pose.rotation);
    c.fillStyle = '#0b171923';
    c.beginPath();
    c.ellipse(p.x, 532, 18, 4, 0, 0, 7);
    c.fill();
    this.football(p, round.time);
    c.restore();
    // HUD and timing graphics stay in screen space while the court moves.
    const shade = c.createLinearGradient(0, 0, 0, 680);
    shade.addColorStop(0, '#071719da');
    shade.addColorStop(0.23, '#07171908');
    shade.addColorStop(0.72, '#07171900');
    shade.addColorStop(1, '#071719ee');
    c.fillStyle = shade;
    c.fillRect(0, 0, 400, 680);
    const target = project(round.target, cam);
    if (!round.ended && age > 0.65 * beat && cam.limb === round.limb) {
      const ready = Math.abs(round.remaining) <= round.window;
      const visible = this.gentle ? 1 : smooth((cam.close - 0.45) / 0.35);
      c.save();
      c.globalAlpha = visible;
      c.strokeStyle = round.isPerfectMoment ? '#ffe5a3' : ready ? '#e8cb8d88' : '#ffffffb0';
      c.lineWidth = ready ? 2.5 : 1;
      c.beginPath();
      c.arc(target.x, target.y, 19 * cam.zoom, 0, 7);
      c.stroke();
      const radius = (19 + clamp(round.remaining / (0.9 * beat)) * 32) * cam.zoom;
      c.globalAlpha = visible * 0.65;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(target.x, target.y, radius, 0, 7);
      c.stroke();
      c.restore();
    }
    const f = round.feedback;
    if (f && round.time - f.at < 0.65 * beat) {
      const opacity = 1 - clamp(((round.time - f.at) / beat - 0.2) / 0.45);
      c.save();
      c.globalAlpha = opacity;
      c.fillStyle = f.grade === 'perfect' ? '#f5d58b' : f.grade === 'miss' ? '#fff' : '#aff3e7';
      c.textAlign = 'center';
      c.font = '700 32px "Barlow Condensed",sans-serif';
      c.fillText(
        f.grade === 'miss' ? 'WAIT FOR IT' : `${f.grade.toUpperCase()} +${f.points}`,
        200,
        203,
      );
      c.font = '600 13px Inter,sans-serif';
      c.fillText(
        f.grade === 'perfect' ? `×${f.multiplier} PERFECT CHAIN` : 'CHAIN RESET',
        200,
        224,
      );
      if (f.grade !== 'miss') {
        const hit = project(f.point, cam),
          spread = (round.time - f.at) * 65;
        c.strokeStyle = '#fff2c1';
        c.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          c.beginPath();
          c.moveTo(hit.x + Math.cos(a) * (24 + spread), hit.y + Math.sin(a) * (24 + spread));
          c.lineTo(hit.x + Math.cos(a) * (30 + spread), hit.y + Math.sin(a) * (30 + spread));
          c.stroke();
        }
      }
      c.restore();
    }
    c.textAlign = 'left';
    c.fillStyle = '#f5dfac';
    c.font = '600 10px Inter,sans-serif';
    c.fillText(this.venueName.toUpperCase(), 24, 37, 270);
    c.fillStyle = '#fff';
    c.font = '700 24px "Barlow Condensed",sans-serif';
    c.fillText(focusCharacter(round.character).name.toUpperCase(), 24, 65, 270);
    c.textAlign = 'right';
    c.font = '700 40px "Barlow Condensed",sans-serif';
    c.fillText(String(round.hits).padStart(2, '0'), 376, 57);
    c.font = '600 9px Inter,sans-serif';
    c.fillStyle = '#cad3cd';
    c.fillText('TOUCHES', 376, 74);
    c.fillStyle = round.streak > 0 ? '#ffe0a0' : '#c6d1cc';
    c.font = '700 12px Inter,sans-serif';
    c.fillText(`${round.score.toLocaleString()} PTS`, 376, 99);
    c.textAlign = 'left';
    c.fillText(`×${round.multiplier} PERFECT CHAIN`, 24, 91);
    if (!showCues) return;
    const inWindow = Math.abs(round.remaining) <= round.window;
    let cue = round.ended
      ? round.reason === 'complete'
        ? 'ROUND COMPLETE'
        : round.reason === 'target-missed'
          ? 'ROUND FINISHED'
          : round.reason === 'timed-complete'
            ? 'TIME’S UP'
            : round.reason === 'finish'
              ? 'RUN FINISHED'
              : 'BALL DROPPED'
      : age < 0.65 * beat
        ? 'NICE. LET IT FLY.'
        : cam.close < 0.12
          ? 'FOLLOW THE FLIGHT'
          : inWindow
            ? round.isPerfectMoment
              ? 'PERFECT · TAP'
              : round.remaining > 0
                ? 'WAIT FOR CENTRE'
                : 'LATE · SAVE IT'
            : `NEXT · ${LABELS[round.limb]}`;
    if (overlay) cue = overlay;
    c.textAlign = 'center';
    c.fillStyle = round.isPerfectMoment ? '#ffe0a0' : '#fff8ec';
    c.font = '700 27px "Barlow Condensed",sans-serif';
    c.fillText(cue, 200, 601);
    c.font = '500 11px Inter,sans-serif';
    c.fillStyle = '#c6d1cc';
    c.fillText(
      round.ended ? 'Start again to find your rhythm' : 'TAP ANYWHERE  /  CLICK  /  SPACE',
      200,
      627,
    );
    const barX = 68,
      barY = 650,
      barW = 264;
    c.fillStyle = '#ffffff25';
    c.fillRect(barX, barY, barW, 3);
    c.fillStyle = '#e8cb8d55';
    c.fillRect(
      barX + barW * (0.5 - round.window / (0.9 * beat)),
      barY - 3,
      (barW * round.window) / (0.45 * beat),
      9,
    );
    c.fillStyle = '#ffe4a5';
    c.fillRect(
      barX + barW * (0.5 - round.perfectWindow / (0.9 * beat)),
      barY - 4,
      (barW * round.perfectWindow) / (0.45 * beat),
      11,
    );
    c.fillStyle = '#fff';
    c.fillRect(barX + barW * 0.5 - 0.5, barY - 6, 1, 15);
    const progress = clamp(0.5 - round.remaining / (0.9 * beat));
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(barX + progress * barW, barY + 1.5, 4, 0, 7);
    c.fill();
  }
}
