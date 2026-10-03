/* global __MANIFEST__ */
/* Generated with an immutable content manifest. All URLs are relative to this scope. */
const MANIFEST = __MANIFEST__;
const CACHE = 'keepy-' + new URL(self.registration.scope).pathname + '-' + MANIFEST.version;
const url = (path) => new URL(path, self.registration.scope).href;
const core = MANIFEST.files.filter(
  (path) =>
    (!path.startsWith('art/') && !path.startsWith('guide/') && !path.endsWith('.mp4')) ||
    ['art/logo.png', 'art/ronaldinho.webp', 'art/court.webp'].includes(path),
);
let downloading;
self.addEventListener('install', (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const path of core) {
        const response = await fetch(url(path), { cache: 'reload' });
        if (!response.ok) throw new Error('Core download failed');
        await cache.put(url(path), response);
      }
    })(),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      await self.clients.claim(); /* Keep prior caches for older tabs until the next launch. */
    })(),
  ),
);
async function broadcast(message) {
  for (const client of await self.clients.matchAll({ includeUncontrolled: true }))
    client.postMessage(message);
}
async function download() {
  const cache = await caches.open(CACHE);
  let done = 0;
  try {
    for (const path of MANIFEST.files) {
      if (!(await cache.match(url(path)))) {
        const response = await fetch(url(path), { cache: 'reload' });
        if (!response.ok) throw new Error('Content unavailable');
        await cache.put(url(path), response);
      }
      done++;
      await broadcast({ type: 'PROGRESS', done, total: MANIFEST.files.length });
    }
    const verified = await Promise.all(MANIFEST.files.map((path) => cache.match(url(path))));
    if (verified.every(Boolean)) await broadcast({ type: 'READY', version: MANIFEST.version });
    else throw new Error('Incomplete cache');
  } catch {
    await broadcast({ type: 'ERROR', done, total: MANIFEST.files.length });
  }
}
self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'DOWNLOAD') {
    downloading ??= download().finally(() => {
      downloading = undefined;
    });
    event.waitUntil(downloading);
  }
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  const path = new URL(request.url).pathname.slice(
    new URL(self.registration.scope).pathname.length,
  );
  if (path === 'sw.js' || path === 'asset-manifest.json') return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const key = request.mode === 'navigate' ? url('index.html') : request.url;
      const hit = await cache.match(key);
      if (hit) return hit;
      return fetch(request);
    })(),
  );
});
