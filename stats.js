/* ==========================================================
   Cinémathèque — onglet Statistiques
   (utilise les fonctions et l'état définis dans app.js)
   ========================================================== */
'use strict';

/* Palette validée (fond sombre #16161a, daltonisme & contraste OK) */
const VZ = { v1: '#3987e5', v2: '#d95926', v3: '#199e70', v4: '#c98500', gain: '#3987e5', loss: '#e66767', neutral: '#6b6b78', track: 'rgba(255,255,255,.07)' };
const HEAT = ['rgba(255,255,255,.04)', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'];
const MON_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/* ---------- Infobulle globale ---------- */
const tipEl = document.createElement('div');
tipEl.className = 'tip';
document.body.appendChild(tipEl);
document.addEventListener('mouseover', e => {
  const t = e.target.closest?.('[data-tip]');
  if (!t) { tipEl.classList.remove('on'); return; }
  tipEl.innerHTML = t.getAttribute('data-tip');
  tipEl.classList.add('on');
});
document.addEventListener('mousemove', e => {
  if (!tipEl.classList.contains('on')) return;
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = e.clientX + 14, y = e.clientY - h - 12;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  if (y < 8) y = e.clientY + 18;
  tipEl.style.transform = `translate(${x}px,${y}px)`;
});
window.addEventListener('scroll', () => tipEl.classList.remove('on'), { passive: true });

/* ---------- Petits outils ---------- */
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= v) return k * p;
  return 10 * p;
}
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const eur = v => money(v, 0);
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const bitrate = m => parseFloat(String(m.specs.bitrate || '').replace(',', '.')) || 0;
const titlesTip = arr => arr.slice(0, 4).map(m => '· ' + esc(m.title)).join('<br>') + (arr.length > 4 ? `<br><span class="dim">+ ${arr.length - 4} autres</span>` : '');
function monthRange(from, to) { // 'YYYY-MM' inclus
  const out = []; let [y, m] = from.split('-').map(Number); const [ey, em] = to.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) { out.push(`${y}-${pad(m)}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

/* Histogramme vertical HTML avec axe Y unique et infobulles */
function colChart(series, { fmt = v => v, color = VZ.v1, h = 180, xEvery = 1 } = {}) {
  const max = niceMax(Math.max(0, ...series.map(s => s.v)));
  return `<div class="cc" style="--h:${h}px">
    <div class="cc-plot">
      ${[1, .5, 0].map(t => `<div class="cc-gl" style="bottom:${t * 100}%"><span>${fmt(max * t)}</span></div>`).join('')}
      <div class="cc-bars">${series.map(s => `<div class="cc-col${s.attrs ? ' click' : ''}" data-tip="${esc(s.tip || '')}"${s.attrs || ''}><div class="cc-bar${s.hl ? ' hl' : ''}" style="height:${s.v / max * 100}%;background:${s.color || color}"></div></div>`).join('')}</div>
    </div>
    <div class="cc-x">${series.map((s, i) => `<span>${s.tick ?? (i % xEvery ? '' : s.label)}</span>`).join('')}</div></div>`;
}
/* Barres horizontales, une seule couleur, cliquables */
function hList(entries, { n = 10, color = VZ.v1, attr, fmt = v => v, sub } = {}) {
  const top = entries.slice(0, n); const max = Math.max(1, ...top.map(e => e[1]));
  if (!top.length) return '<div class="dim">Pas assez de données.</div>';
  return top.map(([k, v]) => `<div class="hbar${attr ? ' click' : ''}" ${attr ? `data-${attr}="${esc(k)}"` : ''} data-tip="${esc(`<b>${esc(k)}</b><br>${fmt(v)}${sub ? ' · ' + sub(k, v) : ''}`)}"><span class="n">${esc(k)}</span><div class="t"><div class="f" style="width:${v / max * 100}%;background:${color}"></div></div><span class="c">${fmt(v)}</span></div>`).join('');
}
/* Barre de répartition (segments séparés par un espace de 2px) */
function splitBar(parts) {
  const tot = sum(parts, p => p[1]) || 1;
  return `<div class="split2">${parts.filter(p => p[1]).map(([l, v, c]) => `<div style="flex:${v};background:${c}" data-tip="${esc(`<b>${esc(l)}</b><br>${v} films · ${pct(v, tot)} %`)}"></div>`).join('')}</div>
  <div class="legend">${parts.map(([l, v, c]) => `<span><i style="background:${c}"></i>${esc(l)} <b class="lv">${v}</b> <span class="dim">${pct(v, tot)} %</span></span>`).join('')}</div>`;
}
const kpi = (k, v, unit, s, cls = '') => `<div class="kpi ${cls}"><div class="k">${k}</div><div class="v">${v}${unit ? `<small>${unit}</small>` : ''}</div><div class="s">${s || ''}</div></div>`;
const card = (title, body, cls = '', extra = '') => `<div class="card ${cls}"><h3><span>${title}</span>${extra}</h3>${body}</div>`;
const delta = (cur, prev, lbl) => prev == null ? '' : cur === prev ? `= ${lbl}` : `<span class="${cur > prev ? 'up' : 'down'}">${cur > prev ? '▲' : '▼'} ${cur > prev ? '+' : ''}${cur - prev}</span> vs ${lbl}`;

/* ---------- Période ---------- */
function periodOf(key) {
  if (key === '12m') { const d = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10); return { from: d, to: TODAY, label: '12 derniers mois', prev: { from: new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10), to: d, label: 'les 12 mois d\'avant' } }; }
  if (/^\d{4}$/.test(key)) return { from: `${key}-01-01`, to: `${key}-12-31`, label: key, prev: { from: `${key - 1}-01-01`, to: `${key - 1}-12-31`, label: String(key - 1) } };
  return { from: '0000', to: '9999', label: 'Toute la collection', prev: null };
}
const inP = (m, p) => m.added >= p.from && m.added <= p.to;

/* ==========================================================
   RENDU
   ========================================================== */
function renderStats() {
  const allOwned = list('owned');
  if (!allOwned.length) { view.innerHTML = '<div class="page wrap"><div class="empty"><div class="big">📊</div><h3>Pas encore de statistiques</h3></div></div>'; return; }
  S.ui.statsP ??= 'all'; S.ui.statsM ??= 'count';
  const years = uniq(allOwned.map(m => m.added.slice(0, 4)).filter(Boolean)).sort().reverse();
  if (S.ui.statsP !== 'all' && S.ui.statsP !== '12m' && !years.includes(S.ui.statsP)) S.ui.statsP = 'all';
  const P = periodOf(S.ui.statsP);
  const o = allOwned.filter(m => inP(m, P));
  const prev = P.prev ? allOwned.filter(m => inP(m, P.prev)) : null;
  const SECTIONS = [['ov', "Vue d'ensemble"], ['buy', 'Achats & valeur'], ['content', 'Contenu'], ['tech', 'Technique'], ['watch', 'Visionnage'], ['wish', 'Wishlist'], ['troph', 'Trophées']];

  view.innerHTML = `<div class="page wrap stats-page">
    <div class="page-head"><div><h1 class="page-title">Statistiques</h1><div class="page-sub">${P.label} · ${plural(o.length, 'film')} possédé${o.length > 1 ? 's' : ''} (hors wishlist et précommandes)</div></div></div>
    <div class="st-bar">
      <div class="chips" id="stPeriod">${[['all', 'Tout'], ['12m', '12 derniers mois'], ...years.map(y => [y, y])].map(([k, l]) => `<button class="chip${S.ui.statsP === k ? ' on' : ''}" data-sp="${k}">${l}</button>`).join('')}</div>
      <div class="st-nav no-sb">${SECTIONS.map(([id, l]) => `<button data-go="${id}">${l}</button>`).join('')}</div>
    </div>
    ${o.length ? [secOverview(o, prev, P), secBuy(o, allOwned, P), secContent(o), secTech(o), secWatch(o), secWish(), secTrophies(allOwned)].join('') :
      `<div class="empty"><div class="big">🗓️</div><h3>Aucun achat sur cette période</h3><p>Choisis une autre période ci-dessus.</p></div>${secWish()}`}
  </div>`;

  $$('[data-sp]', view).forEach(b => b.onclick = () => { S.ui.statsP = b.dataset.sp; saveUI(); const y = scrollY; renderStats(); scrollTo(0, y); });
  $$('[data-go]', view).forEach(b => b.onclick = () => { const t = $('#st-' + b.dataset.go); t && scrollTo({ top: t.getBoundingClientRect().top + scrollY - 140, behavior: 'smooth' }); });
  $$('[data-sm]', view).forEach(b => b.onclick = () => { S.ui.statsM = b.dataset.sm; saveUI(); const y = scrollY; renderStats(); scrollTo(0, y); });
  $$('[data-genre]', view).forEach(b => b.onclick = () => goCatalog({ genre: b.dataset.genre }));
  $$('[data-country]', view).forEach(b => b.onclick = () => goCatalog({ country: b.dataset.country }));
  $$('[data-decade]', view).forEach(b => b.onclick = () => goCatalog({ decade: +b.dataset.decade }));
  initRows(view);
}

/* ---------- 1. Vue d'ensemble ---------- */
function secOverview(o, prev, P) {
  const mins = sum(o, m => m.runtime);
  const priced = o.filter(m => m.price > 0);
  const spent = sum(o, m => m.price), worth = sum(o, m => m.value);
  const both = o.filter(m => m.price != null && m.value != null);
  const gain = sum(both, m => m.value - m.price), base = sum(both, m => m.price);
  const seen = o.filter(isSeen);
  const unseenMin = sum(o.filter(m => !isSeen(m)), m => m.runtime);
  const rated = o.filter(m => m.rating);
  const mine = o.filter(m => myRating(m));
  const prevSpent = prev && sum(prev, m => m.price);
  const d30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  return `<section id="st-ov"><div class="kpis">
    ${kpi('Films', o.length, '', prev ? delta(o.length, prev.length, P.prev.label) : `+${o.filter(m => m.added >= d30).length} ces 30 derniers jours`, 'hl')}
    ${kpi('Temps de film', Math.round(mins / 60), 'h', `${(mins / 1440).toFixed(1).replace('.', ',')} jours non-stop · ${Math.round(mins / Math.max(1, o.filter(m => m.runtime).length))} min/film`)}
    ${kpi('Dépensé', Math.round(spent).toLocaleString('fr-FR'), '€', `${money(spent / Math.max(1, priced.length), 2)} par film payé${prev ? ` · ${prevSpent ? (spent >= prevSpent ? '▲' : '▼') + ' ' + eur(Math.abs(spent - prevSpent)) + ' vs ' + P.prev.label : ''}` : ''}`)}
    ${kpi('Valeur estimée', Math.round(worth).toLocaleString('fr-FR'), '€', `<span class="${gain >= 0 ? 'up' : 'down'}">${gain >= 0 ? '▲ +' : '▼ '}${eur(gain)}</span> · ${base ? (gain >= 0 ? '+' : '') + Math.round(gain / base * 100) : 0} % de plus-value`)}
    ${kpi('Coût par heure', mins ? (spent / (sum(priced, m => m.runtime) / 60 || 1)).toFixed(2).replace('.', ',') : '–', '€/h', 'Prix payé rapporté à la durée des films')}
    ${kpi('Vus', pct(seen.length, o.length), '%', `${seen.length} vus · ${Math.round(unseenMin / 60)} h de films à rattraper`)}
    ${kpi('Note moyenne', rated.length ? (sum(rated, m => m.rating) / rated.length).toFixed(1).replace('.', ',') : '–', '/10', mine.length ? `Ma note moyenne : ${(sum(mine, myRating) / mine.length).toFixed(1).replace('.', ',')} (${mine.length} notés)` : 'Note IMDb / TMDb')}
    ${kpi('Éditions premium', pct(o.filter(m => m.fmt === '4K').length, o.length), '% en 4K', `${pct(o.filter(m => m.steel).length, o.length)} % en steelbook`)}
  </div></section>`;
}

/* ---------- 2. Achats & valeur ---------- */
function secBuy(o, allOwned, P) {
  // Plage de mois
  let months;
  if (S.ui.statsP === 'all') { const first = o.map(m => m.added).filter(Boolean).sort()[0] || TODAY; months = monthRange(first.slice(0, 7), TODAY.slice(0, 7)); }
  else months = monthRange(P.from.slice(0, 7), (P.to > TODAY ? TODAY : P.to).slice(0, 7));
  const byM = {}; o.forEach(m => (byM[m.added.slice(0, 7)] ||= []).push(m));
  const metric = S.ui.statsM;
  let cumC = 0, cumS = 0;
  // en mode « Tout », le cumul part de 0 ; sinon il inclut l'historique avant la période
  if (S.ui.statsP !== 'all') { const before = allOwned.filter(m => m.added < P.from); cumC = before.length; cumS = sum(before, m => m.price); }
  const series = months.map(k => {
    const arr = byM[k] || []; const n = arr.length, sp = sum(arr, m => m.price);
    cumC += n; cumS += sp;
    const [y, mo] = k.split('-');
    const v = { count: n, spend: sp, cumc: cumC, cums: cumS }[metric];
    return { label: `${MON_S[+mo - 1]}`, tick: months.length <= 14 ? MON_S[+mo - 1] : (mo === '01' ? y : ''), v,
      tip: `<b>${MONTHS[+mo - 1]} ${y}</b><br>${plural(n, 'film')} · ${eur(sp)}${metric.startsWith('cum') ? `<br>Cumul : ${metric === 'cumc' ? plural(cumC, 'film') : eur(cumS)}` : ''}${n ? '<br>' + titlesTip(arr) : ''}` };
  });
  const best = Object.entries(byM).sort((a, b) => b[1].length - a[1].length)[0];
  const isMoney = metric === 'spend' || metric === 'cums';
  const acq = card("Rythme d'acquisition",
    colChart(series, { fmt: v => isMoney ? eur(v) : Math.round(v), color: metric.startsWith('cum') ? VZ.v1 : VZ.v1, h: 190 }) +
    `<div class="note">${best ? `Mois record : <b>${MONTHS[+best[0].slice(5) - 1]} ${best[0].slice(0, 4)}</b> avec ${plural(best[1].length, 'film')}.` : ''} Moyenne : ${(o.length / Math.max(1, months.length)).toFixed(1).replace('.', ',')} film${o.length / months.length >= 2 ? 's' : ''} par mois.</div>`,
    'span2', `<span class="seg sm">${[['count', 'Films'], ['spend', 'Dépenses'], ['cumc', 'Cumul films'], ['cums', 'Cumul €']].map(([k, l]) => `<button data-sm="${k}" class="${metric === k ? 'on' : ''}">${l}</button>`).join('')}</span>`);

  // Calendrier (année × mois)
  const yrs = uniq(o.map(m => m.added.slice(0, 4))).sort().reverse();
  const maxCell = Math.max(1, ...Object.values(byM).map(a => a.length));
  const lvl = n => !n ? 0 : Math.min(5, Math.ceil(n / maxCell * 5));
  const heat = card('Calendrier des achats', `<div class="heat"><span></span>${MON_S.map(m => `<span class="hm">${m[0].toUpperCase()}</span>`).join('')}
    ${yrs.map(y => `<span class="hy">${y}</span>${MON_S.map((_, i) => { const k = `${y}-${pad(i + 1)}`; const arr = byM[k] || []; const l = lvl(arr.length); return `<span class="hc" style="background:${HEAT[l]};color:${l >= 4 ? '#0a0a0c' : '#fff'}" data-tip="${esc(`<b>${MONTHS[i]} ${y}</b><br>${plural(arr.length, 'film')} · ${eur(sum(arr, m => m.price))}${arr.length ? '<br>' + titlesTip(arr) : ''}`)}">${arr.length || ''}</span>`; }).join('')}`).join('')}</div>
    <div class="heat-legend"><span>Moins</span>${HEAT.map(c => `<i style="background:${c}"></i>`).join('')}<span>Plus</span></div>`);

  // Bilan par année (sert aussi de vue tableau)
  const yearRows = uniq(allOwned.map(m => m.added.slice(0, 4))).sort().reverse().map(y => {
    const a = allOwned.filter(m => m.added.startsWith(y)); const p = a.filter(m => m.price > 0);
    return `<tr class="${S.ui.statsP === y ? 'sel' : ''}"><td><b>${y}</b></td><td>${a.length}</td><td>${eur(sum(a, m => m.price))}</td><td>${money(sum(p, m => m.price) / Math.max(1, p.length), 2)}</td><td>${eur(sum(a, m => m.value))}</td><td>${pct(a.filter(m => m.fmt === '4K').length, a.length)} %</td><td>${pct(a.filter(m => m.steel).length, a.length)} %</td></tr>`;
  }).join('');
  const yearTable = card('Bilan par année · tableau', `<div class="table-wrap"><table class="table st-table"><thead><tr><th>Année</th><th>Films</th><th>Dépensé</th><th>Prix moyen</th><th>Valeur</th><th>4K</th><th>Steelbook</th></tr></thead><tbody>${yearRows}</tbody></table></div>`, 'span2');

  // Distribution des prix
  const buckets = [['Offert', m => m.price === 0, 'Offert'], ['< 10 €', m => m.price > 0 && m.price < 10, '<10'], ['10–20 €', m => m.price >= 10 && m.price < 20, '10–20'], ['20–30 €', m => m.price >= 20 && m.price < 30, '20–30'], ['30–40 €', m => m.price >= 30 && m.price < 40, '30–40'], ['≥ 40 €', m => m.price >= 40, '40+']];
  const pr = o.filter(m => m.price != null);
  const priceDist = colChart(buckets.map(([l, f, t]) => { const a = pr.filter(f); return { label: l, tick: t, v: a.length, tip: `<b>${l}</b><br>${plural(a.length, 'film')}<br>${titlesTip(a)}` }; }), { h: 140 });
  const combos = [['4K · Steelbook', m => m.fmt === '4K' && m.steel], ['4K · Amaray', m => m.fmt === '4K' && m.amaray], ['Blu-ray · Steelbook', m => m.fmt === 'Blu-ray' && m.steel], ['Blu-ray · Amaray', m => m.fmt === 'Blu-ray' && m.amaray]]
    .map(([l, f]) => { const a = o.filter(m => f(m) && m.price > 0); return [l, a.length ? sum(a, m => m.price) / a.length : 0, a.length]; }).filter(c => c[2]);
  const prices = card('Prix payés <span class="dim" style="text-transform:none;letter-spacing:0;font-weight:500">en €</span>', priceDist + `<div class="mini-table">${combos.map(([l, v, n]) => `<div><span>${l}</span><span class="dim">${n} films</span><b>${money(v, 2)}</b></div>`).join('')}</div>
    <div class="note">Prix médian : <b>${money(median(o.filter(m => m.price > 0).map(m => m.price)), 2)}</b> · ${o.filter(m => m.price === 0).length} offert${o.filter(m => m.price === 0).length > 1 ? 's' : ''}</div>`);

  // Nuage de points prix / valeur
  const pts = o.filter(m => m.price != null && m.value != null);
  const W = 600, H = 360, L = 52, B = 34, T = 12, R = 14;
  const mx = niceMax(Math.max(10, ...pts.map(m => Math.max(m.price, m.value))));
  const X = v => L + v / mx * (W - L - R), Y = v => H - B - v / mx * (H - B - T);
  const ticks = [0, .25, .5, .75, 1].map(t => t * mx);
  const sorted = [...pts].sort((a, b) => (b.value - b.price) - (a.value - a.price));
  const topGain = sorted[0], topLoss = sorted[sorted.length - 1];
  const dot = m => { const g = m.value - m.price; const c = g > 0 ? VZ.gain : g < 0 ? VZ.loss : VZ.neutral;
    return `<g data-k="${esc(m.key)}" class="pt" data-tip="${esc(`<b>${esc(m.title)}</b><br>Payé ${money(m.price, 2)} → estimé ${eur(m.value)}<br>${g > 0 ? '▲ +' : g < 0 ? '▼ ' : '= '}${money(g, 2)}`)}"><circle cx="${X(m.price)}" cy="${Y(m.value)}" r="13" fill="transparent"/><circle cx="${X(m.price)}" cy="${Y(m.value)}" r="5" fill="${c}" stroke="#16161a" stroke-width="2"/>${g > 0 ? '' : ''}</g>`; };
  const lbl = (m, up) => m ? `<text x="${Math.min(X(m.price) + 9, W - 160)}" y="${Y(m.value) + (up ? -8 : 16)}" class="sl">${esc(m.title.length > 24 ? m.title.slice(0, 23) + '…' : m.title)}</text>` : '';
  const scatter = card('Prix payé vs valeur estimée', `<svg class="scatter" viewBox="0 0 ${W} ${H}" data-ctx>
    ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" class="gl"/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" class="ax">${Math.round(t)} €</text><text x="${X(t)}" y="${H - B + 20}" text-anchor="middle" class="ax">${Math.round(t)} €</text>`).join('')}
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(mx)}" y2="${Y(mx)}" class="diag"/><text x="${X(mx) - 6}" y="${Y(mx) + 16}" text-anchor="end" class="ax">valeur = prix</text>
    ${pts.map(dot).join('')}${topGain && topGain.value > topGain.price ? lbl(topGain, true) : ''}${topLoss && topLoss.value < topLoss.price ? lbl(topLoss, false) : ''}
    <text x="${(L + W - R) / 2}" y="${H - 2}" text-anchor="middle" class="ax">Prix payé</text></svg>
    <div class="legend"><span><i style="background:${VZ.gain}"></i>▲ A pris de la valeur · ${pts.filter(m => m.value > m.price).length}</span><span><i style="background:${VZ.loss}"></i>▼ En a perdu · ${pts.filter(m => m.value < m.price).length}</span><span><i style="background:${VZ.neutral}"></i>Stable · ${pts.filter(m => m.value === m.price).length}</span></div>`, 'span2');

  const gains = pts.map(m => [m, m.value - m.price]).sort((a, b) => b[1] - a[1]);
  const gainList = card('Meilleures plus-values', `<div class="records one" data-ctx>${gains.filter(g => g[1] > 0).slice(0, 5).map(([m, g]) => record(`${money(m.price, 2)} → ${eur(m.value)}`, m, `<span class="up">▲ +${eur(g)}</span> <span class="dim">(+${pct(g, m.price || 1)} %)</span>`)).join('') || '<div class="dim">Aucune pour l\'instant.</div>'}</div>`);
  const lossList = card('Plus fortes baisses', `<div class="records one" data-ctx>${gains.filter(g => g[1] < 0).slice(-5).reverse().map(([m, g]) => record(`${money(m.price, 2)} → ${eur(m.value)}`, m, `<span class="down">▼ ${eur(g)}</span>`)).join('') || '<div class="dim">Aucune moins-value 🎉</div>'}</div>`);

  return `<section id="st-buy"><div class="section-title">Achats & valeur</div><div class="cards">${acq}${heat}${prices}${scatter}${gainList}${lossList}${yearTable}</div></section>`;
}

