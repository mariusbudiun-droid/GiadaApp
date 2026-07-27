/* KIN · Home */
'use strict';

let currentAgeMode = 'ymdw';   // 'ymdw' | 'mwd' | 'wd' | 'd'
let currentAgeShowCorrected = false;

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

  // GREETING
  const greetName = SYNC.profile?.display_name || '';
  const hour = now.getHours();
  let greet = 'buongiorno';
  if (hour >= 12 && hour < 18) greet = 'buon pomeriggio';
  else if (hour >= 18) greet = 'buonasera';
  else if (hour < 6) greet = 'è ancora notte';
  html += `<div class="hdr-block">
    <div class="hdr-eyebrow">${greet}${greetName ? ', ' + escapeHtml(greetName) : ''}</div>
    <h1 class="hdr-title">${escapeHtml(child.name)}</h1>
  </div>`;

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

  // ULTIMO EVENTO IMPORTANTE (poppata / cambio / sonno)
  const lastFeed = lastEventOfKind(child.id, 'feed');
  const lastDiaper = lastEventOfKind(child.id, 'diaper');
  const lastSleep = lastEventOfKind(child.id, 'sleep');
  const anyLast = [lastFeed, lastDiaper, lastSleep].filter(Boolean);
  if (anyLast.length > 0) {
    html += `<div class="card-eyebrow eb-spaced">le ultime cose</div>`;
    html += `<div class="last-events">`;
    if (lastFeed) html += renderLastCard('poppata', lastFeed, describeFeed(lastFeed));
    if (lastDiaper) html += renderLastCard('cambio', lastDiaper, describeDiaper(lastDiaper));
    if (lastSleep) html += renderLastCard('sonno', lastSleep, describeSleep(lastSleep));
    html += `</div>`;
  }

  // SHORTCUT
  html += `<div class="card-eyebrow eb-spaced">registra rapidamente</div>`;
  html += `<div class="quick-grid">
    <button class="quick-btn" onclick="openQuickFeed()"><span class="quick-ico">🍼</span><span>Poppata</span></button>
    <button class="quick-btn" onclick="openQuickSleep()"><span class="quick-ico">💤</span><span>Sonno</span></button>
    <button class="quick-btn" onclick="openQuickDiaper()"><span class="quick-ico">👶</span><span>Cambio</span></button>
    <button class="quick-btn" onclick="openQuickGrowth()"><span class="quick-ico">📏</span><span>Peso</span></button>
    <button class="quick-btn" onclick="openQuickTemp()"><span class="quick-ico">🌡️</span><span>Febbre</span></button>
    <button class="quick-btn" onclick="openQuickNote()"><span class="quick-ico">📝</span><span>Nota</span></button>
  </div>`;

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
