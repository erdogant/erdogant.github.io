const CACHE_NAME = "skywalk-v0.2";

const FILES_TO_CACHE = [
  "./main.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  // "./libs/core.css",
  // "./libs/core.js",

  // SCRIPTS
  "./scripts/weightbalance.js",
  "./scripts/fuel.js",
  "./scripts/utils.js",
  "./scripts/maps.js",

  // WEATHER SCRIPTS
  "./scripts/metar.js",
  "./scripts/rain.js",
  "./scripts/cloud.js",
  "./scripts/fog.js",
  "./scripts/sun.js",
  "./scripts/snow.js",
  "./scripts/dark.js",
  // "./scripts/controls.js",
  // "./scripts/textoverlay.js",

  // FIGS
  "./libs/leaflet.css",
  "./libs/leaflet.js",
  "./libs/plotly-2.35.2.min.js",
  "./figs/buy_me_a_coffee.png",
  "./figs/default_aerodrome.jpg",
  "./figs/logo_skywalk.png",
  "./figs/logo_skywalk_dark.png",

  // ICONS
  "./icons/airplane_gray.png",

  // CATAGORY FIGS
  "./icons/sun_VFR.png",
  "./icons/clouds_VFR.png",
  "./icons/clouds_sun_VFR.png",
  "./icons/clouds_rain_VFR.png",
  "./icons/moon_VFR.png",
  "./icons/clouds_moon_VFR.png",
  "./icons/clouds_rain_MVFR.png",
  "./icons/clouds_MVFR.png",
  "./icons/clouds_IFR.png",
  "./icons/clouds_rain_IFR.png",
  "./icons/clouds_LIFR.png",
  "./icons/clouds_rain_LIFR.png",
  "./icons/clouds_unknown.png",
  "./icons/flag_unknown.svg",

  // FIGS AIRCRAFT
  "./icons/aircraft_front.png",
  "./icons/aircraft_back.png",
  "./icons/aircraft_front_black.png",
  "./icons/aircraft_back_black.png",
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

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

self.addEventListener("message", (event) => {
  if (event.data?.action === "update") {
    self.registration.update();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
});
