const CACHE_NAME = 'duopos-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

// Installation phase
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Pre-cache warning: some initial assets could not be cached, normal offline fallback is loaded.', err);
      });
    })
  );
  self.skipWaiting();
});

// Cache activation & old version cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cache) => cache !== CACHE_NAME).map((oldCache) => caches.delete(oldCache))
      );
    })
  );
  self.clients.claim();
});

// Intelligent intercept strategy: Network-First with Cache Fallback
self.addEventListener('fetch', (event) => {
  // Only handle standard HTTP/HTTPS requests (avoid chrome-extension:// etc)
  if (!event.request.url.startsWith('http')) return;

  // Evitar interceptar o cachear peticiones de la API de Supabase para prevenir bloqueos
  if (event.request.url.includes('supabase.co')) {
    return; // Pasa directo a la red sin pasar por el caché del Service Worker
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response from original server, keep a copy in cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If offline, retrieve matching asset from secure cache instead
        return caches.match(event.request);
      })
  );
});
