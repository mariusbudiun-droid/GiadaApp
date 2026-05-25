/* =========================================================
   GIADA · App core
   Storage, navigation, theme, utilities
   ========================================================= */
'use strict';

const APP_VERSION = '1.4.1';
console.log('%c GIADA · v' + APP_VERSION + ' ', 'background:#7A9978;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;');

/* ---------- STORAGE ---------- */
const STORAGE_KEY = 'giada_data_v1';
const THEME_KEY = 'giada_theme_v1';
let DATA = { measurements: [], meals: [], prefs: {} };

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      DATA = Object.assign(DATA, p);
      if (!DATA.measurements) DATA.measurements = [];
      if (!DATA.meals) DATA.meals = [];
      if (!DATA.prefs) DATA.prefs = {};
    }
  } catch(e) {}
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); }
  catch(e) { toast('Errore di salvataggio'); }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

/* ---------- THEME MANAGER ---------- */
const THEMES = [
  { id: 'calda', name: 'Calda', desc: 'Terracotta e salvia, caldo mediterraneo',
    preview: { bg: '#FBF7F2', accent: '#7A9978', accent2: '#B85C42', text: '#2D2A26' } },
  { id: 'tenera', name: 'Tenera', desc: 'Rosa cipria e pesco, gentile e materna',
    preview: { bg: '#FDF6F3', accent: '#D4848B', accent2: '#E8A073', text: '#3D2B2C' } },
  { id: 'minimal', name: 'Minimal', desc: 'Off-white e oro, essenziale ed elegante',
    preview: { bg: '#FAFAF8', accent: '#1A1A18', accent2: '#B8975A', text: '#1A1A18' } },
  { id: 'botanica', name: 'Botanica', desc: 'Foglie e sabbia, naturale e organica',
    preview: { bg: '#F5F1E8', accent: '#4F6B3A', accent2: '#B8A26F', text: '#2A2E20' } }
];

