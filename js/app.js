/* Kreuzwort — crucigramas de vocabulario alemán */
(() => {
  'use strict';

  const UNLOCK = 0.7; // fraction of the previous level's stars needed
  const LEVELS = [
    { id: 'A1', title: 'Start Deutsch 1', file: 'data/a1.json' },
    { id: 'A2', title: 'Goethe-Zertifikat A2', file: 'data/a2.json' },
    { id: 'B1', title: 'Goethe-Zertifikat B1', file: 'data/b1.json' },
  ];
  const STORE = 'kreuzwort.v1';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- storage ----------
  let save;
  try { save = JSON.parse(localStorage.getItem(STORE)) || {}; } catch { save = {}; }
  save.best = save.best || {};
  save.prog = save.prog || {};
  save.unk = save.unk || {};
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch {} };

  const data = {}; // level id -> puzzles
  const starsFor = (rev) => (rev === 0 ? 3 : rev <= 3 ? 2 : 1);
  const starHTML = (n, max = 3) => Array.from({ length: max }, (_, i) => `<span class="star${i < n ? ' on' : ''}">★</span>`).join('');

  function levelStats(id) {
    const ps = data[id] || [];
    let s = 0;
    for (let i = 0; i < ps.length; i++) s += save.best[`${id}-${i}`] || 0;
    return { stars: s, max: ps.length * 3, need: Math.ceil(ps.length * 3 * UNLOCK) };
  }
  function isUnlocked(i) {
    if (i === 0) return true;
    const prev = levelStats(LEVELS[i - 1].id);
    return isUnlocked(i - 1) && prev.stars >= prev.need;
  }

  // ================= MAP =================
  function renderMap() {
    const map = $('#map');
    map.innerHTML = '';
    const chips = document.createElement('nav');
    chips.className = 'chips';
    map.appendChild(chips);
    let total = 0;

    LEVELS.forEach((lv, li) => {
      const puzzles = data[lv.id] || [];
      const open = isUnlocked(li);
      const st = levelStats(lv.id);
      total += st.stars;
      const count = open ? puzzles.length : Math.min(6, puzzles.length);

      const chip = document.createElement('button');
      chip.className = 'chip' + (open ? '' : ' off');
      chip.textContent = lv.id + (open ? '' : ' 🔒');
      chip.onclick = () => document.getElementById('reg-' + lv.id).scrollIntoView({ behavior: 'smooth', block: 'start' });
      chips.appendChild(chip);

      const reg = document.createElement('div');
      reg.className = 'region' + (open ? '' : ' locked');
      reg.id = 'reg-' + lv.id;
      const pct = st.max ? Math.round((st.stars / st.max) * 100) : 0;
      reg.innerHTML = `
        <div class="region-head">
          <div class="lv">${lv.id}</div>
          <div style="flex:1;min-width:0">
            <div class="t">${lv.title}</div>
            <div class="s">${puzzles.length} crucigramas${open ? ' · elegí cualquiera' : ''}</div>
            ${open ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}
          </div>
          ${open ? `<div class="rs"><span class="star">★</span> ${st.stars}/${st.max}</div>` : '<div class="rs">🔒</div>'}
        </div>`;

      const path = document.createElement('div');
      path.className = 'path';
      const W = Math.min(map.clientWidth || 480, 520) - 28;
      const step = 92, top = 72;
      const h = top + (count - 1) * step + 70;
      path.style.height = h + 'px';
      const pts = [];
      for (let i = 0; i < count; i++) pts.push([W / 2 + Math.sin(i * 0.95) * (W * 0.32), top + i * step]);
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y0 + y1) / 2;
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
        if (open) b.onclick = () => openPuzzle(lv.id, i);
        path.appendChild(b);
      });
      reg.appendChild(path);

      if (!open) {
        const prev = LEVELS[li - 1];
        const ps = levelStats(prev.id);
        const m = document.createElement('div');
        m.className = 'lockmsg';
        m.innerHTML = isUnlocked(li - 1)
          ? `<b>🔒 Conseguí ${ps.need - ps.stars} ★ más en ${prev.id}</b>Se abre con el 70% de las estrellas de ${prev.id} (${ps.stars}/${ps.need})`
          : `<b>🔒 Primero desbloqueá ${prev.id}</b>Después necesitás el 70% de sus estrellas`;
        reg.appendChild(m);
      }
      map.appendChild(reg);
    });
    $('#totalStars').textContent = total;
    $('#unkCount').textContent = Object.keys(save.unk).length;
  }

  // ================= PUZZLE =================
  let P = null;
  let showEn = false;

  function openPuzzle(level, idx) {
    const pz = data[level][idx];
    const key = `${level}-${idx}`;
    const cells = {};
    pz.e.forEach((e, ei) => {
      entryCells(e).forEach((k, i) => {
        cells[k] = cells[k] || { a: e.a[i], e: {} };
        cells[k].e[e.d] = ei;
        if (i === 0) cells[k].n = e.n;
      });
    });
    const prog = save.prog[key] || { l: {}, rv: [], rc: 0 };
    P = { level, idx, key, pz, cells, l: { ...prog.l }, rv: new Set(prog.rv), rc: prog.rc || 0,
          lock: new Set(), cur: null, dir: 'A', solved: false };
    computeLocks();
    showEn = false; // every game starts without translation
    syncEnBtn();
    $('#pLevel').textContent = level;
    $('#pName').textContent = `Rätsel ${idx + 1}`;
    show('puzzleView');
    buildGrid();
    buildLists();
    const first = pz.e.find((e) => hasEditable(e)) || pz.e[0];
    select(first.r, first.c, first.d);
    window.scrollTo(0, 0);
    updateLive();
    if (Object.keys(cells).every((k) => P.l[k] === cells[k].a)) checkSolved();
  }

  const entryCells = (e) => Array.from({ length: e.a.length }, (_, i) => (e.d === 'A' ? `${e.r},${e.c + i}` : `${e.r + i},${e.c}`));
  const editable = (k) => !P.lock.has(k) && !P.rv.has(k);
  const hasEditable = (e) => entryCells(e).some(editable);
  const entryOK = (e) => entryCells(e).every((k) => P.l[k] === P.cells[k].a);

  function computeLocks() {
    const before = new Set(P.lock);
    P.lock = new Set(P.rv);
    P.pz.e.forEach((e) => { if (entryOK(e)) entryCells(e).forEach((k) => P.lock.add(k)); });
    return [...P.lock].filter((k) => !before.has(k));
  }

  function sizeCells() {
    const { w, h } = P.pz;
    let size;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    if (vw > 900) {
      const panelH = $('#panel').offsetHeight || 130;
      const availW = Math.min(vw - 360 - 28 - 40, 640);
      const availH = window.innerHeight - 56 - panelH - 24 - 52;
      size = Math.min(availW / w, availH / h);
    } else {
      size = (Math.min(vw, 600) - 30) / w;
    }
    size = Math.max(22, Math.min(44, Math.floor(size)));
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
        html += cell
          ? `<div class="cell w" data-k="${r},${c}">${cell.n ? `<span class="num">${cell.n}</span>` : ''}<span class="ch"></span></div>`
          : '<div class="cell"></div>';
      }
    }
    g.innerHTML = html;
    g.querySelectorAll('.cell.w').forEach((el) => {
      el.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const k = el.dataset.k;
        const [r, c] = k.split(',').map(Number);
        if (P.cur === k) {
          const other = P.dir === 'A' ? 'D' : 'A';
          if (P.cells[k].e[other] !== undefined) P.dir = other;
        }
        select(r, c, P.dir, false);
        focusKbd();
      });
    });
    paint();
  }

  function clueHTML(e, withEn) {
    const de = e.de ? esc(e.de).replace(/____/g, '<span class="blank"></span>') : `<i>${esc(e.en)}</i>`;
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
        li.onclick = () => { select(e.r, e.c, e.d); focusKbd(); };
        ol.appendChild(li);
      });
    });
  }

  function curEntry() {
    if (!P.cur) return null;
    const ei = P.cells[P.cur].e[P.dir];
    return ei === undefined ? null : P.pz.e[ei];
  }

  // select a cell; when jumping to a word, land on its first editable cell
  function select(r, c, dir, toFirstFree = true) {
    const k = r + ',' + c;
    const cell = P.cells[k];
    if (!cell) return;
    if (cell.e[dir] === undefined) dir = dir === 'A' ? 'D' : 'A';
    P.cur = k;
    P.dir = dir;
    P.skip = [];
    if (toFirstFree) {
      const cs = entryCells(curEntry());
      const fi = cs.findIndex(editable);
      if (fi > 0) { P.cur = cs[fi]; P.skip = cs.slice(0, fi).map((x) => P.l[x]); }
    }
    paint(true);
  }

  function paint(scroll) {
    const e = curEntry();
    const inword = new Set(e ? entryCells(e) : []);
    let curEl = null;
    $('#grid').querySelectorAll('.cell.w').forEach((el) => {
      const k = el.dataset.k;
      el.querySelector('.ch').textContent = P.l[k] || '';
      el.classList.toggle('cur', k === P.cur);
      el.classList.toggle('inword', inword.has(k) && k !== P.cur);
      el.classList.toggle('lock', P.lock.has(k));
      el.classList.toggle('rev', P.rv.has(k));
      if (k === P.cur) curEl = el;
    });
    if (e) {
      $('#cbNum').textContent = e.n + (e.d === 'A' ? ' →' : ' ↓');
      $('#cbDe').innerHTML = clueHTML(e, false);
      $('#cbEn').textContent = showEn && e.de ? e.en : '';
    }
    const ei = e ? P.pz.e.indexOf(e) : -1;
    document.querySelectorAll('.clist li').forEach((li) => {
      const i = +li.dataset.ei;
      li.classList.toggle('act', i === ei);
      li.classList.toggle('ok', entryOK(P.pz.e[i]));
    });
    if (scroll && curEl && window.innerWidth <= 900) curEl.scrollIntoView({ block: 'nearest' });
  }

  function storeProg() {
    save.prog[P.key] = { l: P.l, rv: [...P.rv], rc: P.rc };
    persist();
  }
  const updateLive = () => { $('#pStarsLive').innerHTML = starHTML(starsFor(P.rc)); };

  function popCells(keys) {
    keys.forEach((k) => {
      const el = document.querySelector(`.cell[data-k="${k}"]`);
      if (!el) return;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    });
  }

  // after a change: lock finished words; if the current word just locked, jump on
  function afterChange() {
    const newly = computeLocks();
    popCells(newly);
    storeProg();
    if (checkSolved()) { paint(); return; }
    const e = curEntry();
    if (e && !hasEditable(e)) nextEntry(false);
    else paint(true);
  }

  function typeLetter(ch) {
    if (!P || !P.cur || P.solved) return;
    ch = ch.toUpperCase();
    if (ch === 'ß') { typeLetter('S'); typeLetter('S'); return; }
    if (!/^[A-ZÄÖÜ]$/.test(ch)) return;
    const cs = entryCells(curEntry());
    let i = cs.indexOf(P.cur);
    if (!editable(cs[i])) { // cursor sits on fixed letters: hop to the next free cell
      let j = i;
      while (j < cs.length && !editable(cs[j])) j++;
      if (j >= cs.length) return;
      P.skip = cs.slice(i, j).map((x) => P.l[x]);
      i = j; P.cur = cs[j];
    }
    // the player may type the fixed (green) letters the cursor skipped: absorb them
    if (P.skip && P.skip.length) {
      if (P.skip[0] === ch) { P.skip.shift(); paint(); return; }
      P.skip = [];
    }
    P.l[cs[i]] = ch;
    let j = i + 1;
    while (j < cs.length && !editable(cs[j])) j++;
    P.cur = j < cs.length ? cs[j] : cs[i];
    P.skip = cs.slice(i + 1, j).map((x) => P.l[x]);
    afterChange();
  }

  function backspace() {
    if (!P || !P.cur || P.solved) return;
    P.skip = [];
    if (editable(P.cur) && P.l[P.cur]) {
      delete P.l[P.cur];
    } else {
      const cs = entryCells(curEntry());
      let i = cs.indexOf(P.cur) - 1;
      while (i >= 0 && !editable(cs[i])) i--;
      if (i < 0) return;
      P.cur = cs[i];
      delete P.l[P.cur];
    }
    storeProg();
    paint(true);
  }

  function nextEntry(back) {
    const list = P.pz.e;
    const start = Math.max(0, list.indexOf(curEntry()));
    for (let s = 1; s <= list.length; s++) {
      const n = list[(start + (back ? -s : s) + list.length * 2) % list.length];
      if (hasEditable(n)) { select(n.r, n.c, n.d); return; }
    }
    paint();
  }

  function arrow(dr, dc) {
    const want = dc ? 'A' : 'D';
    if (P.dir !== want && P.cells[P.cur].e[want] !== undefined) { P.dir = want; paint(); return; }
    let [r, c] = P.cur.split(',').map(Number);
    for (let s = 0; s < 15; s++) {
      r += dr; c += dc;
      if (r < 0 || c < 0 || r >= P.pz.h || c >= P.pz.w) return;
      if (P.cells[r + ',' + c]) { select(r, c, want, false); return; }
    }
  }

  function reveal(keys) {
    let n = 0;
    keys.forEach((k) => {
      if (!editable(k) || P.l[k] === P.cells[k].a) return;
      P.l[k] = P.cells[k].a; P.rv.add(k); n++;
    });
    P.rc += n;
    updateLive();
    afterChange();
  }

  function checkSolved() {
    if (P.solved) return true;
    if (!Object.keys(P.cells).every((k) => P.l[k] === P.cells[k].a)) return false;
    P.solved = true;
    const stars = starsFor(P.rc);
    const prev = save.best[P.key] || 0;
    const unlockedBefore = LEVELS.map((_, i) => isUnlocked(i));
    save.best[P.key] = Math.max(prev, stars);
    delete save.prog[P.key];
    persist();
    const newLevel = LEVELS.find((lv, i) => isUnlocked(i) && !unlockedBefore[i]);
    $('#grid').classList.add('solved');
    // words that needed help are pre-marked as "no la sabía"
    const helped = new Set(P.pz.e.filter((e) => entryCells(e).some((k) => P.rv.has(k))).map((e) => e.a));
    setTimeout(() => doneStepMark(stars, prev, helped, newLevel), 500);
    return true;
  }

  // ================= END OF GAME =================
  const modal = $('#doneModal'), card = $('#doneCard');
  const wordData = (e) => ({ a: e.a, w: e.w, art: e.art || '', de: e.de, en: e.en, full: e.full });

  function doneStepMark(stars, prev, helped, newLevel) {
    const msgs = { 3: '¡Perfecto! Sin ayuda.', 2: 'Muy bien, con poquita ayuda.', 1: 'Completado. Volvé a jugarlo para sumar estrellas.' };
    const words = P.pz.e.slice().sort((a, b) => a.w.localeCompare(b.w, 'de'));
    card.innerHTML = `
      <h2>Super gemacht!</h2>
      <div class="big-stars">${starHTML(stars)}</div>
      <p>${msgs[stars]}${prev > stars ? ` Tu récord sigue siendo ${prev}★.` : ''}</p>
      ${newLevel ? `<p style="color:var(--green);font-weight:700">🔓 ¡Desbloqueaste ${newLevel.id}!</p>` : ''}
      <h3 style="margin:14px 0 2px;font-size:17px">¿Qué palabras no sabías?</h3>
      <p style="margin:0;font-size:13px">Tocá las que quieras repasar después.</p>
      <div class="wordpick">${words.map((e) => {
        const on = helped.has(e.a) || !!save.unk[e.a];
        return `<button class="wp" data-a="${esc(e.a)}" aria-pressed="${on}">${e.art ? `<small>${esc(e.art)}</small>` : ''}${esc(e.w)}</button>`;
      }).join('')}</div>
      <div class="modal-actions"><button class="btn" id="markSave">Guardar y repasar →</button></div>`;
    card.querySelectorAll('.wp').forEach((b) => (b.onclick = () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));
    $('#markSave').onclick = () => {
      card.querySelectorAll('.wp').forEach((b) => {
        const e = P.pz.e.find((x) => x.a === b.dataset.a);
        if (b.getAttribute('aria-pressed') === 'true') save.unk[e.a] = save.unk[e.a] || { ...wordData(e), lv: P.level, t: Date.now() };
        else delete save.unk[e.a];
      });
      persist();
      const pool = shuffle(Object.values(save.unk)).slice(0, 5);
      if (!pool.length) return doneStepEnd(0, 0);
      runCards(card, pool, (known, total) => doneStepEnd(known, total));
    };
    modal.hidden = false;
  }

  function doneStepEnd(known, total) {
    const left = Object.keys(save.unk).length;
    card.innerHTML = `
      <h2>${total ? 'Repaso listo' : '¡Bien!'}</h2>
      ${total ? `<p>Sabías ${known} de ${total}. Te quedan ${left} palabra${left === 1 ? '' : 's'} para repasar (📚 en el mapa).</p>` : '<p>No marcaste palabras para repasar.</p>'}
      <div class="modal-actions">
        <button class="btn ghost" id="endMap">Volver al mapa</button>
        <button class="btn" id="endNext">Siguiente al azar →</button>
      </div>`;
    $('#endMap').onclick = () => { modal.hidden = true; show('mapView'); };
    $('#endNext').onclick = () => {
      modal.hidden = true;
      const ps = data[P.level];
      let pool = ps.map((_, i) => i).filter((i) => i !== P.idx && (save.best[`${P.level}-${i}`] || 0) < 3);
      if (!pool.length) pool = ps.map((_, i) => i).filter((i) => i !== P.idx);
      openPuzzle(P.level, pool[Math.floor(Math.random() * pool.length)]);
    };
  }

  // ================= FLASHCARDS =================
  function highlight(full, de) {
    if (!de) return esc(full);
    const parts = de.split('____');
    let out = '', pos = 0;
    for (let i = 0; i < parts.length; i++) {
      const idx = full.indexOf(parts[i], pos);
      if (idx < 0) return esc(full);
      if (i > 0) out += `<mark>${esc(full.slice(pos, idx))}</mark>`;
      out += esc(parts[i]);
      pos = idx + parts[i].length;
    }
    return out + esc(full.slice(pos));
  }

  function runCards(box, words, onDone) {
    let i = 0, known = 0;
    const draw = (revealed) => {
      const w = words[i];
      box.innerHTML = `
        <div class="fcard">
          <div class="prog">Palabra ${i + 1} de ${words.length}</div>
          <div class="q">¿Qué significa?</div>
          <div class="word">${w.art ? `<span class="art ${esc(w.art)}">${esc(w.art)}</span> ` : ''}${esc(w.w)}</div>
          ${revealed ? `<div class="ans">${highlight(w.full, w.de)}<div class="en">${esc(w.en)}</div></div>` : ''}
        </div>
        <div class="modal-actions" style="margin-top:16px">
          ${revealed
            ? '<button class="btn bad" data-r="no">✗ Todavía no</button><button class="btn good" data-r="yes">✓ Ya la sé</button>'
            : '<button class="btn" data-r="show">Ver significado</button>'}
        </div>`;
      box.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => {
        const r = b.dataset.r;
        if (r === 'show') return draw(true);
        if (r === 'yes') { known++; delete save.unk[w.a]; persist(); }
        i++;
        if (i < words.length) draw(false); else onDone(known, words.length);
      }));
    };
    draw(false);
  }

  function openPractice() {
    show('practiceView');
    const all = Object.values(save.unk);
    const box = $('#practiceCard');
    $('#practiceCount').textContent = `${all.length} palabra${all.length === 1 ? '' : 's'}`;
    renderUnkList();
    if (!all.length) {
      box.innerHTML = '<div class="empty">Todavía no marcaste palabras.<br>Al terminar un crucigrama podés elegir las que no sabías.</div>';
      return;
    }
    runCards(box, shuffle(all.slice()).slice(0, 10), (known, total) => {
      const left = Object.keys(save.unk).length;
      $('#practiceCount').textContent = `${left} palabra${left === 1 ? '' : 's'}`;
      renderUnkList();
      box.innerHTML = `<div class="fcard"><div class="word" style="font-size:30px">${known} de ${total}</div><div class="q">Te quedan ${left} para repasar</div></div>
        <div class="modal-actions" style="margin-top:16px"><button class="btn ghost" id="pMap">Volver al mapa</button>${left ? '<button class="btn" id="pMore">Otra ronda</button>' : ''}</div>`;
      $('#pMap').onclick = () => show('mapView');
      if (left) $('#pMore').onclick = openPractice;
    });
  }

  function renderUnkList() {
    const list = Object.values(save.unk).sort((a, b) => a.w.localeCompare(b.w, 'de'));
    $('#unkListBox').hidden = !list.length;
    $('#unkList').innerHTML = list.map((w) => `
      <li><div><b>${w.art ? esc(w.art) + ' ' : ''}${esc(w.w)}</b> <small style="color:var(--muted)">${esc(w.lv || '')}</small><br>
      <span>${esc(w.full)}</span><br><span class="s">${esc(w.en)}</span></div>
      <button data-a="${esc(w.a)}" aria-label="Quitar de la lista" title="Quitar de la lista">✕</button></li>`).join('');
    $('#unkList').querySelectorAll('button').forEach((b) => (b.onclick = () => {
      delete save.unk[b.dataset.a]; persist(); renderUnkList();
      const n = Object.keys(save.unk).length;
      $('#practiceCount').textContent = `${n} palabra${n === 1 ? '' : 's'}`;
    }));
  }

  // ================= INPUT =================
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
  kbd.addEventListener('input', () => {
    const v = kbd.value.trim();
    if (v) [...v].forEach(typeLetter);
    kbd.value = '  ';
  });

  document.addEventListener('keydown', (ev) => {
    if (!$('#puzzleView').classList.contains('active') || !modal.hidden || !P) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    const stop = () => ev.preventDefault();
    if (k === 'ArrowRight') { stop(); arrow(0, 1); }
    else if (k === 'ArrowLeft') { stop(); arrow(0, -1); }
    else if (k === 'ArrowDown') { stop(); arrow(1, 0); }
    else if (k === 'ArrowUp') { stop(); arrow(-1, 0); }
    else if (k === 'Tab' || k === 'Enter') { stop(); nextEntry(ev.shiftKey); }
    else if (k === 'Backspace') { stop(); backspace(); }
    else if (k === ' ') { stop(); const o = P.dir === 'A' ? 'D' : 'A'; if (P.cells[P.cur].e[o] !== undefined) { P.dir = o; paint(); } }
    else if (document.activeElement !== kbd && /^[a-zA-ZäöüÄÖÜß]$/.test(k)) { stop(); typeLetter(k); }
  });

  document.querySelectorAll('.umlauts button').forEach((b) => {
    b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); typeLetter(b.dataset.k); focusKbd(); });
  });

  // ---------- tools ----------
  function syncEnBtn() { $('#trBtn').setAttribute('aria-pressed', String(showEn)); }
  const keepFocus = (btn, fn) => btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); fn(); focusKbd(); });
  keepFocus($('#trBtn'), () => { showEn = !showEn; syncEnBtn(); buildLists(); paint(); });
  keepFocus($('#revLetterBtn'), () => { if (P.cur && !P.solved) reveal([P.cur]); });
  keepFocus($('#revWordBtn'), () => { const e = curEntry(); if (e && !P.solved) reveal(entryCells(e)); });
  keepFocus($('#prevClue'), () => nextEntry(true));
  keepFocus($('#nextClue'), () => nextEntry(false));

  let resetArmed = 0;
  $('#resetBtn').onclick = () => {
    if (Date.now() - resetArmed > 2500) {
      resetArmed = Date.now();
      $('#resetBtn').textContent = '?';
      $('#resetBtn').title = 'Tocá otra vez para borrar todo';
      setTimeout(() => { $('#resetBtn').textContent = '↺'; }, 2500);
      return;
    }
    resetArmed = 0;
    $('#resetBtn').textContent = '↺';
    P.l = {}; P.rv = new Set(); P.rc = 0; P.lock = new Set(); P.solved = false;
    delete save.prog[P.key]; persist();
    $('#grid').classList.remove('solved');
    updateLive();
    const f = P.pz.e[0]; select(f.r, f.c, f.d);
  };

  // ================= NAV =================
  function show(id) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === id));
    if (id === 'mapView') { renderMap(); kbd.blur(); }
  }
  $('#backBtn').onclick = () => show('mapView');
  $('#practiceBack').onclick = () => show('mapView');
  $('#practiceBtn').onclick = openPractice;

  new ResizeObserver(() => {
    const h = $('#panel').offsetHeight;
    document.documentElement.style.setProperty('--panelH', h + 'px');
  }).observe($('#panel'));
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (P && $('#puzzleView').classList.contains('active')) sizeCells();
    else if ($('#mapView').classList.contains('active') && window.innerWidth !== lastW) renderMap();
    lastW = window.innerWidth;
  });

  // ================= BOOT =================
  Promise.all(LEVELS.map((l) => fetch(l.file).then((r) => r.json()).then((d) => { data[l.id] = d; })))
    .then(renderMap)
    .catch((err) => { $('#map').innerHTML = `<p style="padding:20px">No se pudieron cargar los crucigramas (${esc(err.message)}).</p>`; });
})();
