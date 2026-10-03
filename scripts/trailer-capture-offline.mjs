/** Offline capture of the SAME Canvas composition and gameplay renderer.
 * npm install --no-save @napi-rs/canvas (or set TRAILER_CANVAS_MODULE to its path)
 * node scripts/trailer-capture-offline.mjs [portrait|landscape] [--stills]
 * No browser, HTTP server or network access is needed.
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const require = createRequire(import.meta.url);
const native = require(process.env.TRAILER_CANVAS_MODULE || '@napi-rs/canvas');
const { createCanvas, Image, GlobalFonts } = native;
GlobalFonts.registerFromPath('public/fonts/barlow-condensed-latin.woff2', 'TrailerHeading');
GlobalFonts.registerFromPath('public/fonts/inter-latin.woff2', 'TrailerBody');
class LocalImage extends Image {
  set src(value) {
    super.src = readFileSync(resolve('public', value.replace(/^\//, '')));
  }
  get src() {
    return super.src;
  }
}
globalThis.Image = LocalImage;
globalThis.FontFace = class {
  load() {
    return Promise.resolve(this);
  }
};
globalThis.window = {};
globalThis.document = {
  fonts: { add() {} },
  body: { append() {} },
  createElement(tag) {
    if (tag !== 'canvas') return { append() {} };
    const canvas = createCanvas(1, 1);
    canvas.setAttribute = () => {};
    return canvas;
  },
};
await mkdir('output/trailer/review', { recursive: true });
await mkdir('public/trailer', { recursive: true });
await build({
  entryPoints: ['scripts/trailer-composition.ts'],
  outfile: 'output/trailer/composition.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
});
const selected = process.argv.find((a) => ['portrait', 'landscape'].includes(a));
for (const orientation of selected ? [selected] : ['landscape', 'portrait']) {
  globalThis.location = { search: `?orientation=${orientation}` };
  await import(`../output/trailer/composition.mjs?${orientation}`);
  const render = globalThis.window.trailerRender;
  for (const t of [2, 4.8, 7, 9.5, 10.7, 12.8, 14.5, 16.2, 18, 19.7, 21.3, 25.3, 28, 31])
    await writeFile(
      `output/trailer/review/${orientation}-${t}.jpg`,
      Buffer.from(render(t), 'base64'),
    );
  await writeFile(`public/trailer/poster-${orientation}.jpg`, Buffer.from(render(31), 'base64'));
  if (!process.argv.includes('--stills')) {
    const ffmpeg = spawn(
      'ffmpeg',
      [
        '-y',
        '-v',
        'error',
        '-f',
        'image2pipe',
        '-vcodec',
        'mjpeg',
        '-framerate',
        '30',
        '-i',
        'pipe:0',
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '19',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        `output/trailer/${orientation}.mp4`,
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    const done = once(ffmpeg, 'close');
    for (let frame = 0; frame < 1020; frame++) {
      if (!ffmpeg.stdin.write(Buffer.from(render(frame / 30), 'base64')))
        await once(ffmpeg.stdin, 'drain');
      if (frame % 180 === 0) console.log(`${orientation}: ${frame}/1020 frames`);
    }
    ffmpeg.stdin.end();
    const [code] = await done;
    if (code !== 0) throw Error(`FFmpeg failed: ${code}`);
  }
  console.log(`${orientation} capture complete`);
}
