import { expect, it, vi } from 'vitest';

const files = vi.hoisted(() => new Map<string, string | Buffer>());
vi.mock('node:fs/promises', () => ({
  readFile: async (path: string, encoding?: string) => {
    if (!files.has(path)) throw new Error('Missing fixture: ' + path);
    const value = files.get(path)!;
    return encoding ? value.toString() : Buffer.from(value);
  },
  writeFile: async (path: string, value: string) => {
    files.set(path, value);
  },
  readdir: async (path: string) => {
    const entries = [...files.keys()].filter((key) => key.startsWith(path + '/'));
    if (!entries.length) throw new Error('Missing directory');
    return entries.map((key) => key.slice(path.length + 1));
  },
  stat: async (path: string) => {
    if (!files.has(path)) throw new Error('Missing fixture');
    return {};
  },
}));

it('portable exporter preserves executable replacement tokens and embeds models', async () => {
  // The real Three bundle contains replacement strings such as $&. Embedding the
  // program as a replacement string expanded them to HTML and broke startup.
  const program = 'const text = "$&"; const before = "$`";';
  files.set(
    'dist/index.html',
    '<head><link href="./assets/style.css" rel="stylesheet"></head><body><script type="module" src="./assets/game.js"></script></body>',
  );
  files.set('dist/./assets/style.css', 'body { color: gold; }');
  files.set('dist/./assets/game.js', program);
  files.set('dist/trailer/portrait.mp4', Buffer.from([4, 5, 6]));
  files.set('dist/trailer/landscape.mp4', Buffer.from([7, 8, 9]));
  files.set('dist/models/player.glb', Buffer.from([1, 2, 3]));
  files.set('dist/models/contacts.json', '{"version":1}');
  // @ts-expect-error The production exporter is a plain Node ESM build script.
  await import('../scripts/export-portable.mjs');
  const html = files.get('KeepyUppy.html')!.toString();
  expect(html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]).toBe(program);
  expect(html).toContain('data:model/gltf-binary;base64,AQID');
  expect(html).toContain('models/contacts.json');
  expect(html).not.toContain('window.__KEEPY_FOCUS__=true');
  expect(html).not.toContain('video/mp4');
  expect(files.get('KeepyUppy-Focus.html')!.toString()).toContain('data:video/mp4;base64,BAUG');
  expect(files.get('KeepyUppy-Focus.html')!.toString()).toContain('window.__KEEPY_FOCUS__=true');
});
