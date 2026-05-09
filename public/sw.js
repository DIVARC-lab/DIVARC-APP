// =====================================================
// DIVARC — Service Worker
// =====================================================
// Stratégie :
//  - GET HTML : network-first, fallback cache
//  - GET assets statiques : cache-first
//  - API / Supabase : pas de cache (toujours frais)
//  - Push : prêt à recevoir des notifications quand le backend
//    enverra des web-push events (VAPID config future).

const CACHE_NAME = "divarc-v6";
const OFFLINE_URL = "/offline";

const ASSETS_TO_CACHE = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

function shouldBypass(request) {
  if (request.method !== "GET") return true;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/_next/data/")) return true;
  if (url.hostname.endsWith("supabase.co")) return true;
  if (url.hostname.endsWith("supabase.in")) return true;
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (shouldBypass(request)) return;

  const url = new URL(request.url);
  const isHTML =
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html");

  if (isHTML) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone).catch(() => undefined);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last-resort fallback for navigations: serve the offline shell
    // so the user gets a branded screen instead of the browser's
    // generic « impossible d'atteindre ce site ».
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone).catch(() => undefined);
    }
    return response;
  } catch (err) {
    return cached ?? Promise.reject(err);
  }
}

// ---- Push notifications (VAPID) ----------------------------------------
// Payload shape envoyé par lib/push/sender.ts :
//   { title, body, url, tag?, icon?, badge? }
// Le SW affiche la notif et ouvre / focus le tab existant au clic.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = { title: "DIVARC", body: "", url: "/" };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "DIVARC", {
      body: payload.body ?? "",
      icon: payload.icon ?? "/icon-192.png",
      badge: payload.badge ?? "/icon-192.png",
      tag: payload.tag ?? "divarc",
      // `data.url` consommé par notificationclick handler ci-dessous.
      data: { url: payload.url ?? "/" },
      requireInteraction: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/notifications";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Cherche un tab DIVARC déjà ouvert et focus + navigate vers l'URL
        // cible. Sinon ouvre un nouveau tab.
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
