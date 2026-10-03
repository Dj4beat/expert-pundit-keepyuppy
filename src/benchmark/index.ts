import './study.css';
import { asset } from '../assets';
import type { Difficulty } from '../types';
import { StudyScene } from './scene';
import { JugglingStudy } from './simulation';

/** An explicit milestone: never writes saves, grants rewards or impersonates the other legends. */
export async function startBenchmark(app: HTMLElement) {
  const query = new URLSearchParams(location.search);
  app.innerHTML = `<main class="study"><header class="study-header"><a href="${location.pathname}" aria-label="Back to KeepyUppy"><img src="${asset('art/logo.png')}" alt="Expert Pundit"/><span>KEEPY<span class="gold">UPPY</span></span></a><span class="study-tag">3D MOVEMENT STUDY · 01</span></header>
    <div class="study-layout"><section class="study-stage"><div id="study-court" tabindex="0" role="application" aria-label="Juggling study. Tap or press Space to kick. Escape pauses."></div><div class="study-top"><span>THE NEIGHBOURHOOD<br/><b>RONALDINHO</b></span><span><b id="study-hits">0</b> TOUCHES</span></div><div id="study-cue" class="study-cue" role="status">LACING UP…</div><div class="study-bottom"><span id="study-time">0.0s</span><span id="study-mode">PLAYABLE STUDY</span></div></section>
    <aside class="study-controls"><span class="eyebrow">BRAZIL · NUMBER 10</span><h1>FIND THE<br/><span class="gold">FEELING.</span></h1><p>A first look at a fully modelled player. Tap once as the ring closes. Feet, knees, and headers follow the ball.</p><p class="study-note">Work in progress. This study is awaiting movement and likeness review before the full roster is rebuilt.</p>
    <label for="study-difficulty">DIFFICULTY</label><select id="study-difficulty"><option value="casual">Casual</option><option value="standard">Standard</option><option value="expert">Expert</option></select>
    <button id="study-play" class="primary" disabled>PLAY A ROUND ↗</button><button id="study-replay" class="secondary" disabled>Watch 30-second benchmark</button>
    <div class="study-options"><button id="study-pause" disabled>Pause</button><button id="study-camera" aria-pressed="false">Side camera</button><button id="study-speed" aria-pressed="false">¼ speed</button></div>
    <button id="study-record" disabled>Record this benchmark</button><a id="study-download" hidden>Download gameplay video</a>
    <label class="study-check"><input id="study-quality" type="checkbox"/> Lighter shadows and resolution</label>
    <p class="small muted">Tap · Click · Space / Esc to pause<br/>This review scene does not award coins or change progress.</p><output id="study-diagnostics" class="small muted"></output><a class="study-back" href="${location.pathname}">← Back to the full game</a></aside></div></main>`;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  let scene: StudyScene;
  try {
    scene = new StudyScene(el('study-court'));
    await scene.load();
  } catch (e) {
    el('study-cue').textContent = 'COURT UNAVAILABLE';
    el('study-diagnostics').textContent =
      `${e instanceof Error ? e.message : e} This scene requires WebGL 2 and the downloaded model.`;
    return;
  }
  let sim = new JugglingStudy(scene.manifest);
  let elapsed = 0,
    previous = performance.now(),
    countdown = 0;
  let paused = true,
    automatic = false,
    slow = query.has('slow'),
    side = query.has('side');
  let finishedTail = 0,
    fps = 60,
    slowFrames = 0;
  let recorder: MediaRecorder | null = null;
  let recordingURL: string | null = null;
  let captureSaved = false;
  const cue = el('study-cue');
  for (const id of ['study-play', 'study-replay', 'study-pause', 'study-record'])
    el<HTMLButtonElement>(id).disabled = false;
  scene.setCamera(side);
  el('study-camera').setAttribute('aria-pressed', String(side));
  el('study-speed').setAttribute('aria-pressed', String(slow));
  scene.draw(sim);
  cue.textContent = 'READY WHEN YOU ARE';

  function start(auto: boolean) {
    sim = new JugglingStudy(
      scene.manifest,
      el<HTMLSelectElement>('study-difficulty').value as Difficulty,
    );
    elapsed = 0;
    finishedTail = 0;
    automatic = auto;
    paused = false;
    countdown = 3;
    scene.maxContactError = 0;
    previous = performance.now();
    el('study-mode').textContent = auto ? 'BENCHMARK REPLAY' : 'YOUR ROUND';
    el('study-pause').textContent = 'Pause';
    el('study-court').focus({ preventScroll: true });
    if (!query.has('capture'))
      el('study-court').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function togglePause() {
    paused = !paused;
    if (!paused) {
      countdown = 3;
      previous = performance.now();
    }
    el('study-pause').textContent = paused ? 'Resume' : 'Pause';
    if (paused && recorder?.state === 'recording') recorder.pause();
    else if (!paused && recorder?.state === 'paused') recorder.resume();
  }
  function advance(target: number) {
    if (automatic) {
      while (!sim.ended && sim.due < 31) {
        const offset =
          sim.limb === 'header' ? 0 : sim.hits % 7 === 2 ? -0.025 : sim.hits % 7 === 4 ? 0.025 : 0;
        const due = sim.due + offset;
        if (due > target) break;
        const result = sim.tap(due);
        if (result === 'miss' || result === null) break;
      }
    }
    sim.advanceTo(target);
  }
  function tap() {
    if (paused || automatic || countdown > 0 || sim.ended) return;
    const now = performance.now();
    elapsed += Math.max(0, Math.min(0.1, (now - previous) / 1000)) * (slow ? 0.25 : 1);
    previous = now;
    const outcome = sim.tap(elapsed);
    if (outcome === 'miss') cue.textContent = 'WAIT FOR THE RING';
    scene.draw(sim);
  }
  el('study-play').onclick = () => {
    stopRecording();
    start(false);
  };
  el('study-replay').onclick = () => {
    stopRecording();
    start(true);
  };
  el('study-pause').onclick = togglePause;
  el('study-camera').onclick = () => {
    side = !side;
    scene.setCamera(side);
    el('study-camera').setAttribute('aria-pressed', String(side));
    scene.draw(sim);
  };
  el('study-speed').onclick = () => {
    slow = !slow;
    el('study-speed').setAttribute('aria-pressed', String(slow));
  };
  el<HTMLInputElement>('study-quality').onchange = (e) =>
    scene.setLowQuality((e.target as HTMLInputElement).checked);
  el('study-court').onpointerdown = (e) => {
    e.preventDefault();
    tap();
  };
  window.addEventListener('keydown', (e) => {
    if (
      e.code === 'Space' &&
      !e.repeat &&
      !['BUTTON', 'SELECT', 'INPUT', 'A'].includes((e.target as HTMLElement).tagName)
    ) {
      e.preventDefault();
      tap();
    }
    if (e.code === 'Escape') togglePause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !paused) togglePause();
  });
  window.addEventListener('blur', () => {
    if (!paused && !query.has('capture')) togglePause();
  });

  function stopRecording() {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }
  function record() {
    if (!('MediaRecorder' in window) || !scene.renderer.domElement.captureStream) {
      el('study-diagnostics').textContent = 'Video capture is not supported by this browser.';
      return;
    }
    stopRecording();
    start(true);
    const stream = scene.renderer.domElement.captureStream(30);
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/mp4'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    const current = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 450_000,
    });
    recorder = current;
    const chunks: BlobPart[] = [];
    current.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    current.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: current.mimeType });
      if (recordingURL) URL.revokeObjectURL(recordingURL);
      recordingURL = URL.createObjectURL(blob);
      const link = el<HTMLAnchorElement>('study-download');
      link.href = recordingURL;
      link.download = `ronaldinho-${side ? 'side' : 'gameplay'}-${slow ? 'quarter' : 'normal'}.${current.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
      link.hidden = false;
      el('study-record').textContent = 'Record this benchmark';
      // CLI screenshot tooling can export this small recording with --save-storage.
      // This opt-in capture uses a separate key and never touches player saves.
      if (query.has('capture')) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            localStorage.setItem(
              'keepy-study-capture',
              JSON.stringify({
                video: reader.result,
                camera: side ? 'side' : 'gameplay',
                speed: slow ? 0.25 : 1,
                contacts: sim.history,
                maxContactError: scene.maxContactError,
                duration: sim.time,
                renderer: scene.renderer.info.render,
              }),
            );
            captureSaved = true;
            cue.textContent = 'CAPTURE SAVED';
            document.body.dataset.capture = 'complete';
          } catch {
            cue.textContent = 'CAPTURE STORAGE FULL · USE DOWNLOAD';
          }
        };
        reader.readAsDataURL(blob);
      }
    };
    current.start(1000);
    el('study-record').textContent = 'Recording the benchmark…';
  }
  el('study-record').onclick = record;
  if (query.has('capture')) record();
  else if (query.has('replay')) start(true);
  // Reproducible fixed-time browser frames for joint/contact inspection.
  const snapshot = Number(query.get('at'));
  if (query.has('at') && Number.isFinite(snapshot) && snapshot >= 0) {
    automatic = true;
    advance(Math.min(snapshot, 36));
    paused = true;
    countdown = 0;
    scene.draw(sim);
    cue.textContent = 'REVIEW FRAME';
  }
  let frame = 0;
  function loop(now: number) {
    const delta = Math.max(0, (now - previous) / 1000);
    previous = now;
    fps = 0.97 * fps + 0.03 / Math.max(0.001, delta);
    if (delta > 0.028) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames === 90) {
      scene.setLowQuality(true);
      el<HTMLInputElement>('study-quality').checked = true;
    }
    if (!paused) {
      if (delta > 0.6) {
        // Offline benchmark capture may stall on software shader compilation.
        // Skip that gap; manual rounds still pause to prevent unseen drops.
        if (!automatic) togglePause();
      } else if (countdown > 0) countdown = Math.max(0, countdown - delta);
      else {
        elapsed += delta * (slow ? 0.25 : 1);
        advance(elapsed);
        if (sim.ended) {
          finishedTail += delta;
          if (finishedTail > 1) stopRecording();
        }
      }
    }
    scene.draw(sim, finishedTail);
    el('study-hits').textContent = String(sim.hits);
    el('study-time').textContent = sim.time.toFixed(1) + 's';
    if (!captureSaved)
      cue.textContent =
        countdown > 0
          ? String(Math.ceil(countdown))
          : paused
            ? 'PAUSED'
            : sim.ended
              ? 'BALL DOWN · GO AGAIN'
              : sim.reachable
                ? 'TAP'
                : sim.contact && sim.time - sim.contact.actualTime < 0.5
                  ? sim.contact.outcome.toUpperCase()
                  : '';
    el('study-diagnostics').textContent =
      `${Math.round(fps)} fps · ${scene.renderer.info.render.triangles.toLocaleString()} triangles · contact gap ${(scene.maxContactError * 100).toFixed(1)} cm`;
    frame = requestAnimationFrame(loop);
  }
  frame = requestAnimationFrame(loop);
  window.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(frame);
      stopRecording();
      scene.dispose();
      if (recordingURL) URL.revokeObjectURL(recordingURL);
    },
    { once: true },
  );
}
