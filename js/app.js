/* ==========================================================================
   Mein Training – App-Logik
   Kein Build-Schritt, keine Abhängigkeiten. Läuft als PWA auf dem Handy.
   Aufbau:
     1. Hilfsfunktionen        5. Ansichten (Home, Tabelle, Tag, Verlauf, Editor, Einstellungen)
     2. Zustand & Speichern    6. Aktionen (Klicks, Eingaben)
     3. Programm-Logik         7. Timer, Bilder, Dialoge
     4. Routing & Rendering    8. Export / Import, Start
   ========================================================================== */
'use strict';

(function () {
  const APP_VERSION = '1.0.0';
  const FALLBACK_IMG = 'img/exercises/bodyweight.svg';
  const BUILT_IN_IMAGES = [
    { key: 'barbell', label: 'Langhantel' },
    { key: 'dumbbell', label: 'Kurzhantel' },
    { key: 'kettlebell', label: 'Kettlebell' },
    { key: 'machine', label: 'Maschine' },
    { key: 'bodyweight', label: 'Körper' },
    { key: 'core', label: 'Core' },
    { key: 'cardio', label: 'Ausdauer' },
    { key: 'stretch', label: 'Dehnen' },
  ];
  const DAY_COLORS = ['#14889a', '#d99a2f', '#2f9e63', '#7b61c9', '#c8443c', '#4a7fb5'];
  const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MUSCLES = ['Beine', 'Gesäss', 'Rücken', 'Brust', 'Schultern', 'Arme', 'Core', 'Ausdauer', 'Ganzkörper', 'Beweglichkeit'];
  const DEFAULT_SETTINGS = {
    theme: 'auto', vibrate: true, sound: false, restTimer: true, keepAwake: true,
    bodyWeight: 98, bodyHeight: 185,
  };

  const viewEl = document.getElementById('view');
  const titleEl = document.getElementById('title');
  const backBtn = document.getElementById('btn-back');
  const actionsEl = document.getElementById('topbar-actions');
  const timerBar = document.getElementById('timerbar');
  const toastEl = document.getElementById('toast');
  const modalRoot = document.getElementById('modal-root');

  /* ---------------------------------------------------------------------
     1. Hilfsfunktionen
     --------------------------------------------------------------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (v) => String(v === null || v === undefined ? '' : v)
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const attr = (v) => esc(v);
  const uid = (prefix) => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const DAY_MS = 86400000;
  const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const weekStart = () => { const d = new Date(); const dow = (d.getDay() + 6) % 7; return startOfDay(d.getTime() - dow * DAY_MS); };
  const fmtDate = (ts) => new Date(ts).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtClock = (ts) => new Date(ts).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  const fmtMin = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };
  const fmtSec = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const fmtDur = (s) => { s = Math.round(s || 0); if (s >= 120 && s % 60 === 0) return (s / 60) + ' min'; if (s >= 120) return Math.floor(s / 60) + ' min ' + (s % 60) + ' s'; return s + ' s'; };
  const relDay = (ts) => { const d = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY_MS); return d <= 0 ? 'heute' : d === 1 ? 'gestern' : 'vor ' + d + ' Tagen'; };
  const num = (v, fb) => { const n = parseFloat(String(v === null || v === undefined ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : (fb === undefined ? null : fb); };
  const clampInt = (v, min, max, fb) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb; };
  const firstNum = (s) => { const m = String(s || '').match(/\d+(?:[.,]\d+)?/); return m ? num(m[0]) : null; };
  const lastNum = (s) => { const m = String(s || '').match(/\d+(?:[.,]\d+)?/g); return m ? num(m[m.length - 1]) : null; };
  const round1 = (n) => Math.round(n * 10) / 10;
  const fmtNum = (n) => (n === null || n === undefined || n === '') ? '–' : String(round1(n)).replace('.', '.');
  const fmtWeight = (w, unit) => (w === null || w === undefined || w === '') ? '–' : fmtNum(w) + ' ' + (unit || 'kg');

  /* ---------------------------------------------------------------------
     2. Zustand & Speichern
     --------------------------------------------------------------------- */
  const state = {
    program: null, session: null, history: [], settings: {},
    route: { name: 'home', params: {} }, routeKey: '', draft: null, draftOriginal: null,
  };
  const imageCache = new Map();
  let audioCtx = null;
  let wakeLock = null;

  function loadState() {
    state.program = Storage.load(Storage.KEYS.program, null) || clone(DEFAULT_PROGRAM);
    normalizeProgram(state.program);
    state.session = Storage.load(Storage.KEYS.session, null);
    if (state.session && state.session.timer && state.session.timer.endsAt < Date.now() - 30000) state.session.timer = null;
    state.history = Storage.load(Storage.KEYS.history, []);
    if (!Array.isArray(state.history)) state.history = [];
    state.settings = Object.assign({}, DEFAULT_SETTINGS, Storage.load(Storage.KEYS.settings, {}));
  }
  const saveProgram = () => Storage.save(Storage.KEYS.program, state.program);
  const saveSession = () => Storage.save(Storage.KEYS.session, state.session);
  const saveHistory = () => Storage.save(Storage.KEYS.history, state.history);
  const saveSettings = () => Storage.save(Storage.KEYS.settings, state.settings);

  function normalizeProgram(p) {
    if (!p.name) p.name = 'Mein Trainingsplan';
    if (!Array.isArray(p.days)) p.days = [];
    p.days.forEach((d) => {
      if (!d.id) d.id = uid('day');
      if (!d.name) d.name = 'Trainingstag';
      if (!d.color) d.color = DAY_COLORS[0];
      if (!Array.isArray(d.exercises)) d.exercises = [];
      d.exercises.forEach(normalizeExercise);
    });
  }
  function normalizeExercise(e) {
    if (!e.id) e.id = uid('ex');
    if (!e.name) e.name = 'Übung';
    e.type = e.type === 'time' ? 'time' : 'reps';
    e.sets = clampInt(e.sets, 1, 30, 3);
    e.rest = clampInt(e.rest, 0, 1800, 60);
    if (e.type === 'time') e.duration = clampInt(e.duration, 5, 7200, 30);
    e.useWeight = e.type === 'reps' && e.useWeight !== false;
    if (!e.unit) e.unit = 'kg';
    e.weight = num(e.weight, null);
    e.increment = num(e.increment, null);
    if (!e.image) e.image = FALLBACK_IMG;
    return e;
  }

  /* ---------------------------------------------------------------------
     3. Programm-Logik (Sätze, Verlauf, Steigerung, Kalorien)
     --------------------------------------------------------------------- */
  const findDay = (id) => state.program.days.find((d) => d.id === id) || null;
  const findExercise = (day, id) => (day ? day.exercises.find((e) => e.id === id) : null) || null;
  const isPhoto = (src) => /^(idb:|https?:|data:)/.test(src || '');
  const setLabelOf = (ex) => ex.setLabel || 'Satz';

  function dayMinutes(day) {
    if (day.duration) return day.duration;
    const sec = day.exercises.reduce((sum, e) => sum + e.sets * ((e.type === 'time' ? e.duration : 40) + (e.rest || 0)), 0);
    return Math.max(5, Math.round(sec / 60));
  }
  function lastDoneOfDay(dayId) {
    const h = state.history.find((x) => x.dayId === dayId);
    return h ? h.finishedAt : null;
  }
  function lastResult(exId) {
    for (const h of state.history) {
      const ex = h.exercises.find((e) => e.id === exId);
      if (ex && ex.sets.some((s) => s.done)) return { date: h.finishedAt, sets: ex.sets, unit: ex.unit || 'kg', type: ex.type };
    }
    return null;
  }
  function recordOf(exId) {
    let best = null;
    state.history.forEach((h) => {
      const ex = h.exercises.find((e) => e.id === exId);
      if (!ex) return;
      ex.sets.forEach((s) => { if (s.done && s.reps !== null && s.reps !== undefined && (best === null || s.reps > best.value)) best = { value: s.reps, date: h.finishedAt }; });
    });
    return best;
  }
  function hitTop(ex, last) {
    const top = lastNum(ex.reps);
    if (!top || !last) return false;
    const done = last.sets.filter((s) => s.done);
    return done.length >= ex.sets && done.every((s) => (s.reps || 0) >= top);
  }
  function suggestion(ex) {
    if (ex.type !== 'reps' || !ex.useWeight) return null;
    const last = lastResult(ex.id);
    if (!last) return null;
    const lastW = (last.sets.find((s) => s.done && s.weight !== null && s.weight !== undefined) || {}).weight;
    if (lastW === undefined || lastW === null) return null;
    if (ex.increment && hitTop(ex, last)) {
      return { weight: round1(lastW + ex.increment), increased: true, from: lastW, top: lastNum(ex.reps) };
    }
    return { weight: lastW, increased: false };
  }
  function buildSets(ex, existing) {
    existing = existing || [];
    const last = lastResult(ex.id);
    const sug = suggestion(ex);
    const out = [];
    for (let i = 0; i < ex.sets; i++) {
      if (existing[i]) { out.push(existing[i]); continue; }
      const lastSet = last && last.sets[i] && last.sets[i].done ? last.sets[i] : null;
      let reps;
      if (ex.type === 'time') reps = ex.duration;
      else if (sug && sug.increased) reps = firstNum(ex.reps);
      else if (lastSet && lastSet.reps !== null && lastSet.reps !== undefined && ex.track !== 'max') reps = lastSet.reps;
      else reps = firstNum(ex.reps);
      out.push({ done: false, weight: ex.useWeight ? (sug ? sug.weight : ex.weight) : null, reps: reps, doneAt: null });
    }
    return out;
  }
  function newSession(day) {
    const sets = {};
    day.exercises.forEach((ex) => { sets[ex.id] = buildSets(ex); });
    return { id: uid('s'), dayId: day.id, startedAt: Date.now(), sets: sets, timer: null };
  }
  function reconcileSession(day) {
    let changed = false;
    day.exercises.forEach((ex) => {
      const cur = state.session.sets[ex.id] || [];
      if (cur.length !== ex.sets) { state.session.sets[ex.id] = buildSets(ex, cur).slice(0, ex.sets); changed = true; }
    });
    if (changed) saveSession();
  }
  function sessionCounts(day) {
    let total = 0, done = 0;
    day.exercises.forEach((ex) => {
      const arr = state.session.sets[ex.id] || [];
      total += ex.sets; done += arr.filter((s) => s.done).length;
    });
    return { total: total, done: done };
  }
  function metFor(ex) {
    if (ex.met) return ex.met;
    const img = ex.image || '';
    if (img.indexOf('cardio') >= 0) return 8;
    if (img.indexOf('core') >= 0) return 3.8;
    if (img.indexOf('stretch') >= 0) return 2.5;
    return ex.type === 'time' ? 4 : 5;
  }
  function estimateKcal(exercises, bodyWeight) {
    const kg = bodyWeight || 80;
    let metMinutes = 0;
    exercises.forEach((ex) => {
      const met = ex.met || 5;
      ex.sets.forEach((s) => {
        if (!s.done) return;
        if (ex.type === 'time') metMinutes += met * ((s.reps || 0) / 60);
        else metMinutes += met * 0.75 + 1.5 * ((ex.rest || 0) / 60);
      });
    });
    return Math.round(metMinutes * 3.5 * kg / 200);
  }
  function fmtLast(last, ex) {
    const done = last.sets.filter((s) => s.done);
    if (!done.length) return '–';
    if (ex.type === 'time') {
      const vals = done.map((s) => s.reps || 0);
      return vals.every((v) => v === vals[0]) ? done.length + ' × ' + fmtDur(vals[0]) : vals.map(fmtDur).join(' / ');
    }
    const reps = done.map((s) => fmtNum(s.reps));
    if (!ex.useWeight) return reps.join(' / ') + ' Wdh';
    const weights = done.map((s) => s.weight);
    if (weights.every((w) => w === weights[0])) return fmtWeight(weights[0], last.unit) + ' · ' + reps.join(' / ');
    return done.map((s) => fmtNum(s.weight) + '×' + fmtNum(s.reps)).join(' / ');
  }
  function targetLabel(ex) {
    const parts = [];
    if (ex.type === 'time') parts.push(ex.sets + ' × ' + fmtDur(ex.duration));
    else parts.push(ex.sets + ' × ' + (ex.reps || '?'));
    if (ex.useWeight && ex.weight !== null) parts.push(fmtWeight(ex.weight, ex.unit));
    if (ex.rest) parts.push('Pause ' + fmtDur(ex.rest));
    return parts.join(' · ');
  }

  /* ---------------------------------------------------------------------
     4. Routing & Rendering
     --------------------------------------------------------------------- */
  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { name: 'home', params: {} };
    if (parts[0] === 'table') return { name: 'table', params: {} };
    if (parts[0] === 'day' && parts[1]) return { name: 'day', params: { dayId: parts[1] } };
    if (parts[0] === 'history') return { name: 'history', params: {} };
    if (parts[0] === 'settings') return { name: 'settings', params: {} };
    if (parts[0] === 'edit') {
      if (parts[1] === 'day' && parts[2]) {
        if (parts[3] === 'ex' && parts[4]) return { name: 'editExercise', params: { dayId: parts[2], exId: parts[4] } };
        return { name: 'editDay', params: { dayId: parts[2] } };
      }
      return { name: 'edit', params: {} };
    }
    return { name: 'home', params: {} };
  }
  const navigate = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  function render() {
    const route = parseRoute();
    if (state.route.name === 'editExercise' && (route.name !== 'editExercise' || route.params.exId !== state.route.params.exId)) discardDraft();
    state.route = route;
    const out = (VIEWS[route.name] || VIEWS.home)(route.params);
    const key = route.name + ':' + JSON.stringify(route.params);
    titleEl.textContent = out.title;
    backBtn.hidden = !out.back;
    backBtn.dataset.to = out.back || '#/';
    actionsEl.innerHTML = out.actions || '';
    viewEl.innerHTML = out.html;
    $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === out.tab));
    if (key !== state.routeKey) { state.routeKey = key; window.scrollTo(0, 0); }
    hydrateImages(viewEl);
    if (out.after) out.after();
    syncWakeLock();
  }

  const imgTag = (src, alt, cls) => {
    src = src || FALLBACK_IMG;
    const photo = isPhoto(src) ? ' is-photo' : '';
    if (src.indexOf('idb:') === 0) {
      const key = src.slice(4);
      const cached = imageCache.get(key);
      return '<img class="' + attr(cls || '') + photo + '" alt="' + attr(alt) + '" src="' + (cached || FALLBACK_IMG) + '" data-idb="' + attr(key) + '">';
    }
    return '<img class="' + attr(cls || '') + photo + '" alt="' + attr(alt) + '" src="' + attr(src) + '" loading="lazy">';
  };
  const emptyState = (text) => '<div class="card"><p class="empty">' + esc(text) + '</p></div>';

  /* ---------------------------------------------------------------------
     5. Ansichten
     --------------------------------------------------------------------- */
  const VIEWS = {};

  // ---- Übersicht ----
  VIEWS.home = function () {
    const p = state.program, s = state.session, today = new Date().getDay();
    let html = '';
    if (s) {
      const d = findDay(s.dayId);
      const c = d ? sessionCounts(d) : { done: 0, total: 0 };
      html += '<section class="card card-accent"><div><div class="eyebrow">Zwischenspeicher · laufendes Training</div>' +
        '<h2>' + esc(d ? d.name : 'Training') + '</h2>' +
        '<p class="muted small">Gestartet ' + fmtClock(s.startedAt) + ' · ' + c.done + ' von ' + c.total + ' Sätzen bestätigt</p></div>' +
        '<div class="btn-row"><a class="btn btn-primary" href="#/day/' + attr(s.dayId) + '">Fortsetzen</a>' +
        '<button class="btn btn-ghost" data-action="discard-session">Verwerfen</button></div></section>';
    }
    const total = state.history.length;
    const week = state.history.filter((h) => h.finishedAt >= weekStart()).length;
    const last = state.history[0];
    html += '<section class="stats">' +
      '<div class="stat"><span class="stat-value">' + total + '</span><span class="stat-label">Trainings</span></div>' +
      '<div class="stat"><span class="stat-value">' + week + '</span><span class="stat-label">diese Woche</span></div>' +
      '<div class="stat"><span class="stat-value">' + (last ? esc(relDay(last.finishedAt)) : '–') + '</span><span class="stat-label">zuletzt</span></div></section>';
    html += '<div class="section-head"><h2>' + esc(p.name) + '</h2><a class="link" href="#/table">Als Tabelle</a></div>';
    if (p.notes) html += '<details class="card ex-notes"><summary>Regeln zur Steigerung</summary><p>' + esc(p.notes) + '</p></details>';
    if (!p.days.length) html += emptyState('Noch keine Trainingstage. Lege unter «Bearbeiten» deinen ersten Tag an.');
    html += p.days.map((d) => dayCard(d, today)).join('');
    return { title: 'Mein Training', html: html, tab: 'home' };
  };
  function dayCard(day, today) {
    const muscles = Array.from(new Set(day.exercises.map((e) => e.muscle).filter(Boolean)));
    const lastDone = lastDoneOfDay(day.id);
    const isToday = day.weekday !== null && day.weekday !== undefined && Number(day.weekday) === today;
    const active = state.session && state.session.dayId === day.id;
    return '<article class="card day-card" style="--day-color:' + attr(day.color) + '">' +
      '<div class="day-head"><div class="day-title"><h3>' + esc(day.name) + (isToday ? ' <span class="badge">Heute</span>' : '') + '</h3>' +
      '<p class="muted small">' + day.exercises.length + ' Übungen · ca. ' + dayMinutes(day) + ' min' + (lastDone ? ' · zuletzt ' + relDay(lastDone) : ' · noch nie') + '</p></div></div>' +
      (day.note ? '<p class="small muted">' + esc(day.note) + '</p>' : '') +
      (muscles.length ? '<div class="chips">' + muscles.map((m) => '<span class="chip">' + esc(m) + '</span>').join('') + '</div>' : '') +
      '<div class="thumbs">' + day.exercises.slice(0, 6).map((e) => imgTag(e.image, e.name, 'thumb')).join('') + '</div>' +
      '<div class="btn-row"><a class="btn btn-primary" href="#/day/' + attr(day.id) + '">' + (active ? 'Fortsetzen' : 'Öffnen') + '</a>' +
      '<a class="btn btn-ghost" href="#/edit/day/' + attr(day.id) + '">Bearbeiten</a></div></article>';
  }

  // ---- Tabelle ----
  VIEWS.table = function () {
    const p = state.program;
    let rows = '';
    p.days.forEach((day) => {
      rows += '<tr class="day-row" style="--day-color:' + attr(day.color) + '"><td colspan="7">' + esc(day.name) + ' · ca. ' + dayMinutes(day) + ' min</td></tr>';
      day.exercises.forEach((ex) => {
        rows += '<tr>' +
          '<td class="td-img">' + imgTag(ex.image, ex.name) + '</td>' +
          '<td>' + esc(ex.name) + (ex.section ? '<br><span class="muted small">' + esc(ex.section) + '</span>' : '') + '</td>' +
          '<td class="muted">' + esc(ex.muscle || '') + '</td>' +
          '<td class="num">' + ex.sets + '</td>' +
          '<td>' + (ex.type === 'time' ? fmtDur(ex.duration) : esc(ex.reps || '–')) + '</td>' +
          '<td class="num">' + (ex.useWeight ? esc(fmtWeight(ex.weight, ex.unit)) : '–') + '</td>' +
          '<td class="num">' + (ex.rest ? fmtDur(ex.rest) : '–') + '</td></tr>';
      });
    });
    const html = '<div class="table-wrap"><table class="program-table"><thead><tr><th></th><th>Übung</th><th>Muskel</th><th>Sätze</th><th>Wdh / Zeit</th><th>Gewicht</th><th>Pause</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7" class="empty">Kein Programm vorhanden.</td></tr>') + '</tbody></table></div>' +
      '<p class="help">Gewichte «–» werden beim ersten Training eingetragen und danach gemerkt. Seitlich scrollen für alle Spalten.</p>';
    return { title: 'Programm als Tabelle', html: html, back: '#/', tab: 'home' };
  };

  // ---- Trainingstag ----
  VIEWS.day = function (params) {
    const day = findDay(params.dayId);
    const s = state.session;
    if (!day) {
      let html = emptyState('Dieser Trainingstag existiert nicht mehr.');
      if (s && s.dayId === params.dayId) html += '<button class="btn btn-danger-ghost btn-block" data-action="discard-session">Laufendes Training verwerfen</button>';
      return { title: 'Trainingstag', html: html, back: '#/', tab: 'home' };
    }
    const active = !!(s && s.dayId === day.id);
    if (active) reconcileSession(day);
    let html = '';
    if (s && !active) {
      const other = findDay(s.dayId);
      html += '<section class="card"><p>Es läuft bereits ein Training: <strong>' + esc(other ? other.name : 'unbekannt') + '</strong>.</p>' +
        '<div class="btn-row"><a class="btn btn-secondary" href="#/day/' + attr(s.dayId) + '">Dorthin wechseln</a>' +
        '<button class="btn btn-danger-ghost" data-action="discard-session" data-then="start" data-day="' + attr(day.id) + '">Verwerfen &amp; hier starten</button></div></section>';
    }
    if (active) {
      const c = sessionCounts(day);
      const pct = c.total ? Math.round(100 * c.done / c.total) : 0;
      html += '<section class="card" id="day-progress"><div class="card-row"><div><div class="eyebrow">Laufendes Training</div><h2>' + esc(day.name) + '</h2>' +
        '<p class="muted small">Gestartet ' + fmtClock(s.startedAt) + ' · <span data-live="elapsed">' + fmtMin(Date.now() - s.startedAt) + '</span></p></div>' +
        '<div class="stat-value" data-progress-text>' + c.done + ' / ' + c.total + '</div></div>' +
        '<div class="progress' + (c.done === c.total ? ' is-complete' : '') + '" data-progress-bar><span style="width:' + pct + '%"></span></div></section>';
    } else {
      html += '<section class="card" style="--day-color:' + attr(day.color) + '"><div><div class="eyebrow">Vorschau</div><h2>' + esc(day.name) + '</h2>' +
        '<p class="muted small">' + day.exercises.length + ' Übungen · ca. ' + dayMinutes(day) + ' min' +
        (day.weekday !== null && day.weekday !== undefined ? ' · ' + WEEKDAYS[day.weekday] : '') + '</p>' +
        (day.note ? '<p class="small" style="margin-top:6px">' + esc(day.note) + '</p>' : '') + '</div>' +
        (day.exercises.length && !s ? '<button class="btn btn-primary btn-block" data-action="start-day" data-day="' + attr(day.id) + '">Training starten</button>' : '') + '</section>';
    }
    let lastSection = null;
    day.exercises.forEach((ex, idx) => {
      if ((ex.section || null) !== lastSection) {
        lastSection = ex.section || null;
        if (lastSection) html += '<div class="section-label">' + esc(lastSection) + '</div>';
      }
      html += exerciseCard(ex, idx, active);
    });
    if (!day.exercises.length) html += emptyState('Dieser Tag hat noch keine Übungen.');
    if (active) {
      const c = sessionCounts(day);
      html += '<div class="btn-row" id="finish-bar"><button class="btn btn-primary" data-action="finish-session"' + (c.done ? '' : ' disabled') + '>Training abschliessen</button>' +
        '<button class="btn btn-danger-ghost" data-action="discard-session">Abbrechen</button></div>';
    } else if (day.exercises.length && !s) {
      html += '<button class="btn btn-primary btn-block" data-action="start-day" data-day="' + attr(day.id) + '">Training starten</button>';
    }
    return { title: active ? 'Training läuft' : day.name, html: html, back: '#/', tab: 'home',
      actions: '<a class="icon-btn" href="#/edit/day/' + attr(day.id) + '" aria-label="Tag bearbeiten"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg></a>' };
  };
  function exerciseCard(ex, idx, active) {
    const last = lastResult(ex.id);
    const sug = active ? suggestion(ex) : null;
    const rec = ex.track === 'max' ? recordOf(ex.id) : null;
    const sets = active ? (state.session.sets[ex.id] || []) : [];
    const allDone = active && sets.length && sets.every((s) => s.done);
    let info = '<h3>' + (idx + 1) + '. ' + esc(ex.name) + '</h3>' +
      '<div class="ex-meta">' + (ex.muscle ? '<span class="chip chip-muscle">' + esc(ex.muscle) + '</span>' : '') + '<span>' + esc(targetLabel(ex)) + '</span></div>';
    if (last) info += '<p class="ex-last">Letztes Mal (' + esc(relDay(last.date)) + '): ' + esc(fmtLast(last, ex)) + '</p>';
    if (rec) info += '<p class="ex-last">Rekord: <strong>' + fmtNum(rec.value) + '</strong> (' + esc(relDay(rec.date)) + ') · Ziel: ' + fmtNum(rec.value + 5) + '–' + fmtNum(rec.value + 10) + '</p>';
    if (sug && sug.increased) info += '<p class="ex-hint">Alle Sätze mit ' + fmtNum(sug.top) + ' Wdh geschafft → heute ' + fmtWeight(sug.weight, ex.unit) + ' (+' + fmtNum(ex.increment) + ')</p>';
    let html = '<article class="card exercise' + (allDone ? ' is-done' : '') + '" id="ex-' + attr(ex.id) + '" data-ex-card="' + attr(ex.id) + '">' +
      '<div class="ex-head"><div class="ex-img">' + imgTag(ex.image, ex.name) + '</div><div class="ex-info">' + info + '</div></div>';
    if (ex.notes) html += '<details class="ex-notes"><summary>Hinweise</summary><p>' + esc(ex.notes) + '</p></details>';
    if (active) {
      html += '<div class="sets">' + sets.map((s, i) => setRowHtml(ex, i, s)).join('') + '</div>' +
        '<div class="ex-actions"><button class="btn btn-small btn-ghost" data-action="all-sets" data-ex="' + attr(ex.id) + '">Alle bestätigen</button>' +
        (ex.rest ? '<button class="btn btn-small btn-ghost" data-action="start-rest" data-ex="' + attr(ex.id) + '">Pause ' + fmtDur(ex.rest) + '</button>' : '') + '</div>';
    }
    return html + '</article>';
  }
  function setRowHtml(ex, i, s) {
    const label = setLabelOf(ex) + ' ' + (i + 1);
    const done = s.done ? ' done' : '';
    const check = '<button class="btn-check" data-action="toggle-set" aria-label="' + attr(label) + ' bestätigen">✓</button>';
    if (ex.type === 'time') {
      const useMin = (ex.duration || 0) >= 120;
      const val = (s.reps === null || s.reps === undefined) ? '' : (useMin ? round1(s.reps / 60) : s.reps);
      return '<div class="set-row is-time' + done + '" data-ex="' + attr(ex.id) + '" data-set="' + i + '"><span class="set-label">' + esc(label) + '</span>' +
        '<label class="set-input"><input type="number" inputmode="decimal" data-field="time" data-unit="' + (useMin ? 'min' : 's') + '" value="' + attr(val) + '" min="0" step="' + (useMin ? '1' : '5') + '"><span>' + (useMin ? 'min' : 's') + '</span></label>' +
        '<button class="btn-check btn-play" data-action="start-work" aria-label="Zeit starten">▶</button>' + check + '</div>';
    }
    const weightPart = ex.useWeight
      ? '<label class="set-input"><input type="number" inputmode="decimal" data-field="weight" value="' + attr(s.weight === null || s.weight === undefined ? '' : s.weight) + '" step="0.5" min="0" placeholder="kg"><span>' + esc(ex.unit || 'kg') + '</span></label><span class="set-x">×</span>'
      : '';
    return '<div class="set-row' + (ex.useWeight ? '' : ' is-noweight') + done + '" data-ex="' + attr(ex.id) + '" data-set="' + i + '"><span class="set-label">' + esc(label) + '</span>' + weightPart +
      '<label class="set-input"><input type="number" inputmode="numeric" data-field="reps" value="' + attr(s.reps === null || s.reps === undefined ? '' : s.reps) + '" min="0" step="1" placeholder="' + (ex.track === 'max' ? 'Anzahl' : 'Wdh') + '"><span>' + (ex.track === 'max' ? 'Stk' : 'Wdh') + '</span></label>' + check + '</div>';
  }

  // ---- Verlauf ----
  VIEWS.history = function () {
    const h = state.history;
    const ws = weekStart();
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    let html = '<section class="stats">' +
      '<div class="stat"><span class="stat-value">' + h.filter((x) => x.finishedAt >= ws).length + '</span><span class="stat-label">diese Woche</span></div>' +
      '<div class="stat"><span class="stat-value">' + h.filter((x) => x.finishedAt >= monthStart.getTime()).length + '</span><span class="stat-label">dieser Monat</span></div>' +
      '<div class="stat"><span class="stat-value">' + h.length + '</span><span class="stat-label">gesamt</span></div></section>';
    if (!h.length) html += emptyState('Noch kein Training abgeschlossen. Abgeschlossene Trainings erscheinen hier mit allen Sätzen.');
    h.forEach((entry) => {
      const complete = entry.doneSets >= entry.totalSets;
      const lines = entry.exercises.map((ex) => {
        const done = ex.sets.filter((s) => s.done);
        const summary = done.length ? fmtLast({ sets: ex.sets, unit: ex.unit }, ex) : 'ausgelassen';
        return '<div class="history-line"><span>' + esc(ex.name) + '</span><span class="muted">' + esc(summary) + '</span></div>';
      }).join('');
      html += '<details class="card history-entry" style="--day-color:' + attr(entry.color || '#14889a') + '"><summary>' +
        '<div style="flex:1;min-width:0"><div class="h-date">' + esc(fmtDate(entry.finishedAt)) + '</div>' +
        '<div class="muted small">' + esc(entry.dayName) + ' · ' + fmtMin(entry.finishedAt - entry.startedAt) + (entry.kcal ? ' · ≈ ' + entry.kcal + ' kcal' : '') + '</div></div>' +
        '<span class="badge' + (complete ? '' : ' partial') + '">' + entry.doneSets + '/' + entry.totalSets + '</span></summary>' +
        '<div class="h-body">' + lines + '<div class="btn-row" style="margin-top:6px"><button class="btn btn-small btn-danger-ghost" data-action="delete-history" data-id="' + attr(entry.id) + '">Eintrag löschen</button></div></div></details>';
    });
    return { title: 'Verlauf', html: html, tab: 'history' };
  };

  // ---- Editor: Programm ----
  VIEWS.edit = function () {
    const p = state.program;
    let html = '<section class="card form"><div class="field"><label for="f-pname">Name des Programms</label><input type="text" id="f-pname" data-program-field="name" value="' + attr(p.name) + '"></div>' +
      '<div class="field"><label for="f-pnotes">Regeln &amp; Hinweise (Startseite)</label><textarea id="f-pnotes" data-program-field="notes">' + esc(p.notes || '') + '</textarea></div></section>';
    html += '<div class="section-head"><h2>Trainingstage</h2></div><div class="edit-list">';
    p.days.forEach((d, i) => {
      html += '<div class="edit-item" style="border-left:4px solid ' + attr(d.color) + '"><div class="edit-main"><h3>' + esc(d.name) + '</h3><p>' + d.exercises.length + ' Übungen' + (d.weekday !== null && d.weekday !== undefined ? ' · ' + WEEKDAYS[d.weekday] : '') + '</p></div>' +
        '<div class="edit-actions"><button data-action="move-day" data-id="' + attr(d.id) + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="nach oben">↑</button>' +
        '<button data-action="move-day" data-id="' + attr(d.id) + '" data-dir="1"' + (i === p.days.length - 1 ? ' disabled' : '') + ' aria-label="nach unten">↓</button>' +
        '<a class="btn btn-small btn-secondary" href="#/edit/day/' + attr(d.id) + '">Öffnen</a></div></div>';
    });
    html += '</div><button class="btn btn-secondary btn-block" data-action="add-day">+ Tag hinzufügen</button>';
    return { title: 'Programm bearbeiten', html: html, tab: 'edit' };
  };

  // ---- Editor: Tag ----
  VIEWS.editDay = function (params) {
    const day = findDay(params.dayId);
    if (!day) return { title: 'Tag', html: emptyState('Tag nicht gefunden.'), back: '#/edit', tab: 'edit' };
    let html = '<section class="card form">' +
      '<div class="field"><label for="f-dname">Name</label><input type="text" id="f-dname" data-day-field="name" value="' + attr(day.name) + '"></div>' +
      '<div class="field-grid"><div class="field"><label for="f-dweekday">Wochentag</label><select id="f-dweekday" data-day-field="weekday"><option value="">– kein fester Tag –</option>' +
      WEEKDAYS.map((w, i) => '<option value="' + i + '"' + (Number(day.weekday) === i && day.weekday !== null && day.weekday !== undefined && day.weekday !== '' ? ' selected' : '') + '>' + w + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="f-dduration">Dauer ca. (min)</label><input type="number" id="f-dduration" inputmode="numeric" data-day-field="duration" value="' + attr(day.duration || '') + '" placeholder="auto"></div></div>' +
      '<div class="field"><span class="label">Farbe</span><div class="color-row">' + DAY_COLORS.map((c) => '<label><input type="radio" name="day-color" data-day-field="color" value="' + c + '"' + (day.color === c ? ' checked' : '') + '><span style="background:' + c + '"></span></label>').join('') + '</div></div>' +
      '<div class="field"><label for="f-dnote">Notiz</label><input type="text" id="f-dnote" data-day-field="note" value="' + attr(day.note || '') + '" placeholder="z.B. 3 Sätze × 10–12, 60–90 s Pause"></div></section>';
    html += '<div class="section-head"><h2>Übungen</h2></div><div class="edit-list">';
    day.exercises.forEach((ex, i) => {
      html += '<div class="edit-item">' + imgTag(ex.image, ex.name) + '<div class="edit-main"><h3>' + esc(ex.name) + '</h3><p>' + esc(targetLabel(ex)) + (ex.section ? ' · ' + esc(ex.section) : '') + '</p></div>' +
        '<div class="edit-actions"><button data-action="move-ex" data-id="' + attr(ex.id) + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="nach oben">↑</button>' +
        '<button data-action="move-ex" data-id="' + attr(ex.id) + '" data-dir="1"' + (i === day.exercises.length - 1 ? ' disabled' : '') + ' aria-label="nach unten">↓</button>' +
        '<a class="btn btn-small btn-secondary" href="#/edit/day/' + attr(day.id) + '/ex/' + attr(ex.id) + '">✎</a></div></div>';
    });
    html += '</div><button class="btn btn-secondary btn-block" data-action="add-exercise" data-day="' + attr(day.id) + '">+ Übung hinzufügen</button>' +
      '<div class="btn-row" style="margin-top:8px"><button class="btn btn-ghost" data-action="duplicate-day" data-id="' + attr(day.id) + '">Tag duplizieren</button>' +
      '<button class="btn btn-danger-ghost" data-action="delete-day" data-id="' + attr(day.id) + '">Tag löschen</button></div>';
    return { title: 'Tag bearbeiten', html: html, back: '#/edit', tab: 'edit' };
  };

  // ---- Editor: Übung ----
  VIEWS.editExercise = function (params) {
    const day = findDay(params.dayId);
    if (!day) return { title: 'Übung', html: emptyState('Tag nicht gefunden.'), back: '#/edit', tab: 'edit' };
    const isNew = params.exId === 'new';
    const original = isNew ? null : findExercise(day, params.exId);
    if (!isNew && !original) return { title: 'Übung', html: emptyState('Übung nicht gefunden.'), back: '#/edit/day/' + day.id, tab: 'edit' };
    if (!state.draft || state.draft.__exId !== params.exId) {
      state.draft = original ? clone(original) : {
        name: '', muscle: '', image: FALLBACK_IMG, type: 'reps', sets: 3, reps: '10–12', duration: 30, weight: null,
        useWeight: true, unit: 'kg', rest: 60, increment: null, track: '', section: '', setLabel: '', notes: '',
      };
      state.draft.__exId = params.exId;
      state.draftOriginal = original ? original.image : null;
    }
    const d = state.draft;
    const isTime = d.type === 'time';
    const val = (v) => attr(v === null || v === undefined ? '' : v);
    const isUrl = /^https?:/.test(d.image || '');
    let html = '<form class="card form" data-form="exercise" autocomplete="off">' +
      '<div class="field"><label for="f-name">Name</label><input type="text" id="f-name" name="name" value="' + val(d.name) + '" required placeholder="z.B. Kniebeugen"></div>' +
      '<div class="field-grid"><div class="field"><label for="f-muscle">Muskelgruppe</label><input type="text" id="f-muscle" name="muscle" list="muscle-list" value="' + val(d.muscle) + '"><datalist id="muscle-list">' + MUSCLES.map((m) => '<option value="' + m + '">').join('') + '</datalist></div>' +
      '<div class="field"><label for="f-section">Abschnitt (optional)</label><input type="text" id="f-section" name="section" value="' + val(d.section) + '" placeholder="z.B. Zirkel · 4 Runden"></div></div>' +
      // Bild
      '<div class="field"><span class="label">Bild</span><div class="img-preview">' + imgTag(d.image, d.name) +
      '<div style="display:flex;flex-direction:column;gap:6px"><label class="btn btn-secondary btn-small file-btn">Foto wählen<input type="file" accept="image/*" data-file="image"></label>' +
      (d.image && d.image.indexOf('idb:') === 0 ? '<button type="button" class="btn btn-ghost btn-small" data-action="remove-photo">Foto entfernen</button>' : '') + '</div></div>' +
      '<div class="picto-grid">' + BUILT_IN_IMAGES.map((b) => { const src = 'img/exercises/' + b.key + '.svg'; return '<label><input type="radio" name="image" value="' + src + '"' + (d.image === src ? ' checked' : '') + '><span><img src="' + src + '" alt=""><em>' + b.label + '</em></span></label>'; }).join('') + '</div>' +
      '<input type="url" name="imageUrl" value="' + (isUrl ? val(d.image) : '') + '" placeholder="oder Bild-Adresse (https://…)"></div>' +
      // Art
      '<div class="field"><span class="label">Art</span><div class="seg"><label><input type="radio" name="type" value="reps"' + (!isTime ? ' checked' : '') + '><span>Wiederholungen</span></label><label><input type="radio" name="type" value="time"' + (isTime ? ' checked' : '') + '><span>Zeit</span></label></div></div>' +
      '<div class="field-grid-3"><div class="field"><label for="f-sets">Sätze</label><input type="number" id="f-sets" name="sets" inputmode="numeric" min="1" max="30" value="' + val(d.sets) + '"></div>' +
      (isTime
        ? '<div class="field"><label for="f-duration">Zeit (s)</label><input type="number" id="f-duration" name="duration" inputmode="numeric" min="5" step="5" value="' + val(d.duration) + '"></div>'
        : '<div class="field"><label for="f-reps">Wiederholungen</label><input type="text" id="f-reps" name="reps" value="' + val(d.reps) + '" placeholder="10–12"></div>') +
      '<div class="field"><label for="f-rest">Pause (s)</label><input type="number" id="f-rest" name="rest" inputmode="numeric" min="0" step="5" value="' + val(d.rest) + '"></div></div>' +
      (isTime ? '' :
        '<div class="setting-row"><div class="setting-text"><strong>Mit Gewicht</strong><p>Aus für Körpergewicht, Cardio, Core</p></div><label class="switch"><input type="checkbox" name="useWeight"' + (d.useWeight !== false ? ' checked' : '') + '><span></span></label></div>' +
        (d.useWeight !== false
          ? '<div class="field-grid-3"><div class="field"><label for="f-weight">Startgewicht</label><input type="number" id="f-weight" name="weight" inputmode="decimal" step="0.5" min="0" value="' + val(d.weight) + '" placeholder="–"></div>' +
            '<div class="field"><label for="f-unit">Einheit</label><select id="f-unit" name="unit"><option value="kg"' + (d.unit !== 'lb' ? ' selected' : '') + '>kg</option><option value="lb"' + (d.unit === 'lb' ? ' selected' : '') + '>lb</option></select></div>' +
            '<div class="field"><label for="f-increment">Steigerung</label><input type="number" id="f-increment" name="increment" inputmode="decimal" step="0.5" min="0" value="' + val(d.increment) + '" placeholder="z.B. 2.5"></div></div>' +
            '<p class="help">Steigerung: Wenn alle Sätze die obere Wiederholungszahl erreichen, schlägt die App beim nächsten Training dieses Plus vor.</p>'
          : '<div class="setting-row"><div class="setting-text"><strong>Rekord verfolgen</strong><p>Höchste Zahl merken, z.B. Seilsprünge</p></div><label class="switch"><input type="checkbox" name="track"' + (d.track === 'max' ? ' checked' : '') + '><span></span></label></div>')) +
      '<div class="field"><label for="f-setlabel">Beschriftung der Sätze</label><input type="text" id="f-setlabel" name="setLabel" value="' + val(d.setLabel) + '" placeholder="Satz (oder z.B. Runde)"></div>' +
      '<div class="field"><label for="f-notes">Hinweise zur Ausführung</label><textarea id="f-notes" name="notes">' + esc(d.notes || '') + '</textarea></div>' +
      '<div class="btn-row"><button type="submit" class="btn btn-primary">Speichern</button><a class="btn btn-ghost" href="#/edit/day/' + attr(day.id) + '">Abbrechen</a></div>' +
      (isNew ? '' : '<button type="button" class="btn btn-danger-ghost btn-block" data-action="delete-exercise" data-day="' + attr(day.id) + '" data-id="' + attr(original.id) + '">Übung löschen</button>') +
      '</form>';
    return { title: isNew ? 'Neue Übung' : 'Übung bearbeiten', html: html, back: '#/edit/day/' + day.id, tab: 'edit' };
  };

  // ---- Einstellungen ----
  VIEWS.settings = function () {
    const s = state.settings;
    const sw = (key, title, text) => '<div class="setting-row"><div class="setting-text"><strong>' + title + '</strong><p>' + text + '</p></div><label class="switch"><input type="checkbox" data-setting="' + key + '"' + (s[key] ? ' checked' : '') + '><span></span></label></div>';
    const bmi = s.bodyWeight && s.bodyHeight ? round1(s.bodyWeight / Math.pow(s.bodyHeight / 100, 2)) : null;
    let html = '<section class="card"><h2>Training</h2>' +
      sw('restTimer', 'Pausen-Timer', 'Nach jedem bestätigten Satz automatisch die Pause starten') +
      sw('vibrate', 'Vibration', 'Wenn die Pause oder eine Zeitübung vorbei ist') +
      sw('sound', 'Ton', 'Kurzer Signalton am Ende des Timers') +
      sw('keepAwake', 'Bildschirm anlassen', 'Während eines laufenden Trainings nicht abdunkeln') + '</section>';
    html += '<section class="card"><h2>Darstellung</h2><div class="seg">' +
      [['auto', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']].map((o) => '<label><input type="radio" name="theme" data-setting="theme" value="' + o[0] + '"' + (s.theme === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>').join('') + '</div></section>';
    html += '<section class="card form"><h2>Körperdaten</h2><p class="help">Für die grobe Kalorienschätzung pro Training.</p><div class="field-grid">' +
      '<div class="field"><label for="s-weight">Gewicht (kg)</label><input type="number" id="s-weight" inputmode="decimal" step="0.5" data-setting="bodyWeight" value="' + attr(s.bodyWeight || '') + '"></div>' +
      '<div class="field"><label for="s-height">Grösse (cm)</label><input type="number" id="s-height" inputmode="numeric" data-setting="bodyHeight" value="' + attr(s.bodyHeight || '') + '"></div></div>' +
      (bmi ? '<p class="help">BMI ' + bmi + '</p>' : '') + '</section>';
    html += '<section class="card"><h2>Daten &amp; Sicherung</h2><p class="help">Alles liegt nur auf diesem Gerät. Eine Sicherungsdatei enthält Programm, Verlauf, Einstellungen und eigene Fotos.</p>' +
      '<div class="btn-row"><button class="btn btn-secondary" data-action="export">Sicherung exportieren</button><label class="btn btn-secondary file-btn">Sicherung importieren<input type="file" accept="application/json,.json" data-file="import"></label></div>' +
      '<p class="help" id="storage-info">Speicher wird ermittelt …</p></section>';
    html += '<section class="card"><h2>Zurücksetzen</h2><div class="btn-row"><button class="btn btn-ghost" data-action="reset-program">Beispielprogramm laden</button>' +
      '<button class="btn btn-danger-ghost" data-action="reset-history">Verlauf löschen</button></div></section>';
    html += '<section class="card"><h2>Info</h2><p class="small muted">Mein Training · Version ' + APP_VERSION + '<br>' +
      (navigator.onLine ? 'Online' : 'Offline') + ' · ' + (window.matchMedia('(display-mode: standalone)').matches ? 'als App installiert' : 'im Browser') + '</p>' +
      '<p class="help">Installieren: Im Browser-Menü «Zum Startbildschirm hinzufügen» (Android: Chrome-Menü, iPhone: Teilen-Symbol). Danach läuft die App auch offline.</p></section>';
    return { title: 'Einstellungen', html: html, tab: 'settings', after: fillStorageInfo };
  };
  async function fillStorageInfo() {
    const el = $('#storage-info'); if (!el) return;
    const est = await Storage.estimate();
    const localBytes = Object.values(Storage.KEYS).reduce((n, k) => n + ((localStorage.getItem(k) || '').length * 2), 0);
    let text = 'Programm &amp; Verlauf: ' + (localBytes / 1024).toFixed(1) + ' KB';
    if (est && est.quota) text += ' · Gerätespeicher belegt: ' + (est.usage / 1048576).toFixed(1) + ' MB von ' + Math.round(est.quota / 1048576) + ' MB';
    el.innerHTML = text;
  }

  /* ---------------------------------------------------------------------
     6. Aktionen
     --------------------------------------------------------------------- */
  const ACTIONS = {
    'start-day': (el) => {
      const day = findDay(el.dataset.day); if (!day) return;
      if (state.session) { toast('Es läuft bereits ein Training.'); return; }
      state.session = newSession(day); saveSession(); render(); toast('Training gestartet. Viel Erfolg!');
    },
    'discard-session': async (el) => {
      if (!state.session) return;
      const ok = await confirmDialog({ title: 'Training verwerfen?', text: 'Die bestätigten Sätze dieses Trainings gehen verloren.', ok: 'Verwerfen', danger: true });
      if (!ok) return;
      state.session = null; saveSession(); renderTimer();
      if (el.dataset.then === 'start') { const day = findDay(el.dataset.day); if (day) { state.session = newSession(day); saveSession(); } }
      render();
    },
    'toggle-set': (el) => toggleSet(el.closest('.set-row')),
    'all-sets': (el) => {
      const day = findDay(state.session && state.session.dayId); const ex = findExercise(day, el.dataset.ex); if (!ex) return;
      const arr = state.session.sets[ex.id]; const now = Date.now();
      const allDone = arr.every((s) => s.done);
      arr.forEach((s) => { s.done = !allDone; s.doneAt = allDone ? null : now; });
      saveSession(); render();
    },
    'start-rest': (el) => {
      const day = findDay(state.session && state.session.dayId); const ex = findExercise(day, el.dataset.ex); if (!ex || !ex.rest) return;
      startTimer(ex.rest, ex.name, 'rest');
    },
    'start-work': (el) => {
      const row = el.closest('.set-row'); const day = findDay(state.session && state.session.dayId); const ex = findExercise(day, row.dataset.ex); if (!ex) return;
      const set = state.session.sets[ex.id][+row.dataset.set];
      const secs = Math.round(set.reps || ex.duration || 30);
      if (secs > 0) startTimer(secs, ex.name + ' · ' + setLabelOf(ex) + ' ' + (+row.dataset.set + 1), 'work');
    },
    'finish-session': finishSession,
    'delete-history': async (el) => {
      const ok = await confirmDialog({ title: 'Eintrag löschen?', text: 'Dieses Training wird aus dem Verlauf entfernt.', ok: 'Löschen', danger: true });
      if (!ok) return;
      state.history = state.history.filter((h) => h.id !== el.dataset.id); saveHistory(); render();
    },
    'add-day': () => {
      const day = { id: uid('day'), name: 'Neuer Tag', weekday: null, color: DAY_COLORS[state.program.days.length % DAY_COLORS.length], duration: null, note: '', exercises: [] };
      state.program.days.push(day); saveProgram(); navigate('#/edit/day/' + day.id);
    },
    'move-day': (el) => moveItem(state.program.days, el.dataset.id, +el.dataset.dir),
    'delete-day': async (el) => {
      const day = findDay(el.dataset.id); if (!day) return;
      const ok = await confirmDialog({ title: '«' + day.name + '» löschen?', text: 'Der Tag und seine Übungen werden aus dem Programm entfernt. Der Verlauf bleibt erhalten.', ok: 'Löschen', danger: true });
      if (!ok) return;
      state.program.days = state.program.days.filter((d) => d.id !== day.id); saveProgram();
      if (state.session && state.session.dayId === day.id) { state.session = null; saveSession(); }
      navigate('#/edit');
    },
    'duplicate-day': (el) => {
      const day = findDay(el.dataset.id); if (!day) return;
      const copy = clone(day); copy.id = uid('day'); copy.name = day.name + ' (Kopie)'; copy.weekday = null;
      copy.exercises.forEach((e) => { e.id = uid('ex'); });
      const idx = state.program.days.indexOf(day); state.program.days.splice(idx + 1, 0, copy); saveProgram();
      navigate('#/edit/day/' + copy.id);
    },
    'add-exercise': (el) => navigate('#/edit/day/' + el.dataset.day + '/ex/new'),
    'move-ex': (el) => { const day = findDay(state.route.params.dayId); if (day) moveItem(day.exercises, el.dataset.id, +el.dataset.dir); },
    'delete-exercise': async (el) => {
      const day = findDay(el.dataset.day); const ex = findExercise(day, el.dataset.id); if (!ex) return;
      const ok = await confirmDialog({ title: '«' + ex.name + '» löschen?', text: 'Die Übung wird aus diesem Tag entfernt.', ok: 'Löschen', danger: true });
      if (!ok) return;
      if (ex.image && ex.image.indexOf('idb:') === 0) Storage.deleteImage(ex.image.slice(4)).catch(() => {});
      day.exercises = day.exercises.filter((e) => e.id !== ex.id); saveProgram();
      state.draft = null; navigate('#/edit/day/' + day.id);
    },
    'remove-photo': () => { if (!state.draft) return; state.draft.image = FALLBACK_IMG; render(); },
    'export': exportData,
    'reset-program': async () => {
      const ok = await confirmDialog({ title: 'Beispielprogramm laden?', text: 'Dein aktuelles Programm wird durch das Standardprogramm ersetzt. Der Verlauf bleibt erhalten. Tipp: vorher eine Sicherung exportieren.', ok: 'Laden', danger: true });
      if (!ok) return;
      state.program = clone(DEFAULT_PROGRAM); normalizeProgram(state.program); saveProgram(); toast('Beispielprogramm geladen.'); navigate('#/');
    },
    'reset-history': async () => {
      const ok = await confirmDialog({ title: 'Verlauf löschen?', text: 'Alle abgeschlossenen Trainings werden gelöscht. Das Programm bleibt.', ok: 'Löschen', danger: true });
      if (!ok) return;
      state.history = []; saveHistory(); toast('Verlauf gelöscht.'); render();
    },
  };

  function moveItem(arr, id, dir) {
    const i = arr.findIndex((x) => x.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; saveProgram(); render();
  }

  function toggleSet(row) {
    if (!row || !state.session) return;
    const day = findDay(state.session.dayId); const ex = findExercise(day, row.dataset.ex); if (!ex) return;
    const i = +row.dataset.set; const arr = state.session.sets[ex.id]; const set = arr && arr[i]; if (!set) return;
    set.done = !set.done; set.doneAt = set.done ? Date.now() : null;
    saveSession();
    row.classList.toggle('done', set.done);
    const card = row.closest('.exercise'); if (card) card.classList.toggle('is-done', arr.every((s) => s.done));
    const c = sessionCounts(day);
    updateProgress(c);
    if (set.done) {
      if (c.done >= c.total) { toast('Alle Sätze bestätigt.', { action: 'Abschliessen', onAction: finishSession, duration: 8000 }); }
      else if (state.settings.restTimer && ex.rest > 0) startTimer(ex.rest, ex.name + ' · nach ' + setLabelOf(ex) + ' ' + (i + 1), 'rest');
    }
  }
  function updateProgress(c) {
    const t = $('[data-progress-text]'); if (t) t.textContent = c.done + ' / ' + c.total;
    const b = $('[data-progress-bar]'); if (b) { b.classList.toggle('is-complete', c.done === c.total); $('span', b).style.width = (c.total ? Math.round(100 * c.done / c.total) : 0) + '%'; }
    const f = $('#finish-bar .btn-primary'); if (f) f.disabled = c.done === 0;
  }

  async function finishSession() {
    const s = state.session; if (!s) return;
    const day = findDay(s.dayId);
    if (!day) { state.session = null; saveSession(); render(); return; }
    const c = sessionCounts(day);
    const exercises = day.exercises.map((ex) => ({
      id: ex.id, name: ex.name, muscle: ex.muscle, type: ex.type, unit: ex.unit || 'kg', useWeight: ex.useWeight, rest: ex.rest, met: metFor(ex), track: ex.track || null,
      sets: (s.sets[ex.id] || []).map((x) => ({ done: !!x.done, weight: x.weight === undefined ? null : x.weight, reps: x.reps === undefined ? null : x.reps })),
    }));
    const kcal = estimateKcal(exercises, state.settings.bodyWeight);
    const ok = await confirmDialog({
      title: 'Training abschliessen?',
      text: c.done + ' von ' + c.total + ' Sätzen · ' + fmtMin(Date.now() - s.startedAt) + ' · ≈ ' + kcal + ' kcal (grobe Schätzung)',
      ok: 'Speichern',
    });
    if (!ok) return;
    state.history.unshift({ id: s.id, dayId: day.id, dayName: day.name, color: day.color, startedAt: s.startedAt, finishedAt: Date.now(), exercises: exercises, totalSets: c.total, doneSets: c.done, kcal: kcal });
    saveHistory();
    state.session = null; saveSession(); renderTimer();
    toast('Training gespeichert. Stark!');
    navigate('#/history');
  }

  // ---- Klicks ----
  viewEl.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !viewEl.contains(el)) return;
    e.preventDefault();
    const fn = ACTIONS[el.dataset.action];
    if (fn) fn(el, e);
  });
  backBtn.addEventListener('click', () => navigate(backBtn.dataset.to || '#/'));

  // ---- Eingaben ----
  function onInput(e) {
    const inp = e.target;
    if (!(inp instanceof HTMLElement)) return;
    const row = inp.closest('.set-row');
    if (row && state.session && inp.dataset.field) {
      const arr = state.session.sets[row.dataset.ex]; const set = arr && arr[+row.dataset.set]; if (!set) return;
      const v = num(inp.value, null);
      if (inp.dataset.field === 'weight') set.weight = v;
      else if (inp.dataset.field === 'reps') set.reps = v;
      else if (inp.dataset.field === 'time') set.reps = v === null ? null : Math.round(inp.dataset.unit === 'min' ? v * 60 : v);
      saveSession(); return;
    }
    if (inp.dataset.programField) { state.program[inp.dataset.programField] = inp.value; saveProgram(); return; }
    if (inp.dataset.dayField) {
      const day = findDay(state.route.params.dayId); if (!day) return;
      const f = inp.dataset.dayField;
      if (f === 'weekday') day.weekday = inp.value === '' ? null : parseInt(inp.value, 10);
      else if (f === 'duration') day.duration = clampInt(inp.value, 1, 600, null);
      else if (f === 'color') { if (inp.checked) day.color = inp.value; }
      else day[f] = inp.value;
      saveProgram(); return;
    }
    if (inp.dataset.setting) {
      const key = inp.dataset.setting;
      if (inp.type === 'checkbox') state.settings[key] = inp.checked;
      else if (inp.type === 'radio') { if (inp.checked) state.settings[key] = inp.value; }
      else if (inp.type === 'number') state.settings[key] = num(inp.value, null);
      else state.settings[key] = inp.value;
      saveSettings();
      if (key === 'theme') applyTheme();
      if (key === 'keepAwake') syncWakeLock();
      return;
    }
    if (inp.closest('[data-form="exercise"]') && state.draft && inp.name) {
      const d = state.draft;
      if (inp.name === 'imageUrl') { const v = inp.value.trim(); if (/^https?:\/\//.test(v)) d.image = v; else if (/^https?:/.test(d.image || '')) d.image = FALLBACK_IMG; return; }
      if (inp.type === 'checkbox') d[inp.name] = inp.name === 'track' ? (inp.checked ? 'max' : '') : inp.checked;
      else if (inp.type === 'radio') { if (inp.checked) d[inp.name] = inp.value; }
      else d[inp.name] = inp.value;
      if (e.type === 'change' && (inp.name === 'type' || inp.name === 'useWeight' || inp.name === 'image')) render();
    }
  }
  viewEl.addEventListener('input', onInput);
  viewEl.addEventListener('change', (e) => {
    const inp = e.target;
    if (inp.dataset && inp.dataset.file === 'image') { handleImageUpload(inp.files[0]); return; }
    if (inp.dataset && inp.dataset.file === 'import') { importData(inp.files[0]); inp.value = ''; return; }
    if (inp.type === 'radio' || inp.type === 'checkbox' || inp.tagName === 'SELECT') onInput(e);
  });
  viewEl.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form="exercise"]');
    if (!form) return;
    e.preventDefault();
    saveExerciseDraft();
  });
  viewEl.addEventListener('error', (e) => {
    const img = e.target;
    if (img && img.tagName === 'IMG' && !img.dataset.fallback) { img.dataset.fallback = '1'; img.src = FALLBACK_IMG; img.classList.remove('is-photo'); }
  }, true);

  function saveExerciseDraft() {
    const d = state.draft; if (!d) return;
    const day = findDay(state.route.params.dayId); if (!day) return;
    const name = String(d.name || '').trim();
    if (!name) { toast('Bitte einen Namen eingeben.'); const f = $('#f-name'); if (f) f.focus(); return; }
    const ex = {
      id: d.__exId === 'new' ? uid('ex') : d.__exId,
      name: name, muscle: String(d.muscle || '').trim(), image: d.image || FALLBACK_IMG, type: d.type === 'time' ? 'time' : 'reps',
      sets: clampInt(d.sets, 1, 30, 3), reps: String(d.reps || '').trim(), duration: clampInt(d.duration, 5, 7200, 30),
      weight: num(d.weight, null), useWeight: d.type !== 'time' && d.useWeight !== false, unit: d.unit === 'lb' ? 'lb' : 'kg',
      rest: clampInt(d.rest, 0, 1800, 0), increment: num(d.increment, null), track: d.track === 'max' ? 'max' : null,
      section: String(d.section || '').trim(), setLabel: String(d.setLabel || '').trim(), notes: String(d.notes || ''), met: d.met || null,
    };
    if (ex.type === 'reps' && !ex.reps) ex.reps = '10';
    normalizeExercise(ex);
    const idx = day.exercises.findIndex((x) => x.id === ex.id);
    if (idx >= 0) day.exercises[idx] = ex; else day.exercises.push(ex);
    saveProgram();
    if (state.draftOriginal && state.draftOriginal.indexOf('idb:') === 0 && state.draftOriginal !== ex.image) Storage.deleteImage(state.draftOriginal.slice(4)).catch(() => {});
    state.draft = null; state.draftOriginal = null;
    toast('Übung gespeichert.');
    navigate('#/edit/day/' + day.id);
  }
  function discardDraft() {
    const d = state.draft; if (!d) return;
    if (d.image && d.image.indexOf('idb:') === 0 && d.image !== state.draftOriginal) Storage.deleteImage(d.image.slice(4)).catch(() => {});
    state.draft = null; state.draftOriginal = null;
  }
  async function handleImageUpload(file) {
    if (!file || !state.draft) return;
    try {
      const dataUrl = await resizeImage(file, 900, 0.82);
      const key = 'img-' + uid('p');
      await Storage.putImage(key, dataUrl);
      imageCache.set(key, dataUrl);
      const prev = state.draft.image;
      if (prev && prev.indexOf('idb:') === 0 && prev !== state.draftOriginal) Storage.deleteImage(prev.slice(4)).catch(() => {});
      state.draft.image = 'idb:' + key;
      render();
    } catch (err) {
      console.warn(err);
      toast('Bild konnte nicht gespeichert werden.');
    }
  }
  function resizeImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild nicht lesbar')); };
      img.src = url;
    });
  }

  /* ---------------------------------------------------------------------
     7. Timer, Bilder, Dialoge, Toast
     --------------------------------------------------------------------- */
  function startTimer(seconds, label, mode) {
    if (!state.session) return;
    primeAudio();
    state.session.timer = { endsAt: Date.now() + seconds * 1000, total: seconds, label: label, mode: mode || 'rest', notified: false };
    saveSession(); renderTimer();
  }
  function renderTimer() {
    const t = state.session && state.session.timer;
    if (!t) { if (!timerBar.hidden) { timerBar.hidden = true; timerBar.innerHTML = ''; timerBar.dataset.mode = ''; } return; }
    const left = Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000));
    const pct = Math.min(100, Math.round(100 * (1 - left / t.total)));
    if (timerBar.hidden || timerBar.dataset.mode !== t.mode) {
      timerBar.hidden = false; timerBar.dataset.mode = t.mode;
      timerBar.innerHTML = '<div class="timer-head"><div class="timer-label"><span class="eyebrow">' + (t.mode === 'work' ? 'Übung läuft' : 'Pause') + '</span><br><span data-timer-label></span></div>' +
        '<div class="timer-time" data-timer-time></div><div class="timer-actions"><button class="btn btn-small btn-ghost" data-timer="plus">+30 s</button><button class="btn btn-small btn-secondary" data-timer="stop">Fertig</button></div></div>' +
        '<div class="progress"><span data-timer-bar></span></div>';
    }
    $('[data-timer-label]', timerBar).textContent = t.label || '';
    $('[data-timer-time]', timerBar).textContent = left > 0 ? fmtSec(left) : (t.mode === 'work' ? 'Zeit um' : 'Weiter!');
    $('[data-timer-bar]', timerBar).style.width = pct + '%';
    timerBar.classList.toggle('is-over', left <= 0);
    if (left <= 0 && !t.notified) {
      t.notified = true; saveSession();
      notifyTimerDone(t);
      setTimeout(() => { if (state.session && state.session.timer === t) { state.session.timer = null; saveSession(); renderTimer(); } }, 4000);
    }
  }
  timerBar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-timer]'); const t = state.session && state.session.timer;
    if (!b || !t) return;
    if (b.dataset.timer === 'plus') { t.endsAt = Math.max(t.endsAt, Date.now()) + 30000; t.total += 30; t.notified = false; timerBar.classList.remove('is-over'); }
    else state.session.timer = null;
    saveSession(); renderTimer();
  });
  function notifyTimerDone(t) {
    if (state.settings.vibrate && navigator.vibrate) { try { navigator.vibrate([200, 100, 200, 100, 350]); } catch (err) { /* ignorieren */ } }
    if (state.settings.sound) beep();
    toast(t.mode === 'work' ? 'Zeit um – Satz bestätigen.' : 'Pause vorbei – nächster Satz.');
  }
  function primeAudio() {
    if (!state.settings.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (err) { /* ignorieren */ }
  }
  function beep() {
    try {
      if (!audioCtx) primeAudio(); if (!audioCtx) return;
      const t0 = audioCtx.currentTime;
      [0, 0.22, 0.44].forEach((off) => {
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.0001, t0 + off); g.gain.exponentialRampToValueAtTime(0.35, t0 + off + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.18);
        o.start(t0 + off); o.stop(t0 + off + 0.2);
      });
    } catch (err) { /* ignorieren */ }
  }
  setInterval(() => {
    renderTimer();
    const el = $('[data-live="elapsed"]');
    if (el && state.session) el.textContent = fmtMin(Date.now() - state.session.startedAt);
  }, 500);

  async function hydrateImages(root) {
    for (const img of $$('img[data-idb]', root)) {
      const key = img.dataset.idb;
      if (imageCache.has(key)) { img.src = imageCache.get(key); continue; }
      try { const data = await Storage.getImage(key); if (data) { imageCache.set(key, data); img.src = data; } } catch (err) { /* Platzhalter bleibt */ }
    }
  }

  let toastTimer = null;
  function toast(msg, opts) {
    opts = opts || {};
    toastEl.innerHTML = '<span>' + esc(msg) + '</span>' + (opts.action ? '<button type="button">' + esc(opts.action) + '</button>' : '');
    if (opts.action) $('button', toastEl).onclick = () => { toastEl.hidden = true; if (opts.onAction) opts.onAction(); };
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, opts.duration || 3200);
  }
  function confirmDialog(o) {
    return new Promise((resolve) => {
      modalRoot.innerHTML = '<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><h2>' + esc(o.title) + '</h2>' + (o.text ? '<p>' + esc(o.text) + '</p>' : '') +
        '<div class="modal-actions"><button class="btn btn-secondary" data-modal="cancel">' + esc(o.cancel || 'Abbrechen') + '</button><button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-modal="ok">' + esc(o.ok || 'OK') + '</button></div></div></div>';
      modalRoot.hidden = false;
      const done = (v) => { modalRoot.hidden = true; modalRoot.innerHTML = ''; resolve(v); };
      const backdrop = $('.modal-backdrop', modalRoot);
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) done(false); });
      $('[data-modal="ok"]', modalRoot).addEventListener('click', () => done(true));
      $('[data-modal="cancel"]', modalRoot).addEventListener('click', () => done(false));
    });
  }

  function applyTheme() {
    const t = state.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    const dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = dark ? '#0c1c23' : '#f3f6f7';
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  async function syncWakeLock() {
    const want = state.settings.keepAwake && state.session && state.route.name === 'day' && document.visibilityState === 'visible';
    try {
      if (want && !wakeLock && 'wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!want && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (err) { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => { syncWakeLock(); renderTimer(); });

  /* ---------------------------------------------------------------------
     8. Export / Import, Start
     --------------------------------------------------------------------- */
  async function exportData() {
    const images = await Storage.allImages();
    const data = { app: 'mein-training', version: 1, exportedAt: new Date().toISOString(), program: state.program, history: state.history, settings: state.settings, images: images };
    const json = JSON.stringify(data, null, 2);
    const name = 'mein-training-' + new Date().toISOString().slice(0, 10) + '.json';
    const blob = new Blob([json], { type: 'application/json' });
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Mein Training – Sicherung' }); return; }
    } catch (err) { if (err && err.name === 'AbortError') return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Sicherung erstellt.');
  }
  async function importData(file) {
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch (err) { toast('Datei konnte nicht gelesen werden.'); return; }
    const program = data && data.program && Array.isArray(data.program.days) ? data.program : (data && Array.isArray(data.days) ? data : null);
    if (!program) { toast('Kein gültiges Programm in dieser Datei.'); return; }
    const hasHistory = Array.isArray(data.history);
    const ok = await confirmDialog({ title: 'Sicherung importieren?', text: 'Das aktuelle Programm wird ersetzt' + (hasHistory ? ', der Verlauf wird übernommen (' + data.history.length + ' Trainings)' : '') + '. Ein laufendes Training wird verworfen.', ok: 'Importieren', danger: true });
    if (!ok) return;
    if (data.images && typeof data.images === 'object') {
      for (const key of Object.keys(data.images)) { try { await Storage.putImage(key, data.images[key]); } catch (err) { /* ignorieren */ } }
    }
    state.program = clone(program); normalizeProgram(state.program); saveProgram();
    if (hasHistory) { state.history = data.history; saveHistory(); }
    if (data.settings && typeof data.settings === 'object') { state.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings); saveSettings(); applyTheme(); }
    state.session = null; saveSession(); imageCache.clear();
    toast('Import abgeschlossen.');
    navigate('#/');
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Neue Version verfügbar.', { action: 'Neu laden', onAction: () => location.reload(), duration: 12000 });
        });
      });
    }).catch((err) => console.warn('Service Worker', err));
  }

  loadState();
  applyTheme();
  window.addEventListener('hashchange', render);
  render();
  renderTimer();
  registerServiceWorker();
  window.MeinTraining = { state: state, render: render, version: APP_VERSION };
})();
