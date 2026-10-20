/* صيدليتي Service Worker — installability + offline shell + push-ready.
 *
 * HARD RULES
 *  1) /api/* is NEVER cached and NEVER served from cache. Money and stock must
 *     never come from a stale copy.
 *  2) Offline WRITES are NOT queued. Writes require connectivity + an
 *     idempotency key; POS checkout is blocked while offline.
 *  3) Authenticated HTML is NEVER written to the cache. Only public routes are
 *     cacheable, so a shared pharmacy device cannot show the previous user's
 *     pages after logout / session expiry.
 */
const VERSION = "v1.1.0";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

/** مسارات عامة فقط: لا بيانات مستخدم ولا جلسة. أي مسار آخر لا يُخزَّن إطلاقًا. */
const PUBLIC_NAV = [/^\/offline\/?$/, /^\/login\/?$/, /^\/setup\/?$/, /^\/shop\/login\/?$/];

function isPublicNavigation(pathname) {
  return PUBLIC_NAV.some((re) => re.test(pathname));
}

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

/** الخروج/انتهاء الجلسة يمسح كل الكاش (HTML محفوظ قد يحمل بيانات مستخدم سابق). */
async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
}

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "CLEAR_CACHES") event.waitUntil(clearAllCaches());
  if (type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // writes pass through untouched (idempotency lives in the app)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // third-party: leave the browser alone

  // 1) API: network-only. No caching, no fallback — the app layer owns offline behavior.
  if (url.pathname.startsWith("/api/")) return;

  // 2) Navigations: network-only with an offline fallback.
  //    Public pages only are stored; authenticated pages are never cached.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && isPublicNavigation(url.pathname)) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(async () => {
          if (isPublicNavigation(url.pathname)) {
            const hit = await caches.match(request);
            if (hit) return hit;
          }
          return (await caches.match(OFFLINE_URL)) ?? Response.error();
        }),
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
            // لا نخزّن استجابة خطأ أو إعادة توجيه
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
            }
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
  // لا تفتح روابط خارجية من حمولة غير موثوقة
  if (typeof data.url !== "string" || !data.url.startsWith("/")) data.url = "/alerts";
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
