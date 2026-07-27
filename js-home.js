/* KIN · Home */
'use strict';

let currentAgeMode = 'ymdw';   // 'ymdw' | 'mwd' | 'wd' | 'd'
let currentAgeShowCorrected = false;

/* Sotto questa soglia mostriamo il tracking da neonato/bimbo piccolo
   (poppate, sonno, cambi). Sopra, quello non ha più senso: restano
   crescita, febbre, nota (e in futuro le milestone). */
const INFANT_MAX_MONTHS = 36;

function isInfantChild(child) {
  const age = ageOf(child.birth_date);
  return age.totalMonths < INFANT_MAX_MONTHS;
}

/* Anniversario automatico: rileva se oggi è esattamente un mese o un anno
   di vita (0 settimane e 0 giorni di resto oltre il mese/anno pieno). */
function checkAnniversaryToday(child) {
  const age = ageOf(child.birth_date);
  if (age.isNegative) return null;
  // Prime settimane (utile solo nei primissimi mesi)
  if (age.totalDays === 7) return '1 settimana';
  if (age.totalDays === 14) return '2 settimane';
  if (age.totalDays === 21) return '3 settimane';
  // Esattamente N mesi (ancora nel primo anno)
  if (age.ymdw.years === 0 && age.ymdw.weeks === 0 && age.ymdw.days === 0 && age.ymdw.months >= 1) {
    return age.ymdw.months + (age.ymdw.months === 1 ? ' mese' : ' mesi');
  }
  // Esattamente N anni
  if (age.ymdw.months === 0 && age.ymdw.weeks === 0 && age.ymdw.days === 0 && age.ymdw.years >= 1) {
    return age.ymdw.years === 1 ? '1 anno' : age.ymdw.years + ' anni';
  }
  return null;
}

