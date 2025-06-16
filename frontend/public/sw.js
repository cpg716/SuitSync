importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const CACHE_NAME = 'suitsync-cache-v2';
const OFFLINE_URL = '/offline.html';

// Precache offline page
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Workbox routing
if (workbox) {
  // Static assets: stale-while-revalidate
  workbox.routing.registerRoute(
    ({request}) => [
      'script', 'style', 'image', 'font'
    ].includes(request.destination),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'suitsync-static-v1',
    })
  );

  // API: network-first
  workbox.routing.registerRoute(
    ({url}) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'suitsync-api-v1',
      networkTimeoutSeconds: 5,
    })
  );

  // Navigation: network-first with offline fallback
  workbox.routing.registerRoute(
    ({request}) => request.mode === 'navigate',
    async ({event}) => {
      try {
        return await workbox.strategies.networkFirst({
          cacheName: 'suitsync-pages-v1',
        }).handle({event});
      } catch (err) {
        return caches.match(OFFLINE_URL);
      }
    }
  );
}

// Push notification event
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data.json(); } catch {}
  const title = data.title || 'SuitSync Notification';
  const options = {
    body: data.body || '',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    data: data.url ? { url: data.url } : {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
}); 