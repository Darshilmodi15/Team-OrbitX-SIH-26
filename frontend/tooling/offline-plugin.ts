import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Plugin } from "vite";

/** Cache only the public, self-contained reader. Never cache API or auth responses. */
export function offlineTripReader(): Plugin {
  return {
    name: "orca-offline-trip-reader",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/offline-trip-reader.html") return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(readFileSync(new URL("../src/lib/orca/offline/reader.html", import.meta.url), "utf8").replace("__ORCA_ENCRYPTED_PAYLOAD__", "{}"));
      });
    },
    generateBundle() {
      const reader = readFileSync(new URL("../src/lib/orca/offline/reader.html", import.meta.url), "utf8")
        .replace("__ORCA_ENCRYPTED_PAYLOAD__", "{}");
      const version = createHash("sha256").update(reader).digest("hex").slice(0, 16);
      this.emitFile({ type: "asset", fileName: "offline-trip-reader.html", source: reader });
      this.emitFile({ type: "asset", fileName: "trip-worker.js", source: `
const CACHE = 'orca-offline-reader-${version}';
const READER = '/offline-trip-reader.html';
const ROUTES = new Set(['/', '/dashboard', '/map', '/location', '/assistant', '/alerts', '/services', '/settings', '/login', '/auth', READER]);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(READER, {cache:'reload'}))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('orca-offline-reader-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin || !ROUTES.has(url.pathname)) return;
  event.respondWith((async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try { return await fetch(request, {signal:controller.signal}); }
    catch {
      return await caches.match(READER, {cacheName:CACHE}) || new Response('Offline reader unavailable. Open your downloaded trip HTML file directly in a browser.', {status:503,headers:{'Content-Type':'text/plain'}});
    } finally { clearTimeout(timer); }
  })());
});
` });
    },
  };
}