function renderHome() {
  const c = document.getElementById('homeContent');
  if (!c) return;

  const active = getActiveChild();
  if (!active) {
    c.innerHTML = renderEmptyHome();
    return;
  }

  const child = active;
  const now = new Date();
  const age = ageOf(child.birth_date, now);
  const correctedNeeded = child.due_date && age.totalDays < 730; // < 2 anni
  const corrected = correctedNeeded ? correctedAge(child.birth_date, child.due_date, now) : null;
  const showingAge = (currentAgeShowCorrected && corrected) ? corrected : age;

  const ageStr = formatAge(showingAge, currentAgeMode);
  const ageTypeLabel = (currentAgeShowCorrected && corrected) ? 'età corretta' : 'età reale';

  let html = '';

  // SWITCHER FIGLIO
  html += renderChildSwitcher();

  // GREETING + toggle notte rapido
  const greetName = SYNC.profile?.display_name || '';
  const hour = now.getHours();
  let greet = 'buongiorno';
  if (hour >= 12 && hour < 18) greet = 'buon pomeriggio';
  else if (hour >= 18) greet = 'buonasera';
  else if (hour < 6) greet = 'è ancora notte';
  const isNight = (typeof CURRENT_THEME !== 'undefined' && CURRENT_THEME === 'night');
  html += `<div class="hdr-block hdr-with-toggle">
    <div class="hdr-block-text">
      <div class="hdr-eyebrow">${greet}${greetName ? ', ' + escapeHtml(greetName) : ''}</div>
      <h1 class="hdr-title">${escapeHtml(child.name)}</h1>
    </div>
    <button class="night-toggle-btn ${isNight?'active':''}" onclick="toggleNightMode()" aria-label="Modalità notte">${isNight ? '☀️' : '🌙'}</button>
  </div>`;

  // ANNIVERSARIO DI OGGI (se capita)
  const anniversary = (typeof checkAnniversaryToday === 'function') ? checkAnniversaryToday(child) : null;
  if (anniversary) {
    html += `<div class="anniversary-card">🎉 Oggi ${escapeHtml(child.name)} compie ${escapeHtml(anniversary)}!</div>`;
  }

  // AGE CARD
  html += `<div class="age-card">
    <div class="age-mode-row">
      <button class="age-mode ${currentAgeMode==='ymdw'?'active':''}" onclick="setAgeMode('ymdw')">anni</button>
      <button class="age-mode ${currentAgeMode==='mwd'?'active':''}" onclick="setAgeMode('mwd')">mesi</button>
      <button class="age-mode ${currentAgeMode==='wd'?'active':''}" onclick="setAgeMode('wd')">settimane</button>
      <button class="age-mode ${currentAgeMode==='d'?'active':''}" onclick="setAgeMode('d')">giorni</button>
    </div>
    <div class="age-main">${escapeHtml(ageStr)}</div>
    ${corrected ? `
      <div class="age-corrected-row">
        <button class="age-corrected-toggle ${!currentAgeShowCorrected?'active':''}" onclick="setCorrectedMode(false)">reale</button>
        <button class="age-corrected-toggle ${currentAgeShowCorrected?'active':''}" onclick="setCorrectedMode(true)">corretta</button>
      </div>
      <div class="age-corrected-hint">Fino ai 2 anni i pediatri usano l'età corretta per i prematuri.</div>
    ` : ''}
    <div class="age-birth-hint">Nato/a il ${fmtDateLong(parseDateStr(child.birth_date))}</div>
  </div>`;

  const infantMode = isInfantChild(child);

  // IN QUESTO PERIODO — sezione primaria: cosa aspettarti, perché, cosa fare
  const currentPhases = (typeof getCurrentPhases === 'function') ? getCurrentPhases(child) : [];
  html += `<div class="card-eyebrow eb-spaced">in questo periodo</div>`;
  if (currentPhases.length > 0) {
    html += `<div class="phase-list-wrap">`;
    currentPhases.forEach(p => { html += renderPhaseTeaser(p); });
    html += `</div>`;
  } else {
    html += `<div class="empty-card"><div class="empty-text">I contenuti su questa fascia d'età arriveranno presto.</div></div>`;
  }

  // REGISTRA — sezione secondaria, di supporto
  html += `<div class="card-eyebrow eb-spaced">registra rapidamente</div>`;
  if (infantMode) {
    html += `<div class="quick-grid quick-grid-secondary">
      <button class="quick-btn" onclick="openQuickFeed()"><span class="quick-ico">🍼</span><span>Poppata</span></button>
      <button class="quick-btn" onclick="openQuickSleep()"><span class="quick-ico">💤</span><span>Sonno</span></button>
      <button class="quick-btn" onclick="openQuickDiaper()"><span class="quick-ico">👶</span><span>Cambio</span></button>
      <button class="quick-btn" onclick="openQuickGrowth()"><span class="quick-ico">📏</span><span>Peso</span></button>
      <button class="quick-btn" onclick="openQuickTemp()"><span class="quick-ico">🌡️</span><span>Febbre</span></button>
      <button class="quick-btn" onclick="openQuickNote()"><span class="quick-ico">📝</span><span>Nota</span></button>
    </div>`;
  } else {
    html += `<div class="quick-grid quick-grid-3 quick-grid-secondary">
      <button class="quick-btn" onclick="openQuickGrowth()"><span class="quick-ico">📏</span><span>Crescita</span></button>
      <button class="quick-btn" onclick="openQuickTemp()"><span class="quick-ico">🌡️</span><span>Febbre</span></button>
      <button class="quick-btn" onclick="openQuickNote()"><span class="quick-ico">📝</span><span>Nota</span></button>
    </div>`;
  }

  c.innerHTML = html;
}

function renderEmptyHome() {
  return `
    <div class="hdr-block">
      <div class="hdr-eyebrow">benvenuto</div>
      <h1 class="hdr-title">Kin</h1>
    </div>
    <div class="empty-card">
      <div class="empty-text">Non hai ancora aggiunto figli.</div>
      <button class="welcome-primary" onclick="openAddChild()">
        <div class="welcome-btn-title">Aggiungi un figlio</div>
      </button>
    </div>`;
}

