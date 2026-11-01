/* 오늘의 5문제 - 오프라인 지원
   우리 파일(index.html, units.js 등)은 인터넷이 되면 항상 새로 받아오고,
   인터넷이 끊기면 마지막으로 받아 둔 것을 씁니다. 그래서 units.js를 바꾸면 자동으로 반영됩니다. */
const CACHE = 'math5-v1';
const SHELL = ['./', './index.html', './units.js', './firebase-config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firestore 통신은 건드리지 않음
  if (url.hostname.includes('googleapis.com') && !url.hostname.startsWith('fonts')) return;
  const sameOrigin = url.origin === self.location.origin;
  const staticLib = url.hostname === 'www.gstatic.com' || url.hostname.startsWith('fonts.');
  if (sameOrigin) {
    // 네트워크 먼저, 실패하면 저장본
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
  } else if (staticLib) {
    // 버전이 고정된 라이브러리와 글꼴은 저장본 먼저
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
