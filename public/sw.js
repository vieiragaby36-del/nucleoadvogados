const CACHE_NAME = "nucleo-public-v5";
const PUBLIC_FILES = [
  "/", "/home.html", "/index.html", "/styles.css", "/theme-controls.css", "/light.css", "/site.js", "/translations.js", "/search-index.json", "/manifest.webmanifest",
  "/nucleo-logo.png", "/nucleo-logo-white.png", "/nucleo-icon.png", "/nucleo-icon-white.png", "/nucleo-icon-192.png", "/favicon.png", "/mauro-em-atividade.webp", "/sala-nucleo.webp", "/equipe-nucleo.webp",
  "/escritorio.html", "/setores.html", "/equipe/mauro-cesar-ramos-de-almeida.html", "/inteligencia.html", "/ferramentas.html", "/busca.html",
  "/atuacao/empresarial-e-societario.html", "/atuacao/tributario-e-administrativo.html", "/atuacao/contencioso-estrategico.html", "/atuacao/familia-e-patrimonio.html", "/atuacao/compliance-e-lgpd.html", "/atuacao/internacional-e-arbitragem.html",
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
