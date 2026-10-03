/** Editable 34-second film. Rendered deterministically by trailer-capture.mjs.
 * Gameplay is the real FocusRound simulation and FocusScene camera renderer;
 * only editing time (slow motion and cuts) differs from ordinary play.
 */
import { FocusRound } from '../src/focus/simulation';
import { FocusScene } from '../src/focus/scene';

const roster = [
  'ronaldinho',
  'okocha',
  'baggio',
  'best',
  'cruyff',
  'henry',
  'maradona',
  'pele',
  'messi',
  'cristiano',
  'ronaldo',
  'zidane',
];
const names = [
  'RONALDINHO',
  'JAY-JAY OKOCHA',
  'ROBERTO BAGGIO',
  'GEORGE BEST',
  'JOHAN CRUYFF',
  'THIERRY HENRY',
  'DIEGO MARADONA',
  'PELÉ',
  'LIONEL MESSI',
  'CRISTIANO RONALDO',
  'RONALDO',
  'ZINEDINE ZIDANE',
];
const images: Record<string, HTMLImageElement> = {};
await Promise.all(
  [...roster, 'stadium', 'court'].map(async (id) => {
    const img = new Image();
    img.src = `/art/${id}.webp`;
    await img.decode();
    images[id] = img;
  }),
);
const heading = new FontFace('TrailerHeading', 'url(/fonts/barlow-condensed-latin.woff2)', {
  weight: '100 900',
});
const body = new FontFace('TrailerBody', 'url(/fonts/inter-latin.woff2)', { weight: '100 900' });
await Promise.all([heading.load(), body.load()]);
document.fonts.add(heading);
document.fonts.add(body);
const portrait = new URLSearchParams(location.search).get('orientation') === 'portrait';
const w = portrait ? 720 : 1280,
  h = portrait ? 1280 : 720;
