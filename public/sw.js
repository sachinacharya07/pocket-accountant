// v2: network-first for the HTML shell so a new deploy is never served with
// stale references to old hashed JS/CSS filenames (which caused 404s after
// each redeploy). Hashed static assets are still cached for offline use,
// since their filename changes whenever their content changes.
const CACHE = "pocket-accountant-v2";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // Navigations (loading the page itself) — always go to the network first
  // so we get the current build's HTML. Only fall back to cache if offline.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  // Everything else (hashed JS/CSS/images) — cache-first, since the filename
  // itself changes whenever the content does, so a cached copy is never stale.
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
    )
  );
});
