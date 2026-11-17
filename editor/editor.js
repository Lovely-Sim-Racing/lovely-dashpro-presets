/*
  Lovely Dash Pro Preset Editor: the plugin's Dash Pro editor (Pages Layout, Alerts & Notifications, Lap Review) in the browser.
  Everything it offers comes from editor-schema.json (written from the Lovely Plugin), and the preview is made of
  images/ (every module cut from the real dash). It reads and writes .dashpro presets exactly as the plugin does:
  one line of JSON, the plugin's key order, missing settings filled with the plugin's defaults.
*/
'use strict';
(() => {
  const STORE = 'lovely-dashpro-editor';
  const SESSIONS = ['Practice', 'Qualifying', 'Race'];
  // Bars toolbar order, as in the plugin: Both, Topbar, Sidebars, None (BarMode 0, 2, 1, 3)
  const BAR_ORDER = [0, 2, 1, 3];
  const BAR_LABELS = ['Both', 'Topbar', 'Sidebars', 'None'];
  // Shown under a section of the Alerts & Notifications tab that has no switch of its own
  const GROUP_NOTES = { 'Lap Review': 'Shows a review of each lap when you cross the line. Sessions and layouts are set in the Lap Review tab.' };

  let S = null;   // editor-schema.json
  let IMG = null; // images/index.json
  const state = { preset: null, name: '', page: 0, tab: 'pages', layoutMode: false, preview: true, lrSession: 'Practice', undo: [], redo: [] };

  // ---------------------------------------------------------------- small helpers
  const $ = (s, r = document) => r.querySelector(s);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isBlank = (v) => v == null || v === '' || v === 'Blank';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v | 0));
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  function el(tag, props, ...children) {
    const e = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'style' && isObj(v)) Object.assign(e.style, v);
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else if (k === 'text') e.textContent = v;
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }

  function place(e, b) {
    e.style.left = b.x + 'px'; e.style.top = b.y + 'px'; e.style.width = b.w + 'px'; e.style.height = b.h + 'px';
    return e;
  }

  const img = (path) => path ? 'images/' + path : null;

  // JavaScript lists number-like keys ("5", a Lap Review strip layout) before the others, which would reorder the
  // plugin's JSON. They're read with a ~ in front (kept in order) and written back without it.
  const NUM_KEY = /(?<!\\)"(\d+)"(\s*):/g;
  const parseJson = (text) => JSON.parse(text.replace(NUM_KEY, '"~$1"$2:'));
  const toJson = (value) => JSON.stringify(value).replace(/(?<!\\)"~(\d+)":/g, '"$1":');
  const layoutKey = (name) => /^\d+$/.test(name) ? '~' + name : name;

  // ---------------------------------------------------------------- storage, undo
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ preset: state.preset, name: state.name, page: state.page, tab: state.tab, preview: state.preview })); } catch (e) { /* private mode: no autosave */ }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      const result = normalize(saved.preset);
      if (result.problems.length) return false;
      state.preset = result.preset;
      state.name = saved.name || '';
      state.page = clamp(saved.page || 0, 0, state.preset.PagesLayout.Pages.length - 1);
      state.tab = ['pages', 'alerts', 'lapReview'].includes(saved.tab) ? saved.tab : 'pages';
      state.preview = saved.preview !== false;
      return true;
    } catch (e) { return false; }
  }

  function snapshot() { return JSON.stringify({ preset: state.preset, page: state.page }); }

  function pushUndo(snap) {
    state.undo.push(snap || snapshot());
    if (state.undo.length > 200) state.undo.shift();
    state.redo = [];
  }

  // Every edit goes through here: undo point, the edit, autosave, redraw
  function change(fn, redraw = true) {
    pushUndo();
    fn();
    save();
    if (redraw) render();
    updateUndoButtons();
  }

  function undo(dir) {
    const from = dir < 0 ? state.undo : state.redo;
    const to = dir < 0 ? state.redo : state.undo;
    if (!from.length) return;
    to.push(snapshot());
    const s = JSON.parse(from.pop());
    state.preset = s.preset;
    state.page = clamp(s.page, 0, state.preset.PagesLayout.Pages.length - 1);
    save(); render(); updateUndoButtons();
  }

  function updateUndoButtons() {
    $('#btnUndo').disabled = !state.undo.length;
    $('#btnRedo').disabled = !state.redo.length;
  }

  // ---------------------------------------------------------------- presets: read, fill, check
  // Fills a value from the plugin's defaults, keeping the plugin's key order. Lists, and the Lap Review's per-layout
  // modules, replace the default (as the plugin reads them); unknown keys are kept.
  const REPLACE = new Set(['StripModules']);
  function fill(def, val, key) {
    if (val === undefined || val === null) return clone(def);
    if (!isObj(def) || !isObj(val) || REPLACE.has(key)) return clone(val);
    const out = {};
    for (const k of Object.keys(def)) out[k] = fill(def[k], val[k], k);
    for (const k of Object.keys(val)) if (!(k in out)) out[k] = clone(val[k]);
    return out;
  }

  // Lap Review settings saved before each session had its own layout: that layout becomes every session's
  const LEGACY_LR = ['Mode', 'StripLayout', 'StripModules', 'FullScreenSectors', 'FullScreenMiddle', 'FullScreenBottom'];
  function fillLapReview(lr) {
    if (!isObj(lr)) return clone(S.defaults.lapReview);
    const v = clone(lr);
    if (!SESSIONS.some((s) => isObj(v[s])) && LEGACY_LR.some((k) => k in v)) {
      const legacy = {};
      for (const k of LEGACY_LR) if (k in v) legacy[k] = v[k];
      for (const s of SESSIONS) v[s] = clone(legacy);
    }
    for (const k of LEGACY_LR) delete v[k];
    const out = fill(S.defaults.lapReview, v);
    for (const s of SESSIONS) out[s] = fill(S.defaults.lapReviewSession, v[s]);
    return out;
  }

  // Reads a preset (parsed JSON) as the plugin would import it. problems: can't be used; warnings: worth a look
  function normalize(p) {
    const problems = [];
    if (!isObj(p)) return { problems: ['This isn\'t a preset (not a JSON object).'], warnings: [] };
    if (p.Format !== S.preset.format) problems.push(`Not a Lovely Dash Pro preset (Format should be "${S.preset.format}").`);
    if (typeof p.Version !== 'number') problems.push('The preset has no Version.');
    else if (p.Version > S.preset.version) problems.push(`Preset version ${p.Version} is newer than this editor knows (${S.preset.version}). Update the editor, or export it again from your plugin.`);
    const pages = p.PagesLayout && Array.isArray(p.PagesLayout.Pages) ? p.PagesLayout.Pages : null;
    if (!pages || !pages.length) problems.push('The preset has no pages.');
    if (problems.length) return { problems, warnings: [] };

    const out = {
      Format: S.preset.format,
      Version: S.preset.version,
      PagesLayout: { Pages: pages.map((pg) => ({ Name: isObj(pg) && typeof pg.Name === 'string' ? pg.Name : '', Layout: fill(S.defaults.page, isObj(pg) ? pg.Layout : null) })) },
      AlertsNotifications: fill(S.defaults.alerts, p.AlertsNotifications),
      LapReview: fillLapReview(p.LapReview),
    };
    for (const k of Object.keys(p)) if (!(k in out)) out[k] = clone(p[k]);
    const check = validate(out, pages);
    return { preset: out, problems: check.problems, warnings: check.warnings };
  }

  // The checks the presets repo makes, plus module names the plugin doesn't offer in that slot
  function validate(preset, rawPages) {
    const problems = [], warnings = [];
    const pages = preset.PagesLayout.Pages;
    if (!pages.length) problems.push('The preset has no pages.');
    const names = pages.map((p) => (p.Name || '').trim());
    if (names.some((n) => !n)) problems.push('A page has no name.');
    const dupes = names.filter((n, i) => n && names.indexOf(n) !== i);
    if (dupes.length) problems.push(`Two pages share a name: ${[...new Set(dupes)].join(', ')}.`);
    if (rawPages) rawPages.forEach((pg, i) => { if (!isObj(pg) || !isObj(pg.Layout)) warnings.push(`Page ${i + 1} had no layout: it starts as the default page.`); });

    const M = S.modules;
    const offer = (list, value, where, page) => { if (!isBlank(value) && !list.includes(value)) warnings.push(`${page}: "${value}" isn't offered in ${where} (the dash shows it empty).`); };
    for (const pg of pages) {
      const L = pg.Layout, n = `"${pg.Name || '?'}"`;
      const bars = L.SidebarTopbar || {};
      offer(M.topbar, bars.TopbarPage, 'the Topbar', n);
      offer(M.sidebar, bars.LeftSidebarPage, 'the sidebars', n);
      offer(M.sidebar, bars.RightSidebarPage, 'the sidebars', n);
      for (const side of ['LeftModules', 'RightModules']) {
        const z = (L.MultifunctionModules || {})[side] || {};
        for (const r of ['Row1Modules', 'Row2Modules', 'Row3Modules']) for (const c of ['Column1', 'Column2', 'Column3']) offer(M.module, (z[r] || {})[c], 'the module rows', n);
        const b = ((L.BottomModules || {})[side] || {}).Row1Modules || {};
        for (const c of ['Column1', 'Column2', 'Column3']) offer(M.module, b[c], 'the bottom rows', n);
      }
      for (const c of ['Column1', 'Column2', 'Column3', 'Column4']) offer(M.data, (L.ModuleData || {})[c], 'the Data row', n);
      const rows = ((L.CentralColumn || {}).CentralRowModules) || {};
      for (const r of ['Row1', 'Row2', 'Row3', 'Row4', 'Row5']) offer(M.data, rows[r], 'the central column', n);
      if (L.FullScreen != null && !M.fullScreen.includes(L.FullScreen)) warnings.push(`${n}: Full Screen page "${L.FullScreen}" doesn't exist.`);
      else if (L.FullScreen == null && (L.FullScreenPage < 0 || L.FullScreenPage >= M.fullScreen.length)) warnings.push(`${n}: Full Screen page ${L.FullScreenPage} doesn't exist.`);
    }
    const lr = preset.LapReview;
    for (const s of SESSIONS) {
      const ses = lr[s];
      for (const mods of Object.values(ses.StripModules || {})) for (const m of mods || []) offer(M.lapReview, m, 'the Lap Review', `Lap Review (${s})`);
      for (const m of [...(ses.FullScreenMiddle || []), ...(ses.FullScreenBottom || [])]) offer(M.lapReview, m, 'the Lap Review', `Lap Review (${s})`);
    }
    return { problems, warnings: [...new Set(warnings)] };
  }

  function loadPreset(json, name, source) {
    let parsed;
    try { parsed = typeof json === 'string' ? parseJson(json) : json; } catch (e) {
      showProblems('Can\'t open this preset', ['It isn\'t valid JSON. A .dashpro file is the one line the plugin\'s Export writes.'], []);
      return false;
    }
    const result = normalize(parsed);
    if (result.problems.length) { showProblems('Can\'t open this preset', result.problems, result.warnings); return false; }
    pushUndo(JSON.stringify({ preset: state.preset, page: state.page, name: state.name }));
    state.preset = result.preset;
    state.page = 0;
    // The name it was opened as (the community preset's, the file's): offered when exporting and submitting
    if (name != null) state.name = name;
    save(); render(); updateUndoButtons();
    if (result.warnings.length) showProblems(`Opened ${source || 'the preset'}`, [], result.warnings);
    else toast(`Opened ${source || 'the preset'}`);
    return true;
  }

  // One line, as the plugin exports it
  const exportText = () => toJson(state.preset);

  // ---------------------------------------------------------------- model access
  const pages = () => state.preset.PagesLayout.Pages;
  const layout = () => pages()[state.page].Layout;
  // A page as the plugin lists it: its name and the sessions it's on, "Primary (P, Q, R)" (just the name when it's on in none)
  const pageLabel = (p) => {
    const on = SESSIONS.filter((s) => p.Layout && p.Layout['Is' + s]).map((s) => s[0]);
    return on.length ? `${p.Name} (${on.join(', ')})` : p.Name;
  };
  // The sessions no page is active in, as the plugin words them: "Race", "Qualifying or Race", "Practice, Qualifying or Race".
  // Empty when every session has a page
  const sessionsWithoutPage = () => {
    const missing = SESSIONS.filter((s) => !pages().some((p) => p.Layout && p.Layout['Is' + s]));
    return missing.length <= 1 ? missing.join('') : `${missing.slice(0, -1).join(', ')} or ${missing[missing.length - 1]}`;
  };
  const allowed = (kind) => (kind === 'lapReview' ? S.modules.lapReview : S.modules[kind]) || [];
  const frameFor = (barMode) => S.geometry.frames[clamp(barMode, 0, S.geometry.frames.length - 1)];

  // ---------------------------------------------------------------- rendering: shell
  function render() {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === state.tab));
    closePicker();
    const main = $('#main');
    const scroll = window.scrollY;
    main.replaceChildren();
    if (state.tab === 'pages') renderPages(main);
    else if (state.tab === 'alerts') renderAlerts(main);
    else renderLapReview(main);
    window.scrollTo(0, scroll);
  }

  function segmented(labels, selected, onSelect, small) {
    return el('div', { class: 'segmented' }, labels.map((l, i) => el('button', {
      type: 'button', class: 'btn' + (small ? ' small' : '') + (i === selected ? ' selected' : ''), onclick: () => onSelect(i),
    }, l)));
  }

  function toggle(label, checked, onChange, title) {
    const input = el('input', { type: 'checkbox', onchange: (e) => onChange(e.target.checked) });
    input.checked = !!checked;
    return el('label', { class: 'toggle', title }, input, label);
  }

  // A small drawing of a layout: column spans (rows of modules) or row spans (central column)
  function pictogram(spans, vertical, selected, onClick) {
    const p = el('button', { type: 'button', class: 'picto' + (selected ? ' selected' : ''), onclick: onClick, title: spans.join('-') });
    p.style[vertical ? 'gridTemplateRows' : 'gridTemplateColumns'] = spans.map((s) => s + 'fr').join(' ');
    for (let i = 0; i < spans.length; i++) p.append(el('span'));
    return p;
  }

  function pictoRow(options, selected, onSelect, vertical) {
    return el('div', { class: 'picto-row' }, options.map((spans, i) => pictogram(spans, vertical, i === selected, () => onSelect(i))));
  }

  function sectionTitle(text, right) {
    return el('div', { class: 'section-title' }, text, right ? el('div', { class: 'right' }, right) : null);
  }

  // The dash: an 854x480 canvas scaled to the width available
  function dashCanvas(parent, extraClass) {
    const fit = el('div', { class: 'dash-fit' });
    const dash = el('div', { class: 'dash ' + (state.preview ? 'preview' : 'boxes') + (extraClass ? ' ' + extraClass : '') });
    fit.append(dash);
    parent.append(el('div', { class: 'dash-frame' }, fit));
    const resize = () => { dash.style.transform = `scale(${fit.clientWidth / S.geometry.width})`; };
    new ResizeObserver(resize).observe(fit);
    requestAnimationFrame(resize);
    return dash;
  }

  // ---------------------------------------------------------------- slots
  // A slot: { zone, kind, box, get(), set(v), image(name) -> path, vertical }. opts: inert (dimmed, no clicks), locked
  let slots = [];

  function addSlot(dash, slot, opts = {}) {
    const value = slot.get();
    const blank = isBlank(value);
    const e = place(el('div', { class: 'slot' + (blank ? ' blank' : ''), title: slot.zone }), slot.box);
    if (state.preview) {
      const path = blank ? null : slot.image(value);
      if (path) e.append(el('img', { src: img(path), alt: value, draggable: 'false' }));
      else if (blank) e.append(el('span', { class: 'plus' }, '+'));
      // No image: a module the current dashboards don't have yet (or one this editor doesn't know). Its name, in a box
      else { e.classList.add('no-image'); e.title = `${value}: no preview yet`; e.append(el('span', { class: slot.vertical ? 'vertical' : null }, value)); }
    } else {
      const label = el('span', { class: slot.vertical ? 'vertical' : null }, blank ? '+' : value);
      e.append(label);
    }
    if (opts.inert || opts.locked) {
      e.classList.add(opts.locked ? 'locked' : 'inert');
      if (opts.dim != null) e.style.opacity = opts.dim;
      dash.append(e);
      return e;
    }
    if (!blank && allowed(slot.kind).includes('Blank')) {
      e.append(el('button', { type: 'button', class: 'remove', title: 'Remove', 'aria-label': 'Remove', onpointerdown: (ev) => ev.stopPropagation(), onclick: (ev) => { ev.stopPropagation(); change(() => slot.set('Blank')); } }, '✕'));
    }
    slot.el = e;
    slots.push(slot);
    e.addEventListener('pointerdown', (ev) => startPress(ev, slot));
    dash.append(e);
    return e;
  }

  function addStatic(dash, box, content, opts = {}) {
    const e = place(el('div', { class: 'static' + (opts.class ? ' ' + opts.class : '') }), box);
    if (opts.background) e.style.background = opts.background;
    if (opts.radius != null) e.style.borderRadius = opts.radius + 'px';
    if (opts.image) e.append(el('img', { src: img(opts.image), alt: '' }));
    if (content != null) e.append(typeof content === 'string' ? el('span', { style: opts.font ? { fontSize: opts.font + 'px' } : null }, content) : content);
    if (opts.opacity != null) e.style.opacity = opts.opacity;
    dash.append(e);
    return e;
  }

  function addPanel(dash, box, ...children) {
    const p = place(el('div', { class: 'panel' }, ...children), box);
    dash.append(p);
    return p;
  }

  // Drag one slot onto another to swap them (only where each module is offered in the other slot); click to pick
  const fits = (a, b) => a && b && a !== b && a.kind !== 'fullScreen' && b.kind !== 'fullScreen'
    && allowed(b.kind).includes(isBlank(a.get()) ? 'Blank' : a.get()) && allowed(a.kind).includes(isBlank(b.get()) ? 'Blank' : b.get());

  function startPress(ev, slot) {
    if (ev.button !== 0) return;
    const start = { x: ev.clientX, y: ev.clientY };
    let dragging = false, ghost = null, over = null;
    const target = slot.el;
    target.setPointerCapture(ev.pointerId);

    const slotAt = (x, y) => {
      const hit = document.elementsFromPoint(x, y).find((n) => n.classList && n.classList.contains('slot') && n !== target);
      return slots.find((s) => s.el === hit) || null;
    };
    const move = (e) => {
      if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5 && slot.kind !== 'fullScreen' && !state.layoutMode) {
        dragging = true;
        ghost = el('div', { class: 'drag-ghost' }, isBlank(slot.get()) ? 'Empty' : slot.get());
        document.body.append(ghost);
        for (const s of slots) s.el.classList.add(s === slot ? 'drag-source' : fits(slot, s) ? 'drag-valid' : 'drag-invalid');
      }
      if (!dragging) return;
      ghost.style.left = e.clientX + 12 + 'px'; ghost.style.top = e.clientY + 12 + 'px';
      const t = slotAt(e.clientX, e.clientY);
      const ok = t && fits(slot, t) ? t : null;
      if (ok !== over) { if (over) over.el.classList.remove('drag-over'); over = ok; if (over) over.el.classList.add('drag-over'); }
    };
    const up = (e) => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', cancel);
      if (!dragging) { if (e.type === 'pointerup') openPicker(slot); return; }
      ghost.remove();
      for (const s of slots) s.el.classList.remove('drag-source', 'drag-valid', 'drag-invalid', 'drag-over');
      if (over && e.type === 'pointerup') {
        const a = slot.get(), b = over.get(), o = over;
        change(() => { slot.set(b); o.set(a); });
      }
    };
    const cancel = (e) => up(e);
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', cancel);
  }

  // ---------------------------------------------------------------- module picker
  let pickerSlot = null, firstMatch = null;

  function openPicker(slot) {
    pickerSlot = slot;
    const picker = $('#picker');
    $('#pickerTitle').textContent = slot.zone;
    $('#pickerSearch').value = '';
    fillPicker('');
    picker.hidden = false;
    // Below the slot if it fits, else above; kept on screen
    const r = slot.el.getBoundingClientRect();
    const pw = picker.offsetWidth, ph = picker.offsetHeight;
    let left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 8);
    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    picker.style.left = left + 'px'; picker.style.top = top + 'px';
    $('#pickerSearch').focus();
  }

  function closePicker() { $('#picker').hidden = true; pickerSlot = null; }

  const pickerLabel = (m) => m === 'Blank' ? 'Empty' : m;

  // The modules allowed in the slot, by category; a search keeps matching modules, or a whole matching category
  function fillPicker(query) {
    const list = $('#pickerList');
    list.replaceChildren();
    firstMatch = null;
    const slot = pickerSlot;
    if (!slot) return;
    const q = query.trim().toLowerCase();
    const current = slot.get() || 'Blank';
    const ok = allowed(slot.kind);
    const listed = new Set();
    let shown = 0;
    const filter = (cat, items) => (!q || cat.toLowerCase().includes(q)) ? items : items.filter((m) => pickerLabel(m).toLowerCase().includes(q));
    const group = (title, items) => {
      if (!items.length) return;
      const wrap = el('div', { class: 'wrap' });
      for (const m of items) {
        if (!firstMatch) firstMatch = m;
        const need = S.modules.needs && S.modules.needs[m];
        wrap.append(el('button', { type: 'button', class: 'btn' + (m === current ? ' selected' : '') + (need ? ' unavailable' : ''), title: need || null, onclick: () => pick(m) }, pickerLabel(m)));
      }
      list.append(el('h3', null, title), wrap);
      shown += items.length;
    };
    if (slot.kind === 'lapReview') {
      const items = ok.filter((m) => m !== 'Blank');
      group('Lap Review', filter('Lap Review', items));
      items.forEach((m) => listed.add(m));
    } else {
      for (const cat of S.modules.categories) {
        const items = cat.modules.filter((m) => ok.includes(m));
        items.forEach((m) => listed.add(m));
        group(cat.name, filter(cat.name, items));
      }
    }
    group('Other', filter('Other', ok.filter((m) => !listed.has(m))));
    if (!shown) list.append(el('p', { class: 'empty' }, `No modules match "${query}".`));
  }

  function pick(m) {
    const slot = pickerSlot;
    closePicker();
    if (slot) change(() => slot.set(m));
  }

  // ---------------------------------------------------------------- the page on the dash
  function rowCells(medium, rowLayout, x, y, scale) {
    const rows = S.geometry.rows[medium ? 'medium' : 'small'];
    const cells = rows.layouts[clamp(rowLayout, 0, rows.layouts.length - 1)];
    return cells.map((c) => ({ column: c.column, box: { x: x + c.x * scale, y, w: c.w * scale, h: rows.rowHeight * scale }, size: `${c.w}x${rows.rowHeight}` }));
  }

  const moduleImage = (size) => (name) => IMG.module[size] && IMG.module[size][name];
  const dataImage = (h) => (name) => IMG.data[`140x${h}`] && IMG.data[`140x${h}`][name];

  // Draws a page layout L. opts: inert (no editing: the Lap Review's underlay), dim (opacity), panels (Layout mode)
  function drawPage(dash, L, opts = {}) {
    const f = frameFor(L.SidebarTopbar.BarMode);
    const bars = L.SidebarTopbar;
    const slotOpts = { inert: opts.inert || state.layoutMode && opts.panels, dim: opts.dim };
    const staticOpacity = opts.dim != null ? opts.dim : (state.layoutMode && opts.panels ? (state.preview ? 0.2 : 0.15) : null);

    if (f.topbar) addSlot(dash, { zone: 'Topbar', kind: 'topbar', box: f.topbar, get: () => bars.TopbarPage, set: (v) => { bars.TopbarPage = v; }, image: (n) => IMG.topbar[n] }, slotOpts);
    if (f.leftSidebar) {
      addSlot(dash, { zone: 'Left sidebar', kind: 'sidebar', box: f.leftSidebar, vertical: true, get: () => bars.LeftSidebarPage, set: (v) => { bars.LeftSidebarPage = v; }, image: (n) => IMG.sidebar[n] && IMG.sidebar[n].left }, slotOpts);
      addSlot(dash, { zone: 'Right sidebar', kind: 'sidebar', box: f.rightSidebar, vertical: true, get: () => bars.RightSidebarPage, set: (v) => { bars.RightSidebarPage = v; }, image: (n) => IMG.sidebar[n] && IMG.sidebar[n].right }, slotOpts);
    }

    if (L.PageLayout === 1) {
      const fs = S.modules.fullScreen;
      addSlot(dash, {
        zone: 'Full screen page', kind: 'fullScreen', box: f.fullScreen,
        // By name (FullScreen), else by number (FullScreenPage, older presets); saved both ways, like the plugin
        get: () => fs.includes(L.FullScreen) ? L.FullScreen : fs[clamp(L.FullScreenPage, 0, fs.length - 1)],
        set: (v) => { const i = fs.indexOf(v); if (i >= 0) { L.FullScreenPage = i; L.FullScreen = v; } },
        image: (n) => IMG.fullScreen[n],
      }, slotOpts);
      if (opts.panels && state.layoutMode) addPanel(dash, f.fullScreen, el('div', { class: 'caption' }, 'Full Screen has no layout options. Switch to Modules to pick the page.'));
      return;
    }

    // Module zones: 3x3, 2x2 or MFM
    const zones = [['Left modules', L.MultifunctionModules.LeftModules, f.leftModules, 'left'], ['Right modules', L.MultifunctionModules.RightModules, f.rightModules, 'right']];
    for (const [zone, side, box, which] of zones) {
      if (side.Size === 2) {
        if (state.preview) addStatic(dash, box, null, { image: IMG.mfm[which], opacity: staticOpacity, radius: 0, background: 'transparent' });
        else addStatic(dash, box, 'Multi Function Module (MFM)\nConfigure in the Modules Tab', { opacity: staticOpacity, font: 14 }).style.whiteSpace = 'pre-line';
      } else {
        const medium = side.Size === 1;
        const rows = S.geometry.rows[medium ? 'medium' : 'small'];
        for (let r = 0; r < (medium ? 2 : 3); r++) {
          const row = side[`Row${r + 1}Modules`];
          if (!row) continue;
          for (const c of rowCells(medium, side[`Row${r + 1}Layout`], box.x, box.y + r * rows.rowStep * f.modulesScale, f.modulesScale)) {
            addSlot(dash, { zone, kind: 'module', box: c.box, get: () => row[`Column${c.column}`], set: (v) => { row[`Column${c.column}`] = v; }, image: moduleImage(c.size) }, slotOpts);
          }
        }
      }
      if (opts.panels && state.layoutMode) mfmPanel(dash, zone, side, box);
    }

    drawCentral(dash, L, f.centralTop, slotOpts, staticOpacity, opts.panels);

    const data = L.ModuleData;
    f.dataRow.forEach((box, i) => addSlot(dash, { zone: 'Data row', kind: 'data', box, get: () => data[`Column${i + 1}`], set: (v) => { data[`Column${i + 1}`] = v; }, image: dataImage(38) }, slotOpts));

    for (const [zone, side, box] of [['Bottom left', L.BottomModules.LeftModules, f.bottomLeft], ['Bottom right', L.BottomModules.RightModules, f.bottomRight]]) {
      const row = side.Row1Modules;
      if (row) {
        for (const c of rowCells(false, side.Layout, box.x, box.y, 1)) {
          addSlot(dash, { zone, kind: 'module', box: c.box, get: () => row[`Column${c.column}`], set: (v) => { row[`Column${c.column}`] = v; }, image: moduleImage(c.size) }, slotOpts);
        }
      }
      if (opts.panels && state.layoutMode) {
        addPanel(dash, box, el('div', { class: 'head' }, zone), pictoRow(S.options.rowLayouts.map((o) => o.spans), side.Layout, (i) => change(() => { side.Layout = i; })));
      }
    }
  }

  function drawCentral(dash, L, top, slotOpts, staticOpacity, panels) {
    const C = S.geometry.central;
    const central = L.CentralColumn;
    const inputs = central.ThrottleBrakeToggle === 1;
    const sectors = !!central.SectorBar;
    if (state.preview) {
      const key = 'gear' + (inputs ? '-inputs' : '') + (sectors ? '-sectors' : '');
      addStatic(dash, { x: C.x, y: top, w: C.width, h: C.inputsHeight }, null, { image: IMG.central[key], opacity: staticOpacity, radius: 0, background: 'transparent' });
    } else {
      const shift = sectors ? C.sectorBarShift : 0;
      if (sectors) {
        const seg = (C.width + C.sectorGap) / 3 - C.sectorGap;
        for (let i = 0; i < 3; i++) addStatic(dash, { x: C.x + i * (seg + C.sectorGap), y: top, w: seg, h: C.sectorBarHeight }, null, { background: 'var(--line)', radius: 2, opacity: staticOpacity });
      }
      const gear = { x: C.x + (inputs ? C.gearInset : 0), y: top + shift, w: inputs ? C.width - 2 * C.gearInset : C.width, h: C.inputsHeight - shift };
      addStatic(dash, gear, '2', { class: 'gear', font: inputs ? 110 : 130, opacity: staticOpacity });
      if (inputs) {
        for (const x of [C.x, C.x + C.width - C.inputBarWidth]) addStatic(dash, { x, y: top + shift, w: C.inputBarWidth, h: C.inputsHeight - shift }, null, { background: 'var(--line)', opacity: staticOpacity });
      }
    }

    // Data rows: each number of the layout is a row span (38 tall, 48 apart)
    const opts = S.options.centralLayouts;
    const spans = opts[clamp(central.RowLayout, 0, opts.length - 1)].spans;
    let y = top + C.rowsOffset;
    spans.forEach((span, i) => {
      const h = C.rowHeight + C.rowPitch * (span - 1);
      const rows = central.CentralRowModules;
      addSlot(dash, { zone: 'Central column', kind: 'data', box: { x: C.x + C.rowInset, y, w: C.rowWidth, h }, get: () => rows[`Row${i + 1}`], set: (v) => { rows[`Row${i + 1}`] = v; }, image: dataImage(h) }, slotOpts);
      y += C.rowPitch * span;
    });

    if (panels && state.layoutMode) {
      addPanel(dash, { x: C.x, y: top, w: C.width, h: C.inputsHeight },
        el('div', { style: { margin: 'auto 0', display: 'grid', gap: '10px' } },
          toggle('Show Sectors', sectors, (v) => change(() => { central.SectorBar = v; })),
          toggle('Show Inputs', inputs, (v) => change(() => { central.ThrottleBrakeToggle = v ? 1 : 0; }))));
      addPanel(dash, { x: C.x, y: top + 188, w: C.width, h: 238 },
        el('div', { class: 'head' }, 'Rows'),
        el('div', { class: 'picto-grid' }, opts.map((o, i) => pictogram(o.spans, true, central.RowLayout === i, () => change(() => { central.RowLayout = i; })))));
    }
  }

  function mfmPanel(dash, zone, side, box) {
    const head = el('div', { class: 'head' }, zone, segmented(['3×3', '2×2', 'MFM'], side.Size, (i) => change(() => {
      side.Size = i;
      // 2x2 rows only have two layouts: keep the saved values in range for the dash
      if (i === 1) { side.Row1Layout = Math.min(side.Row1Layout, 1); side.Row2Layout = Math.min(side.Row2Layout, 1); }
    }), true));
    if (side.Size === 2) { addPanel(dash, box, head, el('div', { class: 'caption' }, 'Multi Function Module (MFM). Its pages are set in the plugin\'s Modules tab.')); return; }
    const medium = side.Size === 1;
    const opts = (medium ? S.options.rowLayoutsMedium : S.options.rowLayouts).map((o) => o.spans);
    const rows = el('div', { style: { display: 'grid', gridTemplateRows: `repeat(${medium ? 2 : 3}, 1fr)`, gap: '6px', flex: '1' } });
    for (let r = 0; r < (medium ? 2 : 3); r++) {
      rows.append(pictoRow(opts, side[`Row${r + 1}Layout`], (i) => change(() => { side[`Row${r + 1}Layout`] = i; })));
    }
    addPanel(dash, box, head, rows);
  }

  // ---------------------------------------------------------------- Pages Layout tab
  function renderPages(main) {
    slots = [];
    const L = layout();
    const select = el('select', { 'aria-label': 'Page', onchange: (e) => {
      if (e.target.value === '__add') { e.target.value = String(state.page); addPage(); return; }
      state.page = +e.target.value; save(); render();
    } }, pages().map((p, i) => el('option', { value: i }, pageLabel(p))), el('option', { disabled: true }, '──────────'), el('option', { value: '__add' }, 'Add new page…'));
    select.value = String(state.page);

    main.append(el('div', { class: 'bar page-bar' },
      el('div', { class: 'group' }, select, el('div', { class: 'links' },
        el('button', { type: 'button', class: 'link', disabled: state.page === 0, onclick: () => movePage(-1) }, 'Up'),
        el('button', { type: 'button', class: 'link', disabled: state.page === pages().length - 1, onclick: () => movePage(1) }, 'Down'),
        el('button', { type: 'button', class: 'link', onclick: renamePage }, 'Rename'),
        el('button', { type: 'button', class: 'link', disabled: pages().length < 2, onclick: deletePage }, 'Delete'))),
      el('div', { class: 'group' }, el('span', { class: 'label' }, 'Active in Session'),
        SESSIONS.map((s) => toggle(s, L['Is' + s], (v) => change(() => { L['Is' + s] = v; }))))));

    main.append(sectionTitle('DASHBOARD LAYOUT', toggle('Preview', state.preview, (v) => { state.preview = v; save(); render(); }, 'Show the modules as the dash draws them')));
    // As the plugin: only when a session has no page
    const without = sessionsWithoutPage();
    if (without) main.append(el('p', { class: 'lock-note' }, `No page is active in ${without}. The page buttons go through all pages there.`));

    const barIndex = BAR_ORDER.indexOf(L.SidebarTopbar.BarMode);
    main.append(el('div', { class: 'toolbars' },
      // As in the plugin: Modules / Layout on the left, the page layout in the middle, the bars on the right
      el('div', { class: 'group' }, segmented(['Modules', 'Layout'], state.layoutMode ? 1 : 0, (i) => { state.layoutMode = i === 1; render(); })),
      el('div', { class: 'group' }, el('span', { class: 'label' }, 'Layout'), segmented(S.options.pageLayouts, L.PageLayout, (i) => change(() => { L.PageLayout = i; }))),
      el('div', { class: 'group' }, el('span', { class: 'label' }, 'Bars'), segmented(BAR_LABELS, barIndex, (i) => change(() => { L.SidebarTopbar.BarMode = BAR_ORDER[i]; })))));

    const dash = dashCanvas(main);
    drawPage(dash, L, { panels: true });
    main.append(el('p', { class: 'sub', style: { color: 'var(--muted)', marginTop: '10px' } },
      state.layoutMode ? 'Pick each zone\'s size and row layouts.' : 'Click a slot to pick its module. Drag a module onto another slot to swap them.'));
  }

  function promptName(title, value, action, onDone) {
    const input = el('input', { type: 'text', maxlength: '40', value: value || '' });
    const error = el('p', { style: { color: 'var(--danger)', minHeight: '1.4em', margin: '6px 0 0' } });
    const done = () => {
      const name = input.value.trim();
      if (!name) { error.textContent = 'The page needs a name.'; return; }
      if (pages().some((p, i) => p.Name === name && i !== (title.startsWith('Rename') ? state.page : -1))) { error.textContent = 'Another page has that name.'; return; }
      closeModal(); onDone(name);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
    openModal(title, [el('p', null, 'Page name'), input, error], [
      el('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Cancel'),
      el('button', { type: 'button', class: 'btn btn-accent', onclick: done }, action)]);
    input.focus(); input.select();
  }

  function addPage() {
    promptName('Add a page', '', 'Add', (name) => change(() => {
      // A new page starts as the Dash Pro Default's first page, as in the plugin
      pages().push({ Name: name, Layout: clone(S.defaults.page) });
      state.page = pages().length - 1;
    }));
  }

  function renamePage() { promptName('Rename the page', pages()[state.page].Name, 'Rename', (name) => change(() => { pages()[state.page].Name = name; })); }

  function deletePage() {
    if (pages().length < 2) return;
    const name = pages()[state.page].Name;
    openModal('Delete the page?', [el('p', null, `"${name}" and its layout will be removed. You can undo it.`)], [
      el('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Cancel'),
      el('button', { type: 'button', class: 'btn btn-accent', onclick: () => { closeModal(); change(() => { pages().splice(state.page, 1); state.page = Math.max(0, state.page - 1); }); } }, 'Delete')]);
  }

  function movePage(dir) {
    const i = state.page, j = i + dir;
    if (j < 0 || j >= pages().length) return;
    change(() => { const p = pages(); [p[i], p[j]] = [p[j], p[i]]; state.page = j; });
  }

  // ---------------------------------------------------------------- Alerts & Notifications tab
  function renderAlerts(main) {
    const A = state.preset.AlertsNotifications, LR = state.preset.LapReview;
    const sources = [
      ...S.settings.alerts.options.map((o) => ({ o, obj: A })),
      ...S.settings.lapReview.options.filter((o) => o.group !== 'Sessions').map((o) => ({ o, obj: LR })),
    ];
    const wrap = el('div', { class: 'settings' });
    for (const group of S.settings.alerts.groups) {
      const items = sources.filter((s) => s.o.group === group && !s.o.hidden);
      if (!items.length) continue;
      const sw = items.find((s) => s.o.switch);
      const card = el('section', { class: 'card' });
      if (sw) {
        card.append(el('h3', null, toggle(sw.o.label, sw.obj[sw.o.key], (v) => change(() => { sw.obj[sw.o.key] = v; }))));
        if (sw.o.description) card.append(el('p', { class: 'desc' }, sw.o.description));
      } else {
        card.append(el('h3', null, group));
        if (GROUP_NOTES[group]) card.append(el('p', { class: 'desc' }, GROUP_NOTES[group]));
      }
      const body = el('div', { class: 'body' });
      body.hidden = !!sw && !sw.obj[sw.o.key];
      for (const s of items) if (s !== sw && !s.o.rangeEnd) body.append(option(s.o, s.obj));
      if (body.children.length) card.append(body);
      wrap.append(card);
    }
    main.append(sectionTitle('ALERTS & NOTIFICATIONS'), wrap);
  }

  // One setting: a switch, radio buttons, a slider, or a range (two values)
  function option(o, obj) {
    const box = el('div', { class: 'opt' });
    if (o.heading) box.append(el('div', { class: 'opt-title', style: { color: 'var(--text)', fontWeight: '600' } }, o.heading));
    if (o.type === 'bool') {
      box.append(toggle(o.label, obj[o.key], (v) => change(() => { obj[o.key] = v; })));
    } else if (o.type === 'choice') {
      box.append(el('div', { class: 'opt-title' }, o.label));
      const name = 'opt-' + o.key;
      box.append(el('div', { class: 'radios' }, o.choices.map((c) => {
        const r = el('input', { type: 'radio', name, value: c.value, onchange: () => change(() => { obj[o.key] = c.value; }) });
        r.checked = obj[o.key] === c.value;
        return el('label', null, r, c.label);
      })));
    } else if (o.rangeTo) {
      box.append(el('div', { class: 'opt-title' }, o.label), rangeControl(o, obj));
    } else {
      box.append(el('div', { class: 'opt-title' }, o.label), numberControl(o, obj));
    }
    if (o.description) box.append(el('p', { class: 'desc' }, o.description));
    return box;
  }

  // Sliders write as they move; the undo point is taken when the drag starts
  function liveEdit(input, apply) {
    let before = null;
    const begin = () => { if (before == null) before = snapshot(); };
    input.addEventListener('pointerdown', begin);
    input.addEventListener('keydown', begin);
    input.addEventListener('focus', begin);
    input.addEventListener('input', () => { begin(); apply(); save(); });
    input.addEventListener('change', () => { apply(); if (before != null) { pushUndo(before); before = null; } save(); updateUndoButtons(); });
    input.addEventListener('blur', () => { before = null; });
  }

  const snap = (v, o) => clamp(Math.round(v / o.step) * o.step, o.min, o.max);

  function numberControl(o, obj) {
    const range = el('input', { type: 'range', min: o.min, max: o.max, step: o.step, value: obj[o.key], 'aria-label': o.label });
    const num = el('input', { type: 'number', min: o.min, max: o.max, step: o.step, value: obj[o.key], 'aria-label': o.label });
    liveEdit(range, () => { obj[o.key] = snap(+range.value, o); num.value = obj[o.key]; });
    liveEdit(num, () => { if (num.value === '') return; obj[o.key] = snap(+num.value, o); range.value = obj[o.key]; });
    num.addEventListener('change', () => { num.value = obj[o.key]; });
    return el('div', { class: 'number' }, range, num);
  }

  // Two values on one track (lower <= upper), with a number box for each
  function rangeControl(o, obj) {
    const lo = o.key, hi = o.rangeTo;
    const a = el('input', { type: 'range', min: o.min, max: o.max, step: o.step, value: obj[lo], 'aria-label': o.label + ' from' });
    const b = el('input', { type: 'range', min: o.min, max: o.max, step: o.step, value: obj[hi], 'aria-label': o.label + ' to' });
    const na = el('input', { type: 'number', min: o.min, max: o.max, step: o.step, value: obj[lo], 'aria-label': o.label + ' from' });
    const nb = el('input', { type: 'number', min: o.min, max: o.max, step: o.step, value: obj[hi], 'aria-label': o.label + ' to' });
    const fillBar = el('div', { class: 'fill' });
    const sync = () => {
      a.value = na.value = obj[lo]; b.value = nb.value = obj[hi];
      const span = o.max - o.min || 1;
      fillBar.style.left = ((obj[lo] - o.min) / span * 100) + '%';
      fillBar.style.width = ((obj[hi] - obj[lo]) / span * 100) + '%';
    };
    const setLo = (v) => { obj[lo] = Math.min(snap(v, o), obj[hi]); sync(); };
    const setHi = (v) => { obj[hi] = Math.max(snap(v, o), obj[lo]); sync(); };
    liveEdit(a, () => setLo(+a.value));
    liveEdit(b, () => setHi(+b.value));
    liveEdit(na, () => { if (na.value !== '') setLo(+na.value); });
    liveEdit(nb, () => { if (nb.value !== '') setHi(+nb.value); });
    sync();
    return el('div', { class: 'number' }, na, el('div', { class: 'dual' }, el('div', { class: 'track' }), fillBar, a, b), nb);
  }

  // ---------------------------------------------------------------- Lap Review tab
  function renderLapReview(main) {
    slots = [];
    const LR = state.preset.LapReview;
    const name = state.lrSession;
    const ses = LR[name];
    const on = !!LR['Is' + name];
    const L = layout();
    const colors = (S.settings.lapReview.options.find((o) => o.key === 'Colors').choices.find((c) => c.value === LR.Colors) || { label: 'Normal' }).label;
    const lrImages = IMG.lapReview[colors] || IMG.lapReview.Normal;

    main.append(el('div', { class: 'bar' },
      el('div', { class: 'sessions' }, SESSIONS.map((s) => {
        const cb = el('input', { type: 'checkbox', title: `Show the Lap Review in ${s}`, onclick: (e) => e.stopPropagation(), onchange: (e) => change(() => { LR['Is' + s] = e.target.checked; }) });
        cb.checked = !!LR['Is' + s];
        return el('div', { class: 'session' + (s === name ? ' selected' : ''), role: 'button', tabindex: '0', onclick: () => { state.lrSession = s; render(); }, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.lrSession = s; render(); } } }, cb, s);
      })),
      el('div', { class: 'group' },
        el('span', { class: 'label' }, 'Shown over'),
        (() => { const sel = el('select', { 'aria-label': 'Page shown underneath', onchange: (e) => { state.page = +e.target.value; save(); render(); } }, pages().map((p, i) => el('option', { value: i }, pageLabel(p)))); sel.value = String(state.page); return sel; })(),
        el('button', { type: 'button', class: 'link', disabled: !on, title: 'Give the other two sessions this layout (their on/off stays)', onclick: () => change(() => { for (const s of SESSIONS) if (s !== name) LR[s] = clone(ses); }) }, 'Copy to all sessions'))));

    main.append(sectionTitle('LAP REVIEW LAYOUT', toggle('Preview', state.preview, (v) => { state.preview = v; save(); render(); })));
    if (!on) main.append(el('p', { class: 'lock-note' }, `The Lap Review is off in ${name}. Tick it to show it and edit its layout.`));

    const fullScreen = ses.Mode === 1;
    const layouts = S.options.lapReviewStripLayouts;
    const stripLayout = layouts.some((l) => l.name === ses.StripLayout) ? ses.StripLayout : '1-3-1';
    const bar = el('div', { class: 'toolbars', style: on ? null : { opacity: '.35', pointerEvents: 'none' } },
      el('div', { class: 'group' }, segmented(S.options.lapReviewModes.map((m) => m.label), fullScreen ? 1 : 0, (i) => change(() => { ses.Mode = i; }))),
      fullScreen
        ? el('div', { class: 'group' }, el('span', { class: 'label' }, 'Middle row'), segmented(['Sectors', '3 Modules'], ses.FullScreenSectors ? 0 : 1, (i) => change(() => { ses.FullScreenSectors = i === 0; })))
        : el('div', { class: 'group' }, el('span', { class: 'label' }, 'Layout'), pictoRow(layouts.map((l) => l.spans), layouts.findIndex((l) => l.name === stripLayout), (i) => change(() => { ses.StripLayout = layouts[i].name; }))),
      el('div'));
    main.append(bar);

    const dash = dashCanvas(main);
    // The page underneath, as the dash shows it (dimmed while editing the boxes)
    drawPage(dash, L, { inert: true, dim: state.preview ? 0.45 : 0.15 });

    const lock = on ? {} : { locked: true };
    const f = frameFor(L.SidebarTopbar.BarMode);
    if (fullScreen) {
      const g = S.geometry.lapReviewFullScreen[ses.FullScreenSectors ? 'sectors' : 'modules'];
      if (state.preview) addStatic(dash, g.panel, null, { image: ses.FullScreenSectors ? lrImages.panelSectors : lrImages.panelModules, radius: 0, background: 'transparent', opacity: on ? null : 0.35 });
      else {
        addStatic(dash, g.panel, null, { background: '#262626', radius: 4, opacity: on ? null : 0.35 });
        addStatic(dash, g.headline, 'Lap Time and Lap Delta', { font: 24, opacity: on ? null : 0.35 });
        if (g.sectors) addStatic(dash, g.sectors, 'Sectors', { font: 20, opacity: on ? null : 0.35 });
      }
      const tile = (n) => lrImages.fullScreen && lrImages.fullScreen[n];
      const listSlot = (arr, i, zone, box) => addSlot(dash, {
        zone, kind: 'lapReview', box, image: tile,
        get: () => (ses[arr] || [])[i] || 'Blank',
        set: (v) => { const a = ses[arr] || (ses[arr] = []); while (a.length <= i) a.push('Blank'); a[i] = v; },
      }, lock);
      g.middle.forEach((box, i) => listSlot('FullScreenMiddle', i, 'Middle row', box));
      g.bottom.forEach((box, i) => listSlot('FullScreenBottom', i, 'Bottom row', box));
    } else {
      const band = f.alertBand;
      if (state.preview) addStatic(dash, band, null, { image: lrImages.band[String(L.SidebarTopbar.BarMode)], radius: 0, background: 'transparent', opacity: on ? null : 0.35 });
      else addStatic(dash, band, null, { background: '#262626', radius: 4, opacity: on ? null : 0.35 });
      const G = S.geometry.lapReviewStrip;
      const spans = layouts.find((l) => l.name === stripLayout).spans;
      let x = band.x + (band.w - (5 * G.columnWidth + 4 * G.columnGap)) / 2;
      const y = band.y + (band.h - G.height) / 2;
      spans.forEach((span, i) => {
        const w = span * G.columnWidth + (span - 1) * G.columnGap;
        const size = `${w}x${G.height}`;
        addSlot(dash, {
          zone: 'Strip', kind: 'lapReview', box: { x, y, w, h: G.height }, image: (n) => lrImages[size] && lrImages[size][n],
          get: () => ((ses.StripModules || {})[layoutKey(stripLayout)] || [])[i] || 'Blank',
          set: (v) => { const m = ses.StripModules || (ses.StripModules = {}); const k = layoutKey(stripLayout); const a = m[k] || (m[k] = []); while (a.length <= i) a.push('Blank'); a[i] = v; },
        }, lock);
        x += w + G.columnGap;
      });
    }
    main.append(el('p', { class: 'sub', style: { color: 'var(--muted)', marginTop: '10px' } }, 'Each session has its own layout. Colors and duration are in Alerts & Notifications.'));
  }

  // ---------------------------------------------------------------- open, export
  function openDialog() {
    const body = [];
    const choices = el('div', { class: 'open-choices' },
      el('button', { type: 'button', class: 'btn', onclick: () => { closeModal(); $('#fileInput').click(); } }, 'From a file (.dashpro)…'),
      el('button', { type: 'button', class: 'btn', onclick: pasteDialog }, 'Paste a preset…'),
      el('button', { type: 'button', class: 'btn', onclick: () => { closeModal(); loadPreset(S.defaults.preset, 'Dash Pro Default', 'the Dash Pro Default'); } }, 'The Dash Pro Default'));
    body.push(choices);
    const list = el('div', { class: 'preset-grid' }, el('p', null, 'Loading the community presets…'));
    const search = el('input', { type: 'search', placeholder: 'Search by name or author', 'aria-label': 'Search presets by name or author', autocomplete: 'off', disabled: true });
    const none = el('p', { class: 'preset-none', hidden: true });
    body.push(el('div', { class: 'preset-head' }, el('h2', null, 'Community presets'), search), list, none);
    openModal('Open a preset', body, [el('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Close')], { wide: true });
    fetch('../presets/manifest.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((m) => {
      // As the plugin's Browse Presets: featured first (1 first), then the newest; each card shows the preset's first page
      const presets = m.presets.filter((p) => p && p.path).sort((a, b) =>
        (a.featured || Infinity) - (b.featured || Infinity) || String(b.added || '').localeCompare(String(a.added || '')) || a.name.localeCompare(b.name));
      const cards = presets.map((p) => {
        const shot = (p.pageImages || []).find((s) => s) || p.preview;
        const count = (p.pages || []).length;
        const meta = [p.author, count === 1 ? '1 page' : `${count} pages`, p.added].filter(Boolean).join(' · ');
        const card = el('button', { type: 'button', class: 'preset-card', title: p.description || p.name, onclick: () => openCommunity(p) },
          el('div', { class: 'preset-shot' },
            shot ? el('img', { src: '../presets/' + shot, alt: '', loading: 'lazy' }) : null,
            p.featured ? el('span', { class: 'featured' }, 'FEATURED') : null),
          el('strong', null, p.name),
          el('span', { class: 'meta' }, meta));
        card.dataset.search = `${p.name || ''}\n${p.author || ''}`.toLowerCase();
        return card;
      });
      list.replaceChildren(...cards);
      // Search: every word typed must be in the name or the author
      const filter = () => {
        const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
        let shown = 0;
        for (const c of cards) { const hit = words.every((w) => c.dataset.search.includes(w)); c.hidden = !hit; if (hit) shown++; }
        none.hidden = shown > 0;
        none.textContent = `No presets match "${search.value.trim()}".`;
        list.scrollTop = 0;
      };
      search.disabled = false;
      search.addEventListener('input', filter);
      search.addEventListener('keydown', (e) => {
        // Enter opens the only match
        if (e.key === 'Enter') { const shown = cards.filter((c) => !c.hidden); if (shown.length === 1) shown[0].click(); }
      });
      search.focus();
    }).catch(() => list.replaceChildren(el('p', null, 'The community presets can\'t be loaded right now.')));
  }

  function openCommunity(p) {
    closeModal();
    fetch('../presets/' + p.path, { cache: 'no-store' }).then((r) => r.ok ? r.text() : Promise.reject(r.status))
      .then((t) => { if (loadPreset(t, p.name, `"${p.name}"`)) track('open_preset', { source: 'community', preset_name: p.name }); })
      .catch(() => showProblems('Can\'t open this preset', [`"${p.name}" couldn't be downloaded.`], []));
  }

  function pasteDialog() {
    const area = el('textarea', { placeholder: '{"Format":"LovelyDashProPreset", ...}', spellcheck: 'false' });
    openModal('Paste a preset', [el('p', null, 'Paste the contents of a .dashpro file.'), area], [
      el('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Cancel'),
      el('button', { type: 'button', class: 'btn btn-accent', onclick: () => { const t = area.value; closeModal(); loadPreset(t, null, 'the pasted preset'); } }, 'Open')]);
    area.focus();
  }

  // The .dashpro file name for a preset name: accents dropped, characters Windows doesn't allow replaced
  const fileName = (name = state.name) => {
    const base = (name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\\/:*?"<>|]+/g, '-').trim();
    return (base || 'Dash Pro Preset') + '.dashpro';
  };

  // A labelled form field for the Export and Submit dialogs
  const formField = (label, input, hint) => el('label', { style: { display: 'grid', gap: '4px', marginBottom: '12px' } },
    el('span', null, label), input, hint ? el('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, hint) : null);

  function exportDialog() {
    const check = validate(state.preset);
    if (check.problems.length) { showProblems('Fix these before exporting', check.problems, check.warnings); return; }
    const text = exportText();
    const name = el('input', { type: 'text', maxlength: '60', value: state.name || '', placeholder: 'My Preset', autocomplete: 'off' });
    const error = el('p', { style: { color: 'var(--danger)', minHeight: '1.4em', margin: '0' } });
    const downloadBtn = el('button', { type: 'button', class: 'btn btn-accent' }, 'Download');
    const keepName = () => {
      const n = name.value.trim();
      if (!n) { error.textContent = 'The preset needs a name.'; name.focus(); return false; }
      if (n !== state.name) { state.name = n; save(); }
      return true;
    };
    downloadBtn.addEventListener('click', () => { if (keepName()) { download(text); track('export_preset', { method: 'download' }); closeModal(); } });
    name.addEventListener('input', () => { error.textContent = ''; });
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') downloadBtn.click(); });
    const body = [
      el('p', null, `${pages().length} page${pages().length === 1 ? '' : 's'}, with Alerts & Notifications and Lap Review. In the Lovely Plugin, open Dash Pro and click Import, then pick this file.`),
      formField('Preset name', name, 'Names the file. Submitting it uses this name too.'),
    ];
    if (check.warnings.length) body.push(el('ul', { class: 'warnings' }, check.warnings.map((w) => el('li', null, w))));
    body.push(error);
    openModal('Export the preset', body, [
      el('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Cancel'),
      el('button', { type: 'button', class: 'btn', onclick: () => { if (keepName()) { copyText(text); track('export_preset', { method: 'copy' }); } } }, 'Copy'),
      downloadBtn]);
    name.focus(); name.select();
  }

  // ---------------------------------------------------------------- submit (GitHub's Submit a Preset form, filled in)
  const REPO = 'https://github.com/Lovely-Sim-Racing/lovely-dashpro-presets';
  const MAX_URL = 8000; // GitHub refuses much longer links

  // gzip + base64: a whole preset fits in the link this way (the plain JSON usually doesn't)
  async function gzipBase64(text) {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  async function gunzipBase64(b64) {
    const bytes = Uint8Array.from(atob(b64.replace(/\s+/g, '')), (c) => c.charCodeAt(0));
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }

  // The issue link with every field filled in; the preset as JSON if it fits, else compressed, else left to attach
  async function submitUrl(fields, text) {
    const link = (preset) => {
      const q = new URLSearchParams({ template: 'submit-preset.yml', title: `[Preset] ${fields.name}`, name: fields.name, author: fields.author, description: fields.description, tags: fields.tags, preset });
      return `${REPO}/issues/new?${q}`;
    };
    const plain = link('Sent from the online editor.\n\n```json\n' + text + '\n```');
    if (plain.length <= MAX_URL) return { url: plain, how: 'plain' };
    const packed = link('Sent from the online editor, compressed (gzip, base64): the .dashpro is the unpacked text.\n\n```dashpro-gzip-base64\n' + await gzipBase64(text) + '\n```');
    if (packed.length <= MAX_URL) return { url: packed, how: 'compressed' };
    return { url: link('Attach the zipped .dashpro here (it was too big to include).'), how: 'attach' };
  }

  function submitDialog() {
    const check = validate(state.preset);
    if (check.problems.length) { showProblems('Fix these before submitting', check.problems, check.warnings); return; }
    let author = '';
    try { author = localStorage.getItem(STORE + '-author') || ''; } catch (e) { /* no storage */ }
    const field = formField;
    const name = el('input', { type: 'text', maxlength: '60', value: state.name || '', placeholder: 'LMU Endurance' });
    const who = el('input', { type: 'text', maxlength: '60', value: author, placeholder: 'Your name or team' });
    const desc = el('textarea', { rows: '3', maxlength: '400', placeholder: 'Fuel and Virtual Energy focused, with a qualifying page.', style: { minHeight: '70px', font: 'inherit' } });
    const tags = el('input', { type: 'text', maxlength: '120', placeholder: 'LMU, Hypercar, Endurance' });
    const error = el('p', { style: { color: 'var(--danger)', minHeight: '1.4em', margin: '0' } });
    const go = async () => {
      const fields = { name: name.value.trim(), author: who.value.trim(), description: desc.value.trim(), tags: tags.value.trim() };
      if (!fields.name) { error.textContent = 'The preset needs a name.'; name.focus(); return; }
      if (!fields.description) { error.textContent = 'Add a sentence or two about it.'; desc.focus(); return; }
      if (fields.name !== state.name) { state.name = fields.name; save(); }
      try { localStorage.setItem(STORE + '-author', fields.author); } catch (e) { /* no storage */ }
      const text = exportText();
      const { url, how } = await submitUrl(fields, text);
      if (how === 'attach') download(text);
      track('submit_preset', { method: how });
      window.open(url, '_blank', 'noopener');
      closeModal();
      openModal('Finish on GitHub', [
        el('p', null, 'GitHub\'s Submit a Preset form opened in a new tab, filled in. Sign in if it asks, tick the sharing box, then click Create.'),
        how === 'attach' ? el('p', null, `This preset is too big to include in the link: ${fileName()} was saved. Zip it and drag the zip into the "Preset file" box.`) : null,
        el('p', null, 'We check it, make the screenshots and add it to the presets. You\'re notified on the issue when it\'s live.'),
        el('p', null, el('a', { href: url, target: '_blank', rel: 'noopener' }, 'Open the form again')),
      ], [el('button', { type: 'button', class: 'btn btn-accent', onclick: closeModal }, 'OK')]);
    };
    const body = [
      el('p', null, `Share this preset (${pages().length} page${pages().length === 1 ? '' : 's'}) in the community presets. This opens GitHub's Submit a Preset form, filled in. You need a free GitHub account.`),
      field('Preset name', name, 'A short name people will see in the plugin.'),
      field('Author', who, 'The name to credit. Your GitHub name is used if you leave this empty.'),
      field('Description', desc, 'One or two sentences. What is it good for?'),
      field('Tags', tags, 'Optional, separated by commas. For example a sim, a class or a race type.'),
    ];
    if (check.warnings.length) body.push(el('p', null, 'Worth a look first:'), el('ul', { class: 'warnings' }, check.warnings.map((w) => el('li', null, w))));
    body.push(error);
    openModal('Submit to the community presets', body, [
      el('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Cancel'),
      el('button', { type: 'button', class: 'btn btn-accent', onclick: go }, 'Continue on GitHub')]);
    (state.name ? desc : name).focus();
  }

  // Google Analytics event (index.html loads GA on the live site only; a no-op elsewhere)
  function track(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) { /* never break the editor */ }
  }

  function download(text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = el('a', { href: url, download: fileName() });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Saved ${fileName()}`);
  }

  function copyText(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Copied the preset')).catch(() => {
      const area = el('textarea', null, text); document.body.append(area); area.select();
      try { document.execCommand('copy'); toast('Copied the preset'); } catch (e) { toast('Couldn\'t copy: use Download'); }
      area.remove();
    });
  }

  // ---------------------------------------------------------------- modal, toast
  // opts.wide: a wider dialog (the preset grid)
  function openModal(title, body, actions, opts = {}) {
    closePicker();
    $('#modal .modal').classList.toggle('wide', !!opts.wide);
    $('#modalTitle').textContent = title;
    $('#modalBody').replaceChildren(...body);
    $('#modalActions').replaceChildren(...actions);
    $('#modal').hidden = false;
  }

  function closeModal() { $('#modal').hidden = true; }

  function showProblems(title, problems, warnings) {
    const body = [];
    if (problems.length) body.push(el('ul', { class: 'problems' }, problems.map((p) => el('li', null, p))));
    if (warnings.length) body.push(el('p', null, 'Worth a look:'), el('ul', { class: 'warnings' }, warnings.map((w) => el('li', null, w))));
    openModal(title, body, [el('button', { type: 'button', class: 'btn btn-accent', onclick: closeModal }, 'OK')]);
  }

  let toastTimer = 0;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  // ---------------------------------------------------------------- start
  function wire() {
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { state.tab = t.dataset.tab; state.layoutMode = false; save(); render(); }));
    $('#btnUndo').addEventListener('click', () => undo(-1));
    $('#btnRedo').addEventListener('click', () => undo(1));
    $('#btnNew').addEventListener('click', () => loadPreset(S.defaults.preset, '', 'a new preset (the Dash Pro Default)'));
    $('#btnOpen').addEventListener('click', openDialog);
    $('#btnExport').addEventListener('click', exportDialog);
    $('#btnSubmit').addEventListener('click', submitDialog);
    // Lovely Dash Pro promo: ✕ hides it for this visit only (this tab; it's back next time the editor is opened)
    try { localStorage.removeItem(STORE + '-promo-closed'); } catch (e) { /* no storage */ } // the old "closed for good" flag
    let promoClosed = false;
    try { promoClosed = sessionStorage.getItem(STORE + '-promo-closed') === '1'; } catch (e) { /* no storage: show it */ }
    $('#promo').hidden = promoClosed;
    $('#promoClose').addEventListener('click', () => {
      $('#promo').hidden = true;
      try { sessionStorage.setItem(STORE + '-promo-closed', '1'); } catch (e) { /* no storage */ }
    });
    $('#fileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      file.text().then((t) => loadPreset(t, file.name.replace(/\.(dashpro|json)$/i, ''), `"${file.name}"`));
    });
    $('#pickerClose').addEventListener('click', closePicker);
    $('#pickerSearch').addEventListener('input', (e) => fillPicker(e.target.value));
    $('#pickerSearch').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && firstMatch) { e.preventDefault(); pick(firstMatch); }
      else if (e.key === 'Escape') { e.preventDefault(); closePicker(); }
    });
    document.addEventListener('pointerdown', (e) => {
      const p = $('#picker');
      if (!p.hidden && !p.contains(e.target) && !(e.target.closest && e.target.closest('.slot'))) closePicker();
    });
    $('#modal').addEventListener('pointerdown', (e) => { if (e.target === $('#modal')) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#modal').hidden) { closeModal(); return; }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox' && document.activeElement.type !== 'radio' && document.activeElement.type !== 'range';
      if (typing || !(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(-1); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); undo(1); }
    });
    // Drop a .dashpro file anywhere on the page
    document.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    document.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (!file) return;
      e.preventDefault();
      file.text().then((t) => loadPreset(t, file.name.replace(/\.(dashpro|json)$/i, ''), `"${file.name}"`));
    });
  }

  async function start() {
    try {
      const [schema, images] = await Promise.all([
        fetch('editor-schema.json', { cache: 'no-cache' }).then((r) => r.text()).then(parseJson),
        fetch('images/index.json', { cache: 'no-cache' }).then((r) => r.json()),
      ]);
      S = schema; IMG = images;
    } catch (e) {
      $('#loading').textContent = 'The editor\'s data couldn\'t be loaded. Reload the page to try again.';
      return;
    }
    $('#footVersion').textContent = `Lovely Plugin ${S.plugin} · preset format v${S.preset.version}`;
    wire();

    // ?preset=<id>: open a community preset (from the presets' pages)
    const id = new URLSearchParams(location.search).get('preset');
    if (!restore()) { state.preset = normalize(S.defaults.preset).preset; state.name = ''; }
    render(); updateUndoButtons();
    if (id) {
      fetch('../presets/manifest.json', { cache: 'no-store' }).then((r) => r.json()).then((m) => {
        const p = m.presets.find((x) => x.id === id);
        if (p) openCommunity(p);
      }).catch(() => {});
    }
  }

  // For checks in the browser console: the current preset as the plugin's Export writes it
  window.lovelyEditor = { exportText: () => exportText(), state, normalize: (p) => normalize(p), parseJson, toJson, submitUrl, gunzipBase64 };

  start();
})();
