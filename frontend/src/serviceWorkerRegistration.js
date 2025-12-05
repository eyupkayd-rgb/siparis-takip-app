// Service Worker kayıt fonksiyonu

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('✅ Service Worker kayıt edildi:', registration);
          
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('🔄 Yeni içerik mevcut, sayfa yenileniyor...');
                } else {
                  console.log('✅ İçerik offline kullanım için önbelleğe alındı.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.error('❌ Service Worker kayıt hatası:', error);
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
