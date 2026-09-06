/* 목양교회 앱 서비스워커 — 웹 푸시(기도 알림) 처리 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 서버(send-reminders 함수)가 보낸 푸시를 받아 알림을 띄웁니다.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = {};
  }
  const title = data.title || '기도할 시간이에요 🙏';
  const options = {
    body: data.body || '오늘도 기도로 하나님과 만나요.',
    icon: data.icon || './app-icon.png',
    badge: './app-icon.png',
    tag: 'prayer-reminder',
    renotify: true,
    data: { url: data.url || './' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림을 누르면 앱을 엽니다(이미 열려 있으면 그 창으로).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});
