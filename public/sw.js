// Service Worker for DevPet PWA
const CACHE_NAME = "devpet-v2";
const ICON = "/web-app-manifest-192x192.png";
const STATIC_ASSETS = [ICON, "/web-app-manifest-512x512.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("devpet-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin ||
      !STATIC_ASSETS.includes(url.pathname)) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) =>
      (await cache.match(event.request)) || fetch(event.request),
    ),
  );
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || "Your companion misses you!",
    icon: ICON,
    badge: ICON,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "DevPet", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || "/dashboard"),
  );
});
