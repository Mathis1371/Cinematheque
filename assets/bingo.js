/* ==========================================================
   Cinémathèque — BINGO : les défis du collectionneur
   Chargé après app.js (utilise ses utilitaires et son état).
   ========================================================== */
'use strict';

const REFS = window.REFS || { referenceFilmographies: {}, referenceSagas: {}, referenceActors: {}, sagaPhotos: {} };

/* Données perso du Bingo (gardées avec « vus » et « notes », donc dans la sauvegarde) */
S.user.bingos ??= [];      // défis perso : [{ id, name, ic, titles: [] }]
S.user.bingoPins ??= [];   // défis épinglés : ['type|nom']
S.user.bingoDone ??= {};   // défis complétés : { 'type|nom': 'AAAA-MM-JJ' }
S.ui.bingo = { q: '', f: 'all', sort: 'pct', cf: 'all', ...(S.ui.bingo || {}) };

const BINGO = {
  directors: { t: 'Réalisateurs', one: 'Réalisateur', ic: '🎬', ref: () => REFS.referenceFilmographies || {}, d: 'Complète les filmographies cultes' },
  sagas: { t: 'Sagas', one: 'Saga', ic: '🍿', ref: () => REFS.referenceSagas || {}, d: 'Rassemble les grandes franchises' },
  actors: { t: 'Acteurs', one: 'Acteur', ic: '⭐', ref: () => REFS.referenceActors || {}, d: 'Collectionne les films des stars' },
  custom: { t: 'Mes défis', one: 'Défi perso', ic: '✨', ref: () => Object.fromEntries(S.user.bingos.map(b => [b.name, b.titles])), d: 'Tes propres listes à compléter' },
};
const BTYPES = Object.keys(BINGO);
const bid = (type, name) => type + '|' + name;
const bhref = (type, name) => `#/bingo/${type}/${encodeURIComponent(name)}`;
const avCls = type => type === 'sagas' ? ' sq' : type === 'custom' ? ' emo' : '';

/* ---------- Correspondance des titres ----------
   Plus tolérante qu'avant : chiffres romains (II = 2), ordinaux (3e = 3ème),
   « & » = « et », et une faute de frappe d'écart sur les titres longs. */
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
function bkey(s) {
  return fold(s).replace(/&/g, ' et ')
    .replace(/\b(\d+)\s*(?:eme|e|er|re|nd|nde)\b/g, '$1')
    .replace(/\b(viii|vii|vi|iv|ix|iii|ii|i|v|x)\b/g, w => ROMAN[w])
    .replace(/[^a-z0-9]+/g, '');
}
let BIX = null;
function bIndex() {
  if (BIX && BIX.src === S.movies) return BIX;
  const map = new Map();
  S.movies.forEach(m => { const k = bkey(m.title); if (!map.has(k)) map.set(k, []); map.get(k).push(m); });
  return (BIX = { src: S.movies, map, keys: [...map.keys()], near: new Map() });
}
function bFind(title) {
  const I = bIndex(), k = bkey(title);
  const hit = I.map.get(k);
  if (hit) return hit;
  if (k.length < 9) return [];
  if (!I.near.has(k)) I.near.set(k, I.keys.find(x => Math.abs(x.length - k.length) <= 1 && lev(x, k) <= 1) || null);
  const n = I.near.get(k);
  return n ? I.map.get(n) : [];
}

/* ---------- État d'un défi ---------- */
function bingoState(type, name) {
  const titles = BINGO[type]?.ref()?.[name] || [];
  const nk = tkey(name);
  const credited = m => (type === 'actors' ? m.people : m.directors).some(p => tkey(p) === nk);
  const pick = (cands, ok) => {
    if (type === 'sagas' || type === 'custom') return cands.find(ok) || null;
    // Réalisateurs : on vérifie le crédit. Acteurs : le casting est souvent partiel,
    // donc un titre sans homonyme est accepté même si l'acteur n'est pas listé.
    return cands.find(m => ok(m) && credited(m)) || (type === 'actors' && cands.length === 1 && ok(cands[0]) ? cands[0] : null);
  };
  const cells = titles.map((title, i) => {
    const c = bFind(title);
    const own = pick(c, m => m.owned);
    const pend = own ? null : pick(c, m => !m.owned);
    return { title, i, own, pend, other: pend, seen: !!own && isSeen(own) };
  });
  const total = cells.length, owned = cells.filter(c => c.own).length;
  return {
    type, name, cells, total, owned, left: total - owned,
    pending: cells.filter(c => c.pend).length, wish: cells.filter(c => c.pend?.wish).length, soon: cells.filter(c => c.pend?.soon).length,
    seen: cells.filter(c => c.seen).length,
    pct: total ? Math.floor(owned / total * 100) : 0, done: total > 0 && owned === total,
  };
}
const bingoAll = () => BTYPES.flatMap(t => Object.keys(BINGO[t].ref()).map(n => bingoState(t, n)));
function bingoFind(id) { const i = id.indexOf('|'); const t = id.slice(0, i), n = id.slice(i + 1); return BINGO[t] && BINGO[t].ref()[n] ? bingoState(t, n) : null; }

