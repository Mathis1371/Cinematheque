/* ==========================================================
   Cinémathèque — application (JavaScript pur, aucune dépendance)
   ========================================================== */
'use strict';

/* ---------- Utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tkey = s => fold(s).replace(/[^a-z0-9]+/g, '');
const slug = s => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad = n => String(n).padStart(2, '0');
const nowD = new Date();
const TODAY = `${nowD.getFullYear()}-${pad(nowD.getMonth() + 1)}-${pad(nowD.getDate())}`;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
const uniq = a => [...new Set(a)];
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const plural = (n, w, p) => `${n} ${n > 1 ? (p || w + 's') : w}`;
const money = (v, d = 0) => (v || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: d, minimumFractionDigits: d });
const fmtRt = m => m ? `${Math.floor(m / 60)}h${pad(m % 60)}` : '';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const fmtDate = d => { if (!d) return ''; const [y, m, j] = d.split('-').map(Number); return `${j} ${MONTHS[m - 1]} ${y}`; };
const daysUntil = d => Math.round((new Date(d + 'T00:00:00') - new Date(TODAY + 'T00:00:00')) / 864e5);
function normDate(s) { const m = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : ''; }
function hashColor(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return `hsl(${Math.abs(h) % 360} 45% 38%)`; }
function lev(a, b) { if (Math.abs(a.length - b.length) > 1) return 2; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }

const ICON = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m15 18-6-6 6-6"/></svg>',
  r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 18 6-6-6-6"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  flip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
  sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
  ul: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21V9M7 14l5-5 5 5M4 3h16"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
};

/* ---------- État ---------- */
const LS = { col: 'cine.collection.v1', user: 'cine.user.v1', ui: 'cine.ui.v1' };
const readJSON = (k, d = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Stockage du navigateur indisponible'); return false; } };

const S = {
  raw: [], movies: [], byKey: new Map(),
  source: 'none', fileAvailable: false, unexported: false, savedAt: null,
  user: readJSON(LS.user, { seen: {}, ratings: {}, migrated: false }),
  ui: readJSON(LS.ui, {}),
  heroTimer: null,
};
S.ui.filters ??= {};
S.ui.steel ??= 'all';
const saveUser = () => writeJSON(LS.user, S.user);
const saveUI = () => writeJSON(LS.ui, S.ui);
const isSeen = m => !!S.user.seen[m.key];
const myRating = m => S.user.ratings[m.key] || 0;

/* ---------- Normalisation ---------- */
function normHdr(s) { s = fold(s); if (!s) return ''; if (s.includes('vision')) return 'Dolby Vision'; if (s.includes('hdr')) return 'HDR10'; return s; }
function normAudio(s) {
  const f = fold(s); if (!f) return '';
  if (f.includes('atmos')) return 'Dolby Atmos';
  if (/dts\s?:?\s?x\b/.test(f)) return 'DTS:X';
  if (/dt[sd][- ]?hd/.test(f)) return 'DTS-HD MA';
  if (f.includes('truehd')) return 'Dolby TrueHD';
  return s;
}

function build() {
  const cnt = {};
  S.raw.forEach(r => { const id = r.id || ''; cnt[id] = (cnt[id] || 0) + 1; });
  const used = new Set();
  S.movies = S.raw.map((r, i) => {
    let key = r.id && cnt[r.id] === 1 ? String(r.id) : `${r.id || 'film'}~${slug(r.title)}`;
    while (used.has(key)) key += '_';
    used.add(key);
    const tags = Array.isArray(r.tags) ? r.tags : [];
    const tl = tags.map(t => fold(String(t)).trim());
    const cats = Array.isArray(r.categories) ? r.categories : [];
    const wish = tl.includes('wishlist') || cats.some(c => fold(c) === 'wishlist');
    const added = normDate(r.added);
    const soon = !wish && added > TODAY;
    const specs = r.technicalSpecs || {};
    const res = specs.resolution || '';
    const fmt = tl.includes('4k') ? '4K' : (tl.some(t => t.includes('blu')) || res === '1080p') ? 'Blu-ray' : '';
    const m = {
      key, i, raw: r, id: r.id || '',
      title: String(r.title || 'Sans titre'), year: Number(r.year) || null,
      genres: Array.isArray(r.genres) ? uniq(r.genres) : [],
      people: Array.isArray(r.people) ? uniq(r.people) : [],
      directors: Array.isArray(r.directors) ? r.directors : [],
      runtime: Number(r.runtime) || null, rating: Number(r.rating) || null,
      price: r.price != null ? Number(r.price) : null, value: r.marketValue != null ? Number(r.marketValue) : null,
      overview: r.overview || '', poster: r.poster || '', land: r.netflixPoster || '', alt: r.altPoster || '',
      cats: cats.filter(c => fold(c) !== 'wishlist'), tags, tl,
      country: r.country || '', added, ean: r.ean ? String(r.ean) : '', specs,
      wish, soon, owned: !wish && !soon, status: wish ? 'wish' : soon ? 'soon' : 'owned',
      fmt, steel: tl.some(t => t.includes('steel')), amaray: tl.includes('amaray'), imax: tl.includes('imax'),
      hdr: normHdr(specs.hdr), audio: normAudio(specs.audio), res,
    };
    m.decade = m.year ? Math.floor(m.year / 10) * 10 : null;
    m.ed = m.steel ? 'Steelbook' : m.amaray ? 'Amaray' : '';
    m.ftitle = fold(m.title);
    m.idx = fold([m.title, m.year, ...m.directors, ...m.people, ...m.genres, ...m.cats, ...tags, m.country, m.ean].join(' '));
    m.words = uniq(m.idx.split(/[^a-z0-9]+/).filter(w => w.length > 2));
    return m;
  });
  S.byKey = new Map(S.movies.map(m => [m.key, m]));
  migrateLegacy();
  updateCounts();
}

/* Reprend les « vu » et notes de l'ancien site (même navigateur, même adresse) */
function migrateLegacy() {
  if (S.user.migrated) return;
  let n = 0;
  S.movies.forEach(m => {
    if (!m.id) return;
    if (localStorage.getItem('seen_' + m.id) && !S.user.seen[m.key]) { S.user.seen[m.key] = 1; n++; }
    const r = Number(localStorage.getItem('myrating_' + m.id));
    if (r && !S.user.ratings[m.key]) { S.user.ratings[m.key] = r; n++; }
  });
  if (S.movies.length) { S.user.migrated = true; saveUser(); }
  if (n) setTimeout(() => toast(`${n} données reprises de l'ancien site (vus / notes)`), 800);
}

const list = st => S.movies.filter(m => m.status === st);

/* ---------- Chargement / sauvegarde ---------- */
async function load() {
  const local = readJSON(LS.col);
  let fileData = null;
  try {
    const res = await fetch('data/movies.json', { cache: 'no-store' });
    if (res.ok) {
      let t = (await res.text()).trim();
      t = t.slice(0, t.lastIndexOf('}') + 1);
      const p = JSON.parse(t);
      if (Array.isArray(p.movies)) fileData = p.movies;
    }
  } catch (e) { /* ouvert en file:// ou fichier absent */ }
  S.fileAvailable = !!fileData;
  if (local?.movies && (local.unexported || !fileData)) {
    S.raw = local.movies; S.source = 'local'; S.unexported = !!local.unexported; S.savedAt = local.savedAt;
  } else if (fileData) {
    S.raw = fileData; S.source = 'file';
  } else { S.raw = []; S.source = 'none'; }
  build();
}

function persist(unexported = true) {
  S.unexported = unexported; S.savedAt = new Date().toISOString(); S.source = 'local';
  writeJSON(LS.col, { savedAt: S.savedAt, unexported, movies: S.raw });
  renderNotice();
}

function cleanRaw(r) {
  const o = {};
  for (const [k, v] of Object.entries(r)) {
    if (v === '' || v == null) continue;
    if (Array.isArray(v) && !v.length) continue;
    if (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) continue;
    o[k] = v;
  }
  return o;
}

function download(name, data) {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportCollection() {
  download('movies.json', { movies: S.raw.map(cleanRaw) });
  if (S.source === 'local') persist(false);
  toast('movies.json téléchargé — remplace celui du dossier data/');
}

function importText(text) {
  try {
    text = text.trim(); text = text.slice(0, text.lastIndexOf('}') + 1);
    const p = JSON.parse(text);
    if (!p.movies && (p.seen || p.ratings)) {
      Object.assign(S.user.seen, p.seen || {}); Object.assign(S.user.ratings, p.ratings || {}); saveUser();
      toast('Données personnelles restaurées'); route(); return;
    }
    if (!Array.isArray(p.movies)) throw new Error('clé "movies" absente');
    S.raw = p.movies; build(); persist(false);
    S.source = 'local'; toast(`Collection importée : ${S.raw.length} films`);
    location.hash = '#/'; route();
  } catch (e) { toast('Fichier illisible : ' + e.message); }
}
function pickFile() { const f = $('#fileInput'); f.value = ''; f.click(); }
$('#fileInput').addEventListener('change', async e => { const f = e.target.files[0]; if (f) importText(await f.text()); });

/* ---------- Images ---------- */
function ph(t) { return `<div class="ph">${esc(t)}</div>`; }
function img(srcs, alt, cls = '') {
  const l = uniq(srcs.filter(Boolean));
  if (!l.length) return ph(alt);
  return `<img class="img ${cls}" src="${esc(l[0])}" data-fb="${esc(l.slice(1).join('|'))}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('ok');this.parentNode&&this.parentNode.classList.remove('skel')">`;
}
document.addEventListener('error', e => {
  const t = e.target;
  if (t.tagName !== 'IMG' || !t.classList.contains('img')) return;
  const fb = (t.dataset.fb || '').split('|').filter(Boolean);
  if (fb.length) { t.dataset.fb = fb.slice(1).join('|'); t.src = fb[0]; }
  else { t.parentNode && t.parentNode.classList.remove('skel'); t.outerHTML = t.dataset.ph || ph(t.alt); }
}, true);
const posterSrc = m => [m.poster, m.alt, m.land];
const landSrc = m => [m.land, m.poster];

function avatar(name) {
  const R = window.REFS || {};
  const url = (R.directorPhotos || {})[name] || (R.actorPhotos || {})[name];
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const ph = `<div class="avatar-ph" style="background:${hashColor(name)}">${esc(ini)}</div>`;
  if (url) return img([url], name).replace('<img ', `<img data-ph="${esc(ph)}" `);
  return ph;
}

/* ---------- Gabarits de cartes ---------- */
function minis(m) {
  const l = [], r = [];
  if (m.fmt === '4K') l.push('<span class="mini k4">4K</span>');
  if (m.steel) l.push('<span class="mini steel">STEEL</span>');
  if (isSeen(m)) r.push('<span class="mini seen" title="Vu">VU</span>');
  return (l.length ? `<div class="corner l">${l.join('')}</div>` : '') + (r.length ? `<div class="corner r">${r.join('')}</div>` : '');
}
function pcard(m, extra = '') {
  return `<div class="pcard" data-k="${esc(m.key)}"><div class="pp skel">${img(posterSrc(m), m.title)}${minis(m)}</div>
  <div class="pt">${esc(m.title)}</div>
  <div class="pm">${extra || [m.year, m.runtime && fmtRt(m.runtime)].filter(Boolean).join(' · ')}${!extra && m.rating ? `<span class="rating">★ ${m.rating}</span>` : ''}</div></div>`;
}
function lcard(m) {
  return `<div class="lcard skel" data-k="${esc(m.key)}">${img(landSrc(m), m.title)}${minis(m)}
  <div class="lc-info"><div class="lc-title">${esc(m.title)}</div><div class="lc-meta">${m.year || ''}${m.runtime ? `<span>${fmtRt(m.runtime)}</span>` : ''}${m.rating ? `<span class="rating">★ ${m.rating}</span>` : ''}</div></div></div>`;
}
function tcard(m, n) {
  return `<div class="tcard" data-k="${esc(m.key)}"><span class="num">${n}</span><div class="tp skel">${img(posterSrc(m), m.title)}</div></div>`;
}
let rowId = 0;
function rowHTML(title, items, kind = 'land', opts = {}) {
  if (!items.length) return '';
  const id = 'row' + (++rowId);
  const cards = items.map((m, i) => kind === 'top' ? tcard(m, i + 1) : kind === 'poster' ? pcard(m, opts.extra?.(m)).replace('class="pcard"', 'class="pcard slim"') : lcard(m)).join('');
  return `<section class="row"><div class="row-head"><h2 class="row-title">${opts.link ? `<a href="${opts.link}">${esc(title)} ›</a>` : esc(title)}</h2>${opts.sub ? `<span class="row-sub">${esc(opts.sub)}</span>` : ''}</div>
  <div class="row-wrap"><button class="arrow left" data-row="${id}" data-d="-1" aria-label="Précédent" disabled>${ICON.l}</button>
  <div class="scroller no-sb" id="${id}" data-ctx>${cards}</div>
  <button class="arrow right" data-row="${id}" data-d="1" aria-label="Suivant">${ICON.r}</button></div></section>`;
}
function initRows(root = document) {
  $$('.scroller', root).forEach(sc => {
    const upd = () => {
      const l = root.querySelector(`.arrow.left[data-row="${sc.id}"]`), r = root.querySelector(`.arrow.right[data-row="${sc.id}"]`);
      if (l) l.disabled = sc.scrollLeft < 10;
      if (r) r.disabled = sc.scrollLeft > sc.scrollWidth - sc.clientWidth - 10;
    };
    sc.addEventListener('scroll', debounce(upd, 60), { passive: true });
    requestAnimationFrame(upd);
  });
}
document.addEventListener('click', e => {
  const a = e.target.closest('.arrow[data-row]');
  if (a) { const sc = document.getElementById(a.dataset.row); sc.scrollBy({ left: sc.clientWidth * 0.85 * a.dataset.d, behavior: 'smooth' }); }
});

/* Clic sur une carte → fiche ; sur une personne → page personne */
document.addEventListener('click', e => {
  const p = e.target.closest('[data-p]');
  if (p) { e.preventDefault(); closeAll(); location.hash = '#/personne/' + encodeURIComponent(p.dataset.p); return; }
  const c = e.target.closest('[data-k]');
  if (!c) return;
  const inner = e.target.closest('a[href],button');
  if (inner && inner !== c && c.contains(inner)) return;
  const ctxEl = c.closest('[data-ctx]');
  const ctx = ctxEl ? uniq($$('[data-k]', ctxEl).map(x => x.dataset.k)) : [c.dataset.k];
  openFilm(c.dataset.k, ctx);
});

/* ---------- Overlays ---------- */
const stack = [];
function overlay(html, onClose) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = html;
  ov._onClose = onClose;
  document.body.appendChild(ov);
  stack.push(ov);
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => ov.classList.add('show'));
  ov.addEventListener('mousedown', e => { if (e.target === ov) closeOverlay(ov); });
  return ov;
}
function closeOverlay(ov = stack[stack.length - 1]) {
  if (!ov) return;
  stack.splice(stack.indexOf(ov), 1);
  ov.classList.remove('show');
  ov._onClose && ov._onClose();
  setTimeout(() => ov.remove(), 250);
  if (!stack.length) document.body.classList.remove('noscroll');
}
function closeAll() { while (stack.length) closeOverlay(); }

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
}