function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      const t = JSON.parse(raw);
      return { palette: t.palette || 'calda', mode: t.mode || 'auto' };
    }
  } catch(e) {}
  return { palette: 'calda', mode: 'auto' };
}
function saveTheme(t) {
  try { localStorage.setItem(THEME_KEY, JSON.stringify(t)); } catch(e) {}
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-palette', t.palette);
  document.documentElement.setAttribute('data-mode', t.mode);
  updateThemeMeta(t);
}
function updateThemeMeta(t) {
  // Aggiorna theme-color del meta tag in base alla palette e al mode effettivo
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const palette = THEMES.find(x => x.id === t.palette);
  if (!palette) return;
  const isDark = (t.mode === 'dark') || (t.mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const colors = {
    calda: { light: '#FBF7F2', dark: '#1F1C18' },
    tenera: { light: '#FDF6F3', dark: '#1F1718' },
    minimal: { light: '#FAFAF8', dark: '#0F0F0E' },
    botanica: { light: '#F5F1E8', dark: '#181B12' }
  };
  meta.setAttribute('content', isDark ? colors[t.palette].dark : colors[t.palette].light);
}
let CURRENT_THEME = loadTheme();

/* ---------- UTILITIES ---------- */
function todayStr() { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dateOf(ts) { const d = new Date(ts); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function fmtTime(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function fmtDate(s) {
  const [y,m,d] = s.split('-');
  const dt = new Date(+y, +m-1, +d);
  const M = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const D = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
  return D[dt.getDay()] + ' ' + (+d) + ' ' + M[+m-1];
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove('show'), 2200);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- NAVIGATION ---------- */
function goTo(tab) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('sec-'+tab).classList.add('active');
  const tabBtn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (tabBtn) tabBtn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (tab === 'home') renderHome();
  if (tab === 'pasti') renderPasti();
  if (tab === 'misurazioni') renderMisurazioni();
  if (tab === 'diario') renderDiario();
  if (tab === 'stats') renderStats();
  if (tab === 'set') renderSettings();
}

/* ---------- HEADER ---------- */
function renderHeader() {
  const h = new Date().getHours();
  let e = 'buongiorno';
  if (h>=12 && h<18) e = 'buon pomeriggio';
  else if (h>=18) e = 'buonasera';
  else if (h<6) e = 'è ancora notte';

  let nameForGreeting = 'Giada';
  let subline = '';
  if (typeof SYNC !== 'undefined' && SYNC && SYNC.role === 'partner') {
    nameForGreeting = SYNC.profile?.display_name || 'tu';
    const ownerName = SYNC.ownerProfile?.display_name || 'Giada';
    subline = SYNC.paused ? `dati di ${ownerName} · condivisione in pausa` : `i dati di ${ownerName}`;
  } else if (typeof SYNC !== 'undefined' && SYNC && SYNC.role === 'owner') {
    nameForGreeting = SYNC.profile?.display_name || 'Giada';
  }

  const titleEl = document.getElementById('hdrTitle');
  if (titleEl) titleEl.textContent = e + ', ' + nameForGreeting;
  const M = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const D = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
  const n = new Date();
  const ebEl = document.getElementById('hdrEyebrow');
  if (ebEl) ebEl.textContent = subline || (D[n.getDay()] + ' ' + n.getDate() + ' ' + M[n.getMonth()]);
  const vEl = document.getElementById('hdrVersion');
  if (vEl) vEl.textContent = 'v' + APP_VERSION;
}

/* ---------- HOME ---------- */
const dailyQuotes = [
  "Un pasto alla volta. Stai facendo benissimo.",
  "La gravidanza è temporanea, la cura che ti dai resta.",
  "Ogni numero in target è una piccola vittoria.",
  "Verdure, proteine, carboidrati. In quest'ordine.",
  "Bevi acqua, respira, è tutto sotto controllo.",
  "Anche oggi un piccolo passo per voi due.",
  "Il corpo sa cosa fare. Tu dagli i mattoni giusti.",
  "Non sei sola in questo. Continua così."
];

function renderHome() {
  const today = todayStr();
  const tm = DATA.meals.filter(m => dateOf(m.ts) === today);
  const tms = DATA.measurements.filter(m => dateOf(m.ts) === today);
  const grid = document.getElementById('dayPills');
  grid.innerHTML = '';
  SLOTS.forEach(slot => {
    const entry = tm.find(x => x.mealId === slot.id);
    const hasItems = entry && ((entry.items && entry.items.length) || (entry.choices && Object.keys(entry.choices).length));
    const el = document.createElement('div');
    el.className = 'pill' + (hasItems ? ' done' : '');
    const sn = { colazione:'Colazione', spuntino_matt:'Spuntino', pranzo:'Pranzo', merenda:'Merenda', cena:'Cena', spuntino_notturno:'Notturno' }[slot.id];
    el.innerHTML = `<div class="pill-name">${sn}</div><div class="pill-state">${hasItems ? '✓' : '·'}</div>`;
    grid.appendChild(el);
  });
  const doneCount = tm.filter(m => (m.items && m.items.length) || (m.choices && Object.keys(m.choices).length))
    .reduce((a,m) => { a.add(m.mealId); return a; }, new Set()).size;
  document.getElementById('dayProgress').textContent = doneCount+' di 6 pasti registrati';
  document.getElementById('dayQuote').textContent = '"' + dailyQuotes[new Date().getDate() % dailyQuotes.length] + '"';

  const lastBy = (sk) => { const a = tms.filter(m => m.kind==='glicemia' && m.subkind===sk); return a.length ? a[a.length-1] : null; };
  const sv = (id, m) => {
    const el = document.getElementById(id);
    if (m) { el.innerHTML = m.value + '<span class="metric-unit">mg/dL</span>'; el.classList.remove('empty'); }
    else { el.textContent = '—'; el.classList.add('empty'); }
  };
  sv('m-digiuno', lastBy('digiuno'));
  sv('m-colazione', lastBy('colazione'));
  sv('m-pranzo', lastBy('pranzo'));
  sv('m-cena', lastBy('cena'));
  const kt = tms.filter(m => m.kind === 'chetoni');
  const lk = kt.length ? kt[kt.length-1] : null;
  const ke = document.getElementById('m-chetoni');
  if (lk) { ke.textContent = ketoLabel(lk.value); ke.classList.remove('empty'); ke.style.fontSize = '18px'; }
  else { ke.textContent = '—'; ke.classList.add('empty'); }
  document.getElementById('m-timing').textContent = getTimingForToday() + 'h';

  // Lavagnetta
  if (typeof renderNotesBoard === 'function') renderNotesBoard();
}

function ketoLabel(v) { return { 0:'Negativo', 5:'Tracce', 15:'+', 40:'++', 80:'+++', 160:'++++' }[v] || ('+ '+v); }

/* ---------- LAVAGNETTA ---------- */
function renderNotesBoard() {
  const c = document.getElementById('notesBoard');
  if (!c) return;
  if (typeof getNotesState !== 'function') { c.innerHTML = ''; return; }
  const st = getNotesState();
  if (!st.role) { c.innerHTML = ''; return; }

  // Se l'utente sta scrivendo, non sovrascrivere il textarea — aggiorno solo la bolla "theirs"
  const ta = document.getElementById('myNoteText');
  if (ta && document.activeElement === ta) {
    updateOnlyTheirBubble(st);
    return;
  }

  const myName = (SYNC.profile && SYNC.profile.display_name) || 'io';
  // I miei messaggi: il loro nome è "tu" stilizzato
  const partnerLabel = st.theirsName || (st.role === 'partner' ? 'Giada' : 'lui');

  const mineText = st.mine || '';
  const theirsText = (st.theirs || '').trim();
  const ago = st.theirsUpdatedAt ? timeAgo(new Date(st.theirsUpdatedAt).getTime()) : '';

  // Card collassabile, mostro sempre quella dell'altro se ha scritto, e poi la mia editabile
  const theirsBlock = theirsText
    ? `<div class="note-bubble theirs">
         <div class="note-bubble-head">
           <span class="note-bubble-from">da ${escapeHtml(partnerLabel)}</span>
           ${ago ? `<span class="note-bubble-when">${ago}</span>` : ''}
         </div>
         <div class="note-bubble-text">${escapeHtml(theirsText)}</div>
       </div>`
    : `<div class="note-bubble theirs empty">
         <div class="note-bubble-text muted">${escapeHtml(partnerLabel)} non ha ancora scritto niente.</div>
       </div>`;

  const placeholder = st.role === 'partner'
    ? `Scrivi qualcosa a ${escapeHtml(partnerLabel)}…`
    : `Scrivi qualcosa a ${escapeHtml(partnerLabel)}…`;

  const mineBlock = `
    <div class="note-bubble mine">
      <div class="note-bubble-head">
        <span class="note-bubble-from">tu</span>
        <span class="note-bubble-status" id="noteStatus"></span>
      </div>
      <textarea class="note-textarea" id="myNoteText"
        maxlength="280"
        placeholder="${placeholder}"
        rows="2"
      >${escapeHtml(mineText)}</textarea>
      <div class="note-foot">
        <span class="note-count"><span id="noteCount">${mineText.length}</span>/280</span>
      </div>
    </div>`;

  c.innerHTML = `
    <div class="card-eyebrow eb-spaced">tra di noi</div>
    <div class="notes-board">
      ${theirsBlock}
      ${mineBlock}
    </div>`;

  // Listener: salvataggio con debounce
  const taNew = document.getElementById('myNoteText');
  const cnt = document.getElementById('noteCount');
  const status = document.getElementById('noteStatus');
  if (taNew) {
    taNew.addEventListener('input', () => {
      cnt.textContent = taNew.value.length;
      if (status) status.textContent = 'in salvataggio…';
      if (typeof scheduleNotePush === 'function') {
        scheduleNotePush(taNew.value);
        // mostra "salvato" dopo il debounce + un piccolo margine
        setTimeout(() => { if (status) status.textContent = 'salvato'; setTimeout(() => { if (status) status.textContent = ''; }, 1200); }, 1000);
      }
    });
    // auto-grow leggero
    taNew.addEventListener('input', autoResizeTextarea);
    autoResizeTextarea({ target: taNew });
  }
}

function autoResizeTextarea(e) {
  const ta = e.target;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
}

function updateOnlyTheirBubble(st) {
  const board = document.querySelector('#notesBoard .notes-board');
  if (!board) return;
  const theirs = board.querySelector('.note-bubble.theirs');
  if (!theirs) return;
  const partnerLabel = st.theirsName || 'lui';
  const theirsText = (st.theirs || '').trim();
  const ago = st.theirsUpdatedAt ? timeAgo(new Date(st.theirsUpdatedAt).getTime()) : '';
  if (theirsText) {
    theirs.classList.remove('empty');
    theirs.innerHTML = `
      <div class="note-bubble-head">
        <span class="note-bubble-from">da ${escapeHtml(partnerLabel)}</span>
        ${ago ? `<span class="note-bubble-when">${ago}</span>` : ''}
      </div>
      <div class="note-bubble-text">${escapeHtml(theirsText)}</div>`;
  } else {
    theirs.classList.add('empty');
    theirs.innerHTML = `<div class="note-bubble-text muted">${escapeHtml(partnerLabel)} non ha ancora scritto niente.</div>`;
  }
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'adesso';
  if (diff < 3600) return Math.floor(diff/60) + ' min fa';
  if (diff < 86400) return Math.floor(diff/3600) + 'h fa';
  if (diff < 172800) return 'ieri';
  const d = new Date(ts);
  const M = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return d.getDate() + ' ' + M[d.getMonth()];
}
