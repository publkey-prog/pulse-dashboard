const cacheName = 'pulse-preview-ai-projects-4';
const assets = ['./','./index.html','./manifest.json','./schedule.js','./schedule.css','./ai-auth.js','./project-ai.js','./rates.js','./scenes.js'];
const allowed = new Set(assets.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(cacheName);
  await cache.addAll(assets.map(path => new Request(path,{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).filter(name => name.startsWith('pulse-preview-') && name !== cacheName).map(name => caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  url.search = '';
  if (event.request.method !== 'GET' || !allowed.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(url.href,response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(url.href);
      if (cached) return cached;
      throw error;
    }
  })());
});