/* ---------- Routeur ---------- */
const view = $('#view');
const ROUTES = [
  [/^\/?$/, () => renderHome(), 'home'],
  [/^\/collection$/, () => renderCatalog('owned'), 'collection'],
  [/^\/wishlist$/, () => renderCatalog('wish'), 'wishlist'],
  [/^\/prochainement$/, () => renderUpcoming(), 'upcoming'],
  [/^\/steelbooks$/, () => renderSteel(), 'steelbooks'],
  [/^\/stats$/, () => renderStats(), 'stats'],
  [/^\/bingo$/, () => renderBingoHub(), 'bingo'],
  [/^\/bingo\/(directors|sagas|actors)$/, t => renderBingoList(t), 'bingo'],
  [/^\/bingo\/(directors|sagas|actors)\/(.+)$/, (t, n) => renderBingoDetail(t, decodeURIComponent(n)), 'bingo'],
  [/^\/personne\/(.+)$/, n => renderPerson(decodeURIComponent(n)), ''],
  [/^\/reglages$/, () => renderSettings(), ''],
];
let lastPath = null;
function route() {
  clearInterval(S.heroTimer);
  const path = location.hash.replace(/^#/, '') || '/';
  if (!S.movies.length && !/^\/reglages/.test(path)) { setNav(''); renderWelcome(); return; }
  for (const [re, fn, nav] of ROUTES) {
    const mm = path.match(re);
    if (mm) {
      setNav(nav); fn(...mm.slice(1));
      if (path !== lastPath) window.scrollTo({ top: 0, behavior: 'instant' });
      lastPath = path; return;
    }
  }
  location.hash = '#/';
}
function setNav(r) { $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.r === r)); }
window.addEventListener('hashchange', () => { closeAll(); route(); });

function updateCounts() {
  const c = { owned: list('owned').length, wish: list('wish').length, soon: list('soon').length };
  $$('[data-c]').forEach(el => el.textContent = c[el.dataset.c] || '');
  const o = list('owned');
  $('#footStats').textContent = `${plural(o.length, 'film')} · ${o.filter(m => m.fmt === '4K').length} en 4K · ${o.filter(m => m.steel).length} steelbooks`;
}

function renderNotice() {
  const n = $('#notice');
  if (S.source === 'local' && S.unexported) {
    n.innerHTML = `<div class="notice"><div class="wrap"><span>✏️ <b>Modifications enregistrées dans ce navigateur</b> — exporte <code>movies.json</code> et remplace celui du dossier <code>data/</code> pour les garder pour de bon.</span>
    <button class="btn sm primary" id="nExport">${ICON.dl} Exporter movies.json</button></div></div>`;
    $('#nExport').onclick = exportCollection;
  } else n.innerHTML = '';
}

/* ==========================================================
   ACCUEIL
   ========================================================== */
const PRIORITY = ['Top 10', 'Récompensés aux Oscars', 'Blockbusters', 'Classiques', 'Science-fiction', "Films d'action", 'Films français', 'Animation'];
function renderHome() {
  rowId = 0;
  const owned = list('owned');
  const heroes = shuffle(owned.filter(m => m.land)).slice(0, 7);
  const rows = [];
  const recent = [...owned].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 16);
  rows.push(rowHTML('Ajouts récents', recent, 'land', { sub: recent[0] ? 'dernier : ' + fmtDate(recent[0].added) : '' }));
  let top = owned.filter(m => m.cats.includes('Top 10')).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);
  if (top.length < 3) top = [...owned].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);
  rows.push(rowHTML('Mon Top 10', top, 'top'));
  const soon = list('soon').sort((a, b) => a.added.localeCompare(b.added));
  rows.push(rowHTML('Bientôt dans la collection', soon, 'poster', { link: '#/prochainement', extra: m => `<span style="color:var(--accent2);font-weight:600">${countdown(m.added)}</span>` }));
  const unseen = shuffle(owned.filter(m => !isSeen(m))).slice(0, 18);
  const nUnseen = owned.filter(m => !isSeen(m)).length;
  if (unseen.length) rows.push(rowHTML('Pas encore vus', unseen, 'land', { sub: `${nUnseen} à découvrir` }));
  const catMap = {};
  owned.forEach(m => m.cats.forEach(c => (catMap[c] ||= []).push(m)));
  const cats = [...PRIORITY.filter(c => c !== 'Top 10' && catMap[c]), ...Object.keys(catMap).filter(c => !PRIORITY.includes(c)).sort((a, b) => catMap[b].length - catMap[a].length)];
  // Réalisateurs à l'honneur
  const dirCount = {};
  owned.forEach(m => m.directors.forEach(d => dirCount[d] = (dirCount[d] || 0) + 1));
  const stars = shuffle(Object.entries(dirCount).filter(([, c]) => c >= 3)).slice(0, 2);
  cats.forEach((c, i) => {
    rows.push(rowHTML(c, shuffle(catMap[c]), 'land', { sub: plural(catMap[c].length, 'film') }));
    if (i === 1 && stars[0]) rows.push(rowHTML('Le cinéma de ' + stars[0][0], owned.filter(m => m.directors.includes(stars[0][0])).sort((a, b) => a.year - b.year), 'poster', { link: '#/personne/' + encodeURIComponent(stars[0][0]) }));
    if (i === 4 && stars[1]) rows.push(rowHTML('Le cinéma de ' + stars[1][0], owned.filter(m => m.directors.includes(stars[1][0])).sort((a, b) => a.year - b.year), 'poster', { link: '#/personne/' + encodeURIComponent(stars[1][0]) }));
  });
  rows.push(rowHTML('Envies du moment', shuffle(list('wish')).slice(0, 18), 'poster', { link: '#/wishlist' }));

  view.innerHTML = `${heroes.length ? `<section class="hero" id="hero">${heroes.map((m, i) => `<div class="hero-slide${i ? '' : ' on'}">${img([m.land], m.title)}</div>`).join('')}
    <div class="hero-info"><div class="wrap" id="heroInfo"></div></div>
    <div class="hero-dots">${heroes.map((_, i) => `<button data-i="${i}" class="${i ? '' : 'on'}" aria-label="Film ${i + 1}"></button>`).join('')}</div></section>` : '<div style="height:30px"></div>'}
    <div class="rows wrap">${rows.join('')}</div>`;
  initRows(view);
  if (!heroes.length) return;
  let cur = 0;
  const show = i => {
    cur = (i + heroes.length) % heroes.length;
    const m = heroes[cur];
    $$('.hero-slide', view).forEach((s, j) => s.classList.toggle('on', j === cur));
    $$('.hero-dots button', view).forEach((s, j) => s.classList.toggle('on', j === cur));
    $('#heroInfo').innerHTML = `<div class="hero-kicker">${m.steel ? 'Steelbook' : 'Édition'} ${m.fmt || ''} · Dans ma collection</div>
      <h1 class="hero-title">${esc(m.title)}</h1>
      <div class="hero-meta">${m.rating ? `<span class="rating">★ ${m.rating}</span>` : ''}${m.year ? `<span>${m.year}</span>` : ''}${m.runtime ? `<span>${fmtRt(m.runtime)}</span>` : ''}<span>${esc(m.genres.slice(0, 3).join(' · '))}</span>${m.hdr ? `<span class="pill">${m.hdr}</span>` : ''}${isSeen(m) ? '<span class="pill green">Vu</span>' : ''}</div>
      <p class="hero-overview">${esc(m.overview)}</p>
      <div class="hero-actions"><button class="btn light" data-k="${esc(m.key)}">${ICON.info} Voir la fiche</button><button class="btn" id="heroRandom">${ICON.dice} Que regarder ce soir ?</button></div>`;
    $('#heroRandom').onclick = openRandom;
  };
  show(0);
  const start = () => { clearInterval(S.heroTimer); S.heroTimer = setInterval(() => { if (!document.hidden && !stack.length) show(cur + 1); }, 7000); };
  $$('.hero-dots button', view).forEach(b => b.onclick = () => { show(+b.dataset.i); start(); });
  const hero = $('#hero');
  hero.addEventListener('mouseenter', () => clearInterval(S.heroTimer));
  hero.addEventListener('mouseleave', start);
  let tx = null;
  hero.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
  hero.addEventListener('touchend', e => { if (tx == null) return; const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) { show(cur + (d < 0 ? 1 : -1)); start(); } tx = null; });
  start();
}
function countdown(d) { const n = daysUntil(d); return n <= 0 ? "aujourd'hui" : n === 1 ? 'demain' : `dans ${n} j`; }

