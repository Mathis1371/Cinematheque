/* Cinémathèque — service worker
   - fichiers du site et movies.json : réseau d'abord (toujours à jour), copie de secours hors ligne
   - affiches TMDB : gardées en cache pour un affichage instantané et hors ligne */
const SHELL = 'cine-shell-v1', IMG = 'cine-img-v1', FONT = 'cine-font-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'assets/style.css', 'assets/references.js', 'assets/app.js', 'assets/bingo.js',
  'assets/wishlist.js', 'assets/stats.js', 'data/movies.json', 'assets/icons/icon-192.png'];
const MAX_IMG = 900;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => { })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => ![SHELL, IMG, FONT].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req) {
  const c = await caches.open(SHELL);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch (e) {
    return (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
  }
}
let trimTimer = null;
async function trim() {
  const c = await caches.open(IMG), ks = await c.keys();
  for (let i = 0; i < ks.length - MAX_IMG; i++) await c.delete(ks[i]);
}
async function image(req) {
  const c = await caches.open(IMG);
  const hit = await c.match(req.url);
  if (hit) return hit;
  try {
    // requête CORS : réponse lisible, donc mise en cache sans gonfler le quota
    const res = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
    if (res.ok) { c.put(req.url, res.clone()); clearTimeout(trimTimer); trimTimer = setTimeout(trim, 5000); }
    return res;
  } catch (e) {
    return fetch(req); // le serveur n'accepte pas le CORS : chargement normal, sans cache
  }
}
async function staleWhileRevalidate(req) {
  const c = await caches.open(FONT), hit = await c.match(req);
  const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) { e.respondWith(networkFirst(req)); return; }
  if (/(^|\.)(themoviedb\.org|tmdb\.org)$/.test(u.hostname) && req.destination === 'image') { e.respondWith(image(req)); return; }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) { e.respondWith(staleWhileRevalidate(req)); return; }
});
