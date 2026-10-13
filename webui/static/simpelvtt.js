(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const api = '/api/simpelvtt/';
  const S = { tree: [], gm: null, gmOpen: false, mode: 'play', camp: null, cur: null, view: null, dirty: null };
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ingen lagring */ } } };
  const enc = ref => ref.split('/').map(encodeURIComponent).join('/');

  function msg(t) { const m = $('msg'); m.textContent = t; m.style.display = 'block'; clearTimeout(msg.t); msg.t = setTimeout(() => m.style.display = 'none', 3500); }
  async function call(method, path, body) {
    const opt = { method, headers: {} };
    if (body instanceof FormData) opt.body = body; else if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    let r, d;
    try { r = await fetch(api + path, opt); d = await r.json(); } catch (e) { msg(r && r.status === 413 ? 'Filen er for stor (max 100 MB).' : 'Fejl i forbindelsen.'); return null; }
    if (!r.ok) { msg(d.error || ('Fejl ' + r.status)); return null; }
    return d;
  }
  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); }
    for (const k of kids) e.append(k);
    return e;
  }

  // ---------- træ ----------
  async function loadTree() {
    const d = await call('GET', 'tree'); if (!d) return;
    S.tree = d.campaigns; S.gm = d.general;
    if (!S.tree.find(c => c.name === S.camp)) S.camp = (S.tree[0] || {}).name || null;
    const sel = $('campSel'); sel.textContent = '';
    for (const c of S.tree) sel.append(el('option', { value: c.name }, c.name));
    sel.value = S.camp || '';
    renderTree();
  }
  const dests = () => (S.gm ? [S.gm] : []).concat(S.tree).flatMap(c => [{ c: c.name, r: '', label: c.name }, ...c.rooms.map(r => ({ c: c.name, r: r.name, label: c.name + ' / ' + r.name }))]);

  function thumb(camp, room, file, locked) {
    const ref = room ? `${camp}/${room}/${file}` : `${camp}/${file}`;
    const sel = el('select', { title: 'Flyt til', onchange: async () => { if (S.mode !== 'edit') return; const [c, r] = JSON.parse(sel.value); sel.value = ''; if (await call('POST', 'move', { image: ref, campaign: c, room: r })) loadTree(); } },
      el('option', { value: '' }, 'Flyt…'));
    for (const d of dests()) sel.append(el('option', { value: JSON.stringify([d.c, d.r]) }, d.label));
    const t = el('div', { class: 'thumb' + (S.cur === ref ? ' cur' : ''), draggable: S.mode === 'edit' && !locked ? 'true' : 'false', 'data-ref': ref },
      el('img', { src: '/simpelvtt/thumb/' + enc(ref), loading: 'lazy', alt: file, onclick: () => { if (S.mode === 'play') show(ref); } }),
      el('div', { class: 'n', title: file }, file),
      locked ? el('div', { class: 'lock only-edit', title: 'Leveret med appen: kan ikke ændres her' }, '\u{1F512} låst') : el('div', { class: 'acts only-edit' }, sel, el('button', { class: 'sm', title: 'Omdøb', onclick: () => { const st = file.replace(/\.[^.]+$/, ''); ask('Nyt navn på billedet (endelsen bevares)', st, async v => { const d = await call('PATCH', 'image', { image: ref, to: v }); if (d && S.cur === ref) S.cur = d.image; return d; }); } }, 'Omdøb'), el('button', { class: 'sm danger', title: 'Slet', onclick: async () => { if (S.mode === 'edit' && confirm('Slet ' + file + '?') && await call('DELETE', 'image', { image: ref })) { if (S.cur === ref) S.cur = null; loadTree(); } } }, '✕')));
    t.addEventListener('dragstart', e => { if (S.mode !== 'edit' || locked) { e.preventDefault(); return; } e.dataTransfer.setData('text/x-vtt-ref', ref); e.dataTransfer.effectAllowed = 'move'; });
    return t;
  }
  function dropZone(node, camp, room) {
    node.addEventListener('dragover', e => { if (S.mode !== 'edit') return; e.preventDefault(); node.classList.add('over'); e.stopPropagation(); });
    node.addEventListener('dragleave', () => node.classList.remove('over'));
    node.addEventListener('drop', async e => {
      if (S.mode !== 'edit') return;
      e.preventDefault(); e.stopPropagation(); node.classList.remove('over');
      const ref = e.dataTransfer.getData('text/x-vtt-ref');
      if (ref) { if (await call('POST', 'move', { image: ref, campaign: camp, room })) loadTree(); }
      else if (e.dataTransfer.files.length) upload(camp, room, e.dataTransfer.files);
    });
  }
  let pending = null;
  function pickFiles(camp, room) { if (S.mode !== 'edit') return; pending = { camp, room }; $('fileIn').click(); }
  $('fileIn').addEventListener('change', e => { if (S.mode === 'edit' && pending && e.target.files.length) upload(pending.camp, pending.room, e.target.files); e.target.value = ''; });
  async function upload(camp, room, files) {
    if (S.mode !== 'edit') return;
    const fd = new FormData(); fd.append('campaign', camp); fd.append('room', room || '');
    for (const f of files) fd.append('files', f);
    msg('Uploader ' + files.length + ' fil(er)…');
    const d = await call('POST', 'upload', fd);
    if (d) msg(d.errors.length ? d.errors.join(' | ') : 'Uploadet ' + d.saved.length + '.');
    loadTree();
  }
  async function ask(label, def, fn) { if (S.mode !== 'edit') return; const v = prompt(label, def || ''); if (v && v.trim() && v.trim() !== def && await fn(v.trim())) loadTree(); }

  function roomBlock(c, r) {
    const lk = new Set(r.locked || []);
    const b = el('div', { class: 'room' },
      el('header', {}, el('h3', {}, r.name),
        el('button', { class: 'sm only-edit', onclick: () => pickFiles(c.name, r.name) }, 'Upload'),
        r.shipped ? el('span', { class: 'muted only-edit' }, '\u{1F512} leveret') : el('button', { class: 'sm only-edit', onclick: () => ask('Nyt navn på room', r.name, v => call('PATCH', 'room', { campaign: c.name, name: r.name, to: v })) }, 'Omdøb'),
        r.shipped ? '' : el('button', { class: 'sm danger only-edit', onclick: async () => { if (S.mode === 'edit' && confirm(`Slet room "${r.name}" og alle dets billeder?`) && await call('DELETE', 'room', { campaign: c.name, name: r.name })) loadTree(); } }, 'Slet')),
      el('div', { class: 'thumbs' }, ...r.images.map(f => thumb(c.name, r.name, f, lk.has(f)))));
    if (!r.images.length) b.append(el('div', { class: 'muted only-edit' }, 'Tomt – træk billeder hertil eller upload.'));
    dropZone(b, c.name, r.name);
    return b;
  }
  function campBlock(c, full) {
    const gm = c === S.gm, lk = new Set(c.locked || []);
    const loose = el('div', { class: 'room' }, el('header', {}, el('h3', {}, 'Løse billeder i kampagnen'), el('button', { class: 'sm only-edit', onclick: () => pickFiles(c.name, '') }, 'Upload')),
      el('div', { class: 'thumbs' }, ...c.images.map(f => thumb(c.name, '', f, lk.has(f)))));
    dropZone(loose, c.name, '');
    const head = el('header', {}, el('h2', {}, c.name),
      el('button', { class: 'sm only-edit', onclick: () => ask('Navn på nyt room', '', v => call('POST', 'room', { campaign: c.name, name: v })) }, '+ Room'));
    if (full && !gm) head.append(  // kun i EDIT
      el('button', { class: 'sm only-edit', onclick: () => ask('Nyt navn på kampagne', c.name, v => call('PATCH', 'campaign', { name: c.name, to: v })) }, 'Omdøb'),
      el('button', { class: 'sm danger only-edit', onclick: async () => { if (S.mode === 'edit' && confirm(`Slet kampagnen "${c.name}" med alle rooms og billeder?`) && await call('DELETE', 'campaign', { name: c.name })) loadTree(); } }, 'Slet'));
    if (gm) {  // sammenfoldet sektion, tilgængelig i alle kampagner
      const n = c.rooms.reduce((a, r) => a + r.images.length, c.images.length);
      const d = el('details', { class: 'camp gm' }, el('summary', {}, c.name, el('span', { class: 'muted' }, n + ' kort')),
        el('div', { class: 'muted' }, 'Fælles for alle kampagner. \u{1F512} = leveret med appen (kan ikke ændres); egne tilføjelser kan uploades i EDIT.'));
      if (S.gmOpen) d.open = true;
      d.addEventListener('toggle', () => { S.gmOpen = d.open; });
      const hd = el('header', {}, el('span', { class: 'sp' }), el('button', { class: 'sm only-edit', onclick: () => ask('Navn på nyt room', '', v => call('POST', 'room', { campaign: c.name, name: v })) }, '+ Room'));
      d.append(hd, ...c.rooms.map(r => roomBlock(c, r)), loose);
      return d;
    }
    return el('div', { class: 'camp' }, head, ...c.rooms.map(r => roomBlock(c, r)), loose);
  }
  function renderTree() {
    const t = $('tree'); t.textContent = '';
    if (!S.tree.length) t.append(el('div', { class: 'box muted' }, 'Ingen kampagner endnu. Skift til EDIT og opret en.'));
    const list = S.mode === 'edit' ? S.tree : S.tree.filter(c => c.name === S.camp);
    for (const c of list) t.append(campBlock(c, S.mode === 'edit'));
    if (S.gm) t.append(campBlock(S.gm, S.mode === 'edit'));
  }

  // ---------- tilstand ----------
  function setMode(m) { S.mode = m; pending = null; document.body.dataset.mode = m; for (const b of document.querySelectorAll('.mode button')) b.classList.toggle('on', b.dataset.m === m); store.set('vtt-mode', m); renderTree(); draw(); }
  document.querySelectorAll('.mode button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.m)));
  $('campSel').addEventListener('change', e => { S.camp = e.target.value; store.set('vtt-camp', S.camp); renderTree(); });
  $('newCamp').addEventListener('click', () => ask('Navn på ny kampagne', '', v => call('POST', 'campaign', { name: v })));
  $('openViewer').addEventListener('click', () => window.open('/simpelvtt/vis', 'vtt-vis'));

  // ---------- preview og kontroller ----------
  const box = $('view'), img = $('img'), cv = $('grid');
  function draw() { if (S.view && S.mode === 'play') window.vttRender(box, img, cv, S.view); }
  img.addEventListener('load', draw); window.addEventListener('resize', draw);
  async function show(ref) {
    const d = await call('PUT', 'state', { image: ref }); if (!d) return;
    S.cur = d.image; S.view = d.view; applyImage(); syncCtl(); renderTree();
  }
  function applyImage() {
    $('curName').textContent = S.cur ? '– ' + S.cur : '(tom skærm)';
    if (S.cur) img.src = '/simpelvtt/img/' + enc(S.cur) + '?t=' + Date.now(); else img.removeAttribute('src');
    draw();
  }
  $('blank').addEventListener('click', async () => { const d = await call('PUT', 'state', { image: null }); if (d) { S.cur = null; S.view = d.view; applyImage(); renderTree(); } });
  function save() {  // debounce: gem i serveren, så spillerskærmen og næste gang kortet vises får samme visning
    draw(); clearTimeout(S.dirty);
    S.dirty = setTimeout(() => { if (S.cur) call('PUT', 'view', { image: S.cur, view: S.view }); }, 150);
  }
  const tgt = () => document.querySelector('input[name=tgt]:checked').value;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function zoomBy(f) { const o = S.view[tgt()]; o.zoom = clamp(o.zoom * f, 0.1, 8); syncCtl(); save(); }
  $('zin').onclick = () => zoomBy(1.15); $('zout').onclick = () => zoomBy(1 / 1.15);
  $('reset').onclick = () => { const o = S.view[tgt()]; o.zoom = 1; o.x = 0; o.y = 0; syncCtl(); save(); };
  box.addEventListener('wheel', e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
  let drag = null;
  box.addEventListener('pointerdown', e => { if (!S.cur) return; box.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, t: tgt() }; });
  box.addEventListener('pointermove', e => {
    if (!drag) return; const o = S.view[drag.t];
    o.x = clamp(o.x + (e.clientX - drag.x) / box.clientWidth, -50, 50); o.y = clamp(o.y + (e.clientY - drag.y) / box.clientHeight, -50, 50);
    drag.x = e.clientX; drag.y = e.clientY; save();
  });
  box.addEventListener('pointerup', () => { drag = null; }); box.addEventListener('pointercancel', () => { drag = null; });
  const bind = (id, fn, ev) => $(id).addEventListener(ev || 'input', () => { if (!S.view) return; fn($(id)); syncCtl(id); save(); });
  const rotBy = d => { if (!S.view || !S.cur) return; S.view.img.rot = ((Math.round(((S.view.img.rot || 0) + d) / 90) * 90) % 360 + 360) % 360; syncCtl(); save(); };
  $('rotr').onclick = () => rotBy(90);
  bind('iz', e => S.view.img.zoom = +e.value); bind('gz', e => S.view.grid.zoom = +e.value);
  bind('night', e => S.view.night = e.checked, 'change'); bind('gon', e => S.view.grid.on = e.checked, 'change'); bind('gsize', e => S.view.grid.size = clamp(+e.value || 60, 4, 1000));
  bind('gcol', e => S.view.grid.color = e.value); bind('galpha', e => S.view.grid.alpha = +e.value);
  bind('gox', e => S.view.grid.ox = +e.value || 0); bind('goy', e => S.view.grid.oy = +e.value || 0);
  function syncCtl(skip) {
    const v = S.view; if (!v) return;
    const set = (id, val) => { if (id !== skip) $(id).value = val; };
    set('iz', v.img.zoom); set('gz', v.grid.zoom); set('gsize', v.grid.size); set('gcol', v.grid.color); set('galpha', v.grid.alpha); set('gox', v.grid.ox); set('goy', v.grid.oy);
    $('gon').checked = v.grid.on; $('night').checked = !!v.night;
    $('izo').textContent = v.img.zoom.toFixed(2) + '×'; $('gzo').textContent = v.grid.zoom.toFixed(2) + '×'; $('galphao').textContent = Math.round(v.grid.alpha * 100) + '%';
  }

  async function init() {
    S.camp = store.get('vtt-camp');
    const d = await call('GET', 'state?rev=-1');
    if (d && d.image) { S.cur = d.image; S.view = d.view; syncCtl(); applyImage(); }
    else { S.view = { img: { zoom: 1, x: 0, y: 0, rot: 0 }, grid: { on: false, size: 60, color: '#1D2026', alpha: .4, ox: 0, oy: 0, zoom: 1, x: 0, y: 0, v: 2 }, night: false }; syncCtl(); }
    await loadTree();
    setMode(store.get('vtt-mode') === 'edit' ? 'edit' : 'play');
  }
  init();
})();