/* ---------- Complétions & célébration ---------- */
function bingoSync(states) {
  const D = S.user.bingoDone;
  const first = !S.user.bingoInit;
  if (first) states = bingoAll();
  let changed = first; const fresh = [];
  states.forEach(s => {
    const id = bid(s.type, s.name);
    if (s.done && !(id in D)) { D[id] = first ? '?' : TODAY; changed = true; if (!first) fresh.push(s); }
    else if (!s.done && id in D) { delete D[id]; changed = true; }
  });
  if (first) S.user.bingoInit = 1;
  if (changed) saveUser();
  if (fresh.length) setTimeout(() => { confetti(); toast(fresh.length === 1 ? `🏆 BINGO ! « ${fresh[0].name} » est complété` : `🏆 ${fresh.length} nouveaux bingos complétés !`); }, 400);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = ['#e5383b', '#f5c518', '#3ecf8e', '#5aa9ff', '#b38cff', '#ffffff'];
  const box = document.createElement('div');
  box.className = 'confetti';
  box.innerHTML = Array.from({ length: 110 }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${cols[Math.random() * cols.length | 0]};width:${6 + Math.random() * 6 | 0}px;height:${8 + Math.random() * 9 | 0}px;animation-delay:${(Math.random() * .7).toFixed(2)}s;animation-duration:${(2.3 + Math.random() * 1.7).toFixed(2)}s;--dx:${(Math.random() * 260 - 130) | 0}px;--r:${(Math.random() * 1080 - 540) | 0}deg"></i>`).join('');
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 5000);
}

/* ---------- Petits gabarits ---------- */
function bingoAvatar(type, name, st) {
  if (type === 'sagas') { const u = REFS.sagaPhotos?.[name]; const own = st?.cells.find(c => c.own)?.own; return img([u, own?.poster], name); }
  if (type === 'custom') { const b = S.user.bingos.find(x => x.name === name); return `<div class="bemo">${esc(b?.ic || '🎯')}</div>`; }
  return avatar(name);
}
function bRing(pct, size, sw, label) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, off = c * (1 - pct / 100), h = size / 2;
  return `<div class="bring${pct >= 100 ? ' done' : ''}" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="t" cx="${h}" cy="${h}" r="${r}" stroke-width="${sw}"/><circle class="f" cx="${h}" cy="${h}" r="${r}" stroke-width="${sw}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" data-off="${off.toFixed(1)}" transform="rotate(-90 ${h} ${h})"/></svg>
    <div class="v"><b>${pct}<small>%</small></b>${label ? `<span>${label}</span>` : ''}</div></div>`;
}
const bProg = (pct, done, h) => `<div class="prog${done ? ' done' : ''}"${h ? ` style="height:${h}px"` : ''}><div style="width:0" data-w="${pct}"></div></div>`;
function bAnimate() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('.bring .f[data-off]', view).forEach(c => { c.style.strokeDashoffset = c.dataset.off; c.removeAttribute('data-off'); });
    $$('.prog [data-w]', view).forEach(d => { d.style.width = d.dataset.w + '%'; d.removeAttribute('data-w'); });
  }));
}
const bStrip = s => `<div class="bstrip" aria-hidden="true">${s.cells.map(c => `<i class="${c.own ? 'o' : c.pend ? (c.pend.wish ? 'w' : 's') : ''}" title="${esc(c.title)}"></i>`).join('')}</div>`;
const bStatus = s => s.done ? '🏆 Complété' : !s.owned ? 'Pas commencé' : s.left === 1 ? '🔥 Plus qu’un film !' : s.left <= 3 ? `🔥 Plus que ${s.left} films` : `${s.left} films restants`;
function bCard(s, showType) {
  const pinned = S.user.bingoPins.includes(bid(s.type, s.name));
  const miss = !s.done && s.owned && s.left <= 3 ? s.cells.filter(c => !c.own).map(c => c.title) : [];
  return `<div class="bwrap"><a class="bcard${s.done ? ' done' : ''}" href="${bhref(s.type, s.name)}">
    <div class="top"><div class="av${avCls(s.type)}">${bingoAvatar(s.type, s.name, s)}</div>
      <div style="min-width:0"><div class="nm">${esc(s.name)}</div><div class="sc">${showType ? `${BINGO[s.type].ic} ${BINGO[s.type].one} · ` : ''}${s.owned} / ${s.total} films${s.pending ? ` · <span class="pd">${s.pending} en attente</span>` : ''}</div></div></div>
    ${bStrip(s)}
    ${miss.length ? `<div class="bmiss-l"><span>Manque :</span> ${miss.map(esc).join(' · ')}</div>` : ''}
    <div class="bfoot">${bProg(s.pct, s.done)}<div class="pc"><span>${bStatus(s)}</span><span>${s.pct} %</span></div></div></a>
    <button class="bpin${pinned ? ' on' : ''}" data-pin="${esc(bid(s.type, s.name))}" title="${pinned ? 'Désépingler' : 'Épingler sur la page Bingo'}" aria-label="Épingler">${pinned ? '★' : '☆'}</button></div>`;
}
const bChip = (s, extra = '') => `<a class="bchip" href="${bhref(s.type, s.name)}"><span class="av${avCls(s.type)}">${bingoAvatar(s.type, s.name, s)}</span><span>${esc(s.name)}</span><span class="dim">${extra || s.pct + ' %'}</span></a>`;
function togglePin(id) {
  const P = S.user.bingoPins, i = P.indexOf(id);
  if (i >= 0) P.splice(i, 1); else P.push(id);
  saveUser(); toast(i >= 0 ? 'Défi désépinglé' : '★ Défi épinglé sur la page Bingo');
}
function bBind(redraw) {
  $$('[data-pin]', view).forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); togglePin(b.dataset.pin); redraw(); });
  $$('[data-wish]', view).forEach(b => b.onclick = e => { e.stopPropagation(); bWish(b.dataset.wish, (b.dataset.for || '').split('¦').filter(Boolean)); });
  $$('[data-shop]', view).forEach(b => b.onclick = e => { e.stopPropagation(); bShop(b.dataset.shop); });
  bAnimate();
}
/* Ajout à la wishlist pré-rempli (titre + réalisateur / acteur du défi) */
function bWish(title, ids) {
  const st = ids.map(bingoFind).filter(Boolean);
  const d = st.filter(s => s.type === 'directors').map(s => s.name), p = st.filter(s => s.type === 'actors').map(s => s.name);
  openEditor(null, { wish: true, prefill: { title, ...(d.length ? { directors: d } : {}), ...(p.length ? { people: p } : {}) } });
}
function bShop(title) {
  const ov = overlay(`<div class="editor" style="width:min(520px,100%)"><div class="editor-h"><h2>🛒 ${esc(title)}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="editor-b"><p class="muted" style="margin-top:0">Chercher une édition 4K / steelbook :</p>
    <div class="shops">${shopLinks({ title, steel: true, fmt: '4K' }).map(([n, u, c]) => `<a class="shop" href="${u}" target="_blank" rel="noopener" style="color:${c}">${n}${ICON.ext}</a>`).join('')}</div></div></div>`);
  $$('[data-close]', ov).forEach(b => b.onclick = () => closeOverlay(ov));
}
const section = (t, body, sub) => `<div class="section-title">${t}${sub ? ` <span class="st-sub">${sub}</span>` : ''}</div>${body}`;

