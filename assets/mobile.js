/* ==========================================================
   Cinémathèque — confort sur téléphone et appli iPhone
   (chargé après app.js : utilise overlay/closeOverlay/stack/toast/download)
   ========================================================== */
(() => {
  const root = document.documentElement;
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (standalone) root.classList.add('standalone');
  if (touch) root.classList.add('touch');

  /* ---------- Hauteur réellement visible (clavier ouvert compris) ---------- */
  const vv = window.visualViewport;
  if (vv) {
    const setVh = () => root.style.setProperty('--vvh', Math.round(vv.height) + 'px');
    vv.addEventListener('resize', setVh); setVh();
  }

  const path = () => location.hash.replace(/^#/, '') || '/';

  /* ---------- Bouton retour (l'appli plein écran n'a pas de barre Safari) ---------- */
  const TAB_ROOTS = ['/', '/collection', '/wishlist', '/bingo'];
  const back = document.createElement('button');
  back.type = 'button'; back.className = 'icon-btn back-btn'; back.title = 'Retour'; back.setAttribute('aria-label', 'Retour');
  back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  document.querySelector('.header .logo')?.before(back);
  let moves = 0;
  const updBack = () => document.body.classList.toggle('has-back', !TAB_ROOTS.includes(path()));
  window.addEventListener('hashchange', () => { moves++; updBack(); });
  updBack();
  back.onclick = () => { if (moves > 0 && history.length > 1) history.back(); else location.hash = '#/'; };

  /* ---------- Toucher l'onglet actif = remonter en haut (comme les applis iOS) ---------- */
  document.getElementById('tabbar')?.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (a && a.getAttribute('href').replace(/^#/, '') === path()) { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); }
  });

  /* ---------- Glisser vers le bas pour fermer une fiche ou une fenêtre ---------- */
  if (touch) {
    let st = null;
    const reset = (panel) => {
      panel.style.transition = 'transform .26s cubic-bezier(.2,.8,.2,1)'; panel.style.transform = '';
      setTimeout(() => { panel.style.transition = ''; }, 280);
    };
    document.addEventListener('touchstart', e => {
      st = null;
      const ov = e.target.closest('.overlay');
      if (!ov || e.touches.length !== 1 || ov.scrollTop > 0) return;
      const panel = ov.firstElementChild;
      if (!panel || panel.classList.contains('palette')) return;
      if (e.target.closest('input,textarea,select,.scroller,.spots')) return;
      for (let el = e.target; el && el !== ov; el = el.parentElement) if (el.scrollTop > 0) return;
      st = { ov, panel, x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0, active: false };
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!st) return;
      const dx = e.touches[0].clientX - st.x, dy = e.touches[0].clientY - st.y;
      if (!st.active) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dy <= 0 || Math.abs(dx) > dy || st.ov.scrollTop > 0) { st = null; return; }
        st.active = true; st.ov.classList.add('dragging');
      }
      st.dy = Math.max(0, dy);
      st.panel.style.transform = `translateY(${st.dy}px)`;
      st.ov.style.backgroundColor = `rgba(0,0,0,${Math.max(.15, .72 - st.dy / 600)})`;
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    const end = () => {
      if (!st) return;
      const { ov, panel, dy, active } = st; st = null;
      if (!active) return;
      ov.classList.remove('dragging'); ov.style.backgroundColor = '';
      if (dy > 110) {
        panel.style.transition = 'transform .22s ease-in'; panel.style.transform = 'translateY(100vh)';
        closeOverlay(ov);
      } else reset(panel);
    };
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
  }

  /* ---------- Tirer vers le bas pour actualiser (absent des applis iPhone plein écran) ---------- */
  if (standalone && touch) {
    const ptr = document.createElement('div');
    ptr.className = 'ptr';
    ptr.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>';
    document.body.appendChild(ptr);
    const LIMIT = 90;
    let p = null;
    const hide = () => { ptr.style.transition = 'opacity .2s, transform .2s'; ptr.style.opacity = 0; ptr.style.transform = ''; ptr.classList.remove('ready'); };
    addEventListener('touchstart', e => {
      p = null;
      if (stack.length || scrollY > 0 || e.touches.length !== 1 || e.target.closest('input,textarea,select')) return;
      p = { x: e.touches[0].clientX, y: e.touches[0].clientY, d: 0 };
    }, { passive: true });
    addEventListener('touchmove', e => {
      if (!p) return;
      const d = e.touches[0].clientY - p.y, dx = e.touches[0].clientX - p.x;
      if (d <= 0 || scrollY > 0 || Math.abs(dx) > d) { p = null; hide(); return; }
      p.d = d;
      const k = Math.min(d / LIMIT, 1);
      ptr.style.transition = 'none';
      ptr.style.opacity = k;
      ptr.style.transform = `translateY(${Math.min(d * .55, 64) - 30}px) rotate(${d * 3}deg) scale(${.6 + .4 * k})`;
      ptr.classList.toggle('ready', d > LIMIT);
    }, { passive: true });
    addEventListener('touchend', () => {
      if (!p) return;
      const ok = p.d > LIMIT; p = null;
      if (ok) { ptr.classList.add('spin'); setTimeout(() => location.reload(), 300); } else hide();
    });
  }

  /* ---------- Export sur iPhone : feuille de partage (Fichiers, AirDrop vers le Mac…) ---------- */
  if (touch && navigator.canShare && typeof download === 'function') {
    const saveFile = download;
    window.download = (name, data) => {
      const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      let file;
      try { file = new File([text], name, { type: 'application/json' }); } catch (e) { return saveFile(name, data); }
      if (!navigator.canShare({ files: [file] })) return saveFile(name, data);
      navigator.share({ files: [file], title: name }).catch(err => { if (!err || err.name !== 'AbortError') saveFile(name, data); });
    };
  }

  /* ---------- Hors ligne / en ligne ---------- */
  addEventListener('offline', () => toast('📴 Hors ligne — les fiches et affiches déjà vues restent disponibles'));
  addEventListener('online', () => toast('✅ De nouveau en ligne'));
})();
