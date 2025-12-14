const CACHE_NAME = "skywalk-v1.1";

const FILES_TO_CACHE = [
  "./main.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  // "./libs/core.css",
  // "./libs/core.js",
  "./libs/leaflet.css",
  "./libs/leaflet.js",
  "./libs/plotly-2.35.2.min.js",
  "./figs/buy_me_a_coffee.png",
  "./figs/default_aerodrome.jpg",
  "./figs/logo_skywalk.png",
  "./figs/logo_skywalk_dark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
        } catch {
          console.warn("[SW] Failed to cache:", file);
        }
      }
    }),
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.action === "update") {
    self.registration.update();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
});