/* ---------- 3. Contenu ---------- */
function secContent(o) {
  // Genres : vus / pas vus
  const g = {}; o.forEach(m => m.genres.forEach(x => { (g[x] ||= { n: 0, s: 0 }); g[x].n++; if (isSeen(m)) g[x].s++; }));
  const ge = Object.entries(g).sort((a, b) => b[1].n - a[1].n).slice(0, 12);
  const gmax = Math.max(1, ...ge.map(e => e[1].n));
  const genres = card('Genres', ge.map(([k, v]) => `<div class="hbar click" data-genre="${esc(k)}" data-tip="${esc(`<b>${esc(k)}</b><br>${plural(v.n, 'film')} · ${v.s} vus (${pct(v.s, v.n)} %)`)}"><span class="n">${esc(k)}</span>
    <div class="t stack" style="width:${v.n / gmax * 100}%">${v.s ? `<div style="flex:${v.s};background:${VZ.v1}"></div>` : ''}${v.n - v.s ? `<div style="flex:${v.n - v.s};background:rgba(57,135,229,.28)"></div>` : ''}</div><span class="c">${v.n}</span></div>`).join('') +
    `<div class="legend" style="margin-top:10px"><span><i style="background:${VZ.v1}"></i>Vus</span><span><i style="background:rgba(57,135,229,.28)"></i>Pas encore vus</span><span class="dim">· clique pour filtrer</span></div>`);

  // Décennies
  const dec = {}; o.forEach(m => m.decade && (dec[m.decade] ||= []).push(m));
  const decK = Object.keys(dec).map(Number).sort((a, b) => a - b);
  const yrs = o.map(m => m.year).filter(Boolean);
  const decCard = card('Décennies de sortie', colChart(decK.map(d => ({ label: `${String(d).slice(2)}s`, tick: `${String(d).slice(2)}s`, v: dec[d].length, tip: `<b>Années ${d}</b><br>${plural(dec[d].length, 'film')}<br>${titlesTip(dec[d])}<br><span class="dim">Clique pour filtrer</span>`, attrs: ` data-decade="${d}"` })), { h: 150 }) +
    `<div class="note">Âge moyen d'un film : <b>${Math.round(nowD.getFullYear() - sum(yrs, y => y) / yrs.length)} ans</b> · année médiane <b>${Math.round(median(yrs))}</b></div>`);

  // Durées
  const db = [['< 1h30', m => m.runtime < 90, '<1h30'], ['1h30–1h50', m => m.runtime >= 90 && m.runtime < 110, '1h30'], ['1h50–2h10', m => m.runtime >= 110 && m.runtime < 130, '1h50'], ['2h10–2h30', m => m.runtime >= 130 && m.runtime < 150, '2h10'], ['2h30–2h50', m => m.runtime >= 150 && m.runtime < 170, '2h30'], ['≥ 2h50', m => m.runtime >= 170, '2h50+']];
  const rt = o.filter(m => m.runtime);
  const durCard = card('Durées', colChart(db.map(([l, f, t]) => { const a = rt.filter(f); return { label: l, tick: t, v: a.length, tip: `<b>${l}</b><br>${plural(a.length, 'film')}<br>${titlesTip(a)}` }; }), { h: 140 }) +
    `<div class="note">Durée médiane : <b>${fmtRt(Math.round(median(rt.map(m => m.runtime))))}</b></div>`);

  // Personnes, duos, pays, catégories
  const pairs = {}; o.forEach(m => m.directors.forEach(d => m.people.filter(p => p !== d).forEach(p => { const k = d + '|' + p; pairs[k] = (pairs[k] || 0) + 1; })));
  const duos = Object.entries(pairs).filter(e => e[1] > 1).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const duoCard = card('Duos réalisateur × acteur', duos.length ? duos.map(([k, n]) => { const [d, p] = k.split('|'); return `<div class="duo"><span class="av">${avatar(d)}</span><span class="av">${avatar(p)}</span><span class="nm"><span class="plink" data-p="${esc(d)}">${esc(d)}</span> × <span class="plink" data-p="${esc(p)}">${esc(p)}</span></span><span class="ct">${n}</span></div>`; }).join('') : '<div class="dim">Pas encore de duo récurrent.</div>');
  const nDir = uniq(o.flatMap(m => m.directors)).length, nAct = uniq(o.flatMap(m => m.people)).length;
  const dirCard = card('Réalisateurs', leaders(counter(o, m => m.directors)) + `<div class="note">${nDir} réalisateurs différents</div>`);
  const actCard = card('Acteurs & actrices', leaders(counter(o, m => m.people)) + `<div class="note">${nAct} personnes au casting</div>`);
  const countryCard = card('Pays', hList(counter(o, m => m.country), { n: 8, attr: 'country', color: VZ.v1 }) + `<div class="note">${pct(o.filter(m => m.country && m.country !== 'États-Unis').length, o.length)} % de films hors États-Unis</div>`);
  const catCard = card('Catégories', hList(counter(o, m => m.cats), { n: 10, color: VZ.v1 }));

  // Records
  const by = (f, v, d = 1) => [...o].filter(f).sort((a, b) => (v(a) - v(b)) * d)[0];
  const rec = [
    ['Le plus ancien', by(m => m.year, m => m.year), m => m.year], ['Le plus récent', by(m => m.year, m => m.year, -1), m => m.year],
    ['Le plus court', by(m => m.runtime, m => m.runtime), m => fmtRt(m.runtime)], ['Le plus long', by(m => m.runtime, m => m.runtime, -1), m => fmtRt(m.runtime)],
    ['Le plus cher', by(m => m.price, m => m.price, -1), m => money(m.price, 2)], ['Le mieux noté', by(m => m.rating, m => m.rating, -1), m => '★ ' + m.rating],
    ['Le plus gros débit', by(m => bitrate(m), bitrate, -1), m => m.specs.bitrate], ['Le plus gros casting', by(m => m.people.length, m => m.people.length, -1), m => plural(m.people.length, 'acteur')],
  ];
  const recCard = card('Records', `<div class="records" data-ctx>${rec.map(([l, m, f]) => record(l, m, m ? f(m) : '')).join('')}</div>`, 'span2');

  return `<section id="st-content"><div class="section-title">Contenu</div><div class="cards">${genres}${decCard}${durCard}${dirCard}${actCard}${duoCard}${countryCard}${catCard}${recCard}</div></section>`;
}

