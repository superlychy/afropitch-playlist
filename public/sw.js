/* AfroPitch service worker. Minimal and safe: cache-first for same-origin
   static assets, network-first for pages, network-only for API routes. */
const CACHE = "afropitch-v1";

const STATIC_PREFIXES = [
  "/_next/static/",
  "/icons",
  "/logo",
  "/mixed-fallback-cover.png",
  "/mixed-tag.mp3",
  "/preview-tag.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API routes: always network-only.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (isStaticAsset(url)) {
    // Cache-first for static assets.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })()
    );
    return;
  }

  // Network-first for navigations and pages.
  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw err;
      }
    })()
  );
});
