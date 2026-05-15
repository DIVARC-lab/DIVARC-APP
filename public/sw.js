// =====================================================
// DIVARC — Service Worker
// =====================================================
// Stratégie :
//  - GET HTML : network-first, fallback cache
//  - GET assets statiques : cache-first
//  - API / Supabase : pas de cache (toujours frais)
//  - Push : prêt à recevoir des notifications quand le backend
//    enverra des web-push events (VAPID config future).

const CACHE_NAME = "divarc-v18";
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
  /* Bypass des fetchs RSC (React Server Components) — Next.js Link
     prefetch utilise des fetchs avec ?_rsc= qui retournent un stream
     RSC, pas du HTML cacheable. Les cacher cause des hydration
     mismatches (React error #418) car le client reçoit une réponse
     en cache stale au lieu du flux RSC frais. */
  if (url.searchParams.has("_rsc")) return true;
  /* Bypass aussi les RSC headers explicites. */
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch") === "1") return true;
  return false;
}

/* Match strict des assets statiques cacheables (immutables, hashed
 * filename → safe to cache-first long-term). */
function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  if (url.pathname.startsWith("/images/")) return true;
  if (url.pathname === "/manifest.webmanifest") return true;
  if (url.pathname === "/logo.svg") return true;
  /* Fichiers par extension. */
  if (/\.(woff2?|ttf|otf|eot)$/i.test(url.pathname)) return true;
  if (/\.(png|jpg|jpeg|webp|avif|gif|svg|ico)$/i.test(url.pathname)) return true;
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

  /* Cache-first uniquement pour les vrais assets statiques. Le reste
     (fetch dynamiques, RSC streams, etc.) passe en réseau direct sans
     interception SW pour éviter les mismatches d'hydratation. */
  if (isStaticAsset(url)) {
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

  /* Tag commence par "call-" → notif d'appel entrant. On amplifie :
     vibration pattern (mobile), requireInteraction (la notif reste
     tant que l'user n'a pas tap), boutons d'action Décrocher / Refuser
     (Android/Chrome desktop ; iOS Safari ignore les actions). */
  const isCall =
    typeof payload.tag === "string" && payload.tag.startsWith("call-");

  const options = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/icon-192.png",
    badge: payload.badge ?? "/icon-192.png",
    tag: payload.tag ?? "divarc",
    data: { url: payload.url ?? "/", isCall },
    requireInteraction: isCall,
    vibrate: isCall ? [300, 200, 300, 200, 300, 200, 300] : undefined,
    silent: false,
  };
  if (isCall) {
    options.actions = [
      { action: "accept", title: "✅ Décrocher" },
      { action: "reject", title: "❌ Refuser" },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "DIVARC", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  /* Pour les notifs d'appel : si l'user a tapé "Refuser", on append
     ?call_action=reject à l'URL ; "Décrocher" → ?call_action=accept.
     L'app détecte ces params au mount et auto-déclenche l'action sur
     la session d'appel courante. */
  let targetUrl = event.notification.data?.url ?? "/notifications";
  if (event.notification.data?.isCall && event.action) {
    const sep = targetUrl.includes("?") ? "&" : "?";
    targetUrl = `${targetUrl}${sep}call_action=${event.action}`;
  }
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
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
