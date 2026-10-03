import { readFile, mkdir, writeFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';

const input = process.argv[2];
if (!input)
  throw new Error(
    'Usage: node scripts/extract-benchmark-capture.mjs <storage.json | dedicated-capture-profile>',
  );
let capture;
if ((await stat(input)).isDirectory()) {
  // Playwright omits file:// origins from storageState. A dedicated, disposable
  // capture profile retains the explicit recording in Chromium's local storage.
  const directory = path.join(input, 'Default/Local Storage/leveldb');
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.ldb') && !name.endsWith('.log')) continue;
    let bytes = await readFile(path.join(directory, name));
    if (name.endsWith('.log')) {
      // LevelDB physical log records have seven-byte headers and 32 KiB blocks.
      // Reassemble this dedicated capture profile's record fragments only.
      const chunks = [];
      for (let offset = 0; offset + 7 <= bytes.length;) {
        const remaining = 32768 - (offset % 32768);
        if (remaining < 7) {
          offset += remaining;
          continue;
        }
        const length = bytes.readUInt16LE(offset + 4);
        if (!length) {
          offset += remaining;
          continue;
        }
        if (length + 7 > remaining || offset + 7 + length > bytes.length) break;
        chunks.push(bytes.subarray(offset + 7, offset + 7 + length));
        offset += 7 + length;
      }
      bytes = Buffer.concat(chunks);
    }
    const start = bytes.indexOf('{"video":"data:video/');
    if (start < 0) continue;
    const text = bytes.subarray(start).toString();
    let depth = 0,
      quoted = false,
      escaped = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (quoted && c === '\\') {
        escaped = true;
        continue;
      }
      if (c === '"') quoted = !quoted;
      if (!quoted) {
        if (c === '{') depth++;
        if (c === '}' && --depth === 0) {
          capture = JSON.parse(text.slice(0, i + 1));
          break;
        }
      }
    }
  }
} else {
  const storage = JSON.parse(await readFile(input, 'utf8'));
  const entry = storage.origins
    .flatMap((origin) => origin.localStorage)
    .find((item) => item.name === 'keepy-study-capture');
  if (entry) capture = JSON.parse(entry.value);
}
if (!capture)
  throw new Error(
    'No recording found. Use a dedicated --user-data-dir for file:// capture, or download from the page. Compressed storage is not supported by this helper.',
  );
const match = /^data:(video\/[^;]+)(?:;[^,]*)?;base64,(.*)$/.exec(capture.video);
if (!match) throw new Error('Invalid captured video.');
const directory = 'docs/recordings';
await mkdir(directory, { recursive: true });
const stem = `ronaldinho-${capture.camera}-${capture.speed === 1 ? 'normal' : 'quarter'}`;
const extension = match[1].includes('mp4') ? 'mp4' : 'webm';
const videoPath = path.join(directory, `${stem}.${extension}`);
await writeFile(videoPath, Buffer.from(match[2], 'base64'));
delete capture.video;
await writeFile(path.join(directory, `${stem}.json`), JSON.stringify(capture, null, 2) + '\n');
console.log(
  `Saved ${videoPath}; ${capture.duration.toFixed(2)}s simulation; ${capture.contacts.length} contacts; maximum measured marker gap ${(capture.maxContactError * 100).toFixed(2)}cm.`,
);
