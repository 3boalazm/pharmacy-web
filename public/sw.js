/* صيدليتي Service Worker — installability + shell offline + push-ready.
 *
 * HARD RULE (mirrors ADR-004/005): /api/* is NEVER cached and NEVER served
 * from cache. Money and stock must not come from a stale copy. Offline WRITES
 * are handled at the app layer (command queue + uuidv7 idempotency keys →
 * POST /sales/sync, server-authoritative). The SW only makes the SHELL work:
 * the app opens, navigates, and queues — even with zero connectivity.
 */
const VERSION = "v1.0.0";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => ![SHELL_CACHE, STATIC_CACHE].includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // writes pass through untouched (idempotency lives in the app)

  const url = new URL(request.url);

  // 1) API: network-only. No caching, no fallback — the app layer owns offline behavior.
  if (url.pathname.startsWith("/api/")) return;

  // 2) Navigations: network-first, offline fallback page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(OFFLINE_URL))),
    );
    return;
  }

  // 3) Build assets, icons, fonts: cache-first (immutable by content hash).
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    request.destination === "font";
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
            return res;
          }),
      ),
    );
  }
});

/* Push-ready (Plan: notifications land with a later backend phase).
 * Payload contract: { title, body, url } */
self.addEventListener("push", (event) => {
  let data = { title: "صيدليتي", body: "لديك تنبيه جديد", url: "/alerts" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* keep defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      dir: "rtl",
      lang: "ar",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
