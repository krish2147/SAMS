// SAMS service worker: makes the site installable and quick to open, without ever serving an
// old version when the internet is available.
//  - Pages: always fetched fresh from the server; the last copy is only used when offline.
//  - /assets/*: file names change on every release, so a cached copy is always the right one.
//  - /api/*: never cached (live data, logins, payments).
const PAGE_CACHE = "sams-pages-v1";
const ASSET_CACHE = "sams-assets-v1";
const MAX_ASSETS = 80;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = [PAGE_CACHE, ASSET_CACHE];
    for (const key of await caches.keys()) {
      if (!keep.includes(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        if (fresh.ok) {
          const cache = await caches.open(PAGE_CACHE);
          await cache.put("/", fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match("/");
        return cached || new Response("You are offline. Connect to the internet and try again.", {
          status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) {
        const cache = await caches.open(ASSET_CACHE);
        await cache.put(req, res.clone());
        trim(cache, MAX_ASSETS);
      }
      return res;
    })());
  }
});
