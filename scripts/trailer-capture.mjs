/** Reproducible deterministic capture; starts a local Vite server itself.
 * node scripts/trailer-capture.mjs [portrait|landscape] [--stills]
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
const origin = 'http://127.0.0.1:4188';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4188'],
  { stdio: 'ignore' },
);
let browser;
try {
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {
      /* Wait for Vite to begin listening. */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  await mkdir('output/trailer/review', { recursive: true });
  await mkdir('public/trailer', { recursive: true });
  browser = await chromium.launch({ headless: true });
  const orientations = process.argv.find((a) => ['portrait', 'landscape'].includes(a));
  for (const orientation of orientations ? [orientations] : ['landscape', 'portrait']) {
    const portrait = orientation === 'portrait';
    const page = await browser.newPage({
      viewport: { width: portrait ? 720 : 1280, height: portrait ? 1280 : 720 },
    });
    page.on('pageerror', (e) => console.error(e));
    await page.goto(`${origin}/scripts/trailer.html?orientation=${orientation}`);
    await page.waitForFunction(() => window.trailerReady);
    for (const t of [2, 4.8, 7, 9.5, 10.7, 12.8, 14.5, 16.2, 18, 19.7, 21.3, 25.3, 28, 31]) {
      const data = await page.evaluate((t) => window.trailerRender(t), t);
      await writeFile(`output/trailer/review/${orientation}-${t}.jpg`, Buffer.from(data, 'base64'));
    }
    const poster = await page.evaluate(() => window.trailerRender(31));
    await writeFile(`public/trailer/poster-${orientation}.jpg`, Buffer.from(poster, 'base64'));
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
        const data = await page.evaluate((t) => window.trailerRender(t), frame / 30);
        if (!ffmpeg.stdin.write(Buffer.from(data, 'base64'))) await once(ffmpeg.stdin, 'drain');
        if (frame % 180 === 0) console.log(`${orientation}: ${frame}/1020 frames`);
      }
      ffmpeg.stdin.end();
      const [code] = await done;
      if (code !== 0) throw Error(`FFmpeg failed: ${code}`);
    }
    await page.close();
    console.log(`${orientation} capture complete`);
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
