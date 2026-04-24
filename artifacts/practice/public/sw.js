/* IGCSE Add Maths Crash Practice — offline service worker.
 * Strategy:
 *   - On install: pre-cache the app shell (index.html + favicon).
 *   - On fetch (same-origin GET): network-first for navigations (so fresh
 *     deploys are picked up when online), cache-first for everything else
 *     (JS / CSS / fonts / images), with the response cached on success.
 *   - Cross-origin GETs (Google Fonts, KaTeX assets if any) are also
 *     stale-while-revalidate cached so the app keeps working offline after
 *     the first load.
 *   - On activate: sweep old cache versions.
 */
const CACHE = "igcse-addmaths-v1";
const SHELL = ["./", "./index.html", "./favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // For top-level navigations: try network first, fall back to cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (cached) => cached || caches.match("./index.html") || caches.match("./"),
          ),
        ),
    );
    return;
  }

  // Asset GETs: cache-first with background refresh.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    }),
  );
});