const canvas = document.createElement('canvas');
canvas.width = w;
canvas.height = h;
document.body.append(canvas);
const ctx = canvas.getContext('2d', { alpha: false })!;
const scene = new FocusScene(document.createElement('div'), images.court, images.ronaldinho);
const gold = '#ffe2a1',
  white = '#f4f3e9';
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const u = clamp(v);
  return u * u * (3 - 2 * u);
};
function text(
  value: string,
  x: number,
  y: number,
  size: number,
  color = white,
  align: CanvasTextAlign = 'center',
  max = w - 80,
) {
  ctx.save();
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px TrailerHeading`;
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.fillText(value, x, y, max);
  ctx.restore();
}
function small(value: string, x: number, y: number, size = 19, color = gold) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.font = `600 ${size}px TrailerBody`;
  ctx.fillText(value, x, y, w - 80);
  ctx.restore();
}
function cover(img: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const s = Math.max(width / img.width, height / img.height);
  ctx.drawImage(
    img,
    x + (width - img.width * s) / 2,
    y + (height - img.height * s) / 2,
    img.width * s,
    img.height * s,
  );
}
function background(t: number, court = false) {
  cover(images[court ? 'court' : 'stadium'], 0, 0, w, h);
  ctx.fillStyle = '#020c13b8';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.38, 0, w * 0.5, h * 0.4, w * 0.7);
  g.addColorStop(0, '#17706d44');
  g.addColorStop(1, '#01040fe0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(w * (i / 4), -80);
    ctx.rotate(Math.sin(t * 0.16 + i) * 0.26);
    const b = ctx.createLinearGradient(0, 0, 0, h);
    b.addColorStop(0, '#e6faff24');
    b.addColorStop(1, '#def5ff00');
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(110, h);
    ctx.lineTo(-110, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 40; i++) {
    const x = (Math.sin(i * 39.8) * 0.5 + 0.5) * w;
    const y = (i * 53.1 + t * (7 + (i % 6))) % h;
    ctx.fillStyle = i % 3 ? '#f2dba949' : '#ffffff65';
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.fillStyle = '#d5b96e';
  ctx.fillRect(36, 36, 36, 3);
  small(
    'EXPERT PUNDIT  /  KEEPYUPPY',
    portrait ? w * 0.5 : 330,
    portrait ? 64 : 52,
    portrait ? 17 : 16,
    '#e8eadb99',
  );
}
function player(id: string, x: number, y: number, height: number, alpha = 1) {
  const img = images[id];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    img,
    x - (height * img.width) / img.height / 2,
    y,
    (height * img.width) / img.height,
    height,
  );
  ctx.restore();
}
function shade(y: number) {
  const g = ctx.createLinearGradient(0, y, 0, h);
  g.addColorStop(0, '#01071100');
  g.addColorStop(0.5, '#010711c9');
  g.addColorStop(1, '#010711');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, h - y);
}
function football(x: number, y: number, r: number, spin: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.fillStyle = '#f9fae9';
  ctx.shadowColor = '#ffdf87';
  ctx.shadowBlur = 35;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#132c35';
  for (let j = 0; j < 6; j++) {
    const a = j * Math.PI * 0.4;
    ctx.beginPath();
    ctx.arc(j ? Math.cos(a) * r * 0.87 : 0, j ? Math.sin(a) * r * 0.87 : 0, r * 0.27, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}
function opening(t: number) {
  background(t);
  const full = t >= 5.2;
  const reveal = ease((t - 0.6) / 2.4);
  if (full)
    player('ronaldinho', portrait ? w * 0.5 : w * 0.7, portrait ? 150 : 70, portrait ? 850 : 620);
  else {
    const zoom = 1 + (t / 5.2) * 0.09;
    player(
      'ronaldinho',
      portrait ? w * 0.5 : w * 0.7,
      portrait ? 120 : 45,
      (portrait ? 1460 : 1150) * zoom,
    );
  }
  ctx.fillStyle = `rgba(0,4,10,${(1 - reveal) * 0.99})`;
  ctx.fillRect(0, 0, w, h);
  shade(portrait ? 680 : 430);
  if (t < 4) {
    text('EVERY LEGEND…', portrait ? w * 0.5 : 330, portrait ? 1040 : 550, portrait ? 88 : 92);
    small('THE STADIUM IS WAITING.', portrait ? w * 0.5 : 330, portrait ? 1090 : 596, 17);
  } else {
    text('…STARTS WITH', portrait ? w * 0.5 : 340, portrait ? 1010 : 350, portrait ? 82 : 78);
    text('ONE TOUCH.', portrait ? w * 0.5 : 340, portrait ? 1100 : 445, portrait ? 106 : 110, gold);
  }
  if (t > 6.3) {
    const p = ease((t - 6.3) / 1.7);
    football(w * (portrait ? 0.73 : 0.8) - p * w * 0.15, h * (0.58 + p * 0.15), 20 + p * 32, t * 3);
  }
}
function gameplayRound(index: number, offset: number) {
  const r = new FocusRound('standard', { mode: 'practice' });
  for (let i = 0; i < index; i++) r.tap(r.due);
  const due = r.due;
  if (offset >= 0) {
    r.tap(due);
    r.advanceTo(due + offset);
  } else r.advanceTo(due + offset);
  return r;
}
function gameFrame(t: number, montage: boolean) {
  background(t, true);
  let index = 0,
    offset = 0;
  if (!montage) {
    const q = t - 8;
    offset = q < 1.3 ? -1.7 + q : q < 2.5 ? -0.4 + (q - 1.3) * 0.4 : 0.08 + (q - 2.5) * 1.4;
  } else {
    const q = t - 17;
    const cut = Math.min(2, Math.floor(q / (5 / 3)));
    index = [1, 2, 4][cut];
    offset = -0.8 + (q - (cut * 5) / 3) * 0.85;
  }
  const round = gameplayRound(index, offset);
  scene.draw(round, '', true);
  const gh = portrait ? 1000 : 660,
    gw = (gh * 400) / 680,
    gx = portrait ? (w - gw) / 2 : 720,
    gy = portrait ? 70 : 35;
  ctx.save();
  ctx.shadowColor = '#c8eeef44';
  ctx.shadowBlur = 45;
  ctx.drawImage(scene.canvas, gx, gy, gw, gh);
  ctx.restore();
  if (portrait) {
    shade(820);
    text(montage ? 'MAKE EVERY' : 'TIMING IS', w * 0.5, 1070, 83);
    text(montage ? 'TOUCH PERFECT.' : 'EVERYTHING.', w * 0.5, 1164, 94, gold);
  } else {
    text(montage ? 'MAKE EVERY' : 'TIMING IS', 365, 290, 88);
    text(montage ? 'TOUCH PERFECT.' : 'EVERYTHING.', 365, 391, 98, gold, 'center', 650);
    small('ACTUAL CAMERA GAMEPLAY', 365, 590, 18, '#bacbd0');
  }
  if (montage) {
    const cut = Math.min(2, Math.floor((t - 17) / (5 / 3)));
    text(
      ['×2', '×3', '×5'][cut],
      portrait ? 615 : 365,
      portrait ? 900 : 505,
      portrait ? 96 : 94,
      gold,
    );
  }
}
function legends(t: number) {
  background(t, t < 13.6);
  const group = Math.min(2, Math.floor((t - 12) / (5 / 3)));
  const u = t - 12 - (group * 5) / 3;
  const ids = roster.slice(group * 4, group * 4 + 4);
  if (portrait) {
    ids.forEach((id, i) => {
      const x = i % 2 ? 510 : 210,
        y = i < 2 ? 155 : 620;
      player(id, x, y + 14 * (1 - ease(u * 2)), i < 2 ? 440 : 460);
      small(names[group * 4 + i], x, y + (i < 2 ? 452 : 471), 16, white);
    });
    shade(1040);
    text('GREATNESS IS EARNED.', w * 0.5, 1202, 68, gold);
  } else {
    ids.forEach((id, i) => {
      const x = 170 + i * 314;
      player(id, x, 110 + 14 * (1 - ease(u * 2)), 480);
      small(names[group * 4 + i], x, 610, 16, white);
    });
    text('GREATNESS IS EARNED.', w * 0.5, 686, 64, gold);
  }
  small(`THE LEGENDS  /  ${String(group + 1).padStart(2, '0')}`, w * 0.5, portrait ? 125 : 96, 17);
}
function stars(t: number) {
  background(t);
  player('ronaldinho', w * 0.5, portrait ? 155 : 105, portrait ? 770 : 640, 0.52);
  shade(portrait ? 630 : 340);
  const count = [22.2, 22.9, 23.6, 24.3, 25.2].filter((at) => t >= at).length;
  const size = portrait ? 97 : 119;
  for (let i = 0; i < 5; i++) {
    const x = w * 0.5 + (i - 2) * (size + 6),
      y = portrait ? 817 : 366;
    ctx.save();
    ctx.fillStyle = i < count ? gold : '#43535c';
    ctx.shadowColor = gold;
    ctx.shadowBlur = i < count ? 24 : 0;
    ctx.beginPath();
    for (let point = 0; point < 10; point++) {
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      const radius = size * (point % 2 ? 0.22 : 0.48);
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  text('PERFECTION TAKES', w * 0.5, portrait ? 1040 : 535, portrait ? 80 : 88);
  text('DEDICATION.', w * 0.5, portrait ? 1140 : 639, portrait ? 108 : 110, gold);
}
function challenges(t: number) {
  background(t);
  small('SCORE CHALLENGE', w * 0.5, portrait ? 260 : 164, 21);
  const labels = ['2 MINUTES.', '5 MINUTES.', 'UNLIMITED.'];
  labels.forEach((label, i) => {
    const visible = ease((t - 26 - i * 0.25) * 3);
    ctx.globalAlpha = visible;
    const x = portrait ? 70 : 80 + i * 410,
      y = portrait ? 360 + i * 195 : 255,
      cw = portrait ? 580 : 380,
      ch = portrait ? 159 : 228;
    ctx.fillStyle = '#102c37e8';
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = gold;
    ctx.fillRect(x, y, 4, ch);
    text(label, x + cw / 2, y + (portrait ? 100 : 132), portrait ? 80 : 66, gold);
    ctx.globalAlpha = 1;
  });
  small(
    'SURVIVE. BUILD YOUR CHAIN. SET THE RECORD.',
    w * 0.5,
    portrait ? 1080 : 580,
    portrait ? 17 : 22,
    white,
  );
  small('FREE TO PLAY · SCORES ON THIS DEVICE', w * 0.5, portrait ? 1130 : 622, 16, '#b4c8cc');
}
function finale(t: number) {
  background(t);
  if (portrait) {
    roster.forEach((id, i) =>
      player(id, 65 + (i % 6) * 118, 165 + Math.floor(i / 6) * 224, 260, 0.85),
    );
    player('ronaldinho', w * 0.5, 360, 420);
    shade(610);
    text('KEEPYUPPY', w * 0.5, 835, 139, gold);
    small('EXPERT PUNDIT', w * 0.5, 724, 18);
    text('ARE YOU THE BEST', w * 0.5, 946, 62);
    text('KEEPYUPPY CHAMPION', w * 0.5, 1016, 62);
    text('IN THE WORLD?', w * 0.5, 1086, 66);
  } else {
    roster.forEach((id, i) => player(id, 70 + i * 104, 87 + Math.abs(i - 5.5) * 8, 340, 0.8));
    player('ronaldinho', w * 0.5, 86, 390);
    shade(350);
    small('EXPERT PUNDIT', w * 0.5, 421, 17);
    text('KEEPYUPPY', w * 0.5, 536, 130, gold);
    text('ARE YOU THE BEST KEEPYUPPY CHAMPION IN THE WORLD?', w * 0.5, 590, 43);
  }
  const y = portrait ? 1140 : 625;
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.roundRect(w * 0.5 - 210, y, 230, 65, 5);
  ctx.fill();
  text('PLAY NOW', w * 0.5 - 95, y + 44, 37, '#09222b');
  ctx.strokeStyle = '#f0d99a77';
  ctx.strokeRect(w * 0.5 + 36, y, 174, 65);
  text('WATCH AGAIN', w * 0.5 + 123, y + 43, 28);
}
function render(t: number) {
  ctx.globalAlpha = 1;
  if (t < 8) opening(t);
  else if (t < 12) gameFrame(t, false);
  else if (t < 17) legends(t);
  else if (t < 22) gameFrame(t, true);
  else if (t < 26) stars(t);
  else if (t < 29) challenges(t);
  else finale(t);
  // Short editorial dip at scene boundaries; the last composition holds for five seconds.
  for (const cut of [4, 5.2, 8, 12, 13.6667, 15.3333, 17, 18.6667, 20.3333, 22, 26, 29]) {
    const d = Math.abs(t - cut);
    if (d < 0.09) {
      ctx.fillStyle = `rgba(1,5,10,${0.55 * (1 - d / 0.09)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}
Object.assign(window, { trailerRender: render, trailerReady: true });
render(31);
