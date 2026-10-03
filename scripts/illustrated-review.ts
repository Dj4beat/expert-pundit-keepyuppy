import { GameRenderer } from '../src/renderer';
import { Simulation } from '../src/engine';
import type { RunSettings } from '../src/types';
declare const REVIEW_IMAGES: Record<string, string>;
window.addEventListener('error', (event) => {
  const message = document.createElement('pre');
  message.textContent = event.message;
  document.body.append(message);
});
const params = new URLSearchParams(location.search);
const character = params.get('character') ?? 'ronaldinho';
const venue = params.get('venue') ?? 'court';
const settings: RunSettings = {
  mode: 'practice',
  difficulty: 'standard',
  character,
  venue,
  power: 'golden-touch',
  powerLevel: 0,
  pace: 1,
  seed: 43,
  ball: 'classic',
  kit: 'original',
  effect: 'spark',
};
const [player, court] = await Promise.all(
  [character, venue].map(
    (id) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = REVIEW_IMAGES[id];
      }),
  ),
);
const sim = new Simulation(settings);
const renderer = new GameRenderer(
  document.querySelector('main')!,
  { character: player, venue: court },
  { sound: false, music: false, reduced: false, contrast: false, vibration: false },
);
const offsets = params.has('timing') ? [0, -0.1, 0, 0.1] : [0];
const limit = Number(params.get('touches') ?? 8);
function step(at: number) {
  let due = sim.nextBall.due + offsets[sim.hits % offsets.length];
  while (due <= at && !sim.ended && sim.hits < limit) {
    sim.tap({ type: 'tap', at: due });
    due = sim.nextBall.due + offsets[sim.hits % offsets.length];
  }
  sim.advanceTo(at);
  renderer.draw(sim);
}
if (params.has('sheet')) {
  const times = [
    1.2, 1.4, 1.6, 1.84, 2.05, 2.7, 2.95, 3.19, 3.46, 4.3, 4.54, 4.81, 5.4, 5.66, 5.9, 6.17,
  ];
  const sheet = document.createElement('canvas');
  sheet.width = 1000;
  sheet.height = 1780;
  const ctx = sheet.getContext('2d')!;
  times.forEach((at, i) => {
    step(at);
    const x = (i % 4) * 250,
      y = Math.floor(i / 4) * 445;
    ctx.drawImage(renderer.canvas, x, y, 250, 425);
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${at.toFixed(2)}s`, x + 8, y + 440);
  });
  document.querySelector('main')!.replaceChildren(sheet);
  document.querySelector('main')!.style.cssText = 'width:1000px;height:1780px';
} else if (params.has('at')) {
  step(Number(params.get('at')));
} else {
  const speed = Number(params.get('speed') ?? 1);
  let recorder: MediaRecorder | undefined;
  const chunks: Blob[] = [];
  if (params.has('capture')) {
    renderer.canvas.width = 400;
    renderer.canvas.height = 680;
    recorder = new MediaRecorder(renderer.canvas.captureStream(30), {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 1000000,
    });
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const reader = new FileReader();
      reader.onload = () => {
        localStorage.setItem(
          'keepy-illustrated-capture',
          JSON.stringify({ video: reader.result, duration: sim.time, hits: sim.hits, speed }),
        );
        document.body.dataset.capture = 'complete';
      };
      reader.readAsDataURL(new Blob(chunks, { type: 'video/webm' }));
    };
    recorder.start(1000);
  }
  const start = performance.now();
  function frame(now: number) {
    step(((now - start) / 1000) * speed);
    if (sim.ended) {
      recorder?.stop();
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
document.body.dataset.ready = 'true';