/* ==========================================================
   CATALOGUE (Collection & Wishlist)
   ========================================================== */
const DEF_F = { q: '', genre: '', country: '', decade: '', fmt: '', ed: '', seen: '', dur: '', hdr: '', audio: '', min: 0, sort: 'title', dir: 'asc', view: 'grid', group: '', open: false };
const SORTS = { title: 'Titre', added: "Date d'ajout", year: 'Année', rating: 'Note', mine: 'Ma note', runtime: 'Durée', price: "Prix d'achat", value: 'Valeur estimée', gain: 'Plus-value' };
const GROUPS = { '': 'Sans regroupement', director: 'Par réalisateur', genre: 'Par genre', decade: 'Par décennie', year: 'Par année', country: 'Par pays', fmt: 'Par format', ed: 'Par édition' };
const fOf = scope => (S.ui.filters[scope] = { ...DEF_F, ...(S.ui.filters[scope] || {}) });

function searchMovies(q, arr) {
  const fq = fold(q).trim(); const toks = fq.split(/\s+/).filter(Boolean);
  if (!toks.length) return arr;
  const score = (m, toksUsed) => {
    let s = 0;
    if (m.ftitle.startsWith(fq)) s += 100; else if (m.ftitle.includes(fq)) s += 60;
    toksUsed.forEach(t => { if (m.ftitle.includes(t)) s += 10; });
    return s;
  };
  let out = arr.filter(m => toks.every(t => m.idx.includes(t))).map(m => [score(m, toks), m]);
  if (!out.length) { // tolérance aux fautes de frappe
    out = arr.filter(m => toks.every(t => m.idx.includes(t) || (t.length >= 4 && m.words.some(w => lev(t, w) <= 1)))).map(m => [score(m, toks), m]);
  }
  return out.sort((a, b) => b[0] - a[0]).map(x => x[1]);
}

function applyFilters(arr, f) {
  const durOk = m => !f.dur || (m.runtime && (f.dur === 's' ? m.runtime < 105 : f.dur === 'm' ? m.runtime >= 105 && m.runtime <= 140 : m.runtime > 140));
  let r = arr.filter(m =>
    (!f.genre || m.genres.includes(f.genre)) && (!f.country || m.country === f.country) &&
    (!f.decade || m.decade === +f.decade) && (!f.fmt || m.fmt === f.fmt) && (!f.ed || m.ed === f.ed) &&
    (!f.seen || (f.seen === 'yes') === isSeen(m)) && durOk(m) && (!f.hdr || m.hdr === f.hdr) &&
    (!f.audio || m.audio === f.audio) && (!f.min || (m.rating || 0) >= f.min));
  if (f.q) r = searchMovies(f.q, r);
  const dir = f.dir === 'asc' ? 1 : -1;
  const val = {
    title: m => m.ftitle, added: m => m.added, year: m => m.year || 0, rating: m => m.rating || 0, mine: m => myRating(m),
    runtime: m => m.runtime || 0, price: m => m.price || 0, value: m => m.value || 0, gain: m => (m.value || 0) - (m.price || 0)
  }[f.sort] || (m => m.ftitle);
  if (!(f.q && f.sort === 'title' && f.dir === 'asc')) r = [...r].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : a.ftitle.localeCompare(b.ftitle)) * dir; });
  return r;
}

