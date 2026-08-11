/* KuryemiBul Service Worker — push notifications + PWA shell */
var CACHE = 'kb-sw-v1';

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(clients.claim());
});

/* Push mesajı geldiğinde bildirim göster */
self.addEventListener('push', function (e) {
  if (!e.data) return;
  var data;
  try { data = e.data.json(); } catch (_) { data = { title: 'KuryemiBul', body: e.data.text() }; }

  var title = data.title || 'KuryemiBul';
  var opts = {
    body: data.body || '',
    icon: '/assets/logo.png',
    badge: '/assets/logo.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'kb',
    renotify: true,
    data: { url: data.url || '/' }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

/* Bildirime tıklanınca ilgili sayfayı aç */
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (all) {
      for (var i = 0; i < all.length; i++) {
        if ('focus' in all[i]) { all[i].focus(); return all[i].navigate(url); }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* Sayfa açıkken in-app Realtime olayından tetiklenen yerel bildirim */
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    var d = e.data.payload || {};
    self.registration.showNotification(d.title || 'KuryemiBul', {
      body: d.body || '',
      icon: '/assets/logo.png',
      badge: '/assets/logo.png',
      tag: d.tag || 'kb-realtime',
      data: { url: d.url || '/' }
    });
  }
});