/* ---------- 4. Technique ---------- */
function secTech(o) {
  const k4 = o.filter(m => m.fmt === '4K');
  const fmtCard = card('Formats & éditions',
    `<div class="sub">Format</div>${splitBar([['4K UHD', k4.length, VZ.v1], ['Blu-ray', o.filter(m => m.fmt === 'Blu-ray').length, VZ.v2], ['Non précisé', o.filter(m => !m.fmt).length, VZ.neutral]])}
     <div class="sub">Boîtier</div>${splitBar([['Steelbook', o.filter(m => m.steel).length, VZ.v1], ['Amaray', o.filter(m => m.amaray).length, VZ.v2], ['Autre', o.filter(m => !m.steel && !m.amaray).length, VZ.neutral]])}
     <div class="sub">Master des disques 4K</div>${splitBar([['4K natif', k4.filter(m => m.res === '4K').length, VZ.v1], ['2K upscalé', k4.filter(m => m.res === '2K').length, VZ.v2], ['Non renseigné', k4.filter(m => !m.res || !['4K', '2K'].includes(m.res)).length, VZ.neutral]])}
     ${o.some(m => m.imax) ? `<div class="note">${plural(o.filter(m => m.imax).length, 'film')} avec séquences IMAX</div>` : ''}`);
  const hdrCard = card('HDR (disques 4K)', hList(counter(k4, m => m.hdr || 'Non renseigné'), { n: 5 }) + `<div class="sub" style="margin-top:16px">Audio VO</div>` + hList(counter(o, m => m.audio || 'Non renseigné'), { n: 6, color: VZ.v2 }));
  const br = o.filter(m => bitrate(m));
  const avgBr = a => { const x = a.filter(m => bitrate(m)); return x.length ? (sum(x, bitrate) / x.length).toFixed(0) + ' Mbps' : '–'; };
  const brBuckets = [['< 30', m => bitrate(m) < 30], ['30–45', m => bitrate(m) >= 30 && bitrate(m) < 45], ['45–60', m => bitrate(m) >= 45 && bitrate(m) < 60], ['60–75', m => bitrate(m) >= 60 && bitrate(m) < 75], ['≥ 75', m => bitrate(m) >= 75]];
  const brCard = card('Débit vidéo <span class="dim" style="text-transform:none;letter-spacing:0;font-weight:500">en Mbps</span>', br.length ? colChart(brBuckets.map(([l, f]) => { const a = br.filter(f); return { label: l, tick: l, v: a.length, tip: `<b>${l} Mbps</b><br>${plural(a.length, 'film')}<br>${titlesTip(a)}` }; }), { h: 130 }) +
    `<div class="mini-table"><div><span>Moyenne 4K</span><span></span><b>${avgBr(k4)}</b></div><div><span>Moyenne Blu-ray</span><span></span><b>${avgBr(o.filter(m => m.fmt === 'Blu-ray'))}</b></div></div>
    <div class="records one" data-ctx style="margin-top:12px">${[...br].sort((a, b) => bitrate(b) - bitrate(a)).slice(0, 3).map((m, i) => record(['1er', '2e', '3e'][i] + ' débit', m, m.specs.bitrate)).join('')}</div>`
    : '<div class="dim">Aucun débit renseigné.</div>');
  const filled = o.filter(m => Object.keys(m.specs).length);
  const quality = card('Fiches techniques complètes', `<div class="big-num">${pct(filled.length, o.length)} <small>%</small></div><div class="prog" style="margin:10px 0"><div style="width:${pct(filled.length, o.length)}%;background:${VZ.v1}"></div></div>
    <div class="note">${o.length - filled.length ? `${plural(o.length - filled.length, 'film')} sans infos techniques. <a class="plink" href="#/reglages">Voir la liste ›</a>` : 'Toutes les fiches sont renseignées ✨'}</div>`);
  return `<section id="st-tech"><div class="section-title">Technique</div><div class="cards">${fmtCard}${hdrCard}${brCard}${quality}</div></section>`;
}

