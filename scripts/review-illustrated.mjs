import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
const images = {};
for (const file of await readdir('public/art')) {
  if (!file.endsWith('.webp')) continue;
  images[file.slice(0, -5)] =
    'data:image/webp;base64,' + (await readFile(`public/art/${file}`)).toString('base64');
}
const bundle = await build({
  entryPoints: ['scripts/illustrated-review.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  define: { REVIEW_IMAGES: JSON.stringify(images) },
});
await mkdir('output/illustrated-review', { recursive: true });
await writeFile(
  'output/illustrated-review/review.html',
  `<!doctype html><meta charset="utf-8"><title>Illustrated movement review</title><style>body{margin:0;background:#121d21;display:grid;place-items:center}main{width:400px;height:680px}canvas{width:100%;height:100%}</style><main></main><script type="module">${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script>`,
);
console.log(
  'Open output/illustrated-review/review.html. Options: ?sheet, ?at=2.95, ?timing, ?speed=0.25, ?character=okocha&venue=court. Eight touches then a drop; no saves are read or written.',
);
