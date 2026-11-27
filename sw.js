/* 동선 짜기 오프라인 저장용 서비스 워커
   프로그램을 고칠 때마다 아래 VERSION 숫자를 하나 올려 주세요. */
const VERSION = 'dongseon-v4';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 서버 저장(Firebase)과 유튜브는 오프라인 저장하지 않아요
  if (/firebaseio\.com|firebasedatabase\.app|youtube\.com|ytimg\.com|googlevideo\.com|google\.com/.test(url.hostname)) return;
  if (req.headers.get('accept') === 'text/event-stream') return;

  // 프로그램 화면: 인터넷이 되면 최신 버전, 안 되면 저장해 둔 버전
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(req, { signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) { const c = await caches.open(VERSION); c.put('./index.html', res.clone()); }
        return res;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // 아이콘·글꼴 등: 저장해 둔 것을 먼저 쓰고, 뒤에서 새로 받아 두기
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) caches.open(VERSION).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => null);
    return cached || (await net) || Response.error();
  })());
});
