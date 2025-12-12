/* eslint-disable no-restricted-globals */

// Cache version - her deployment'ta bu versiyonu artırın
const CACHE_NAME = 'erp-app-v2';

// Install - basit cache stratejisi
self.addEventListener('install', (event) => {
  console.log('Service Worker yükleniyor... Version:', CACHE_NAME);
  // Hemen yeni service worker'ı aktif et
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('Service Worker aktif! Version:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Eski cache'leri temizle
          if (cacheName !== CACHE_NAME) {
            console.log('Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tüm client'ları hemen kontrol et
  return self.clients.claim();
});

// Fetch - network-first stratejisi (HTML için cache bypass)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // HTML dosyaları için cache'i bypass et - her zaman network'ten al
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'document' ||
      url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Diğer kaynaklar için network-first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı response'u cache'e kaydet
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network hatası olursa cache'den dön
        return caches.match(event.request);
      })
  );
});