/* ---------- 5. Visionnage ---------- */
function secWatch(o) {
  const seen = o.filter(isSeen), unseen = o.filter(m => !isSeen(m));
  const progress = card('Progression', `<div class="big-num">${seen.length}<small> / ${o.length} films vus</small></div>
    ${splitBar([['Vus', seen.length, VZ.v1], ['Pas encore vus', unseen.length, 'rgba(57,135,229,.28)']])}
    <div class="note">Il te reste <b>${Math.round(sum(unseen, m => m.runtime) / 60)} h</b> de films à rattraper, soit environ <b>${Math.ceil(unseen.length / 2)} semaines</b> à 2 films par semaine.</div>`);
  // % vus par décennie
  const dec = {}; o.forEach(m => m.decade && (dec[m.decade] ||= []).push(m));
  const decSeen = card('Vus par décennie', colChart(Object.keys(dec).sort().map(d => { const a = dec[d]; const s = a.filter(isSeen).length; return { label: d, tick: `${String(d).slice(2)}s`, v: pct(s, a.length), tip: `<b>Années ${d}</b><br>${s} vus sur ${a.length} (${pct(s, a.length)} %)` }; }), { h: 130, fmt: v => Math.round(v) + ' %' }));
  const mine = o.filter(m => myRating(m));
  const dist = Array.from({ length: 10 }, (_, i) => { const a = mine.filter(m => myRating(m) === i + 1); return { label: String(i + 1), tick: String(i + 1), v: a.length, tip: `<b>${i + 1}/10</b><br>${plural(a.length, 'film')}${a.length ? '<br>' + titlesTip(a) : ''}` }; });
  const diffs = mine.filter(m => m.rating).map(m => [m, myRating(m) - m.rating]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5);
  const myCard = card('Mes notes', mine.length ? colChart(dist, { h: 120 }) +
    `<div class="note">Ma moyenne : <b>${(sum(mine, myRating) / mine.length).toFixed(1).replace('.', ',')}</b> vs <b>${(sum(mine.filter(m => m.rating), m => m.rating) / Math.max(1, mine.filter(m => m.rating).length)).toFixed(1).replace('.', ',')}</b> pour la note IMDb des mêmes films</div>
     ${diffs.length ? `<div class="sub" style="margin-top:14px">Mes plus gros désaccords</div><div class="records one" data-ctx>${diffs.map(([m, d]) => record(`Moi ${myRating(m)} · IMDb ${m.rating}`, m, d > 0 ? `<span class="up">▲ je l'aime plus</span>` : `<span class="down">▼ je l'aime moins</span>`)).join('')}</div>` : ''}`
    : '<div class="empty" style="padding:24px 10px"><p>Donne une note à tes films (étoiles dans la fiche) pour voir ta répartition et tes désaccords avec IMDb.</p></div>');
  const prio = [...unseen].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 14);
  const prioRow = prio.length ? `<div class="card span-all"><h3><span>À voir en priorité · les mieux notés pas encore vus</span></h3><div class="scroller no-sb" style="margin:0;padding:4px 0 6px" data-ctx>${prio.map(m => pcard(m).replace('class="pcard"', 'class="pcard slim"')).join('')}</div></div>` : '';
  return `<section id="st-watch"><div class="section-title">Visionnage</div><div class="cards">${progress}${decSeen}${myCard}${prioRow}</div></section>`;
}

