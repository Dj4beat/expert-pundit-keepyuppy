import { mkdir, writeFile } from 'node:fs/promises';
const version = '3.90.0';
const response = await fetch(`https://cdn.jsdelivr.net/npm/phaser@${version}/dist/phaser.min.js`);
if (!response.ok) throw new Error(`Phaser download failed: ${response.status}`);
const source = await response.text();
if (!source.includes('Phaser') || source.length < 500000)
  throw new Error('Unexpected Phaser distribution');
await mkdir('public/vendor', { recursive: true });
await writeFile('public/vendor/phaser.min.js', source);
console.log(`Vendored Phaser ${version}. Rebuild for an entirely local, offline renderer.`);