function renderChildSwitcher() {
  if (DATA.children.length < 2) return '';
  const activeId = getActiveChildId();
  let html = `<div class="child-switcher">`;
  DATA.children.forEach(c => {
    const age = ageOf(c.birth_date);
    const shortAge = shortAgeLabel(age);
    html += `<button class="child-chip ${c.id === activeId ? 'active' : ''}" onclick="switchChild('${c.id}')">
      <span class="child-chip-name">${escapeHtml(c.name)}</span>
      <span class="child-chip-age">${shortAge}</span>
    </button>`;
  });
  html += `</div>`;
  return html;
}

function shortAgeLabel(age) {
  if (age.isNegative) return '—';
  if (age.d < 14) return `${age.d}g`;
  if (age.totalMonths < 3) return `${age.weeks}s`;
  if (age.totalMonths < 24) return `${age.totalMonths}m`;
  return `${age.ymdw.years}a ${age.ymdw.months}m`;
}

function switchChild(id) {
  setActiveChildId(id);
  currentAgeShowCorrected = false;
  renderHome();
  if (document.getElementById('sec-tracking').classList.contains('active')) {
    if (typeof renderTracking === 'function') renderTracking();
  }
  if (document.getElementById('sec-salute').classList.contains('active')) {
    if (typeof renderHealth === 'function') renderHealth();
  }
  if (document.getElementById('sec-diario').classList.contains('active')) {
    if (typeof renderDiary === 'function') renderDiary();
  }
}

function setAgeMode(m) {
  currentAgeMode = m;
  renderHome();
}
function setCorrectedMode(v) {
  currentAgeShowCorrected = v;
  renderHome();
}

/* ---------- LAST EVENT CARDS ---------- */
function renderLastCard(label, ev, description) {
  const now = Date.now();
  const diff = now - ev.ts;
  let ago = '';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) ago = mins <= 0 ? 'adesso' : `${mins} min fa`;
  else if (mins < 60*24) ago = `${Math.floor(mins/60)}h ${mins%60}m fa`;
  else ago = `${Math.floor(mins/60/24)}g fa`;

  return `<div class="last-card">
    <div class="last-card-head">
      <span class="last-card-label">${label}</span>
      <span class="last-card-when">${ago}</span>
    </div>
    <div class="last-card-desc">${description}</div>
  </div>`;
}

function describeFeed(ev) {
  const d = ev.data || {};
  if (d.type === 'breast') {
    const side = d.side === 'both' ? 'entrambi' : (d.side === 'left' ? 'sx' : (d.side === 'right' ? 'dx' : ''));
    const dur = d.duration_min ? ` · ${d.duration_min} min` : '';
    return `Allattamento${side ? ' ' + side : ''}${dur}`;
  }
  if (d.type === 'bottle') {
    return `Biberon${d.ml ? ' ' + d.ml + ' ml' : ''}${d.content ? ' · ' + d.content : ''}`;
  }
  if (d.type === 'solid') {
    return `Solidi${d.what ? ' · ' + d.what : ''}`;
  }
  return 'Poppata';
}
function describeDiaper(ev) {
  const d = ev.data || {};
  const bits = [];
  if (d.pee) bits.push('pipì');
  if (d.poop) bits.push('cacca');
  if (d.color) bits.push(d.color);
  return bits.length ? bits.join(' · ') : 'Cambio';
}
function describeSleep(ev) {
  const d = ev.data || {};
  if (d.duration_min) {
    const h = Math.floor(d.duration_min / 60);
    const m = d.duration_min % 60;
    if (h > 0 && m > 0) return `Dormito ${h}h ${m}min`;
    if (h > 0) return `Dormito ${h}h`;
    return `Dormito ${m} min`;
  }
  if (d.status === 'ongoing') return 'Sta dormendo…';
  return 'Sonno registrato';
}