/* ==========================================================
   ACCUEIL DU BINGO
   ========================================================== */
function bStrategic(all) {
  const map = new Map();
  all.forEach(s => {
    if (s.done) return;
    s.cells.forEach(c => {
      if (c.own || c.pend?.soon) return;
      const k = bkey(c.title);
      const e = map.get(k) || { title: c.title, film: null, chals: [] };
      if (!e.chals.includes(s)) e.chals.push(s);
      if (c.pend && !e.film) e.film = c.pend;
      map.set(k, e);
    });
  });
  return [...map.values()].map(e => {
    const fin = e.chals.filter(s => s.left === 1), close = e.chals.filter(s => s.left > 1 && s.left <= 3);
    return { ...e, fin, score: e.chals.length + fin.length * 3 + close.length + sum(e.chals, s => s.pct) / 400 };
  }).filter(e => e.chals.length > 1 || e.fin.length).sort((a, b) => b.score - a.score);
}
function bRecent(all) {
  const map = new Map();
  all.forEach(s => s.cells.forEach(c => { if (!c.own) return; const e = map.get(c.own.key) || { m: c.own, names: [] }; e.names.push(s.name); map.set(c.own.key, e); }));
  return [...map.values()].filter(e => e.m.added).sort((a, b) => b.m.added.localeCompare(a.m.added)).slice(0, 16);
}
function renderBingoHub() {
  rowId = 0;
  const all = bingoAll(); bingoSync(all);
  const tot = sum(all, s => s.total), own = sum(all, s => s.owned);
  const done = all.filter(s => s.done), near = all.filter(s => !s.done && s.owned && s.left <= 3);
  const pend = sum(all, s => s.pending);
  const D = S.user.bingoDone;
  const lastDone = done.filter(s => /^\d/.test(D[bid(s.type, s.name)] || '')).sort((a, b) => D[bid(b.type, b.name)].localeCompare(D[bid(a.type, a.name)]))[0];
  const posters = shuffle(list('owned').filter(m => m.poster));
  const pins = S.user.bingoPins.map(bingoFind).filter(Boolean);
  const close = all.filter(s => !s.done && s.owned && !S.user.bingoPins.includes(bid(s.type, s.name))).sort((a, b) => a.left - b.left || b.pct - a.pct).slice(0, 6);
  const strat = bStrategic(all).slice(0, 8);
  const recent = bRecent(all), rNames = new Map(recent.map(r => [r.m.key, r.names]));
  const kpi = (ic, k, v, s) => `<div class="kpi"><div class="k">${ic} ${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;

  view.innerHTML = `<div class="page wrap bingo-page">
  <div class="page-head"><div><h1 class="page-title">Bingo</h1><div class="page-sub">Les défis du collectionneur : complète les filmographies, les sagas et les carrières.</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="bRand">${ICON.dice} Un défi au hasard</button><button class="btn primary" id="bNew">+ Créer un défi</button></div></div>
  <div class="bhero">
    ${bRing(tot ? Math.floor(own / tot * 100) : 0, 150, 12, 'des cases cochées')}
    <div class="kpis">
      ${kpi('🏆', 'Défis complétés', `${done.length}<small>/ ${all.length}</small>`, lastDone ? `dernier : ${esc(lastDone.name)}` : done.length ? 'bravo !' : 'le premier t’attend')}
      ${kpi('✅', 'Cases cochées', `${own}<small>/ ${tot}</small>`, `${tot - own} films encore à trouver`)}
      ${kpi('🔥', 'Presque finis', near.length, 'à 3 films ou moins du bingo')}
      ${kpi('⏳', 'En attente', pend, 'cases en wishlist ou précommandées')}
    </div></div>
  <div class="hub">${BTYPES.map((k, i) => {
    const b = BINGO[k], st = all.filter(s => s.type === k);
    const d = st.filter(s => s.done).length, avg = Math.round(sum(st, s => s.pct) / Math.max(1, st.length));
    return `<a class="hub-card" href="#/bingo/${k}"><div class="mosaic">${posters.slice(i * 8, i * 8 + 8).map(m => img([m.poster], '')).join('')}</div>
      <div style="font-size:34px">${b.ic}</div><h3>${b.t}</h3><p>${st.length ? b.d : 'Crée ta propre liste : un studio, un genre, un thème…'}</p>
      ${st.length ? `<div style="margin-top:12px">${bProg(avg, avg === 100)}</div><div class="hub-pills"><span class="pill">${plural(st.length, 'défi')}</span><span class="pill green">${d} complété${d > 1 ? 's' : ''}</span><span class="pill">${avg} % en moyenne</span></div>`
        : '<div class="hub-pills"><span class="pill red">+ Créer mon premier défi</span></div>'}</a>`;
  }).join('')}</div>
  ${pins.length ? section('★ Épinglés', `<div class="bgrid">${pins.map(s => bCard(s, true)).join('')}</div>`) : ''}
  ${close.length ? section('🔥 Si près du but', `<div class="bgrid">${close.map(s => bCard(s, true)).join('')}</div>`, 'les défis les plus proches du bingo') : ''}
  ${strat.length ? section('🛒 Achats stratégiques', `<div class="strat">${strat.map((e, i) => `<div class="srow">
      <span class="rk">${i + 1}</span>
      <div class="th">${e.film ? `<div data-k="${esc(e.film.key)}" style="height:100%">${img(posterSrc(e.film), '')}</div>` : '<div class="ph" style="font-size:22px">📼</div>'}</div>
      <div class="tx"><div class="tt">${esc(e.title)}${e.film?.wish ? ' <span class="pill purple">Wishlist</span>' : ''}</div>
        <div class="ts">Fait avancer ${plural(e.chals.length, 'défi')}${e.fin.length ? ` · <b class="gold">🏆 complète ${e.fin.map(s => esc(s.name)).join(', ')}</b>` : ''}</div>
        <div class="chs">${e.chals.map(s => bChip(s)).join('')}</div></div>
      <div class="ac">${e.film?.wish ? '' : `<button class="btn sm" data-wish="${esc(e.title)}" data-for="${esc(e.chals.map(s => bid(s.type, s.name)).join('¦'))}">+ Wishlist</button>`}<button class="btn sm" data-shop="${esc(e.title)}" title="Où l’acheter ?">${ICON.cart}</button></div></div>`).join('')}</div>`, 'les films qui font avancer plusieurs défis d’un coup') : ''}
  ${recent.length ? rowHTML('Dernières cases cochées', recent.map(r => r.m), 'poster', { extra: m => `<span class="ok-names">✓ ${esc(rNames.get(m.key).join(', '))}</span>` }) : ''}
  ${done.length ? section('🏆 Palmarès', `<div class="palm">${[...done].sort((a, b) => (D[bid(b.type, b.name)] || '').localeCompare(D[bid(a.type, a.name)] || '')).map(s => { const dt = D[bid(s.type, s.name)]; return `<a class="medal" href="${bhref(s.type, s.name)}"><div class="av${avCls(s.type)}">${bingoAvatar(s.type, s.name, s)}</div><div class="nm">${esc(s.name)}</div><div class="sc">${BINGO[s.type].one} · ${s.total} films</div><div class="dt">${dt && dt !== '?' ? 'le ' + fmtDate(dt) : 'complété'}</div></a>`; }).join('')}</div>`, `${done.length} / ${all.length}`) : ''}
  </div>`;
  initRows(view);
  bBind(renderBingoHub);
  $('#bNew').onclick = () => openBingoEditor();
  $('#bRand').onclick = () => {
    const pool = all.filter(s => !s.done && s.owned);
    const s = (pool.length ? pool : all)[Math.random() * (pool.length || all.length) | 0];
    if (s) location.hash = bhref(s.type, s.name);
  };
}

/* ==========================================================
   LISTE D'UNE CATÉGORIE
   ========================================================== */
const BFILTERS = {
  all: ['Tous', () => true], run: ['En cours', s => s.owned && !s.done], near: ['Presque finis', s => !s.done && s.owned && s.left <= 3],
  done: ['Complétés', s => s.done], none: ['Pas commencés', s => !s.owned],
};
const BSORTS = {
  pct: ['Progression', (a, b) => b.pct - a.pct || a.left - b.left], left: ['Films restants', (a, b) => a.done - b.done || a.left - b.left],
  name: ['Nom', (a, b) => a.name.localeCompare(b.name, 'fr')], size: ['Taille de la liste', (a, b) => b.total - a.total],
};
function renderBingoList(type) {
  const b = BINGO[type], U = S.ui.bingo;
  const all = Object.keys(b.ref()).map(n => bingoState(type, n)); bingoSync(all);
  const done = all.filter(s => s.done).length, avg = Math.round(sum(all, s => s.pct) / Math.max(1, all.length));
  if (!BFILTERS[U.f]) U.f = 'all';
  if (!BSORTS[U.sort]) U.sort = 'pct';
  view.innerHTML = `<div class="page wrap bingo-page">
  <div class="page-head"><div><a href="#/bingo" class="muted" style="font-size:14px">‹ Bingo</a><h1 class="page-title">${b.ic} ${b.t}</h1>
    <div class="page-sub">${b.d}${all.length ? ` · ${plural(all.length, 'défi')} · ${done} complété${done > 1 ? 's' : ''} · ${avg} % en moyenne` : ''}</div></div>
    ${type === 'custom' ? '<button class="btn primary" id="bNew">+ Créer un défi</button>' : ''}</div>
  ${all.length ? `<div class="toolbar">
      <div class="field">${ICON.search}<input class="input" id="bq" type="search" placeholder="Nom du défi ou titre d’un film…" value="${esc(U.q)}" autocomplete="off"></div>
      <select class="select" id="bsort" style="width:auto">${Object.entries(BSORTS).map(([k, [l]]) => `<option value="${k}"${U.sort === k ? ' selected' : ''}>Trier : ${l}</option>`).join('')}</select></div>
    <div class="chips" id="bf" style="margin-bottom:18px">${Object.entries(BFILTERS).map(([k, [l, fn]]) => `<button class="chip${U.f === k ? ' on' : ''}" data-f="${k}">${l} <span class="dim">${all.filter(fn).length}</span></button>`).join('')}</div>
    <div id="bres"></div>`
    : `<div class="empty"><div class="big">✨</div><h3>Aucun défi perso pour l’instant</h3><p>Crée ta propre liste à compléter : les films d’un studio, un genre, ta liste de Noël…</p><button class="btn primary" id="bNew2">+ Créer mon premier défi</button></div>`}
  </div>`;
  const draw = () => {
    const q = fold(U.q.trim());
    const res = all.filter(BFILTERS[U.f][1]).filter(s => !q || fold(s.name).includes(q) || s.cells.some(c => fold(c.title).includes(q))).sort(BSORTS[U.sort][1]);
    $('#bres').innerHTML = res.length ? `<div class="bgrid">${res.map(s => bCard(s)).join('')}</div>`
      : `<div class="empty"><div class="big">🔍</div><h3>Aucun défi ne correspond</h3><p>Essaie un autre filtre ou une autre recherche.</p></div>`;
    bBind(draw);
  };
  if (all.length) {
    draw();
    $('#bq').addEventListener('input', debounce(e => { U.q = e.target.value; saveUI(); draw(); }, 120));
    $('#bsort').onchange = e => { U.sort = e.target.value; saveUI(); draw(); };
    $$('#bf .chip').forEach(c => c.onclick = () => { U.f = c.dataset.f; saveUI(); $$('#bf .chip').forEach(x => x.classList.toggle('on', x === c)); draw(); });
  }
  [$('#bNew'), $('#bNew2')].forEach(x => x && (x.onclick = () => openBingoEditor()));
}

/* ==========================================================
   FICHE D'UN DÉFI
   ========================================================== */
function bRelated(s) {
  const keys = new Set(s.cells.map(c => bkey(c.title)));
  return bingoAll().filter(o => !(o.type === s.type && o.name === s.name))
    .map(o => ({ o, n: o.cells.filter(c => keys.has(bkey(c.title))).length })).filter(x => x.n)
    .sort((a, b) => b.n - a.n || b.o.pct - a.o.pct).slice(0, 12);
}
function renderBingoDetail(type, name) {
  const b = BINGO[type], s = bingoState(type, name), U = S.ui.bingo;
  if (!s.total) { location.hash = '#/bingo/' + type; return; }
  bingoSync([s]);
  const id = bid(type, name), pinned = S.user.bingoPins.includes(id), doneAt = S.user.bingoDone[id];
  const isPerson = type === 'directors' || type === 'actors';
  const miss = s.cells.filter(c => !c.own && !c.pend);
  const next = s.cells.filter(c => c.own && !c.seen).map(c => c.own);
  const rel = bRelated(s);
  const forId = esc(id);
  if (!['all', 'own', 'pend', 'miss'].includes(U.cf)) U.cf = 'all';

  view.innerHTML = `<div class="page wrap bingo-page"><a href="#/bingo/${type}" class="muted" style="font-size:14px">‹ ${b.t}</a>
  <div class="bdh${s.done ? ' done' : ''}">
    <div class="person-av${avCls(type)}">${bingoAvatar(type, name, s)}</div>
    <div class="info">
      <div class="kick">${b.ic} ${b.one}</div>
      <h1 class="page-title">${esc(name)}</h1>
      <div class="page-sub">${s.owned} film${s.owned > 1 ? 's' : ''} sur ${s.total} dans la collection${isPerson ? ` · <a class="plink" href="#/personne/${encodeURIComponent(name)}">voir sa page</a>` : ''}</div>
      <div class="bpills"><span class="pill green">✓ ${s.owned} acquis</span>${s.wish ? `<span class="pill purple">🎁 ${s.wish} en wishlist</span>` : ''}${s.soon ? `<span class="pill blue">📅 ${s.soon} à venir</span>` : ''}${miss.length ? `<span class="pill red">✕ ${miss.length} manquant${miss.length > 1 ? 's' : ''}</span>` : ''}${s.owned ? `<span class="pill">👁 ${s.seen} / ${s.owned} vus</span>` : ''}</div>
      ${bStrip(s)}
      <div class="bacts"><button class="btn sm${pinned ? ' on' : ''}" data-pin="${forId}">${pinned ? '★ Épinglé' : '☆ Épingler'}</button>
        ${miss.length ? '<button class="btn sm" id="bCopy">📋 Copier les manquants</button>' : ''}
        ${type === 'custom' ? `<button class="btn sm" id="bEdit">${ICON.edit} Modifier</button><button class="btn sm danger" id="bDel">${ICON.trash} Supprimer</button>` : ''}</div>
    </div>
    ${bRing(s.pct, 150, 12, s.done ? 'BINGO !' : `${s.left} restant${s.left > 1 ? 's' : ''}`)}
  </div>
  ${s.done ? `<div class="bbanner gold">🏆 <span><b>Bingo complété${doneAt && doneAt !== '?' ? ` le ${fmtDate(doneAt)}` : ''}</b> — toute la liste est dans ta collection.${s.seen < s.owned ? ` Prochaine étape : tout regarder (${s.seen} / ${s.owned}).` : ' Et tout est vu. Respect. 👑'}</span></div>`
    : s.owned && s.left <= 3 ? `<div class="bbanner">🔥 <span><b>Plus que ${plural(s.left, 'film')}</b> : ${s.cells.filter(c => !c.own).map(c => esc(c.title)).join(' · ')}</span></div>` : ''}
  ${next.length ? `<div class="bnext" data-k="${esc(next[0].key)}"><div class="th">${img(posterSrc(next[0]), '')}</div><div style="flex:1;min-width:0"><div class="k">👁 Marathon · ${s.seen} / ${s.owned} vus</div><div class="t">À regarder ensuite : <b>${esc(next[0].title)}</b>${next[0].year ? ` <span class="dim">(${next[0].year})</span>` : ''}</div>${bProg(Math.floor(s.seen / s.owned * 100), s.seen === s.owned, 4)}</div><span class="go">${ICON.play}</span></div>` : ''}
  <div class="bdet-tools"><div class="seg sm" id="bcf">${[['all', 'Tous', s.total], ['own', 'Acquis', s.owned], ['pend', 'En attente', s.pending], ['miss', 'Manquants', miss.length]].map(([k, l, n]) => `<button data-v="${k}" class="${U.cf === k ? 'on' : ''}"${n || k === 'all' ? '' : ' disabled'}>${l} · ${n}</button>`).join('')}</div>
    <span class="dim" style="font-size:13px">Numérotés dans l’ordre de la liste</span></div>
  <div class="pgrid bcells" data-ctx id="bcells"></div>
  ${rel.length ? section('🔗 Défis liés', `<div class="chips">${rel.map(({ o, n }) => bChip(o, `${n} en commun · ${o.pct} %`)).join('')}</div>`, 'ils partagent des films avec celui-ci') : ''}
  </div>`;

  const cell = c => {
    const n = `<span class="bnum">${c.i + 1}</span>`;
    if (c.own) return `<div class="pcard" data-k="${esc(c.own.key)}"><div class="bcell own skel">${img(posterSrc(c.own), c.title)}${n}<span class="bstamp">✓</span>${c.seen ? '<span class="mini seen bseen">VU</span>' : ''}</div>
      <div class="pt">${esc(c.own.title)}</div><div class="pm" style="color:var(--green)">${['Acquis', c.own.year, c.own.fmt].filter(Boolean).join(' · ')}</div></div>`;
    if (c.pend) {
      const w = c.pend.wish;
      return `<div class="pcard" data-k="${esc(c.pend.key)}"><div class="bcell pend ${w ? 'wish' : 'soon'}">${img(posterSrc(c.pend), '')}${n}<div style="font-size:30px">${w ? '🎁' : '📅'}</div><div class="lab">${w ? 'Wishlist' : 'Prochainement'}</div>${!w && c.pend.added ? `<div class="dim" style="font-size:12px">${countdown(c.pend.added)}</div>` : ''}</div>
        <div class="pt">${esc(c.title)}</div><div class="pm">${w ? 'Dans ta wishlist' : 'Arrive le ' + fmtDate(c.pend.added)}</div></div>`;
    }
    return `<div class="pcard"><div class="bcell miss">${n}<div style="font-size:30px;opacity:.45">📼</div><div class="lab">Manquant</div>
      <div class="bma"><button class="btn sm" data-wish="${esc(c.title)}" data-for="${forId}">+ Wishlist</button><button class="btn sm" data-shop="${esc(c.title)}">${ICON.cart} Acheter</button></div></div>
      <div class="pt muted">${esc(c.title)}</div></div>`;
  };
  const F = { all: () => true, own: c => c.own, pend: c => c.pend, miss: c => !c.own && !c.pend };
  const draw = () => {
    $('#bcells').innerHTML = s.cells.filter(F[U.cf]).map(cell).join('');
    bBind(() => renderBingoDetail(type, name));
  };
  draw();
  $$('#bcf button').forEach(x => x.onclick = () => { U.cf = x.dataset.v; saveUI(); $$('#bcf button').forEach(y => y.classList.toggle('on', y === x)); draw(); });
  $('#bCopy') && ($('#bCopy').onclick = () => {
    const txt = `${name} — films manquants :\n` + miss.map(c => '• ' + c.title).join('\n');
    (navigator.clipboard?.writeText(txt) || Promise.reject()).then(() => toast(`${plural(miss.length, 'titre')} copié${miss.length > 1 ? 's' : ''}`), () => toast('Copie impossible dans ce navigateur'));
  });
  if (type === 'custom') {
    const cur = S.user.bingos.find(x => x.name === name);
    $('#bEdit').onclick = () => openBingoEditor(cur);
    $('#bDel').onclick = () => {
      if (!confirm(`Supprimer le défi « ${name} » ? (tes films ne sont pas touchés)`)) return;
      S.user.bingos.splice(S.user.bingos.indexOf(cur), 1);
      S.user.bingoPins = S.user.bingoPins.filter(x => x !== id); delete S.user.bingoDone[id];
      saveUser(); toast('Défi supprimé'); location.hash = '#/bingo/custom';
    };
  }
}

/* ==========================================================
   CRÉER / MODIFIER UN DÉFI PERSO
   ========================================================== */
function openBingoEditor(cur) {
  const EMO = ['🎯', '🏆', '🦖', '🚀', '👻', '🎃', '🎄', '🕵️', '🦸', '🧙', '🐉', '🏎️', '🎵', '🤠', '⚔️', '❤️', '🇫🇷', '🎌'];
  const titles = uniq(S.movies.map(m => m.title)).sort((a, b) => a.localeCompare(b, 'fr'));
  const ov = overlay(`<div class="editor" style="width:min(680px,100%)">
    <div class="editor-h"><h2>${cur ? 'Modifier « ' + esc(cur.name) + ' »' : '✨ Nouveau défi'}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <form class="editor-b form-grid" id="bForm" autocomplete="off">
      <div class="c1"><label>Icône</label><input class="input" name="ic" maxlength="8" value="${esc(cur?.ic || '🎯')}" style="text-align:center;font-size:20px"></div>
      <div style="grid-column:span 5"><label>Nom du défi *</label><input class="input" name="name" placeholder="Ex. : Studio Ghibli, Films de Noël, Marvel phase 1…" value="${esc(cur?.name || '')}"></div>
      <div class="c6"><div class="chips" id="bEmo">${EMO.map(e => `<button type="button" class="chip" data-e="${e}">${e}</button>`).join('')}</div></div>
      <div class="c6"><label>Ajouter un film déjà dans ma base</label><div style="display:flex;gap:8px"><input class="input" id="bAddT" list="dlBT" placeholder="Tape un titre puis Entrée…"><button type="button" class="btn" id="bAddB">Ajouter</button></div>
        <datalist id="dlBT">${titles.map(t => `<option value="${esc(t)}">`).join('')}</datalist></div>
      <div class="c6"><label>Films de la liste — un titre par ligne *</label><textarea class="input" name="titles" rows="10" style="padding:12px 14px;line-height:1.6" placeholder="Le Voyage de Chihiro&#10;Princesse Mononoké&#10;Mon voisin Totoro">${esc((cur?.titles || []).join('\n'))}</textarea>
        <div class="dim" id="bCnt" style="font-size:13px;margin-top:8px"></div></div>
    </form>
    <div class="editor-f"><button class="btn" data-close>Annuler</button><button class="btn primary" id="bSave">Enregistrer</button></div></div>`);
  const F = $('#bForm', ov).elements;
  const lines = () => uniq(F.titles.value.split('\n').map(x => x.trim()).filter(Boolean));
  const count = () => {
    const l = lines(); const found = l.map(t => bFind(t));
    const o = found.filter(c => c.some(m => m.owned)).length, p = found.filter(c => !c.some(m => m.owned) && c.length).length;
    $('#bCnt', ov).innerHTML = l.length ? `${plural(l.length, 'film')} · <span style="color:var(--green)">${o} déjà dans ta collection</span>${p ? ` · <span style="color:var(--purple)">${p} en attente</span>` : ''} · ${l.length - o - p} à trouver` : 'Astuce : colle directement une liste copiée depuis un site.';
  };
  const add = () => {
    const t = $('#bAddT', ov).value.trim(); if (!t) return;
    if (!lines().some(x => fold(x) === fold(t))) F.titles.value = (F.titles.value.trim() ? F.titles.value.trim() + '\n' : '') + t;
    $('#bAddT', ov).value = ''; count(); $('#bAddT', ov).focus();
  };
  $$('[data-close]', ov).forEach(x => x.onclick = () => closeOverlay(ov));
  $$('#bEmo .chip', ov).forEach(x => x.onclick = () => { F.ic.value = x.dataset.e; });
  $('#bAddB', ov).onclick = add;
  $('#bAddT', ov).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  F.titles.addEventListener('input', debounce(count, 150));
  count();
  setTimeout(() => (cur ? F.titles : F.name).focus(), 250);
  $('#bSave', ov).onclick = () => {
    const name = F.name.value.trim().replace(/\|/g, '/'), ic = F.ic.value.trim() || '🎯', l = lines();
    if (!name) { F.name.focus(); toast('Donne un nom à ton défi'); return; }
    if (!l.length) { F.titles.focus(); toast('Ajoute au moins un film'); return; }
    if (S.user.bingos.some(x => x !== cur && fold(x.name) === fold(name))) { toast('Un défi porte déjà ce nom'); return; }
    if (cur) {
      const oldId = bid('custom', cur.name), newId = bid('custom', name);
      Object.assign(cur, { name, ic, titles: l });
      if (oldId !== newId) {
        S.user.bingoPins = S.user.bingoPins.map(x => x === oldId ? newId : x);
        if (oldId in S.user.bingoDone) { S.user.bingoDone[newId] = S.user.bingoDone[oldId]; delete S.user.bingoDone[oldId]; }
      }
    } else S.user.bingos.push({ id: Date.now().toString(36), name, ic, titles: l, created: TODAY });
    saveUser(); closeOverlay(ov);
    toast(cur ? 'Défi mis à jour' : `✨ Défi « ${name} » créé`);
    const h = bhref('custom', name);
    if (location.hash === h) route(); else location.hash = h;
  };
}

/* ==========================================================
   Intégrations : recherche globale & fiche film
   ========================================================== */
function bingoSearch(q) {
  const f = fold(q);
  return BTYPES.flatMap(t => Object.keys(BINGO[t].ref()).filter(n => fold(n).includes(f)).map(n => bingoState(t, n))).slice(0, 4);
}
function bingoForFilm(m) {
  const hits = bingoAll().filter(s => s.cells.some(c => c.own === m || c.pend === m));
  if (!hits.length) return '';
  return `<div class="bfilm"><span class="lbl">🎯 Bingo</span><div class="chips">${hits.map(s => bChip(s, `${s.owned}/${s.total}`)).join('')}</div></div>`;
}
