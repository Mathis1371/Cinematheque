/* ==========================================================
   Cinémathèque — WISHLIST & ACHATS
   Priorités, prix visés, budget mensuel et « prochain achat conseillé ».
   Chargé après app.js et bingo.js. Les données sont gardées dans ce
   navigateur avec « vus » et « notes » (et incluses dans la sauvegarde ⚙️).
   ========================================================== */
'use strict';

S.user.wish ??= {};      // { clé du film: { p: 1-3 (priorité), t: prix visé } }
S.user.budget ??= 0;     // budget mensuel en €

const PRIO = { 3: ['🔥', 'Indispensable'], 2: ['👍', 'Envie'], 1: ['💤', 'Un jour'] };
const wMeta = m => (m && S.user.wish[m.key]) || {};
const wPrio = m => wMeta(m).p || 0;
let WR = null; // classement en cache

function setWish(key, patch) {
  const o = { ...(S.user.wish[key] || {}), ...patch };
  Object.keys(o).forEach(k => { if (!o[k]) delete o[k]; });
  if (Object.keys(o).length) S.user.wish[key] = o; else delete S.user.wish[key];
  saveUser(); WR = null;
}

/* ---------- Petits éléments réutilisables ---------- */
function wishMini(m) { const p = wPrio(m); return p ? `<span class="mini prio p${p}" title="${PRIO[p][1]}">${PRIO[p][0]}</span>` : ''; }
function prioBtns(m, labels) {
  const p = wPrio(m);
  return `<div class="prio-btns${labels ? ' big' : ''}" data-prio-for="${esc(m.key)}">${[3, 2, 1].map(v => `<button type="button" data-prio="${v}" class="${p === v ? 'on' : ''}" title="${PRIO[v][1]}" aria-label="${PRIO[v][1]}">${PRIO[v][0]}${labels ? `<span>${PRIO[v][1]}</span>` : ''}</button>`).join('')}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-prio]'), g = b?.closest('[data-prio-for]');
  if (!g) return;
  const key = g.dataset.prioFor, m = S.byKey.get(key); if (!m) return;
  const v = +b.dataset.prio, nv = wPrio(m) === v ? 0 : v;
  setWish(key, { p: nv });
  $$('[data-prio-for]').filter(x => x.dataset.prioFor === key).forEach(x => $$('button', x).forEach(y => y.classList.toggle('on', +y.dataset.prio === nv)));
  toast(nv ? `${PRIO[nv][0]} « ${m.title} » : ${PRIO[nv][1].toLowerCase()}` : 'Priorité retirée');
  if (document.body.dataset.page === 'wishlist') refreshBehind();
});

/* ---------- Prix : prix visé, sinon estimation d'après tes achats ---------- */
let PREF = null;
function priceRef() {
  if (PREF && PREF.src === S.movies) return PREF;
  const by = {}, all = [];
  S.movies.filter(m => !m.wish && m.price > 0).forEach(m => { (by[m.fmt + '|' + m.ed] ||= []).push(m.price); (by[m.fmt + '|'] ||= []).push(m.price); all.push(m.price); });
  const med = a => { a = [...a].sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[n >> 1] : (a[n / 2 - 1] + a[n / 2]) / 2) : 0; };
  const r = {}; for (const k in by) if (by[k].length >= 2) r[k] = med(by[k]);
  return (PREF = { src: S.movies, r, all: med(all) || 25 });
}
function wishPrice(m) {
  const t = wMeta(m).t; if (t) return { v: t, est: false };
  const P = priceRef();
  return { v: P.r[m.fmt + '|' + m.ed] ?? P.r[m.fmt + '|'] ?? P.all, est: true };
}

/* ---------- Classement « prochain achat conseillé » ---------- */
function wishRanking() {
  if (WR && WR.src === S.movies) return WR.list;
  const imp = new Map();
  if (typeof bingoAll === 'function') bingoAll().forEach(s => {
    if (s.done) return;
    s.cells.forEach(c => { if (!c.pend?.wish) return; const e = imp.get(c.pend.key) || { n: 0, fin: [] }; e.n++; if (s.left === 1) e.fin.push(s.name); imp.set(c.pend.key, e); });
  });
  const listW = list('wish').map(m => {
    const p = wPrio(m), b = imp.get(m.key), why = [];
    let score = [8, 0, 16, 32][p];
    if (p) why.push(`${PRIO[p][0]} ${PRIO[p][1]}`);
    if (b) {
      score += Math.min(b.n, 5) * 4 + b.fin.length * 12;
      why.push(b.fin.length ? `🏆 complète ${esc(b.fin.slice(0, 2).join(', '))}` : `🎯 ${plural(b.n, 'défi')} Bingo`);
    }
    if (m.rating) { score += (m.rating - 6.5) * 5; if (m.rating >= 7.8) why.push(`★ ${m.rating}`); }
    if (m.steel) score += 2;
    if (!why.length) why.push(esc(m.genres.slice(0, 2).join(' · ')) || 'Dans ta wishlist');
    return { m, score, why, price: wishPrice(m), bingo: b };
  }).sort((a, b) => b.score - a.score);
  WR = { src: S.movies, list: listW, map: new Map(listW.map((r, i) => [r.m.key, listW.length - i])) };
  return listW;
}
const wishScoreOf = m => { wishRanking(); return WR.map.get(m.key) || 0; };

/* ---------- Tableau de bord en haut de la wishlist ---------- */
function renderWishDash() {
  const box = $('#wDash'); if (!box) return;
  const R = wishRanking(), w = R.map(r => r.m);
  const tot = sum(R, r => r.price.v), est = R.some(r => r.price.est);
  const hot = R.filter(r => wPrio(r.m) === 3), nPrio = w.filter(m => wPrio(m)).length;
  const ym = TODAY.slice(0, 7), B = S.user.budget;
  const spent = sum(S.movies.filter(m => !m.wish && m.added.slice(0, 7) === ym), m => m.price);
  const preSum = sum(list('soon'), m => m.price);
  const pct = B ? Math.min(100, Math.round(spent / B * 100)) : 0;
  if (!w.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<section class="wdash">
    <div class="kpis">
      <div class="kpi hl"><div class="k">🎁 Films convoités</div><div class="v">${w.length}</div><div class="s">${w.filter(m => m.steel).length} en steelbook · ${nPrio ? `${nPrio} classé${nPrio > 1 ? 's' : ''} par priorité` : 'aucune priorité définie'}</div></div>
      <div class="kpi"><div class="k">💶 Pour tout avoir</div><div class="v">≈ ${money(tot)}</div><div class="s">${est ? 'estimé d’après tes prix habituels par édition' : 'd’après tes prix visés'}</div></div>
      <div class="kpi"><div class="k">🔥 Indispensables</div><div class="v">${hot.length}</div><div class="s">${hot.length ? `≈ ${money(sum(hot, r => r.price.v))} pour tous les avoir` : 'marque tes coups de cœur avec 🔥'}</div></div>
      <div class="kpi wbudget"><div class="k">📅 Budget de ${MONTHS[+ym.slice(5) - 1]}</div>
        <div class="v">${money(spent)}${B ? `<small>/ ${money(B)}</small>` : ''}</div>
        ${B ? `<div class="prog${spent > B ? ' over' : ''}" style="margin:10px 0 6px"><div style="width:${pct}%"></div></div>` : ''}
        <div class="s">${B ? (spent <= B ? `reste ${money(B - spent)}` : `dépassé de ${money(spent - B)}`) : 'dépensé ce mois-ci'}${preSum ? ` · ${money(preSum)} de précommandes` : ''}</div>
        <div id="wBudgetBox" style="margin-top:10px"><button class="btn sm" id="wBudget">${B ? 'Modifier' : 'Fixer un budget'}</button></div></div>
    </div>
  </section>`;
  $('#wBudget', box).onclick = () => {
    $('#wBudgetBox').innerHTML = `<form id="wBForm" style="display:flex;gap:6px"><input class="input" type="number" min="0" step="5" id="wBIn" value="${B || ''}" placeholder="ex. 100" style="height:32px;width:110px"><button class="btn sm primary">OK</button></form>`;
    const inp = $('#wBIn'); inp.focus();
    $('#wBForm').onsubmit = ev => { ev.preventDefault(); S.user.budget = Math.max(0, +inp.value || 0); saveUser(); toast(S.user.budget ? `Budget mensuel : ${money(S.user.budget)}` : 'Budget retiré'); renderWishDash(); };
  };
}
function wShop(m) {
  if (!m) return;
  const ov = overlay(`<div class="editor" style="width:min(520px,100%)"><div class="editor-h"><h2>🛒 ${esc(m.title)}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="editor-b"><div class="shops">${shopLinks(m).map(([n, u, c]) => `<a class="shop" href="${u}" target="_blank" rel="noopener" style="color:${c}">${n}${ICON.ext}</a>`).join('')}</div>
    <div class="dim" style="font-size:12px;margin-top:10px">Recherche par ${m.ean ? 'EAN ' + esc(m.ean) : 'titre' + (m.steel ? ' + « steelbook »' : '')} · ${wishPrice(m).est ? 'tu paies d’habitude ≈ ' : 'ton prix visé : '}${money(wishPrice(m).v)}</div></div></div>`);
  $$('[data-close]', ov).forEach(b => b.onclick = () => closeOverlay(ov));
}

