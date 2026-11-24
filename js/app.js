/* Kreuzwort — crucigramas de vocabulario alemán */
(() => {
  'use strict';

  const LEVELS = [
    { id: 'A1', title: 'Start Deutsch 1', sub: 'Primeras palabras', file: 'data/a1.json' },
    { id: 'A2', title: 'Goethe-Zertifikat A2', sub: 'Próximamente', locked: true, preview: 8 },
    { id: 'B1', title: 'Goethe-Zertifikat B1', sub: 'Próximamente', locked: true, preview: 8 },
  ];
  const STORE = 'kreuzwort.v1';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- storage ----------
  let save;
  try { save = JSON.parse(localStorage.getItem(STORE)) || {}; } catch { save = {}; }
  save.best = save.best || {};
  save.prog = save.prog || {};
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch {} };

  const data = {}; // level id -> puzzles

  const starsFor = (rev) => (rev === 0 ? 3 : rev <= 3 ? 2 : 1);
  const starHTML = (n, max = 3) => Array.from({ length: max }, (_, i) => `<span class="star${i < n ? ' on' : ''}">★</span>`).join('');

  // ---------- MAP ----------
  function renderMap() {
    const map = $('#map');
    map.innerHTML = '';
    const chips = document.createElement('nav');
    chips.className = 'chips';
    LEVELS.forEach((lv) => {
      const b = document.createElement('button');
      b.className = 'chip' + (lv.locked ? ' off' : '');
      b.textContent = lv.id + (lv.locked ? ' 🔒' : '');
      b.onclick = () => document.getElementById('reg-' + lv.id).scrollIntoView({ behavior: 'smooth', block: 'start' });
      chips.appendChild(b);
    });
    map.appendChild(chips);
    let total = 0, totalMax = 0;
    LEVELS.forEach((lv) => {
      const puzzles = data[lv.id] || [];
      const count = lv.locked ? lv.preview : puzzles.length;
      let lvStars = 0;
      for (let i = 0; i < puzzles.length; i++) lvStars += save.best[`${lv.id}-${i}`] || 0;
      if (!lv.locked) { total += lvStars; totalMax += count * 3; }

      const reg = document.createElement('div');
      reg.className = 'region' + (lv.locked ? ' locked' : '');
      reg.id = 'reg-' + lv.id;
      const pct = lv.locked ? 0 : Math.round((lvStars / (count * 3)) * 100);
      reg.innerHTML = `
        <div class="region-head">
          <div class="lv">${lv.id}</div>
          <div style="flex:1;min-width:0">
            <div class="t">${lv.title}</div>
            <div class="s">${lv.locked ? lv.sub : count + ' crucigramas · elegí cualquiera'}</div>
            ${lv.locked ? '' : `<div class="bar"><i style="width:${pct}%"></i></div>`}
          </div>
          ${lv.locked ? '<div class="rs">🔒</div>' : `<div class="rs"><span class="star">★</span> ${lvStars}/${count * 3}</div>`}
        </div>`;

      // winding path
      const path = document.createElement('div');
      path.className = 'path';
      const W = Math.min(map.clientWidth || 480, 520) - 28;
      const step = 96, top = 70;
      const h = top + (count - 1) * step + 70;
      path.style.height = h + 'px';
      const pts = [];
      for (let i = 0; i < count; i++) {
        const x = W / 2 + Math.sin(i * 0.95) * (W * 0.32);
        const y = top + i * step;
        pts.push([x, y]);
      }
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const my = (y0 + y1) / 2;
        d += ` C${x0},${my} ${x1},${my} ${x1},${y1}`;
      }
      path.innerHTML = `<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="#141414" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/></svg>`;
      pts.forEach(([x, y], i) => {
        const key = `${lv.id}-${i}`;
        const best = save.best[key] || 0;
        const b = document.createElement('button');
        b.className = 'node' + (best ? ' done' : '') + (best === 3 ? ' perfect' : '') + (!best && save.prog[key] ? ' started' : '');
        b.style.left = x + 'px';
        b.style.top = y + 'px';
        b.innerHTML = `<span class="n">${i + 1}</span><span class="st">${starHTML(best)}</span>`;
        b.setAttribute('aria-label', `${lv.id} crucigrama ${i + 1}, ${best} estrellas`);
        if (!lv.locked) b.onclick = () => openPuzzle(lv.id, i);
        path.appendChild(b);
      });
      reg.appendChild(path);
      if (lv.locked) {
        const m = document.createElement('div');
        m.className = 'lockmsg';
        m.textContent = `🔒 ${lv.id} llega pronto`;
        reg.appendChild(m);
      }
      map.appendChild(reg);
    });
    $('#totalStars').textContent = total;
    $('#totalMax').textContent = '/' + totalMax;
  }

  // ---------- PUZZLE ----------
  let P = null; // current puzzle state

  function openPuzzle(level, idx) {
    const pz = data[level][idx];
    const key = `${level}-${idx}`;
    const cells = {}; // "r,c" -> {a, e:[entry idx...], n}
    pz.e.forEach((e, ei) => {
      for (let i = 0; i < e.a.length; i++) {
        const r = e.d === 'A' ? e.r : e.r + i;
        const c = e.d === 'A' ? e.c + i : e.c;
        const k = r + ',' + c;
        cells[k] = cells[k] || { a: e.a[i], e: {} };
        cells[k].e[e.d] = ei;
        if (i === 0) cells[k].n = e.n;
      }
    });
    const prog = save.prog[key] || { l: {}, rv: [], rc: 0 };
    P = { level, idx, key, pz, cells, l: { ...prog.l }, rv: new Set(prog.rv), rc: prog.rc || 0, bad: new Set(),
          cur: null, dir: 'A', solved: !!save.best[key] && Object.keys(prog.l).length === 0 ? false : false };
    $('#pLevel').textContent = level;
    $('#pName').textContent = `Rätsel ${idx + 1}`;
    buildGrid();
    buildLists();
    const first = pz.e.find((e) => e.d === 'A') || pz.e[0];
    select(first.r, first.c, first.d);
    show('puzzleView');
    window.scrollTo(0, 0);
    updateLive();
  }

  function sizeCells() {
    const pz = P.pz;
    const vw = Math.min(window.innerWidth, 1150);
    const avail = (window.innerWidth > 900 ? Math.min(vw - 440, 620) : vw - 30) - 6;
    const size = Math.max(22, Math.min(40, Math.floor(avail / pz.w)));
    document.documentElement.style.setProperty('--cell', size + 'px');
  }

  function buildGrid() {
    const { pz, cells } = P;
    const g = $('#grid');
    g.classList.remove('solved');
    g.style.gridTemplateColumns = `repeat(${pz.w}, var(--cell))`;
    sizeCells();
    let html = '';
    for (let r = 0; r < pz.h; r++) {
      for (let c = 0; c < pz.w; c++) {
        const cell = cells[r + ',' + c];
        if (!cell) { html += '<div class="cell"></div>'; continue; }
        html += `<div class="cell w" data-k="${r},${c}">${cell.n ? `<span class="num">${cell.n}</span>` : ''}<span class="ch"></span></div>`;
      }
    }
    g.innerHTML = html;
    g.querySelectorAll('.cell.w').forEach((el) => {
      el.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const [r, c] = el.dataset.k.split(',').map(Number);
        const k = el.dataset.k;
        if (P.cur === k) {
          const other = P.dir === 'A' ? 'D' : 'A';
          if (P.cells[k].e[other] !== undefined) P.dir = other;
          select(r, c, P.dir);
        } else select(r, c, P.dir);
        focusKbd();
      });
    });
    paint();
  }

  function clueHTML(e, withEn) {
    let de;
    if (e.de) {
      de = esc(e.de).replace(/____/g, '<span class="blank"></span>');
    } else {
      de = `<i>${esc(e.en)}</i>`;
    }
    const art = e.art ? `<span class="art ${e.art}">${e.art}</span>` : '';
    const en = withEn && e.de ? `<div class="en">${esc(e.en)}</div>` : '';
    return `${de} <span class="len">(${e.a.length})</span>${art}${en}`;
  }

  function buildLists() {
    ['A', 'D'].forEach((d) => {
      const ol = $(d === 'A' ? '#listA' : '#listD');
      ol.innerHTML = '';
      P.pz.e.forEach((e, ei) => {
        if (e.d !== d) return;
        const li = document.createElement('li');
        li.dataset.ei = ei;
        li.innerHTML = `<b>${e.n}</b><div>${clueHTML(e, showEn)}</div>`;
        li.onclick = () => { select(e.r, e.c, e.d); focusKbd(); if (window.innerWidth <= 900) $('#clueBar').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
        ol.appendChild(li);
      });
    });
  }

  const entryCells = (e) => Array.from({ length: e.a.length }, (_, i) => (e.d === 'A' ? `${e.r},${e.c + i}` : `${e.r + i},${e.c}`));

  function curEntry() {
    if (!P.cur) return null;
    const ei = P.cells[P.cur].e[P.dir];
    return ei === undefined ? null : P.pz.e[ei];
  }

  function select(r, c, dir) {
    const k = r + ',' + c;
    const cell = P.cells[k];
    if (!cell) return;
    if (cell.e[dir] === undefined) dir = dir === 'A' ? 'D' : 'A';
    P.cur = k;
    P.dir = dir;
    paint();
  }

  function paint() {
    const e = curEntry();
    const inword = new Set(e ? entryCells(e) : []);
    $('#grid').querySelectorAll('.cell.w').forEach((el) => {
      const k = el.dataset.k;
      el.querySelector('.ch').textContent = P.l[k] || '';
      el.classList.toggle('cur', k === P.cur);
      el.classList.toggle('inword', inword.has(k) && k !== P.cur);
      el.classList.toggle('bad', P.bad.has(k));
      el.classList.toggle('rev', P.rv.has(k));
    });
    if (e) {
      $('#cbNum').textContent = e.n + (e.d === 'A' ? ' →' : ' ↓');
      $('#cbDe').innerHTML = clueHTML(e, false);
      $('#cbEn').textContent = showEn && e.de ? e.en : '';
    }
    const ei = e ? P.pz.e.indexOf(e) : -1;
    document.querySelectorAll('.clist li').forEach((li) => {
      const en = P.pz.e[+li.dataset.ei];
      li.classList.toggle('act', +li.dataset.ei === ei);
      li.classList.toggle('ok', entryCells(en).every((k) => P.l[k] === P.cells[k].a));
    });
  }

  function storeProg() {
    save.prog[P.key] = { l: P.l, rv: [...P.rv], rc: P.rc };
    persist();
  }

  function updateLive() {
    $('#pStarsLive').innerHTML = starHTML(starsFor(P.rc));
  }

  function move(delta) {
    const e = curEntry();
    if (!e) return;
    const cs = entryCells(e);
    const i = cs.indexOf(P.cur) + delta;
    if (i >= 0 && i < cs.length) { P.cur = cs[i]; paint(); }
  }

  function typeLetter(ch) {
    if (!P || !P.cur || P.solved) return;
    ch = ch.toUpperCase();
    if (ch === 'ß') { typeLetter('S'); typeLetter('S'); return; }
    if (!/^[A-ZÄÖÜ]$/.test(ch)) return;
    if (!P.rv.has(P.cur)) { P.l[P.cur] = ch; P.bad.delete(P.cur); }
    // advance to next cell in word (skip revealed)
    const e = curEntry();
    const cs = entryCells(e);
    let i = cs.indexOf(P.cur);
    if (i < cs.length - 1) P.cur = cs[i + 1];
    paint();
    storeProg();
    checkSolved();
  }

  function backspace() {
    if (!P || !P.cur || P.solved) return;
    if (P.l[P.cur] && !P.rv.has(P.cur)) {
      delete P.l[P.cur];
    } else {
      move(-1);
      if (!P.rv.has(P.cur)) delete P.l[P.cur];
    }
    P.bad.delete(P.cur);
    paint();
    storeProg();
  }

  function nextEntry(back) {
    const list = P.pz.e;
    const e = curEntry();
    let i = list.indexOf(e) + (back ? -1 : 1);
    i = (i + list.length) % list.length;
    const n = list[i];
    select(n.r, n.c, n.d);
  }

  function arrow(dr, dc) {
    const want = dc ? 'A' : 'D';
    if (P.dir !== want && P.cells[P.cur].e[want] !== undefined) { P.dir = want; paint(); return; }
    let [r, c] = P.cur.split(',').map(Number);
    for (let s = 0; s < 15; s++) {
      r += dr; c += dc;
      if (r < 0 || c < 0 || r >= P.pz.h || c >= P.pz.w) return;
      if (P.cells[r + ',' + c]) { select(r, c, want); return; }
    }
  }

  function checkSolved() {
    const all = Object.keys(P.cells);
    if (!all.every((k) => P.l[k] === P.cells[k].a)) return;
    P.solved = true;
    const stars = starsFor(P.rc);
    const prev = save.best[P.key] || 0;
    save.best[P.key] = Math.max(prev, stars);
    delete save.prog[P.key];
    persist();
    $('#grid').classList.add('solved');
    setTimeout(() => showDone(stars, prev), 450);
  }

  function showDone(stars, prev) {
    $('#doneStars').innerHTML = starHTML(stars);
    const msgs = { 3: '¡Perfecto! Sin ayuda.', 2: 'Muy bien, con poquita ayuda.', 1: 'Completado. Volvé a intentarlo para más estrellas.' };
    $('#doneMsg').textContent = msgs[stars] + (prev > stars ? ` (Tu récord sigue siendo ${prev}★)` : '');
    $('#vocabList').innerHTML = P.pz.e
      .slice().sort((a, b) => a.w.localeCompare(b.w, 'de'))
      .map((e) => `<li><b>${e.art ? esc(e.art) + ' ' : ''}${esc(e.w)}</b><br><span>${esc(e.full)}</span><br><span class="s">${esc(e.en)}</span></li>`)
      .join('');
    $('#doneModal').hidden = false;
  }

  // ---------- keyboard ----------
  const kbd = $('#kbd');
  function focusKbd() {
    kbd.value = '  ';
    kbd.focus({ preventScroll: true });
    try { kbd.setSelectionRange(2, 2); } catch {}
  }
  kbd.addEventListener('beforeinput', (ev) => {
    ev.preventDefault();
    if (ev.inputType && ev.inputType.startsWith('delete')) backspace();
    else if (ev.data) [...ev.data].forEach(typeLetter);
  });
  kbd.addEventListener('input', () => { // fallback for browsers without beforeinput cancel
    const v = kbd.value.trim();
    if (v) [...v].forEach(typeLetter);
    kbd.value = '  ';
  });

  document.addEventListener('keydown', (ev) => {
    if (!$('#puzzleView').classList.contains('active') || !$('#doneModal').hidden) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    const handled = () => ev.preventDefault();
    if (k === 'ArrowRight') { handled(); arrow(0, 1); }
    else if (k === 'ArrowLeft') { handled(); arrow(0, -1); }
    else if (k === 'ArrowDown') { handled(); arrow(1, 0); }
    else if (k === 'ArrowUp') { handled(); arrow(-1, 0); }
    else if (k === 'Tab' || k === 'Enter') { handled(); nextEntry(ev.shiftKey); }
    else if (k === 'Backspace') { handled(); backspace(); }
    else if (k === 'Delete') { handled(); if (!P.rv.has(P.cur)) { delete P.l[P.cur]; paint(); storeProg(); } }
    else if (k === ' ') { handled(); const o = P.dir === 'A' ? 'D' : 'A'; if (P.cells[P.cur].e[o] !== undefined) { P.dir = o; paint(); } }
    else if (document.activeElement !== kbd && /^[a-zA-ZäöüÄÖÜß]$/.test(k)) { handled(); typeLetter(k); }
  });

  document.querySelectorAll('.umlauts button').forEach((b) => {
    b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); typeLetter(b.dataset.k); focusKbd(); });
  });

  // ---------- tools ----------
  let showEn = false;
  try { showEn = localStorage.getItem(STORE + '.en') === '1'; } catch {}
  const syncEnBtn = () => $('#trBtn').setAttribute('aria-pressed', String(showEn));
  syncEnBtn();
  $('#trBtn').onclick = () => {
    showEn = !showEn;
    try { localStorage.setItem(STORE + '.en', showEn ? '1' : '0'); } catch {}
    syncEnBtn(); buildLists(); paint();
  };
  $('#checkBtn').onclick = () => {
    P.bad.clear();
    Object.keys(P.cells).forEach((k) => { if (P.l[k] && P.l[k] !== P.cells[k].a) P.bad.add(k); });
    paint();
    if (!P.bad.size) flash('¡Todo lo escrito está bien!');
  };
  function reveal(keys) {
    let n = 0;
    keys.forEach((k) => {
      if (P.l[k] === P.cells[k].a) return;
      P.l[k] = P.cells[k].a; P.rv.add(k); P.bad.delete(k); n++;
    });
    P.rc += n;
    updateLive(); paint(); storeProg(); checkSolved();
  }
  $('#revLetterBtn').onclick = () => { if (P.cur && !P.solved) { reveal([P.cur]); move(1); } };
  $('#revWordBtn').onclick = () => { const e = curEntry(); if (e && !P.solved) reveal(entryCells(e)); };
  $('#resetBtn').onclick = () => {
    if (!confirmReset()) return;
    P.l = {}; P.rv = new Set(); P.rc = 0; P.bad.clear(); P.solved = false;
    delete save.prog[P.key]; persist();
    $('#grid').classList.remove('solved');
    updateLive(); paint();
  };
  let resetArmed = 0;
  function confirmReset() { // two taps instead of a blocking dialog
    if (Date.now() - resetArmed < 2500) { resetArmed = 0; $('#resetBtn').textContent = 'Reiniciar'; return true; }
    resetArmed = Date.now(); $('#resetBtn').textContent = '¿Seguro? tocá otra vez';
    setTimeout(() => { $('#resetBtn').textContent = 'Reiniciar'; }, 2500);
    return false;
  }
  function flash(msg) {
    const bar = $('#cbEn'); const old = bar.textContent;
    bar.textContent = msg; setTimeout(() => paint(), 1600);
  }

  // ---------- navigation ----------
  function show(id) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === id));
    if (id === 'mapView') { renderMap(); kbd.blur(); }
  }
  $('#backBtn').onclick = () => { show('mapView'); history.replaceState(null, '', location.pathname); };
  $('#doneMap').onclick = () => { $('#doneModal').hidden = true; show('mapView'); };
  $('#doneNext').onclick = () => {
    $('#doneModal').hidden = true;
    const ps = data[P.level];
    let pool = ps.map((_, i) => i).filter((i) => i !== P.idx && (save.best[`${P.level}-${i}`] || 0) < 3);
    if (!pool.length) pool = ps.map((_, i) => i).filter((i) => i !== P.idx);
    openPuzzle(P.level, pool[Math.floor(Math.random() * pool.length)]);
  };
  window.addEventListener('resize', () => { if (P && $('#puzzleView').classList.contains('active')) sizeCells(); else if ($('#mapView').classList.contains('active')) renderMap(); });

  // ---------- boot ----------
  Promise.all(LEVELS.filter((l) => !l.locked).map((l) => fetch(l.file).then((r) => r.json()).then((d) => { data[l.id] = d; })))
    .then(renderMap)
    .catch((err) => { $('#map').innerHTML = `<p style="padding:20px">No se pudieron cargar los crucigramas (${esc(err.message)}).</p>`; });
})();
