const CACHE_NAME = "nucleo-public-v2";
const PUBLIC_FILES = [
  "/", "/home.html", "/styles.css", "/theme-controls.css", "/light.css", "/translations.js", "/manifest.webmanifest",
  "/nucleo-logo.png", "/nucleo-logo-white.png", "/nucleo-icon.png", "/nucleo-icon-white.png", "/nucleo-icon-192.png", "/favicon.png", "/office-building.webp",
  "/politica-de-privacidade.html", "/termos-de-uso.html"
];
const PUBLIC_PATHS = new Set(PUBLIC_FILES);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("nucleo-public-") && key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !PUBLIC_PATHS.has(url.pathname)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(url.pathname)));
  } else {
    event.respondWith(caches.match(url.pathname).then((cached) => cached || fetch(event.request)));
  }
});