/* ---------- Bloc dans la fiche d'un film de la wishlist ---------- */
function wishSheetHTML(m) {
  const t = wMeta(m).t, P = priceRef(), est = P.r[m.fmt + '|' + m.ed] ?? P.r[m.fmt + '|'] ?? P.all;
  const r = wishRanking(), pos = r.findIndex(x => x.m === m) + 1;
  return `<div class="wpanel">
    <div><div class="lbl">Priorité</div>${prioBtns(m, true)}</div>
    <div><div class="lbl">Prix visé</div><div class="wtarget"><input class="input" type="number" min="0" step="0.5" id="wT" value="${t || ''}" placeholder="${Math.round(est)}"><span>€</span></div>
      <div class="dim" style="font-size:12px;margin-top:4px">tu paies d’habitude ≈ ${money(est)} ${m.fmt || ''} ${m.ed ? m.ed.toLowerCase() : ''}</div></div>
    ${pos ? `<div><div class="lbl">Classement</div><div class="wrank">n° ${pos} <span class="dim">/ ${r.length}</span></div><div class="dim" style="font-size:12px;margin-top:4px">des achats conseillés</div></div>` : ''}
  </div>`;
}
function bindWishSheet(ov, m) {
  const i = $('#wT', ov); if (!i) return;
  i.onchange = () => { const v = Math.max(0, +i.value || 0); setWish(m.key, { t: v }); toast(v ? `Prix visé : ${money(v, 2)}` : 'Prix visé retiré'); refreshBehind(); };
}
