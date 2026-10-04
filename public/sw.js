const CACHE_NAME = "nucleo-public-v28";
const PUBLIC_FILES = [
  "/", "/index.html", "/triagem.html", "/triagem.css", "/triagem-access.css", "/triagem.js", "/crm/config.js", "/styles-v15.css", "/theme-controls.css", "/light.css", "/site.js", "/translations.js", "/ai-assistente.js", "/ai-assistente.css", "/manifest.webmanifest",
  "/nucleo-logo.png", "/nucleo-logo-white.png", "/nucleo-logo-gold.png", "/nucleo-logo-gold-white-text.png", "/nucleo-logo-gold-dark-text.png", "/nucleo-icon.png", "/nucleo-icon-white.png", "/nucleo-icon-192.png", "/favicon.png", "/office-building.webp", "/mauro-em-atividade.webp", "/mauro-ai-avatar.png", "/sala-nucleo.webp",
  "/escritorio.html", "/setores.html",
  "/atuacao/empresarial-e-societario.html", "/atuacao/tributario-e-administrativo.html", "/atuacao/contencioso-estrategico.html", "/atuacao/familia-e-patrimonio.html", "/atuacao/compliance-e-lgpd.html", "/atuacao/internacional-e-arbitragem.html", "/atuacao/criminal.html",
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
