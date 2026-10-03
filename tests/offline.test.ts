import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function worker(failAt = '') {
  const manifest = {
    version: 'test-v1',
    files: [
      'index.html',
      'assets/app.js',
      'art/ronaldinho.webp',
      'art/court.webp',
      'art/messi.webp',
      'guide/timing.webp',
      'trailer/landscape.mp4',
      'trailer/portrait.mp4',
      'trailer/poster-portrait.jpg',
    ],
  };
  const scope = 'https://example.test/expert-pundit-keepyuppy/';
  const stored = new Map<string, unknown>(),
    listeners = new Map<string, (e: any) => void>(),
    messages: any[] = [];
  let skip = 0,
    claimed = 0;
  let fail = failAt;
  const cache = {
    match: async (key: any) => stored.get(typeof key === 'string' ? key : key.url),
    put: async (key: string, response: any) => {
      stored.set(key, response);
    },
  };
  const self = {
    registration: { scope },
    addEventListener: (name: string, fn: (e: any) => void) => listeners.set(name, fn),
    clients: {
      claim: async () => {
        claimed++;
      },
      matchAll: async () => [{ postMessage: (data: any) => messages.push(data) }],
    },
    skipWaiting: async () => {
      skip++;
    },
  };
  const ctx = vm.createContext({
    self,
    caches: { open: async () => cache },
    URL,
    fetch: async (url: any) => {
      if (String(url).includes(fail) && fail) throw new Error('Disconnected');
      return { ok: true, url };
    },
    console,
  });
  const source = readFileSync('scripts/sw-template.js', 'utf8').replace(
    '__MANIFEST__;',
    JSON.stringify(manifest) + ';',
  );
  vm.runInContext(source, ctx);
  const event = async (name: string, data: any = {}) => {
    let pending = Promise.resolve();
    let response: unknown;
    listeners.get(name)!({
      ...data,
      waitUntil: (p: Promise<void>) => (pending = p),
      respondWith: (p: Promise<unknown>) => {
        pending = p.then((x) => {
          response = x;
        });
      },
    });
    await pending;
    return response;
  };
  return {
    event,
    stored,
    messages,
    scope,
    manifest,
    setFailure: (s: string) => {
      fail = s;
    },
    get skipped() {
      return skip;
    },
    get claimed() {
      return claimed;
    },
  };
}
describe('offline delivery', () => {
  it('installs starter assets under the project subpath without force-activating updates', async () => {
    const w = worker();
    await w.event('install');
    expect(w.stored.has(w.scope + 'index.html')).toBe(true);
    expect(w.stored.has(w.scope + 'art/ronaldinho.webp')).toBe(true);
    expect(w.stored.has(w.scope + 'art/messi.webp')).toBe(false);
    expect(w.stored.has(w.scope + 'trailer/landscape.mp4')).toBe(false);
    expect(w.stored.has(w.scope + 'trailer/portrait.mp4')).toBe(false);
    expect(w.stored.has(w.scope + 'trailer/poster-portrait.jpg')).toBe(true);
    expect(w.skipped).toBe(0);
    await w.event('activate');
    expect(w.claimed).toBe(1);
  });
  it('only announces ready after the whole manifest is cached', async () => {
    const w = worker();
    await w.event('install');
    await w.event('message', { data: { type: 'DOWNLOAD' } });
    expect(w.stored.size).toBe(w.manifest.files.length);
    expect(w.messages.at(-1).type).toBe('READY');
    expect(w.messages.filter((m) => m.type === 'PROGRESS')).toHaveLength(w.manifest.files.length);
  });
  it('retains partial downloads and resumes after a disconnection', async () => {
    const w = worker('messi');
    await w.event('install');
    await w.event('message', { data: { type: 'DOWNLOAD' } });
    expect(w.messages.at(-1).type).toBe('ERROR');
    expect(w.messages.some((m) => m.type === 'READY')).toBe(false);
    w.setFailure('');
    await w.event('message', { data: { type: 'DOWNLOAD' } });
    expect(w.messages.at(-1).type).toBe('READY');
  });
  it('serves cached navigation and selected assets without the network', async () => {
    const w = worker();
    await w.event('install');
    w.setFailure('https:');
    const response = await w.event('fetch', {
      request: { url: w.scope, mode: 'navigate', method: 'GET' },
    });
    expect(response).toEqual({ ok: true, url: w.scope + 'index.html' });
    const art = await w.event('fetch', {
      request: { url: w.scope + 'art/court.webp', mode: 'cors', method: 'GET' },
    });
    expect(art).toEqual({ ok: true, url: w.scope + 'art/court.webp' });
  });
  it('activates a waiting update only upon an explicit menu message', async () => {
    const w = worker();
    await w.event('install');
    expect(w.skipped).toBe(0);
    await w.event('message', { data: { type: 'ACTIVATE' } });
    expect(w.skipped).toBe(1);
  });
});
