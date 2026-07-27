/* KIN · Data & utility */
'use strict';

/* ---------- STORAGE ---------- */
const STORAGE_KEY = 'kin_data_v1';
const THEME_KEY = 'kin_theme_v1';
const ACTIVE_CHILD_KEY = 'kin_active_child_v1';

let DATA = {
  children: [],        // {id, name, birth_date, due_date, gender, color, ord}
  events: [],          // {id, child_id, kind, ts, data:{}, note}
  prefs: {}
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      DATA = Object.assign(DATA, p);
      if (!DATA.children) DATA.children = [];
      if (!DATA.events) DATA.events = [];
      if (!DATA.prefs) DATA.prefs = {};
    }
  } catch(e) { console.warn('loadData', e); }
}

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); }
  catch(e) { toast('Errore di salvataggio'); }
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

/* ---------- DATE HELPERS ---------- */
function dateOf(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function todayStr() { return dateOf(Date.now()); }
function fmtTime(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function fmtDateShort(d) {
  const M = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${d.getDate()} ${M[d.getMonth()]}`;
}
function fmtDateLong(d) {
  const M = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
}
function parseDateStr(s) {
  // s = 'YYYY-MM-DD' -> Date locale
  const parts = String(s || '').split('-');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
}

/* ---------- ETÀ CALCOLATA ---------- */
function ageOf(birthDate, atDate) {
  const now = atDate ? new Date(atDate) : new Date();
  const b = new Date(birthDate);
  b.setHours(0,0,0,0);
  const n = new Date(now);
  n.setHours(0,0,0,0);
  const msDay = 86400000;
  const totalDays = Math.floor((n - b) / msDay);

  // Anni/mesi/giorni/settimane accurati (usando componenti calendario)
  let years = n.getFullYear() - b.getFullYear();
  let months = n.getMonth() - b.getMonth();
  let days = n.getDate() - b.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(n.getFullYear(), n.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) { years -= 1; months += 12; }

  const totalMonths = years * 12 + months;
  const weeks = Math.floor(totalDays / 7);
  const daysAfterWeeks = totalDays - weeks * 7;
  const daysAfterMonths = days;
  const weeksAfterMonths = Math.floor(daysAfterMonths / 7);
  const daysAfterMonthsAndWeeks = daysAfterMonths - weeksAfterMonths * 7;

  return {
    totalDays, totalMonths, weeks, years, months,
    ymdw: { years, months, weeks: weeksAfterMonths, days: daysAfterMonthsAndWeeks },
    mwd: { months: totalMonths, weeks: weeksAfterMonths, days: daysAfterMonthsAndWeeks },
    wd: { weeks, days: daysAfterWeeks },
    d: totalDays,
    isNegative: totalDays < 0
  };
}

/* Età corretta per prematuro: usa DPP come "nascita" per il calcolo */
function correctedAge(birthDate, dueDate, atDate) {
  if (!dueDate) return null;
  const b = new Date(birthDate);
  const dpp = new Date(dueDate);
  b.setHours(0,0,0,0);
  dpp.setHours(0,0,0,0);
  // Se non era prematuro (nato dopo DPP o allo stesso momento), l'età corretta è uguale a quella reale
  const msDay = 86400000;
  const prematurityDays = Math.round((dpp - b) / msDay);
  if (prematurityDays <= 0) return null;
  return ageOf(dueDate, atDate);
}

/* Formatta un oggetto età in stringa leggibile */
function formatAge(age, mode) {
  // mode: 'ymdw' | 'mwd' | 'wd' | 'd'
  if (!age) return '';
  if (age.isNegative) return 'non ancora nato';
  const singPlur = (n, s, p) => n === 1 ? s : p;

  if (mode === 'd') {
    return `${age.d} ${singPlur(age.d, 'giorno', 'giorni')}`;
  }
  if (mode === 'wd') {
    const parts = [];
    if (age.wd.weeks > 0) parts.push(`${age.wd.weeks} ${singPlur(age.wd.weeks, 'settimana', 'settimane')}`);
    if (age.wd.days > 0 || parts.length === 0) parts.push(`${age.wd.days} ${singPlur(age.wd.days, 'giorno', 'giorni')}`);
    return parts.join(', ');
  }
  if (mode === 'mwd') {
    const parts = [];
    if (age.mwd.months > 0) parts.push(`${age.mwd.months} ${singPlur(age.mwd.months, 'mese', 'mesi')}`);
    if (age.mwd.weeks > 0) parts.push(`${age.mwd.weeks} ${singPlur(age.mwd.weeks, 'settimana', 'settimane')}`);
    if (age.mwd.days > 0 || parts.length === 0) parts.push(`${age.mwd.days} ${singPlur(age.mwd.days, 'giorno', 'giorni')}`);
    return parts.join(', ');
  }
  // ymdw (default)
  const parts = [];
  if (age.ymdw.years > 0) parts.push(`${age.ymdw.years} ${singPlur(age.ymdw.years, 'anno', 'anni')}`);
  if (age.ymdw.months > 0) parts.push(`${age.ymdw.months} ${singPlur(age.ymdw.months, 'mese', 'mesi')}`);
  if (age.ymdw.weeks > 0) parts.push(`${age.ymdw.weeks} ${singPlur(age.ymdw.weeks, 'settimana', 'settimane')}`);
  if (age.ymdw.days > 0 || parts.length === 0) parts.push(`${age.ymdw.days} ${singPlur(age.ymdw.days, 'giorno', 'giorni')}`);
  return parts.join(', ');
}

/* ---------- CHILDREN HELPERS ---------- */
function getActiveChildId() {
  const stored = localStorage.getItem(ACTIVE_CHILD_KEY);
  if (stored && DATA.children.some(c => c.id === stored)) return stored;
  return DATA.children[0]?.id || null;
}
function setActiveChildId(id) {
  localStorage.setItem(ACTIVE_CHILD_KEY, id);
}
function getActiveChild() {
  const id = getActiveChildId();
  return DATA.children.find(c => c.id === id) || null;
}
function getChild(id) { return DATA.children.find(c => c.id === id) || null; }

/* ---------- EVENTS HELPERS ---------- */
function eventsForChild(childId) {
  return (DATA.events || []).filter(e => e.child_id === childId);
}
function eventsForChildOfDay(childId, dayKey) {
  return eventsForChild(childId).filter(e => dateOf(e.ts) === dayKey);
}
function lastEventOfKind(childId, kind) {
  const list = eventsForChild(childId).filter(e => e.kind === kind).sort((a,b) => b.ts - a.ts);
  return list[0] || null;
}

/* ---------- UI HELPERS ---------- */
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escapeAttr(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

let toastTimer = null;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function showConfirm(title, msg, onOk) {
  let ov = document.getElementById('confirmOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'confirmOverlay';
    ov.className = 'confirm-overlay';
    document.body.appendChild(ov);
  }
  ov.innerHTML = `
    <div class="confirm-card">
      <div class="confirm-title">${escapeHtml(title)}</div>
      <div class="confirm-msg">${escapeHtml(msg)}</div>
      <div class="confirm-actions">
        <button class="confirm-cancel" onclick="closeConfirm()">Annulla</button>
        <button class="confirm-ok" id="confirmOkBtn">Conferma</button>
      </div>
    </div>`;
  ov.classList.add('show');
  document.getElementById('confirmOkBtn').onclick = () => { closeConfirm(); onOk(); };
}
function closeConfirm() {
  const ov = document.getElementById('confirmOverlay');
  if (ov) ov.classList.remove('show');
}