/* ---------- 6. Wishlist & précommandes (non filtré par période) ---------- */
function secWish() {
  const w = list('wish'), soon = list('soon').sort((a, b) => a.added.localeCompare(b.added));
  if (!w.length && !soon.length) return '';
  const next = soon[0];
  const budget = sum(soon, m => m.price);
  const steelValue = (() => { const own = list('owned').filter(m => m.steel && m.price > 0); return own.length ? sum(own, m => m.price) / own.length : 0; })();
  const wSteel = w.filter(m => m.steel).length;
  return `<section id="st-wish"><div class="section-title">Wishlist & précommandes <span class="dim" style="text-transform:none;letter-spacing:0;font-weight:500">(toutes périodes)</span></div>
  <div class="kpis">
    ${kpi('Wishlist', w.length, 'films', `${wSteel} en steelbook · ${w.filter(m => m.fmt === '4K').length} en 4K`)}
    ${kpi('Budget estimé', steelValue ? Math.round(w.length * steelValue).toLocaleString('fr-FR') : '–', '€', `sur la base de ton prix moyen (${money(steelValue, 2)})`)}
    ${kpi('Précommandes', soon.length, '', budget ? `${money(budget, 2)} à prévoir` : '')}
    ${kpi('Prochaine arrivée', next ? daysUntil(next.added) : '–', next ? 'jours' : '', next ? `${esc(next.title)} · ${fmtDate(next.added)}` : 'Aucune précommande')}
  </div>
  <div class="cards">${card('Réalisateurs les plus convoités', leaders(counter(w, m => m.directors), 6))}${card('Genres de la wishlist', hList(counter(w, m => m.genres), { n: 8, color: VZ.v2 }))}${card('Décennies de la wishlist', colChart(Object.entries(counter(w, m => m.decade).reduce((a, [k, v]) => (a[k] = v, a), {})).sort((a, b) => a[0] - b[0]).map(([d, v]) => ({ label: d, tick: `${String(d).slice(2)}s`, v, tip: `<b>Années ${d}</b><br>${plural(v, 'film')}` })), { h: 130, color: VZ.v2 }))}</div></section>`;
}

