import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function walk(dir, prefix = '') {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = prefix + e.name;
    if (e.isDirectory()) files.push(...(await walk(path.join(dir, e.name), p + '/')));
    else if (!['sw.js', 'asset-manifest.json'].includes(p)) files.push(p);
  }
  return files;
}
const files = (await walk('dist')).sort();
const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(await readFile('dist/' + file));
}
const manifest = { version: hash.digest('hex').slice(0, 16), files };
await writeFile('dist/asset-manifest.json', JSON.stringify(manifest, null, 2));
const template = await readFile('scripts/sw-template.js', 'utf8');
await writeFile('dist/sw.js', template.replace('__MANIFEST__', JSON.stringify(manifest)));
console.log(`Offline manifest: ${files.length} files · ${manifest.version}`);
