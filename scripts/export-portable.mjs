import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const mime = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.js': 'text/javascript',
  '.glb': 'model/gltf-binary',
  '.json': 'application/json',
};
async function data(file) {
  return (
    'data:' +
    (mime[path.extname(file)] ?? 'application/octet-stream') +
    ';base64,' +
    (await readFile(file)).toString('base64')
  );
}
let html = await readFile('dist/index.html', 'utf8');
const assets = {};
for (const directory of ['art', 'fonts', 'guide', 'vendor', 'models']) {
  let names;
  try {
    names = await readdir('dist/' + directory);
  } catch {
    continue;
  }
  for (const name of names) {
    if (mime[path.extname(name)])
      assets[directory + '/' + name] = await data('dist/' + directory + '/' + name);
  }
}
const cssPath = html.match(/<link[^>]+href="(\.\/assets\/[^"]+\.css)"[^>]*>/)[1];
let css = await readFile('dist/' + cssPath, 'utf8');
for (const match of [...css.matchAll(/url\(([^)]+)\)/g)]) {
  const source = match[1].replace(/["']/g, '');
  const file = path.join('dist/assets', source);
  try {
    await stat(file);
    css = css.replaceAll(match[0], `url("${await data(file)}")`);
  } catch {
    /* No remote resources in the portable edition. */
  }
}
const jsPath = html.match(/<script[^>]+src="(\.\/assets\/[^"]+\.js)"[^>]*><\/script>/)[1];
const js = await readFile('dist/' + jsPath, 'utf8');
html = html
  .replace(/<link[^>]+rel="manifest"[^>]*>/, '')
  .replace(/<link[^>]+rel="icon"[^>]*>/, '')
  .replace(/<link[^>]+href="\.\/assets\/[^"]+\.css"[^>]*>/, () => `<style>${css}</style>`)
  .replace(/<script[^>]+src="\.\/assets\/[^"]+\.js"[^>]*><\/script>/, '');
html = html.replace(
  '</body>',
  () =>
    `<script>window.__KEEPY_PORTABLE__=true;window.__KEEPY_ASSETS__=${JSON.stringify(assets).replace(/</g, '\\u003c')};</script><script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script></body>`,
);
await writeFile('KeepyUppy.html', html);
const trailerAssets = {};
try {
  for (const name of await readdir('dist/trailer'))
    if (mime[path.extname(name)])
      trailerAssets['trailer/' + name] = await data('dist/trailer/' + name);
} catch {
  /* Trailer assets may be absent in test fixtures. */
}
await writeFile(
  'KeepyUppy-Focus.html',
  html
    .replace(
      'window.__KEEPY_PORTABLE__=true;',
      'window.__KEEPY_PORTABLE__=true;window.__KEEPY_FOCUS__=true;',
    )
    .replace(
      '</body>',
      () =>
        `<script>Object.assign(window.__KEEPY_ASSETS__,${JSON.stringify(trailerAssets)});</script></body>`,
    ),
);
console.log(
  `Portable game: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB · all artwork embedded`,
);