/* ---------- 7. Trophées ---------- */
function secTrophies(o) {
  const n = f => o.filter(f).length;
  const g = s => n(m => m.genres.some(x => fold(x).includes(s)));
  const seen = n(isSeen);
  const worth = sum(o, m => m.value);
  const bingoDone = ['directors', 'sagas', 'actors'].reduce((t, k) => t + Object.keys(BINGO[k].ref()).filter(name => bingoState(k, name).pct === 100).length, 0);
  const T = [
    ['📼', '50 films', 50, o.length], ['📀', '100 films', 100, o.length], ['🏛️', '250 films', 250, o.length],
    ['✨', '50 films en 4K', 50, n(m => m.fmt === '4K')], ['💎', '100 films en 4K', 100, n(m => m.fmt === '4K')],
    ['🛡️', '25 steelbooks', 25, n(m => m.steel)], ['⚔️', '100 steelbooks', 100, n(m => m.steel)],
    ['🍿', '50 films vus', 50, seen], ['👑', 'Tout vu', o.length, seen],
    ['🚀', '25 films de SF', 25, g('science')], ['🦇', "10 films d'horreur", 10, g('horreur')],
    ['🎞️', "10 films d'avant 1980", 10, n(m => m.year && m.year < 1980)], ['🇫🇷', '10 films français', 10, n(m => m.country === 'France')],
    ['🌍', '5 pays différents', 5, uniq(o.map(m => m.country).filter(Boolean)).length],
    ['🔊', '50 pistes Dolby Atmos', 50, n(m => m.audio === 'Dolby Atmos')], ['🌈', '50 en Dolby Vision', 50, n(m => m.hdr === 'Dolby Vision')],
    ['💰', 'Collection à 5 000 €', 5000, Math.round(worth)], ['🎯', 'Un bingo complété', 1, bingoDone],
  ].map(([ic, nm, goal, cur]) => ({ ic, nm, goal, cur })).sort((a, b) => (b.cur >= b.goal) - (a.cur >= a.goal) || b.cur / b.goal - a.cur / a.goal);
  const won = T.filter(t => t.cur >= t.goal).length;
  return `<section id="st-troph"><div class="section-title">Trophées · ${won} / ${T.length} débloqués</div><div class="trophies">${T.map(t => `<div class="trophy${t.cur >= t.goal ? ' won' : ''}"><div class="ic">${t.ic}</div><div class="nm">${t.nm}</div><div class="pr"><div style="width:${Math.min(100, t.cur / t.goal * 100)}%"></div></div><div class="pc">${t.goal >= 1000 ? `${eur(Math.min(t.cur, t.goal))} / ${eur(t.goal)}` : `${Math.min(t.cur, t.goal)} / ${t.goal}`}</div></div>`).join('')}</div></section>`;
}
