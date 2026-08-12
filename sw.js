// 나트랑 일정 PWA 서비스워커
// 캐시 버전을 올리면 이전 캐시가 정리되고 새 파일이 반영됩니다.
const CACHE = 'nhatrang-2026-v3';

// 앱 셸: 오프라인에서도 일정/체크리스트가 열리도록 캐싱.
// (지도 타일·구글폰트 등 외부 CDN은 온라인에서만 표시됨)
const SHELL = [
  './',
  './index.html',
  './prep.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // HTML(페이지 이동)은 "네트워크 우선" — 최신 index/prep가 바로 반영됨.
  // 오프라인일 때만 캐시본 사용.
  const isHTML = req.mode === 'navigate' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/');

  if (sameOrigin && isHTML) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  if (sameOrigin) {
    // 정적 자원(아이콘·매니페스트): 캐시 우선
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
  } else {
    // 외부(지도 타일·폰트): 네트워크 우선, 실패 시 캐시
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