function renderCatalog(scope) {
  const f = fOf(scope);
  const base = list(scope);
  const isWish = scope === 'wish';
  view.innerHTML = `<div class="page wrap">
    <div class="page-head"><div><h1 class="page-title">${isWish ? 'Wishlist' : 'Ma collection'}</h1>
      <div class="page-sub">${isWish ? `${plural(base.length, 'film')} convoité${base.length > 1 ? 's' : ''} · ${base.filter(m => m.steel).length} en steelbook` : `${plural(base.length, 'film')} · ${base.filter(m => m.fmt === '4K').length} en 4K · ${base.filter(m => isSeen(m)).length} vus`}</div></div>
      <div style="display:flex;gap:8px"><button class="btn" id="catRandom">${ICON.dice} Au hasard</button><button class="btn primary" id="catAdd">+ Ajouter</button></div></div>
    <div class="toolbar">
      <div class="field">${ICON.search}<input class="input" id="q" type="search" placeholder="Titre, réalisateur, acteur, genre…" value="${esc(f.q)}" autocomplete="off"></div>
      <button class="btn" id="fToggle">${ICON.filter} Filtres <span id="fCount"></span></button>
      <select class="select" id="sort">${Object.entries(SORTS).filter(([k]) => !isWish || !['price', 'value', 'gain'].includes(k)).map(([k, v]) => `<option value="${k}"${f.sort === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
      <button class="icon-btn" id="dir" title="Inverser l'ordre" style="border-radius:12px;width:42px;height:42px">${f.dir === 'asc' ? '↑' : '↓'}</button>
      <select class="select" id="group">${Object.entries(GROUPS).map(([k, v]) => `<option value="${k}"${f.group === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
      <div class="seg"><button data-v="grid" class="${f.view === 'grid' ? 'on' : ''}" title="Grille">${ICON.grid}</button><button data-v="list" class="${f.view === 'list' ? 'on' : ''}" title="Liste">${ICON.list}</button></div>
    </div>
    <div id="fPanel"></div><div class="active-filters" id="fActive"></div><div id="results"></div></div>`;

  const upd = () => { saveUI(); renderPanel(); renderResults(); };
  const renderPanel = () => {
    const opts = (k, fn) => uniq(base.flatMap(fn).filter(Boolean)).sort((a, b) => String(a).localeCompare(String(b), 'fr'));
    const chips = (k, items) => `<div class="chips">${items.map(([v, l]) => `<button class="chip${String(f[k]) === String(v) ? ' on' : ''}" data-f="${k}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
    const sel = (k, items, all = 'Tous') => `<select class="select" style="width:100%" data-fs="${k}"><option value="">${all}</option>${items.map(v => `<option${f[k] === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
    $('#fPanel').innerHTML = f.open ? `<div class="filters">
      <div class="fgroup"><label class="fl">Format</label>${chips('fmt', [['4K', '4K UHD'], ['Blu-ray', 'Blu-ray']])}</div>
      <div class="fgroup"><label class="fl">Édition</label>${chips('ed', [['Steelbook', 'Steelbook'], ['Amaray', 'Amaray']])}</div>
      ${isWish ? '' : `<div class="fgroup"><label class="fl">Visionnage</label>${chips('seen', [['yes', 'Vus'], ['no', 'Pas encore vus']])}</div>`}
      <div class="fgroup"><label class="fl">Durée</label>${chips('dur', [['s', '< 1h45'], ['m', '1h45 – 2h20'], ['l', '> 2h20']])}</div>
      <div class="fgroup"><label class="fl">Décennie</label>${chips('decade', opts('decade', m => [m.decade]).map(d => [d, `${String(d).slice(2)}s`]))}</div>
      <div class="fgroup"><label class="fl">Genre</label>${sel('genre', opts('genre', m => m.genres))}</div>
      <div class="fgroup"><label class="fl">Pays</label>${sel('country', opts('country', m => [m.country]))}</div>
      ${isWish ? '' : `<div class="fgroup"><label class="fl">HDR</label>${chips('hdr', opts('hdr', m => [m.hdr]).map(v => [v, v]))}</div>
      <div class="fgroup"><label class="fl">Audio</label>${sel('audio', opts('audio', m => [m.audio]))}</div>`}
      <div class="fgroup"><label class="fl">Note minimale : <span style="color:var(--gold)" id="minV">${f.min ? '★ ' + f.min : 'toutes'}</span></label><input type="range" class="range" min="0" max="9" step="0.5" value="${f.min}" id="minR"></div>
    </div>` : '';
    $$('[data-f]', $('#fPanel')).forEach(b => b.onclick = () => { const k = b.dataset.f, v = b.dataset.v; f[k] = String(f[k]) === v ? '' : (k === 'decade' ? +v : v); upd(); });
    $$('[data-fs]', $('#fPanel')).forEach(s => s.onchange = () => { f[s.dataset.fs] = s.value; upd(); });
    const mr = $('#minR');
    if (mr) { mr.oninput = () => { $('#minV').textContent = +mr.value ? '★ ' + mr.value : 'toutes'; }; mr.onchange = () => { f.min = +mr.value; upd(); }; }
  };
  const LABELS = { fmt: v => v, ed: v => v, seen: v => v === 'yes' ? 'Vus' : 'Pas vus', dur: v => ({ s: '< 1h45', m: '1h45–2h20', l: '> 2h20' })[v], decade: v => `Années ${String(v).slice(2)}`, genre: v => v, country: v => v, hdr: v => v, audio: v => v, min: v => `★ ≥ ${v}` };
  const renderResults = () => {
    const res = applyFilters(base, f);
    const act = Object.keys(LABELS).filter(k => f[k]);
    $('#fCount').innerHTML = act.length ? `<span class="badge-count">${act.length}</span>` : '';
    $('#fToggle').classList.toggle('on', f.open);
    $('#fActive').innerHTML = `<span class="result-count">${plural(res.length, 'résultat')}</span>` + act.map(k => `<button class="chip on" data-rm="${k}">${esc(LABELS[k](f[k]))} <span class="x">✕</span></button>`).join('') +
      (act.length || f.q ? '<button class="chip" id="fReset">Tout effacer</button>' : '');
    $$('[data-rm]').forEach(b => b.onclick = () => { f[b.dataset.rm] = DEF_F[b.dataset.rm]; upd(); });
    const rr = $('#fReset'); if (rr) rr.onclick = () => { Object.assign(f, { ...DEF_F, sort: f.sort, dir: f.dir, view: f.view, group: f.group, open: f.open }); $('#q').value = ''; upd(); };
    const out = $('#results');
    if (!res.length) { out.innerHTML = `<div class="empty"><div class="big">🎞️</div><h3>Aucun film ne correspond</h3><p>Essaie d'enlever un filtre ou de changer ta recherche.</p></div>`; return; }
    out.innerHTML = f.group ? groupHTML(res, f, scope) : (f.view === 'list' ? tableHTML(res, scope, f) : `<div class="pgrid" data-ctx>${res.map(m => pcard(m)).join('')}</div>`);
    $$('th[data-s]', out).forEach(th => th.onclick = () => { const s = th.dataset.s; if (f.sort === s) f.dir = f.dir === 'asc' ? 'desc' : 'asc'; else { f.sort = s; f.dir = s === 'title' ? 'asc' : 'desc'; } $('#sort').value = f.sort; $('#dir').textContent = f.dir === 'asc' ? '↑' : '↓'; upd(); });
  };
  $('#q').addEventListener('input', debounce(e => { f.q = e.target.value; saveUI(); renderResults(); }, 120));
  $('#fToggle').onclick = () => { f.open = !f.open; upd(); };
  $('#sort').onchange = e => { f.sort = e.target.value; f.dir = ['title'].includes(f.sort) ? 'asc' : 'desc'; $('#dir').textContent = f.dir === 'asc' ? '↑' : '↓'; upd(); };
  $('#dir').onclick = () => { f.dir = f.dir === 'asc' ? 'desc' : 'asc'; $('#dir').textContent = f.dir === 'asc' ? '↑' : '↓'; upd(); };
  $('#group').onchange = e => { f.group = e.target.value; upd(); };
  $$('.seg button', view).forEach(b => b.onclick = () => { f.view = b.dataset.v; $$('.seg button', view).forEach(x => x.classList.toggle('on', x === b)); upd(); });
  $('#catAdd').onclick = () => openEditor(null, isWish ? { wish: true } : {});
  $('#catRandom').onclick = () => { const r = applyFilters(base, f); if (r.length) openFilm(r[Math.random() * r.length | 0].key, r.map(m => m.key)); };
  renderPanel(); renderResults();
}

function groupHTML(res, f, scope) {
  const g = {};
  const keyOf = { director: m => m.directors.length ? m.directors : ['Inconnu'], genre: m => m.genres.length ? m.genres : ['Non classé'], decade: m => [m.decade ? `Années ${m.decade}` : 'Inconnue'], year: m => [String(m.year || 'Inconnue')], country: m => [m.country || 'Inconnu'], fmt: m => [m.fmt || 'Autre'], ed: m => [m.ed || 'Standard'] }[f.group];
  res.forEach(m => keyOf(m).forEach(k => (g[k] ||= []).push(m)));
  let keys = Object.keys(g);
  if (['decade', 'year'].includes(f.group)) keys.sort((a, b) => b.localeCompare(a));
  else if (['director', 'genre', 'country'].includes(f.group)) keys.sort((a, b) => g[b].length - g[a].length || a.localeCompare(b, 'fr'));
  else keys.sort();
  return keys.map(k => `<div class="group"><h2 class="group-title">${f.group === 'director' && k !== 'Inconnu' ? `<a href="#/personne/${encodeURIComponent(k)}">${esc(k)}</a>` : esc(k)} <small>${g[k].length}</small></h2>
    ${f.view === 'list' ? tableHTML(g[k], scope, f) : `<div class="pgrid" data-ctx>${g[k].map(m => pcard(m)).join('')}</div>`}</div>`).join('');
}
function tableHTML(res, scope, f) {
  const own = scope !== 'wish';
  const th = (s, l, cls = '') => `<th data-s="${s}" class="${cls}">${l}${f.sort === s ? (f.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>`;
  return `<div class="table-wrap"><table class="table"><thead><tr><th></th>${th('title', 'Titre')}${th('year', 'Année')}<th class="hide-sm">Réalisation</th>${th('runtime', 'Durée', 'hide-sm')}<th>Édition</th>${th('rating', 'Note')}${own ? th('mine', 'Ma note', 'hide-sm') + th('price', 'Prix', 'hide-sm') + th('value', 'Valeur', 'hide-sm') + '<th>Vu</th>' : ''}</tr></thead>
  <tbody data-ctx>${res.map(m => `<tr data-k="${esc(m.key)}"><td><div class="thumb">${img(posterSrc(m), m.title)}</div></td><td class="t">${esc(m.title)}</td><td>${m.year || ''}</td><td class="hide-sm muted">${esc(m.directors.join(', '))}</td><td class="hide-sm muted">${fmtRt(m.runtime)}</td>
  <td>${m.fmt ? `<span class="pill ${m.fmt === '4K' ? 'k4' : 'br'}">${m.fmt}</span> ` : ''}${m.steel ? '<span class="pill steel">Steel</span>' : ''}</td><td class="rating">${m.rating ? '★ ' + m.rating : ''}</td>
  ${own ? `<td class="hide-sm" style="color:var(--gold)">${myRating(m) || ''}</td><td class="hide-sm">${m.price != null ? money(m.price, 2) : ''}</td><td class="hide-sm">${m.value != null ? money(m.value, 0) : ''}</td><td>${isSeen(m) ? '<span style="color:var(--green)">●</span>' : '<span class="dim">○</span>'}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}

/* ==========================================================
   PROCHAINEMENT
   ========================================================== */
function renderUpcoming() {
  const soon = list('soon').sort((a, b) => a.added.localeCompare(b.added));
  const months = {};
  soon.forEach(m => (months[m.added.slice(0, 7)] ||= []).push(m));
  const budget = sum(soon, m => m.price);
  view.innerHTML = `<div class="page wrap"><div class="page-head"><div><h1 class="page-title">Prochainement</h1>
    <div class="page-sub">${soon.length ? `${plural(soon.length, 'édition')} en précommande${budget ? ` · ${money(budget, 2)} à prévoir` : ''}` : 'Aucune précommande en cours.'}</div></div></div>
    ${soon.length ? `<div class="timeline" data-ctx>${Object.entries(months).map(([k, arr]) => { const [y, mo] = k.split('-'); return `<div class="tl-month"><h3>${MONTHS[+mo - 1]} ${y}</h3><div class="up-grid">${arr.map(m => `
      <div class="up-card" data-k="${esc(m.key)}"><div class="th skel">${img(posterSrc(m), m.title)}</div><div style="min-width:0">
        <div class="tt">${esc(m.title)}</div><div class="muted" style="font-size:13px">${fmtDate(m.added)}${m.year ? ' · ' + m.year : ''}</div>
        <div class="cd">${daysUntil(m.added)} <small>jour${daysUntil(m.added) > 1 ? 's' : ''}</small></div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">${m.fmt ? `<span class="pill ${m.fmt === '4K' ? 'k4' : 'br'}">${m.fmt}</span>` : ''}${m.steel ? '<span class="pill steel">Steelbook</span>' : ''}${m.price ? `<span class="pill">${money(m.price, 2)}</span>` : ''}</div>
      </div></div>`).join('')}</div></div>`; }).join('')}</div>`
      : `<div class="empty"><div class="big">📅</div><h3>Rien à l'horizon</h3><p>Ajoute un film avec une date d'ajout future : il apparaîtra ici jusqu'à sa sortie.</p></div>`}</div>`;
}

/* ==========================================================
   STEELBOOKS
   ========================================================== */
function renderSteel() {
  const all = S.movies.filter(m => m.steel).sort((a, b) => a.ftitle.localeCompare(b.ftitle));
  const cnt = { all: all.length, owned: all.filter(m => m.owned).length, soon: all.filter(m => m.soon).length, wish: all.filter(m => m.wish).length };
  const fl = S.ui.steel;
  const shown = fl === 'all' ? all : all.filter(m => m.status === fl);
  const groups = new Map();
  shown.forEach(m => { const k = m.alt || m.poster || m.key; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); });
  const val = sum(all.filter(m => m.owned), m => m.value);
  const lab = { owned: ['green', '✓ Collection'], soon: ['blue', '📅 Prochainement'], wish: ['purple', '🎁 Wishlist'] };
  view.innerHTML = `<div class="page wrap">
    <div class="steel-head"><div style="position:relative"><h1 class="page-title">Steelbooks</h1><div class="page-sub">Les boîtiers métal, côté face. ${val ? `Valeur estimée de la vitrine : <b style="color:#dfe6ee">${money(val)}</b>` : ''}</div></div>
      <div class="steel-stats">${[['all', 'Total'], ['owned', 'Possédés'], ['soon', 'À venir'], ['wish', 'Wishlist']].map(([k, l]) => `<button class="steel-stat${fl === k ? ' on' : ''}" data-sf="${k}"><b>${cnt[k]}</b><span>${l}</span></button>`).join('')}</div></div>
    ${groups.size ? `<div class="sgrid" data-ctx>${[...groups.values()].map(g => { const m = g[0]; const [c, l] = lab[m.status]; return `
      <div class="scard" data-k="${esc(m.key)}"><div class="in"><div class="pp skel">${img([m.alt, m.poster, m.land], m.title)}</div>
      <div class="bt"><div class="t">${esc(g.map(x => x.title).join(' / '))}</div><span class="pill ${c}" style="align-self:flex-start">${l}</span>
      <div class="m"><span>${m.year || ''}${m.fmt ? ' · ' + m.fmt : ''}</span>${sum(g, x => x.value) ? `<span style="color:var(--green)">${money(sum(g, x => x.value))}</span>` : ''}</div></div></div></div>`; }).join('')}</div>`
      : '<div class="empty"><div class="big">🛡️</div><h3>Aucun steelbook ici</h3></div>'}</div>`;
  $$('[data-sf]', view).forEach(b => b.onclick = () => { S.ui.steel = b.dataset.sf; saveUI(); renderSteel(); });
}

/* ==========================================================
   STATISTIQUES
   ========================================================== */
function counter(arr, fn) { const c = {}; arr.forEach(m => [].concat(fn(m)).filter(Boolean).forEach(v => c[v] = (c[v] || 0) + 1)); return Object.entries(c).sort((a, b) => b[1] - a[1]); }
function leaders(entries, n = 6) {
  return entries.slice(0, n).map(([k, v], i) => `<div class="leader" data-p="${esc(k)}"><span class="r g${i + 1}">${i + 1}</span><div class="av">${avatar(k)}</div><span class="nm">${esc(k)}</span><span class="ct">${v}</span></div>`).join('');
}
function record(label, m, val) { return m ? `<div class="record" data-k="${esc(m.key)}"><div class="th">${img(posterSrc(m), m.title)}</div><div style="min-width:0"><div class="k">${label}</div><div class="t">${esc(m.title)}</div><div class="v">${val}</div></div></div>` : ''; }

function goCatalog(patch) {
  const f = fOf('owned');
  Object.assign(f, { ...DEF_F, sort: f.sort, dir: f.dir, view: f.view, open: true }, patch);
  saveUI(); closeAll();
  if (location.hash === '#/collection') route(); else location.hash = '#/collection';
}

/* ==========================================================
   BINGO
   ========================================================== */
const BINGO = {
  directors: { t: 'Réalisateurs', ic: '🎬', ref: () => REFS.referenceFilmographies, d: 'Complète les filmographies cultes' },
  sagas: { t: 'Sagas', ic: '🍿', ref: () => REFS.referenceSagas, d: 'Rassemble les grandes franchises' },
  actors: { t: 'Acteurs', ic: '⭐', ref: () => REFS.referenceActors, d: 'Collectionne les films des stars' },
};
const REFS = window.REFS || { referenceFilmographies: {}, referenceSagas: {}, referenceActors: {}, sagaPhotos: {} };
function bingoState(type, name) {
  const refList = BINGO[type].ref()[name] || [];
  const nk = tkey(name);
  const ctx = m => type === 'sagas' || (type === 'actors' ? m.people : m.directors).some(p => tkey(p) === nk);
  const cells = refList.map(t => {
    const k = tkey(t);
    const cands = S.movies.filter(m => tkey(m.title) === k);
    const own = cands.find(m => m.owned && ctx(m)) || null;
    const other = !own && (cands.find(m => ctx(m)) || cands[0]) || null;
    return { title: t, own, other };
  });
  const owned = cells.filter(c => c.own).length;
  return { cells, owned, total: refList.length, pct: refList.length ? Math.round(owned / refList.length * 100) : 0 };
}
function renderBingoHub() {
  const posters = shuffle(list('owned').filter(m => m.poster));
  view.innerHTML = `<div class="page wrap"><div class="page-head"><div><h1 class="page-title">Bingo</h1><div class="page-sub">Les défis du collectionneur : complète les filmographies, les sagas et les carrières.</div></div></div>
  <div class="hub">${Object.entries(BINGO).map(([k, b], i) => {
    const names = Object.keys(b.ref()); const st = names.map(n => bingoState(k, n));
    const done = st.filter(s => s.pct === 100).length, avg = Math.round(sum(st, s => s.pct) / Math.max(1, st.length));
    return `<a class="hub-card" href="#/bingo/${k}"><div class="mosaic">${posters.slice(i * 8, i * 8 + 8).map(m => img([m.poster], '')).join('')}</div>
    <div style="font-size:34px">${b.ic}</div><h3>${b.t}</h3><p>${b.d}</p>
    <div style="display:flex;gap:8px;margin-top:12px"><span class="pill">${names.length} défis</span><span class="pill green">${done} complétés</span><span class="pill">${avg} % en moyenne</span></div></a>`;
  }).join('')}</div></div>`;
}
function bingoAvatar(type, name, st) {
  if (type === 'sagas') { const u = REFS.sagaPhotos?.[name]; const own = st.cells.find(c => c.own)?.own; return img([u, own?.poster], name); }
  return avatar(name);
}
function renderBingoList(type) {
  const b = BINGO[type];
  const items = Object.keys(b.ref()).map(n => [n, bingoState(type, n)]).sort((x, y) => y[1].pct - x[1].pct || y[1].owned - x[1].owned);
  view.innerHTML = `<div class="page wrap"><div class="page-head"><div><a href="#/bingo" class="muted" style="font-size:14px">‹ Bingo</a><h1 class="page-title">${b.ic} ${b.t}</h1><div class="page-sub">${b.d} · trié par progression</div></div></div>
  <div class="bgrid">${items.map(([n, s]) => `<a class="bcard${s.pct === 100 ? ' done' : ''}" href="#/bingo/${type}/${encodeURIComponent(n)}">
    <div class="top"><div class="av${type === 'sagas' ? ' sq' : ''}">${bingoAvatar(type, n, s)}</div><div><div class="nm">${esc(n)}</div><div class="sc">${s.owned} / ${s.total} films${s.cells.filter(c => c.other).length ? ` · ${s.cells.filter(c => c.other).length} en attente` : ''}</div></div></div>
    <div><div class="prog${s.pct === 100 ? ' done' : ''}"><div style="width:${s.pct}%"></div></div><div class="pc" style="margin-top:6px"><span>${s.pct === 100 ? '🏆 Complété' : ''}</span><span>${s.pct} %</span></div></div></a>`).join('')}</div></div>`;
}
function renderBingoDetail(type, name) {
  const b = BINGO[type]; const s = bingoState(type, name);
  if (!s.total) { location.hash = '#/bingo/' + type; return; }
  const shopQ = t => encodeURIComponent(t + ' 4K steelbook');
  view.innerHTML = `<div class="page wrap"><a href="#/bingo/${type}" class="muted" style="font-size:14px">‹ ${b.t}</a>
  <div class="person-head" style="margin-top:10px"><div class="person-av" style="${type === 'sagas' ? 'border-radius:20px;background:#fff' : ''}">${bingoAvatar(type, name, s)}</div>
    <div style="flex:1;min-width:240px"><h1 class="page-title">${esc(name)}</h1>
      <div class="page-sub">${s.owned} films sur ${s.total} dans la collection${type !== 'sagas' ? ` · <a class="plink" href="#/personne/${encodeURIComponent(name)}">voir la page</a>` : ''}</div>
      <div class="prog${s.pct === 100 ? ' done' : ''}" style="height:10px;margin-top:14px;max-width:520px"><div style="width:${s.pct}%"></div></div>
      <div style="font-family:var(--display);font-size:44px;margin-top:6px;color:${s.pct === 100 ? 'var(--gold)' : 'var(--text)'}">${s.pct} %</div></div></div>
  <div class="pgrid" style="margin-top:24px" data-ctx>${s.cells.map(c => {
    if (c.own) return `<div class="pcard" data-k="${esc(c.own.key)}"><div class="bcell own">${img(posterSrc(c.own), c.title)}<span class="ck">✓</span></div><div class="pt">${esc(c.title)}</div><div class="pm" style="color:var(--green)">Acquis</div></div>`;
    if (c.other) { const w = c.other.wish; return `<div class="pcard" data-k="${esc(c.other.key)}"><div class="bcell pend ${w ? 'wish' : 'soon'}">${img(posterSrc(c.other), '')}<div style="font-size:30px">${w ? '🎁' : '📅'}</div><div class="lab" style="color:var(${w ? '--purple' : '--blue'})">${w ? 'Wishlist' : 'Prochainement'}</div></div><div class="pt">${esc(c.title)}</div></div>`; }
    return `<a class="pcard" href="https://www.google.com/search?q=${shopQ(c.title)}" target="_blank" rel="noopener"><div class="bcell miss"><div style="font-size:30px;opacity:.4">📼</div><div class="lab" style="color:#ff8a8c">Manquant</div><div class="dim" style="font-size:11px">Chercher ↗</div></div><div class="pt muted">${esc(c.title)}</div></a>`;
  }).join('')}</div></div>`;
}

/* ==========================================================
   PERSONNE
   ========================================================== */
function renderPerson(name) {
  const films = S.movies.filter(m => m.directors.includes(name) || m.people.includes(name)).sort((a, b) => (b.year || 0) - (a.year || 0));
  if (!films.length) { view.innerHTML = `<div class="page wrap"><div class="empty"><h3>Aucun film avec ${esc(name)}</h3></div></div>`; return; }
  const dir = films.filter(m => m.directors.includes(name)), act = films.filter(m => m.people.includes(name));
  const owned = films.filter(m => m.owned);
  const rated = films.filter(m => m.rating);
  const collab = counter(films, m => [...m.directors, ...m.people].filter(p => p !== name)).filter(e => e[1] > 1).slice(0, 10);
  const bingoT = REFS.referenceFilmographies?.[name] ? 'directors' : REFS.referenceActors?.[name] ? 'actors' : null;
  const bs = bingoT && bingoState(bingoT, name);
  const roles = [dir.length && `Réalisation de ${plural(dir.length, 'film')}`, act.length && `À l'affiche de ${plural(act.length, 'film')}`].filter(Boolean).join(' · ');
  const sec = (t, arr) => arr.length ? `<div class="section-title">${t} · ${arr.length}</div><div class="pgrid" data-ctx>${arr.map(m => pcard(m)).join('')}</div>` : '';
  view.innerHTML = `<div class="page wrap"><div class="person-head"><div class="person-av">${avatar(name)}</div>
    <div style="flex:1;min-width:240px"><h1 class="page-title">${esc(name)}</h1><div class="page-sub">${roles}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><span class="pill">${owned.length} dans la collection</span><span class="pill green">${owned.filter(isSeen).length} vus</span>${rated.length ? `<span class="pill" style="color:var(--gold)">★ ${(sum(rated, m => m.rating) / rated.length).toFixed(1)} de moyenne</span>` : ''}
      ${bs ? `<a class="pill red" href="#/bingo/${bingoT}/${encodeURIComponent(name)}">🎯 Bingo : ${bs.pct} %</a>` : ''}</div>
      ${collab.length ? `<div style="margin-top:14px;font-size:14px"><span class="dim">Travaille souvent avec :</span> ${collab.map(([p, c]) => `<span class="plink" data-p="${esc(p)}">${esc(p)}</span> <span class="dim">(${c})</span>`).join(', ')}</div>` : ''}
    </div></div>
    ${sec('Dans ma collection', owned)}${sec('Prochainement', films.filter(m => m.soon))}${sec('Dans ma wishlist', films.filter(m => m.wish))}</div>`;
}

/* ==========================================================
   FICHE FILM
   ========================================================== */
let filmOv = null;
function openFilm(key, ctx = []) {
  const m = S.byKey.get(key); if (!m) return;
  if (filmOv && stack.includes(filmOv)) { filmOv._ctx = ctx.length > 1 ? ctx : filmOv._ctx; fillFilm(filmOv, m); filmOv.scrollTop = 0; return; }
  filmOv = overlay(`<div class="sheet" role="dialog" aria-modal="true"></div>`, () => { filmOv = null; });
  filmOv._ctx = ctx;
  fillFilm(filmOv, m);
}
function similar(m) {
  const sc = S.movies.filter(x => x !== m && x.status !== 'wish').map(x => {
    let s = 0;
    x.directors.forEach(d => m.directors.includes(d) && (s += 4));
    x.genres.forEach(g => m.genres.includes(g) && (s += 1));
    x.people.forEach(p => m.people.includes(p) && (s += 1.2));
    if (x.decade === m.decade) s += .5;
    return [s, x];
  }).filter(x => x[0] >= 3).sort((a, b) => b[0] - a[0]);
  return sc.slice(0, 14).map(x => x[1]);
}
function shopLinks(m) {
  const q = encodeURIComponent(m.ean || `${m.title} ${m.steel ? 'steelbook' : m.fmt === '4K' ? '4K' : 'blu-ray'}`);
  const t = encodeURIComponent(m.title);
  return [['Fnac', `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${q}`, '#e1a500'], ['Amazon', `https://www.amazon.fr/s?k=${q}`, '#ff9900'], ['Vinted', `https://www.vinted.fr/catalog?search_text=${q}`, '#09b1ba'],
  ['Leboncoin', `https://www.leboncoin.fr/recherche?text=${q}`, '#ff6e14'], ['eBay', `https://www.ebay.fr/sch/i.html?_nkw=${q}`, '#3665f3'], ['Zavvi', `https://www.zavvi.com/search?q=${q}`, '#a1a1a1'],
  ['Steelbook Pro', `https://steelbookpro.fr/?s=${t}`, '#c9d2dc'], ['4K Ultra HD', `https://4k-ultra-hd.fr/?s=${t}`, '#ffd76a']];
}
function fillFilm(ov, m) {
  ov._key = m.key;
  const ctx = ov._ctx || [];
  const pos = ctx.indexOf(m.key);
  const sim = similar(m);
  const g = m.value != null && m.price != null ? m.value - m.price : null;
  const statusPill = m.wish ? '<span class="pill purple">🎁 Wishlist</span>' : m.soon ? `<span class="pill blue">📅 Arrive le ${fmtDate(m.added)}</span>` : '<span class="pill green">✓ Dans ma collection</span>';
  const specs = [['Format', m.fmt === '4K' ? '4K Ultra HD' : m.fmt], ['Édition', m.ed], ['Master', m.res], ['HDR', m.specs.hdr], ['Audio VO', m.specs.audio], ['Débit', m.specs.bitrate], ['Disque', m.specs.diskType], ['Image', m.specs.aspectRatio], ['EAN', m.ean],
  [m.soon ? 'Arrivée' : 'Ajouté le', fmtDate(m.added)], ["Prix d'achat", m.price != null ? (m.price === 0 ? 'Offert' : money(m.price, 2)) : ''], ['Valeur estimée', m.value != null ? money(m.value, 2) : ''],
  ['Plus-value', g != null && m.price ? `<span class="${g >= 0 ? 'up' : 'down'}">${g >= 0 ? '+' : ''}${money(g, 2)}</span>` : '']].filter(x => x[1]);
  const mine = myRating(m);
  ov.querySelector('.sheet').innerHTML = `
    <div class="m-hero">${img(landSrc(m), m.title)}</div>
    <div class="m-top"><div style="display:flex;gap:8px">${ctx.length > 1 ? `<button class="icon-btn" id="mPrev" ${pos <= 0 ? 'disabled style="opacity:.3"' : ''} title="Précédent (←)">${ICON.l}</button><button class="icon-btn" id="mNext" ${pos >= ctx.length - 1 ? 'disabled style="opacity:.3"' : ''} title="Suivant (→)">${ICON.r}</button><span class="pill" style="align-self:center;background:rgba(0,0,0,.55)">${pos + 1} / ${ctx.length}</span>` : ''}</div>
      <button class="icon-btn" id="mClose" title="Fermer (Échap)">${ICON.x}</button></div>
    <div class="m-body">
      <div class="m-poster"><div class="pp skel" id="mPoster">${img(posterSrc(m), m.title)}</div>${m.alt && m.poster ? `<div class="flip-btn"><button class="icon-btn" id="mFlip" title="Voir l'édition / l'affiche">${ICON.flip}</button></div>` : ''}</div>
      <div class="m-info">
        <h2 class="m-title">${esc(m.title)}</h2>
        <div class="m-meta">${[m.year, fmtRt(m.runtime), m.rating && `<span class="rating">★ ${m.rating}</span>`, esc(m.country)].filter(Boolean).join('<span class="sep"></span>')}</div>
        <div class="m-pills">${statusPill}${m.fmt ? `<span class="pill ${m.fmt === '4K' ? 'k4' : 'br'}">${m.fmt === '4K' ? '4K UHD' : 'Blu-ray'}</span>` : ''}${m.steel ? '<span class="pill steel">Steelbook</span>' : ''}${m.imax ? '<span class="pill">IMAX</span>' : ''}${m.hdr ? `<span class="pill">${m.hdr}</span>` : ''}${m.audio ? `<span class="pill">${esc(m.audio)}</span>` : ''}</div>
        <div class="m-actions">
          ${m.wish ? '' : `<button class="btn sm${isSeen(m) ? ' on' : ''}" id="mSeen">${ICON.eye} ${isSeen(m) ? 'Vu' : 'Marquer comme vu'}</button>`}
          ${m.wish ? `<button class="btn sm primary" id="mBought">${ICON.cart} Je l'ai acheté</button>` : ''}
          <button class="btn sm" id="mEdit">${ICON.edit} Modifier</button>
          ${m.wish ? '' : `<span class="stars" id="mStars" title="Ma note">${Array.from({ length: 10 }, (_, i) => `<button data-v="${i + 1}" class="${i < mine ? 'on' : ''}" aria-label="${i + 1}/10">${ICON.star}</button>`).join('')}<span class="val">${mine ? mine + '/10' : ''}</span></span>`}
        </div>
      </div>
      <div class="m-rest">
        <div class="tabs"><button class="on" data-t="a">Résumé</button><button data-t="b">Édition & technique</button><button data-t="c">Trouver / acheter</button></div>
        <div data-p-t="a"><p class="overview">${esc(m.overview) || '<span class="dim">Pas de synopsis.</span>'}</p>
          <div class="credits">
            ${m.directors.length ? `<div><span class="lbl">Réalisation</span>${m.directors.map(d => `<span class="plink" data-p="${esc(d)}">${esc(d)}</span>`).join(', ')}</div>` : ''}
            ${m.people.length ? `<div><span class="lbl">Avec</span>${m.people.map(d => `<span class="plink" data-p="${esc(d)}">${esc(d)}</span>`).join(', ')}</div>` : ''}
            ${m.genres.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${m.genres.map(x => `<button class="chip" data-genre="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
            ${m.cats.length ? `<div style="font-size:13px" class="muted">Catégories : ${esc(m.cats.join(' · '))}</div>` : ''}
          </div></div>
        <div data-p-t="b" class="hidden"><div class="spec-grid">${specs.map(([k, v]) => `<div class="spec"><div class="k">${k}</div><div class="v">${String(v).startsWith('<span') ? v : esc(v)}</div></div>`).join('')}</div></div>
        <div data-p-t="c" class="hidden"><div class="shops">${shopLinks(m).map(([n, u, c]) => `<a class="shop" href="${u}" target="_blank" rel="noopener" style="color:${c}">${n}${ICON.ext}</a>`).join('')}</div>
          <div class="dim" style="font-size:12px;margin-top:10px">Recherche par ${m.ean ? 'EAN ' + esc(m.ean) : 'titre' + (m.steel ? ' + « steelbook »' : '')}.${m.id && /^tt\d+/.test(m.id) ? ` · <a class="plink" href="https://www.imdb.com/title/${esc(m.id)}/" target="_blank" rel="noopener">Fiche IMDb ↗</a>` : ''}</div></div>
      </div>
    </div>
    ${sim.length ? `<div class="m-similar"><div class="section-title" style="margin-top:0">Dans la même veine</div><div class="scroller no-sb" data-ctx>${sim.map(x => pcard(x).replace('class="pcard"', 'class="pcard slim"')).join('')}</div></div>` : ''}`;

  const q = s => ov.querySelector(s);
  q('#mClose').onclick = () => closeOverlay(ov);
  q('#mPrev') && (q('#mPrev').onclick = () => navFilm(-1));
  q('#mNext') && (q('#mNext').onclick = () => navFilm(1));
  $$('.tabs button', ov).forEach(b => b.onclick = () => { $$('.tabs button', ov).forEach(x => x.classList.toggle('on', x === b)); $$('[data-p-t]', ov).forEach(p => p.classList.toggle('hidden', p.dataset.pT !== b.dataset.t)); });
  $$('[data-genre]', ov).forEach(b => b.onclick = () => goCatalog({ genre: b.dataset.genre }));
  let alt = false;
  q('#mFlip') && (q('#mFlip').onclick = () => { alt = !alt; const pp = q('#mPoster'); pp.style.transition = 'transform .25s'; pp.style.transform = 'rotateY(90deg)'; setTimeout(() => { pp.innerHTML = img(alt ? [m.alt] : posterSrc(m), m.title); pp.style.transform = ''; }, 200); });
  q('#mSeen') && (q('#mSeen').onclick = () => { if (isSeen(m)) delete S.user.seen[m.key]; else S.user.seen[m.key] = 1; saveUser(); fillFilm(ov, m); refreshBehind(); toast(isSeen(m) ? `« ${m.title} » marqué comme vu` : 'Retiré des films vus'); });
  const stars = q('#mStars');
  if (stars) {
    const paint = v => $$('button', stars).forEach((b, i) => b.classList.toggle('on', i < v));
    $$('button', stars).forEach(b => {
      b.onmouseenter = () => paint(+b.dataset.v);
      b.onclick = () => { const v = +b.dataset.v; if (myRating(m) === v) delete S.user.ratings[m.key]; else S.user.ratings[m.key] = v; saveUser(); stars.querySelector('.val').textContent = myRating(m) ? myRating(m) + '/10' : ''; paint(myRating(m)); };
    });
    stars.onmouseleave = () => paint(myRating(m));
  }
  q('#mEdit').onclick = () => openEditor(m);
  q('#mBought') && (q('#mBought').onclick = () => openEditor(m, { bought: true }));
  initRows(ov);
}
function navFilm(d) {
  if (!filmOv) return;
  const ctx = filmOv._ctx || [];
  const i = ctx.indexOf(filmOv._key) + d;
  if (i >= 0 && i < ctx.length) { fillFilm(filmOv, S.byKey.get(ctx[i])); filmOv.scrollTop = 0; }
}
function refreshBehind() { updateCounts(); const y = window.scrollY; route(); window.scrollTo(0, y); }

/* ==========================================================
   ÉDITEUR (ajout / modification)
   ========================================================== */
function openEditor(m, opt = {}) {
  const r = m ? m.raw : {};
  const sp = r.technicalSpecs || {};
  const wish = opt.bought ? false : m ? m.wish : !!opt.wish;
  const tl = m ? m.tl : ['4k', 'steelbook'];
  const otherTags = (r.tags || []).filter(t => !['4k', 'blu-ray', 'bluray', 'steelbook', 'amaray', 'imax', 'wishlist'].includes(fold(t)));
  const cats = (r.categories || []).filter(c => fold(c) !== 'wishlist');
  const allCats = uniq(S.movies.flatMap(x => x.cats)).sort((a, b) => a.localeCompare(b, 'fr'));
  const v = x => esc(x ?? '');
  const ov = overlay(`<div class="editor">
    <div class="editor-h"><h2>${m ? (opt.bought ? '🎉 Bienvenue dans la collection' : 'Modifier « ' + esc(m.title) + ' »') : 'Ajouter un film'}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <form class="editor-b form-grid" id="edForm" autocomplete="off">
      <div class="c3"><label>Titre *</label><input class="input" name="title" required value="${v(r.title)}"></div>
      <div class="c1"><label>Année</label><input class="input" name="year" type="number" value="${v(r.year)}"></div>
      <div class="c1"><label>Durée (min)</label><input class="input" name="runtime" type="number" value="${v(r.runtime)}"></div>
      <div class="c1"><label>Note /10</label><input class="input" name="rating" type="number" step="0.1" min="0" max="10" value="${v(r.rating)}"></div>
      <div class="c2"><label>Statut</label><select class="select" name="status"><option value="owned"${!wish ? ' selected' : ''}>Collection (ou précommande)</option><option value="wish"${wish ? ' selected' : ''}>Wishlist</option></select></div>
      <div class="c2"><label>Date d'ajout / d'arrivée</label><input class="input" name="added" type="date" value="${v(opt.bought ? TODAY : normDate(r.added) || TODAY)}"></div>
      <div class="c2"><label>Pays</label><input class="input" name="country" list="dlCountry" value="${v(r.country)}"></div>
      <div class="c2"><label>Format</label><select class="select" name="fmt"><option value="4K"${tl.includes('4k') ? ' selected' : ''}>4K UHD</option><option value="blu-ray"${tl.some(t => t.includes('blu')) ? ' selected' : ''}>Blu-ray</option><option value=""${!tl.includes('4k') && !tl.some(t => t.includes('blu')) ? ' selected' : ''}>Non précisé</option></select></div>
      <div class="c2"><label>Édition</label><select class="select" name="ed"><option value="steelbook"${tl.some(t => t.includes('steel')) ? ' selected' : ''}>Steelbook</option><option value="amaray"${tl.includes('amaray') ? ' selected' : ''}>Amaray</option><option value=""${!tl.some(t => t.includes('steel')) && !tl.includes('amaray') ? ' selected' : ''}>Autre / non précisé</option></select></div>
      <div class="c2"><label>Autres tags</label><input class="input" name="otags" placeholder="IMAX, Collector…" value="${v([...(tl.includes('imax') ? ['IMAX'] : []), ...otherTags].join(', '))}"></div>
      <div class="c2"><label>Prix d'achat (€)</label><input class="input" name="price" type="number" step="0.01" value="${v(r.price)}" ${opt.bought ? 'autofocus' : ''}></div>
      <div class="c2"><label>Valeur estimée (€)</label><input class="input" name="marketValue" type="number" step="0.01" value="${v(r.marketValue)}"></div>
      <div class="c2"><label>EAN (code-barres)</label><input class="input" name="ean" value="${v(r.ean)}"></div>
      <div class="c6"><label>Synopsis</label><textarea class="input" name="overview" rows="3">${v(r.overview)}</textarea></div>
      <div class="c3"><label>Réalisateur(s) — séparés par des virgules</label><input class="input" name="directors" value="${v((r.directors || []).join(', '))}"></div>
      <div class="c3"><label>Genres</label><input class="input" name="genres" value="${v((r.genres || []).join(', '))}"></div>
      <div class="c6"><label>Casting</label><input class="input" name="people" value="${v((r.people || []).join(', '))}"></div>
      <div class="c6"><label>Catégories (rangées de l'accueil)</label><div class="chips" id="edCats">${allCats.map(c => `<button type="button" class="chip${cats.includes(c) ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}<input class="input" name="newcat" placeholder="+ nouvelle" style="width:150px;height:30px;border-radius:999px"></div></div>
      <div class="form-sec">Affiches</div>
      <div class="c2"><label>Affiche (portrait)</label><input class="input" name="poster" value="${v(r.poster)}"></div>
      <div class="c2"><label>Image paysage (bannière)</label><input class="input" name="netflixPoster" value="${v(r.netflixPoster)}"></div>
      <div class="c2"><label>Photo de l'édition</label><input class="input" name="altPoster" value="${v(r.altPoster)}"></div>
      <div class="previews"><div style="width:90px;aspect-ratio:2/3" id="pv1"></div><div style="width:200px;aspect-ratio:16/9" id="pv2"></div><div style="width:90px;aspect-ratio:3/4" id="pv3"></div></div>
      <div class="form-sec">Technique</div>
      <div class="c2"><label>Master</label><input class="input" name="resolution" list="dlRes" value="${v(sp.resolution)}"></div>
      <div class="c2"><label>HDR</label><input class="input" name="hdr" list="dlHdr" value="${v(sp.hdr)}"></div>
      <div class="c2"><label>Audio VO</label><input class="input" name="audio" list="dlAudio" value="${v(sp.audio)}"></div>
      <div class="c2"><label>Débit</label><input class="input" name="bitrate" placeholder="60 Mbps" value="${v(sp.bitrate)}"></div>
      <div class="c2"><label>Disque</label><input class="input" name="diskType" placeholder="BD-100" value="${v(sp.diskType)}"></div>
      <div class="c2"><label>Format image</label><input class="input" name="aspectRatio" placeholder="2.39:1" value="${v(sp.aspectRatio)}"></div>
      <div class="c2"><label>Identifiant IMDb</label><input class="input" name="id" placeholder="tt1234567" value="${v(r.id)}"></div>
      <datalist id="dlCountry">${uniq(S.movies.map(x => x.country).filter(Boolean)).map(c => `<option>${esc(c)}</option>`).join('')}</datalist>
      <datalist id="dlRes"><option>4K</option><option>2K</option><option>1080p</option></datalist>
      <datalist id="dlHdr"><option>Dolby Vision</option><option>HDR10</option><option>HDR10+</option></datalist>
      <datalist id="dlAudio"><option>Dolby Atmos</option><option>DTS:X</option><option>DTS-HD MA 5.1</option><option>DTS-HD MA 7.1</option><option>Dolby TrueHD 5.1</option></datalist>
    </form>
    <div class="editor-f">${m ? `<button class="btn danger" id="edDel" style="margin-right:auto">${ICON.trash} Supprimer</button>` : ''}<button class="btn" id="edCopy">Copier le JSON</button><button class="btn" data-close>Annuler</button><button class="btn primary" id="edSave">Enregistrer</button></div>
  </div>`);
  const form = $('#edForm', ov);
  $$('[data-close]', ov).forEach(b => b.onclick = () => closeOverlay(ov));
  $$('#edCats .chip', ov).forEach(b => b.onclick = () => b.classList.toggle('on'));
  const pv = () => { [['poster', 'pv1'], ['netflixPoster', 'pv2'], ['altPoster', 'pv3']].forEach(([n, id]) => { const u = form.elements[n].value.trim(); $('#' + id, ov).innerHTML = u ? img([u], '?') : ''; }); };
  ['poster', 'netflixPoster', 'altPoster'].forEach(n => form.elements[n].addEventListener('change', pv)); pv();
  if (opt.bought) setTimeout(() => form.elements.price.focus(), 300);

  const collect = () => {
    const F = form.elements, val = n => F[n].value.trim(), num = n => val(n) === '' ? undefined : Number(val(n));
    const list = n => val(n).split(',').map(s => s.trim()).filter(Boolean);
    if (!val('title')) { F.title.focus(); toast('Le titre est obligatoire'); return null; }
    const isW = val('status') === 'wish';
    const tags = [val('fmt'), val('ed'), ...list('otags')].filter(Boolean);
    let cats2 = $$('#edCats .chip.on', ov).map(b => b.dataset.c);
    if (val('newcat')) cats2.push(...list('newcat'));
    if (isW) cats2 = ['wishlist', ...cats2];
    const specs = cleanRaw({ resolution: val('resolution'), hdr: val('hdr'), audio: val('audio'), bitrate: val('bitrate'), diskType: val('diskType'), aspectRatio: val('aspectRatio') });
    const base = { ...r };
    delete base.technicalSpecs;
    const id = val('id') || r.id || (slug(val('title')) + (val('year') ? '-' + val('year') : ''));
    return cleanRaw({
      ...base, id, title: val('title'), year: num('year'), price: isW ? undefined : num('price'), marketValue: isW ? undefined : num('marketValue'), ean: val('ean'),
      genres: list('genres'), people: list('people'), directors: list('directors'), runtime: num('runtime'), rating: num('rating'), overview: val('overview'),
      poster: val('poster'), netflixPoster: val('netflixPoster'), altPoster: val('altPoster'), categories: uniq(cats2), technicalSpecs: specs, tags: uniq(tags), country: val('country'), added: val('added') || TODAY,
    });
  };
  $('#edCopy', ov).onclick = () => { const o = collect(); if (!o) return; navigator.clipboard?.writeText(JSON.stringify(o, null, 2) + ',').then(() => toast('JSON copié'), () => toast('Copie impossible')); };
  $('#edSave', ov).onclick = () => {
    const o = collect(); if (!o) return;
    let key;
    if (m) { S.raw[m.i] = o; } else { S.raw.push(o); }
    build(); persist(true);
    key = (m ? S.movies[m.i] : S.movies[S.movies.length - 1]).key;
    closeOverlay(ov);
    if (filmOv) closeOverlay(filmOv);
    refreshBehind();
    toast(m ? 'Modifications enregistrées' : `« ${o.title} » ajouté`);
    setTimeout(() => openFilm(key, [key]), 260);
  };
  const del = $('#edDel', ov);
  if (del) del.onclick = () => {
    if (!confirm(`Supprimer « ${m.title} » de la collection ?`)) return;
    S.raw.splice(m.i, 1); delete S.user.seen[m.key]; delete S.user.ratings[m.key]; saveUser();
    build(); persist(true); closeAll(); refreshBehind(); toast('Film supprimé');
  };
}

/* ==========================================================
   RECHERCHE GLOBALE (Ctrl+K)
   ========================================================== */
const PAGES = [['Accueil', '#/'], ['Ma collection', '#/collection'], ['Wishlist', '#/wishlist'], ['Prochainement', '#/prochainement'], ['Steelbooks', '#/steelbooks'], ['Statistiques', '#/stats'], ['Bingo', '#/bingo'], ['Données & réglages', '#/reglages']];
function openPalette() {
  if ($('.palette')) return;
  const ov = overlay(`<div class="palette"><div class="palette-in">${ICON.search}<input id="palQ" placeholder="Film, réalisateur, acteur, page…" autocomplete="off"><span class="kbd">Échap</span></div><div class="pal-list" id="palList"></div>
    <div class="pal-foot"><span>↑↓ naviguer</span><span>↵ ouvrir</span><span>Ctrl+K pour revenir ici</span></div></div>`);
  const inp = $('#palQ', ov), box = $('#palList', ov);
  let items = [], sel = 0;
  const people = {};
  S.movies.forEach(m => [...m.directors, ...m.people].forEach(p => people[p] = (people[p] || 0) + 1));
  const hl = (t, q) => { if (!q) return esc(t); const i = fold(t).indexOf(fold(q)); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };
  const stLabel = { owned: 'Collection', wish: 'Wishlist', soon: 'Prochainement' };
  const render = () => {
    const q = inp.value.trim();
    const films = q ? searchMovies(q, S.movies).slice(0, 8) : [...list('owned')].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 5);
    const ppl = q ? Object.entries(people).filter(([p]) => fold(p).includes(fold(q))).sort((a, b) => b[1] - a[1]).slice(0, 5) : [];
    const pages = PAGES.filter(([t]) => !q || fold(t).includes(fold(q)));
    items = [];
    let h = '';
    if (films.length) { h += `<div class="pal-sec">${q ? 'Films' : 'Ajouts récents'}</div>`; films.forEach(m => { items.push(() => { closeOverlay(ov); openFilm(m.key, [m.key]); }); h += `<div class="pal-item" data-i="${items.length - 1}"><div class="th">${img(posterSrc(m), '')}</div><div class="tx"><div class="tt">${hl(m.title, q)}</div><div class="ts">${[m.year, m.directors[0], stLabel[m.status], m.fmt, m.steel && 'Steelbook'].filter(Boolean).join(' · ')}</div></div></div>`; }); }
    if (ppl.length) { h += '<div class="pal-sec">Personnes</div>'; ppl.forEach(([p, c]) => { items.push(() => { closeOverlay(ov); location.hash = '#/personne/' + encodeURIComponent(p); }); h += `<div class="pal-item" data-i="${items.length - 1}"><div class="av">${avatar(p)}</div><div class="tx"><div class="tt">${hl(p, q)}</div><div class="ts">${plural(c, 'film')}</div></div></div>`; }); }
    if (pages.length) { h += '<div class="pal-sec">Pages</div>'; pages.forEach(([t, u]) => { items.push(() => { closeOverlay(ov); location.hash = u; }); h += `<div class="pal-item" data-i="${items.length - 1}"><div class="tx"><div class="tt">${hl(t, q)}</div></div></div>`; }); }
    if (!items.length) h = '<div class="empty" style="padding:40px">Aucun résultat</div>';
    box.innerHTML = h; sel = 0; paint();
  };
  const paint = () => $$('.pal-item', box).forEach(el => el.classList.toggle('sel', +el.dataset.i === sel)) || $(`.pal-item[data-i="${sel}"]`, box)?.scrollIntoView({ block: 'nearest' });
  inp.addEventListener('input', debounce(render, 60));
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); paint(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); }
    else if (e.key === 'Enter') { items[sel]?.(); e.preventDefault(); }
  });
  box.addEventListener('mousemove', e => { const it = e.target.closest('.pal-item'); if (it && +it.dataset.i !== sel) { sel = +it.dataset.i; paint(); } });
  box.addEventListener('click', e => { const it = e.target.closest('.pal-item'); if (it) items[+it.dataset.i](); });
  render(); setTimeout(() => inp.focus(), 30);
}

/* ==========================================================
   QUE REGARDER CE SOIR ?
   ========================================================== */
function openRandom() {
  const o = list('owned');
  const genres = uniq(o.flatMap(m => m.genres)).sort((a, b) => a.localeCompare(b, 'fr'));
  const ov = overlay(`<div class="editor" style="width:min(520px,100%)"><div class="editor-h"><h2>🎲 Que regarder ce soir ?</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="roulette"><div class="roul-stage" id="rStage"><div class="ph">?</div></div><div class="roul-title" id="rTitle">Prêt à tirer au sort</div><div class="muted" id="rSub" style="margin-top:6px;min-height:22px"></div>
    <div class="form-grid" style="text-align:left;margin-top:18px">
      <div class="c3"><label>Genre</label><select class="select" id="rG"><option value="">Peu importe</option>${genres.map(g => `<option>${esc(g)}</option>`).join('')}</select></div>
      <div class="c3"><label>Durée</label><select class="select" id="rD"><option value="">Peu importe</option><option value="105">Moins de 1h45</option><option value="130">Moins de 2h10</option><option value="999">Une grosse soirée</option></select></div>
      <div class="c6"><label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:14px;color:var(--text);font-weight:500"><input type="checkbox" id="rU" checked style="accent-color:var(--accent);width:16px;height:16px"> Seulement les films que je n'ai pas encore vus</label></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:18px"><button class="btn primary" id="rGo">${ICON.dice} Lancer</button><button class="btn hidden" id="rOpen">${ICON.info} Voir la fiche</button></div></div></div>`);
  $('[data-close]', ov).onclick = () => closeOverlay(ov);
  let spinning = false, winner = null;
  $('#rGo', ov).onclick = () => {
    if (spinning) return;
    const g = $('#rG', ov).value, d = +$('#rD', ov).value, u = $('#rU', ov).checked;
    let pool = o.filter(m => (!g || m.genres.includes(g)) && (!u || !isSeen(m)) && (!d || (d === 999 ? m.runtime > 150 : m.runtime && m.runtime <= d)));
    if (!pool.length) { $('#rTitle', ov).textContent = 'Aucun film ne correspond'; $('#rSub', ov).textContent = 'Assouplis les critères.'; return; }
    spinning = true; $('#rOpen', ov).classList.add('hidden');
    const stage = $('#rStage', ov); stage.classList.remove('win');
    const pre = shuffle(pool).slice(0, 20); pre.forEach(m => { const i = new Image(); i.src = m.poster; });
    winner = pool[Math.random() * pool.length | 0];
    let t = 0, delay = 60, n = 0;
    const tick = () => {
      const m = n > 0 && delay > 340 ? winner : pre[n++ % pre.length];
      stage.innerHTML = img(posterSrc(m), m.title); $('#rTitle', ov).textContent = m.title; $('#rSub', ov).textContent = '';
      if (m === winner && delay > 340) {
        spinning = false; stage.classList.add('win');
        $('#rSub', ov).innerHTML = `${[winner.year, fmtRt(winner.runtime), winner.directors[0]].filter(Boolean).join(' · ')} — sur ${plural(pool.length, 'candidat')}`;
        $('#rGo', ov).innerHTML = ICON.dice + ' Relancer'; $('#rOpen', ov).classList.remove('hidden'); return;
      }
      delay *= 1.12; t += delay; setTimeout(tick, delay);
    };
    tick();
  };
  $('#rOpen', ov).onclick = () => { closeOverlay(ov); setTimeout(() => openFilm(winner.key, [winner.key]), 200); };
}

/* ==========================================================
   RÉGLAGES & QUALITÉ DES DONNÉES
   ========================================================== */
function issues() {
  const out = [];
  const add = (ic, t, films, hint) => films.length && out.push({ ic, t, films, hint });
  const ids = {}; S.movies.forEach(m => m.id && (ids[m.id] ||= []).push(m));
  Object.entries(ids).filter(([, a]) => a.length > 1).forEach(([id, a]) => add('🆔', `Identifiant en double : ${id}`, a, 'Chaque film doit avoir son propre ID (IMDb). Le site les distingue, mais corrige-les à la source.'));
  const titles = {}; S.movies.forEach(m => (titles[tkey(m.title) + m.year] ||= []).push(m));
  Object.values(titles).filter(a => a.length > 1).forEach(a => add('👯', `Film présent plusieurs fois : ${a[0].title}`, a));
  add('🖼️', 'Sans affiche', S.movies.filter(m => !m.poster));
  add('📅', 'Date d\'ajout mal formée (ex. « 2026-6-10 »)', S.movies.filter(m => m.raw.added && m.raw.added !== m.added), 'Corrigée automatiquement à l\'affichage ; un export la remet au bon format.');
  add('🏷️', 'Possédés sans prix d\'achat', list('owned').filter(m => m.price == null));
  add('⚙️', 'Possédés sans infos techniques', list('owned').filter(m => !Object.keys(m.specs).length));
  add('🗂️', 'Possédés sans catégorie (absents des rangées de l\'accueil)', list('owned').filter(m => !m.cats.length));
  add('💿', 'Sans format (4K / Blu-ray)', S.movies.filter(m => !m.fmt));
  add('🔢', 'Année suspecte', S.movies.filter(m => !m.year || m.year < 1890 || m.year > nowD.getFullYear() + 2 || (m.added && m.year > +m.added.slice(0, 4) + 1)));
  return out;
}
function renderSettings() {
  const iss = issues();
  const nSeen = Object.keys(S.user.seen).length, nRat = Object.keys(S.user.ratings).length;
  const src = { file: 'Fichier <code>data/movies.json</code>', local: 'Copie enregistrée dans ce navigateur', none: 'Aucune donnée chargée' }[S.source];
  view.innerHTML = `<div class="page wrap"><div class="page-head"><div><h1 class="page-title">Données & réglages</h1><div class="page-sub">Source actuelle : ${src} · ${plural(S.movies.length, 'film')}</div></div></div>
  <div class="set-grid">
    <div class="set-card"><h3>📦 Ma collection</h3><p>Les ajouts et modifications faits sur le site sont gardés dans ce navigateur. Exporte <code>movies.json</code> puis remplace celui du dossier <code>data/</code> pour les rendre permanents.</p>
      <div class="btns"><button class="btn primary" id="sExp">${ICON.dl} Exporter movies.json</button><button class="btn" id="sImp">${ICON.ul} Importer un JSON</button>
      ${S.source === 'local' && S.fileAvailable ? '<button class="btn danger" id="sReset">Revenir au fichier data/movies.json</button>' : ''}</div></div>
    <div class="set-card"><h3>👁️ Mes données perso</h3><p>${nSeen} films vus et ${nRat} notes personnelles, gardés dans ce navigateur. Fais une sauvegarde pour les retrouver sur un autre appareil.</p>
      <div class="btns"><button class="btn" id="sUExp">${ICON.dl} Sauvegarder</button><button class="btn" id="sUImp">${ICON.ul} Restaurer</button></div></div>
    <div class="set-card"><h3>⌨️ Raccourcis</h3><p style="line-height:2"><span class="kbd">Ctrl K</span> ou <span class="kbd">/</span> rechercher · <span class="kbd">R</span> film au hasard · <span class="kbd">N</span> ajouter un film · <span class="kbd">← →</span> film précédent / suivant · <span class="kbd">Échap</span> fermer</p></div>
  </div>
  <div class="section-title">Qualité des données · ${iss.length ? plural(iss.length, 'point') + ' à vérifier' : 'tout est propre ✨'}</div>
  <div>${iss.map(x => `<div class="issue"><span class="ic">${x.ic}</span><div><b>${esc(x.t)}</b> <span class="dim">(${x.films.length})</span>${x.hint ? `<div class="dim" style="font-size:13px">${esc(x.hint)}</div>` : ''}<div class="films" data-ctx>${x.films.slice(0, 40).map(m => `<span data-k="${esc(m.key)}">${esc(m.title)}</span>`).join(', ')}${x.films.length > 40 ? ` … +${x.films.length - 40}` : ''}</div></div></div>`).join('')}</div></div>`;
  $('#sExp').onclick = exportCollection;
  $('#sImp').onclick = pickFile;
  $('#sReset') && ($('#sReset').onclick = () => { if (!confirm('Abandonner les modifications non exportées et recharger data/movies.json ?')) return; localStorage.removeItem(LS.col); location.reload(); });
  $('#sUExp').onclick = () => download('mes-donnees-cinematheque.json', { seen: S.user.seen, ratings: S.user.ratings });
  $('#sUImp').onclick = pickFile;
}
function renderWelcome() {
  view.innerHTML = `<div class="page wrap" style="max-width:720px"><div class="empty" style="padding-top:40px"><div class="big">🎬</div><h3 style="font-size:28px">Bienvenue dans ta Cinémathèque</h3>
  <p>La collection n'a pas pu être lue automatiquement. C'est normal si la page est ouverte en double-cliquant sur <code>index.html</code> : les navigateurs bloquent alors la lecture de <code>data/movies.json</code>.</p></div>
  <div class="dropzone" id="drop"><p style="margin-top:0"><b>Glisse ton fichier movies.json ici</b><br><span class="muted">ou</span></p><button class="btn primary" id="wImp">${ICON.ul} Choisir le fichier</button>
  <p class="dim" style="font-size:13px;margin-bottom:0">Il sera mémorisé dans ce navigateur : plus besoin de le réimporter.</p></div>
  <p class="muted" style="font-size:14px;margin-top:20px">Astuce : lance plutôt le site avec <b>« Lancer le site.bat »</b> (Windows) ou <b>« Lancer le site.command »</b> (Mac). Il s'ouvre alors sur <code>http://localhost:8000</code> et lit <code>data/movies.json</code> tout seul.</p></div>`;
  $('#wImp').onclick = pickFile;
}
['dragover', 'dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => {
  const dz = $('#drop'); if (!e.dataTransfer?.types?.includes('Files')) return;
  e.preventDefault();
  if (ev === 'dragover') dz?.classList.add('drag'); else dz?.classList.remove('drag');
  if (ev === 'drop') { const f = e.dataTransfer.files[0]; if (f) f.text().then(importText); }
}));

/* ==========================================================
   Démarrage & raccourcis
   ========================================================== */
$('#openSearch').onclick = openPalette;
$('#openRandom').onclick = openRandom;
$('#openAdd').onclick = () => openEditor(null);
const totop = $('#totop');
window.addEventListener('scroll', () => totop.classList.toggle('show', scrollY > 700), { passive: true });
totop.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
  if (e.key === 'Escape' && stack.length) { e.preventDefault(); closeOverlay(); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (filmOv && stack[stack.length - 1] === filmOv) {
    if (e.key === 'ArrowLeft') { navFilm(-1); e.preventDefault(); return; }
    if (e.key === 'ArrowRight') { navFilm(1); e.preventDefault(); return; }
  }
  if (stack.length) return;
  if (e.key === '/') { e.preventDefault(); openPalette(); }
  else if (e.key.toLowerCase() === 'r' && S.movies.length) openRandom();
  else if (e.key.toLowerCase() === 'n') openEditor(null);
});

(async () => { await load(); renderNotice(); route(); })();
