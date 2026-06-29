/* =========================================================
   GIADA · Calendario
   - Counter gravidanza (settimane+giorni, trimestre, giorni a DPP)
   - Vista mensile con pallini per pasti/misurazioni/appuntamenti
   - Vista giorno con elenco di tutto (sostituisce il diario)
   - Aggiungi appuntamenti (solo owner)
   - Export .ics per Calendario iOS
   ========================================================= */
'use strict';

let calCursor = new Date();        // primo giorno del mese visualizzato
let calSelectedDate = null;        // YYYY-MM-DD del giorno aperto in vista
let editingApptId = null;          // se sto modificando un appuntamento

/* ---------- DATA UTILITIES ---------- */
function dueDateObj() {
  const d = (typeof SYNC !== 'undefined' && SYNC.profile && SYNC.profile.due_date) || null;
  if (!d) return null;
  // d in formato 'YYYY-MM-DD'
  const parts = String(d).split('-');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function pregnancyStatus() {
  const dpp = dueDateObj();
  if (!dpp) return null;
  // settimane di gravidanza = 40 settimane meno il numero di giorni che mancano alla DPP
  const today = new Date(); today.setHours(0,0,0,0);
  const dppN = new Date(dpp); dppN.setHours(0,0,0,0);
  const msDay = 86400000;
  const daysToDpp = Math.round((dppN - today) / msDay);
  const totalDaysGest = 280 - daysToDpp;
  if (totalDaysGest < 0) return { error: 'pre' };
  const weeks = Math.floor(totalDaysGest / 7);
  const days = totalDaysGest % 7;
  let trimester = 1;
  if (weeks >= 13 && weeks < 27) trimester = 2;
  else if (weeks >= 27) trimester = 3;
  let phase = '';
  if (weeks < 14) phase = '1° trimestre';
  else if (weeks < 28) phase = '2° trimestre';
  else if (weeks < 37) phase = '3° trimestre';
  else if (weeks < 42) phase = 'a termine';
  else phase = 'oltre la DPP';
  return { weeks, days, daysToDpp, trimester, phase, totalDaysGest };
}

/* ---------- MONTH GRID ---------- */
function calMonthDays(cursor) {
  // Restituisce array di 42 oggetti {date, inMonth} per la griglia mensile (6 settimane)
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1);
  // Settimana inizia lunedì (0=lun, 6=dom)
  let startWeekday = first.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;
  const gridStart = new Date(y, m, 1 - startWeekday);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({ date: d, inMonth: d.getMonth() === m });
  }
  return days;
}

function calDayKey(d) {
  // YYYY-MM-DD locale
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calDayHasData(dayKey) {
  // restituisce {meals, meas, appts} count
  const meals = DATA.meals.filter(x => dateOf(x.ts) === dayKey).length;
  const meas = DATA.measurements.filter(x => dateOf(x.ts) === dayKey).length;
  const appts = (DATA.appointments || []).filter(a => {
    const d = new Date(a.date);
    return calDayKey(d) === dayKey;
  }).length;
  return { meals, meas, appts };
}

/* ---------- RENDER CALENDARIO ---------- */
function renderCalendario() {
  const c = document.getElementById('calendarContent');
  if (!c) return;

  const isPartner = typeof isPartnerMode === 'function' && isPartnerMode();
  const dpp = dueDateObj();
  const preg = pregnancyStatus();

  // PARTE 1: counter gravidanza
  let html = '';
  if (!dpp) {
    if (isPartner) {
      html += `<div class="preg-card empty">
        <div class="preg-empty-text">La data presunta del parto non è ancora stata impostata.</div>
      </div>`;
    } else {
      html += `<button class="preg-card empty" onclick="openDppPicker()">
        <div class="preg-empty-text">📅 Imposta la data presunta del parto</div>
        <div class="preg-empty-sub">per vedere settimane e traguardi</div>
      </button>`;
    }
  } else {
    const dppStr = fmtDate(dpp.getTime());
    if (preg && !preg.error) {
      const togo = preg.daysToDpp;
      const togoText = togo > 0 ? `tra ${togo} giorn${togo === 1 ? 'o' : 'i'}` : (togo === 0 ? 'è oggi!' : `${Math.abs(togo)} giorn${Math.abs(togo)===1?'o':'i'} fa`);
      const progressPct = Math.max(0, Math.min(100, (preg.totalDaysGest / 280) * 100));
      html += `<div class="preg-card">
        <div class="preg-week"><span class="preg-week-big">${preg.weeks}</span><span class="preg-week-plus">+${preg.days}</span></div>
        <div class="preg-phase">${preg.phase}</div>
        <div class="preg-progress"><div class="preg-progress-bar" style="width:${progressPct}%"></div></div>
        <div class="preg-foot">
          <span>DPP: ${dppStr}</span>
          <span>${togoText}</span>
        </div>
      </div>`;
    } else {
      html += `<div class="preg-card"><div class="preg-foot">DPP: ${dppStr}</div></div>`;
    }
  }

  // PARTE 2: navigazione mensile
  const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const cur = new Date(calCursor.getFullYear(), calCursor.getMonth(), 1);
  html += `
    <div class="cal-nav">
      <button class="cal-nav-btn" onclick="calPrevMonth()" aria-label="mese precedente">‹</button>
      <div class="cal-nav-title">${monthNames[cur.getMonth()]} ${cur.getFullYear()}</div>
      <button class="cal-nav-btn" onclick="calNextMonth()" aria-label="mese successivo">›</button>
    </div>`;

  // PARTE 3: griglia mensile
  const today = new Date(); today.setHours(0,0,0,0);
  const todayKey = calDayKey(today);
  const days = calMonthDays(cur);
  html += `<div class="cal-grid">`;
  html += `<div class="cal-dow">L</div><div class="cal-dow">M</div><div class="cal-dow">M</div><div class="cal-dow">G</div><div class="cal-dow">V</div><div class="cal-dow">S</div><div class="cal-dow">D</div>`;
  days.forEach(d => {
    const key = calDayKey(d.date);
    const isToday = key === todayKey;
    const isSelected = key === calSelectedDate;
    const dots = calDayHasData(key);
    const classes = [
      'cal-day',
      !d.inMonth ? 'out' : '',
      isToday ? 'today' : '',
      isSelected ? 'selected' : ''
    ].filter(Boolean).join(' ');
    let dotsHtml = '';
    if (dots.meals) dotsHtml += '<span class="cal-dot meals"></span>';
    if (dots.meas) dotsHtml += '<span class="cal-dot meas"></span>';
    if (dots.appts) dotsHtml += '<span class="cal-dot appts"></span>';
    html += `<button class="${classes}" onclick="calSelectDay('${key}')">
      <span class="cal-day-num">${d.date.getDate()}</span>
      <span class="cal-day-dots">${dotsHtml}</span>
    </button>`;
  });
  html += `</div>`;
  html += `<div class="cal-legend">
    <span><span class="cal-dot meals"></span> pasti</span>
    <span><span class="cal-dot meas"></span> misurazioni</span>
    <span><span class="cal-dot appts"></span> appuntamenti</span>
  </div>`;

  // PARTE 4: prossimi appuntamenti
  const upcoming = (DATA.appointments || [])
    .filter(a => new Date(a.date).getTime() >= today.getTime())
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4);

  html += `<div class="card-eyebrow eb-spaced">prossimi appuntamenti</div>`;
  if (upcoming.length === 0) {
    html += `<div class="appt-empty">Nessun appuntamento in programma.</div>`;
  } else {
    upcoming.forEach(a => {
      html += renderApptCard(a, !isPartner);
    });
  }
  if (!isPartner) {
    html += `<button class="add-appt-btn" onclick="openApptForm()">+ aggiungi appuntamento</button>`;
  }

  c.innerHTML = html;
}

function renderApptCard(a, editable) {
  const d = new Date(a.date);
  const dayLabel = fmtDateShort(d);
  const timeLabel = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dD = new Date(d); dD.setHours(0,0,0,0);
  let when = dayLabel;
  if (dD.getTime() === today.getTime()) when = 'oggi';
  else if (dD.getTime() === tomorrow.getTime()) when = 'domani';
  const locHtml = a.location ? `<div class="appt-loc">📍 ${escapeHtml(a.location)}</div>` : '';
  const noteHtml = a.note ? `<div class="appt-note">"${escapeHtml(a.note)}"</div>` : '';
  const actions = editable
    ? `<div class="appt-actions">
        <button class="appt-action" onclick="downloadIcs('${a.id}')">📅 al Calendario</button>
        <button class="appt-action edit" onclick="openApptForm('${a.id}')">modifica</button>
       </div>`
    : '';
  return `<div class="appt-card">
    <div class="appt-when">
      <div class="appt-when-day">${when}</div>
      <div class="appt-when-time">${timeLabel}</div>
    </div>
    <div class="appt-body">
      <div class="appt-title">${escapeHtml(a.title)}</div>
      ${locHtml}${noteHtml}
      ${actions}
    </div>
  </div>`;
}

/* ---------- NAVIGAZIONE MESE ---------- */
function calPrevMonth() {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1);
  renderCalendario();
}
function calNextMonth() {
  calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1);
  renderCalendario();
}

/* ---------- SELEZIONE GIORNO ---------- */
function calSelectDay(dayKey) {
  calSelectedDate = dayKey;
  openDayView(dayKey);
}

/* ---------- VISTA GIORNO (sheet) ---------- */
function openDayView(dayKey) {
  const parts = dayKey.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  const today = new Date(); today.setHours(0,0,0,0);
  const isFuture = d.getTime() > today.getTime();
  const isPast = d.getTime() < today.getTime();
  const isPartner = typeof isPartnerMode === 'function' && isPartnerMode();

  const D = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
  const M = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  let title = `${D[d.getDay()]} ${d.getDate()} ${M[d.getMonth()]}`;
  if (d.getTime() === today.getTime()) title = `oggi · ${d.getDate()} ${M[d.getMonth()]}`;

  document.getElementById('sheetTitle').textContent = title;
  document.getElementById('sheetSub').textContent = isFuture ? 'futuro' : (isPast ? 'passato' : 'oggi');

  // raccolgo entries del giorno
  const meals = DATA.meals.filter(x => dateOf(x.ts) === dayKey).sort((a,b) => a.ts - b.ts);
  const meas = DATA.measurements.filter(x => dateOf(x.ts) === dayKey).sort((a,b) => a.ts - b.ts);
  const appts = (DATA.appointments || []).filter(a => calDayKey(new Date(a.date)) === dayKey).sort((a,b) => new Date(a.date) - new Date(b.date));

  const isEmpty = appts.length === 0 && meals.length === 0 && meas.length === 0;
  let html = '';

  // APPUNTAMENTI
  if (appts.length > 0) {
    html += `<div class="day-section-title">Appuntamenti</div>`;
    appts.forEach(a => { html += renderApptCard(a, !isPartner); });
  }

  // PASTI
  if (meals.length > 0) {
    html += `<div class="day-section-title">Pasti</div>`;
    meals.forEach(m => {
      const slot = SLOT_BY_ID[m.mealId];
      const time = fmtTime(m.ts);
      let itemsText = '';
      if (m.items && m.items.length) {
        itemsText = m.items.map(it => {
          if (it.custom) return `${it.custom.name} (${it.qty}${it.custom.unit})`;
          const f = FOOD_BY_ID[it.foodId];
          return f ? `${f.name} (${it.qty}${f.unit})` : '';
        }).filter(Boolean).join(' · ');
      }
      const noteHtml = m.note ? `<div class="day-meal-note">"${escapeHtml(m.note)}"</div>` : '';
      const editBtn = !isPartner
        ? `<button class="day-card-edit" onclick="openMealEditFromCalendar('${m.id}','${dayKey}')">modifica</button>`
        : '';
      html += `<div class="day-meal-card">
        <div class="day-meal-head">
          <span class="day-meal-name">${slot ? slot.name : 'pasto'}</span>
          <span class="day-meal-time">${time}</span>
        </div>
        ${itemsText ? `<div class="day-meal-items">${escapeHtml(itemsText)}</div>` : ''}
        ${noteHtml}
        ${editBtn}
      </div>`;
    });
  }

  // MISURAZIONI
  if (meas.length > 0) {
    html += `<div class="day-section-title">Misurazioni</div>`;
    const skLabel = { digiuno:'a digiuno', colazione:'dopo colazione', pranzo:'dopo pranzo', cena:'dopo cena' };
    meas.forEach(m => {
      const time = fmtTime(m.ts);
      let lbl, valTxt;
      if (m.kind === 'glicemia') {
        const sk = skLabel[m.subkind] || 'glicemia';
        const tg = m.timing ? ` (${m.timing}h)` : '';
        lbl = sk + tg;
        valTxt = `${m.value} <span class="day-meas-unit">mg/dL</span>`;
      } else if (m.kind === 'pressione') {
        lbl = 'pressione';
        valTxt = `${m.value}/${m.value2} <span class="day-meas-unit">mmHg</span>`;
      } else if (m.kind === 'peso') {
        lbl = 'peso';
        valTxt = `${m.value} <span class="day-meas-unit">kg</span>`;
      } else {
        lbl = 'chetoni';
        valTxt = ketoLabel(m.value);
      }
      const noteHtml = m.note ? `<div class="day-meas-note">"${escapeHtml(m.note)}"</div>` : '';
      const editBtn = !isPartner
        ? `<button class="day-card-edit" onclick="openMeasForm('${m.id}','${dayKey}')">modifica</button>`
        : '';
      html += `<div class="day-meas-card">
        <div class="day-meas-head">
          <div>
            <div class="day-meas-label">${lbl}</div>
            <div class="day-meas-time">${time}</div>
          </div>
          <div class="day-meas-val">${valTxt}</div>
        </div>
        ${noteHtml}
        ${editBtn}
      </div>`;
    });
  }

  if (isEmpty) {
    html += `<div class="day-empty">Nessuna registrazione per questo giorno.</div>`;
  }

  // BOTTONI AGGIUNGI (solo se non partner)
  if (!isPartner) {
    if (isEmpty) {
      // Giorno vuoto: 4 scorciatoie misurazioni + pasto + appuntamento
      html += `<div class="day-section-title">aggiungi a questo giorno</div>
        <div class="day-quick-grid">
          <button class="day-quick" onclick="openMeasForm(null,'${dayKey}','glicemia')">
            <span class="day-quick-ico">🩸</span><span>Glicemia</span>
          </button>
          <button class="day-quick" onclick="openMeasForm(null,'${dayKey}','chetoni')">
            <span class="day-quick-ico">🧪</span><span>Chetoni</span>
          </button>
          <button class="day-quick" onclick="openMeasForm(null,'${dayKey}','pressione')">
            <span class="day-quick-ico">💗</span><span>Pressione</span>
          </button>
          <button class="day-quick" onclick="openMeasForm(null,'${dayKey}','peso')">
            <span class="day-quick-ico">⚖️</span><span>Peso</span>
          </button>
          <button class="day-quick" onclick="openMealEditFromCalendar(null,'${dayKey}')">
            <span class="day-quick-ico">🍽️</span><span>Pasto</span>
          </button>
          <button class="day-quick" onclick="closeSheet(); setTimeout(() => openApptForm(null,'${dayKey}'),250);">
            <span class="day-quick-ico">📅</span><span>Appuntamento</span>
          </button>
        </div>`;
    } else {
      // Giorno con dati: due bottoni + appuntamento
      html += `<div class="day-add-row">
        <button class="day-add-mini" onclick="openMeasMenu('${dayKey}')">+ misurazione</button>
        <button class="day-add-mini" onclick="openMealEditFromCalendar(null,'${dayKey}')">+ pasto</button>
      </div>
      <button class="add-appt-btn" onclick="closeSheet(); setTimeout(() => openApptForm(null,'${dayKey}'),250);">+ aggiungi appuntamento</button>`;
    }
  }

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

/* ---------- MENU "scegli tipo misurazione" (quando il giorno ha già dati) ---------- */
function openMeasMenu(dayKey) {
  const html = `
    <div class="day-section-title">Che tipo di misurazione?</div>
    <div class="day-quick-grid">
      <button class="day-quick" onclick="openMeasForm(null,'${dayKey}','glicemia')">
        <span class="day-quick-ico">🩸</span><span>Glicemia</span>
      </button>
      <button class="day-quick" onclick="openMeasForm(null,'${dayKey}','chetoni')">
        <span class="day-quick-ico">🧪</span><span>Chetoni</span>
      </button>
      <button class="day-quick" onclick="openMeasForm(null,'${dayKey}','pressione')">
        <span class="day-quick-ico">💗</span><span>Pressione</span>
      </button>
      <button class="day-quick" onclick="openMeasForm(null,'${dayKey}','peso')">
        <span class="day-quick-ico">⚖️</span><span>Peso</span>
      </button>
    </div>
    <button class="day-add-mini" style="width:100%;margin-top:8px" onclick="openDayView('${dayKey}')">‹ indietro</button>`;
  document.getElementById('sheetTitle').textContent = 'Aggiungi misurazione';
  document.getElementById('sheetSub').textContent = formatDateLong(dayKey);
  document.getElementById('sheetBody').innerHTML = html;
}

function formatDateLong(dayKey) {
  const parts = dayKey.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  const D = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
  const M = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  return `${D[d.getDay()]} ${d.getDate()} ${M[d.getMonth()]}`;
}

/* ---------- FORM MISURAZIONE (nuovo o edit, contestualizzato a un giorno) ---------- */
function openMeasForm(measId, dayKey, kindIfNew) {
  // measId === null → nuovo, useremo kindIfNew
  // measId valido → edit, recupero kind da DATA
  let m = null;
  let kind = kindIfNew;
  if (measId) {
    m = (DATA.measurements || []).find(x => x.id === measId);
    if (m) kind = m.kind;
  }
  if (!kind) return;

  const isNew = !m;
  const title = isNew ? `Aggiungi ${kind}` : `Modifica ${kind}`;
  document.getElementById('sheetTitle').textContent = title;
  document.getElementById('sheetSub').textContent = formatDateLong(dayKey);

  // Costruisco form in base al kind
  let body = '';
  if (kind === 'glicemia') {
    body = renderGlucForm(m, dayKey);
  } else if (kind === 'chetoni') {
    body = renderKetoForm(m, dayKey);
  } else if (kind === 'pressione') {
    body = renderBpForm(m, dayKey);
  } else if (kind === 'peso') {
    body = renderWeightForm(m, dayKey);
  }

  document.getElementById('sheetBody').innerHTML = body;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');

  // Salvo stato per il salvataggio
  window._editingMeas = { id: measId, dayKey, kind, isNew };
}

function renderGlucForm(m, dayKey) {
  const subkinds = [
    { id: 'digiuno', label: 'A digiuno', defH: 8 },
    { id: 'colazione', label: 'Dopo colazione', defH: 9 },
    { id: 'pranzo', label: 'Dopo pranzo', defH: 14 },
    { id: 'cena', label: 'Dopo cena', defH: 21 }
  ];
  const curSub = m ? m.subkind : 'digiuno';
  const curTiming = m ? (m.timing || 1) : 1;
  const curVal = m ? m.value : '';
  const curNote = m ? (m.note || '') : '';
  const curTime = m ? fmtTime(m.ts) : '08:00';

  let subkindRadios = subkinds.map(s =>
    `<label class="form-radio${s.id === curSub ? ' active' : ''}">
       <input type="radio" name="glucSub" value="${s.id}" ${s.id === curSub ? 'checked' : ''} onchange="updateGlucDefaultTime()">
       ${s.label}
     </label>`).join('');

  return `
    <div class="meas-form">
      <label class="form-label">Quando</label>
      <div class="form-radio-grid">${subkindRadios}</div>

      <div class="form-row" id="glucTimingRow">
        <div>
          <label class="form-label">Timing</label>
          <div class="form-radio-row">
            <label class="form-radio-pill${curTiming === 1 ? ' active' : ''}">
              <input type="radio" name="glucTiming" value="1" ${curTiming === 1 ? 'checked' : ''}>1h
            </label>
            <label class="form-radio-pill${curTiming === 2 ? ' active' : ''}">
              <input type="radio" name="glucTiming" value="2" ${curTiming === 2 ? 'checked' : ''}>2h
            </label>
          </div>
        </div>
        <div>
          <label class="form-label">Ora</label>
          <input type="time" id="glucTime" class="appt-input" value="${curTime}">
        </div>
      </div>

      <label class="form-label">Valore (mg/dL)</label>
      <input type="number" id="glucValueEdit" class="appt-input" inputmode="numeric" min="20" max="600" value="${curVal}">

      <label class="form-label">Nota (opzionale)</label>
      <textarea id="glucNoteEdit" class="appt-input" rows="2" maxlength="500">${escapeHtml(curNote)}</textarea>

      <div class="meas-form-actions">
        ${m ? `<button class="appt-form-del" onclick="deleteMeasFromForm()">Elimina</button>` : ''}
        <button class="appt-form-save" onclick="saveMeasFromForm()">Salva</button>
      </div>
    </div>`;
}

function updateGlucDefaultTime() {
  // se è nuovo, aggiorna l'ora di default in base al subkind scelto
  if (!window._editingMeas || !window._editingMeas.isNew) return;
  const sel = document.querySelector('input[name="glucSub"]:checked');
  if (!sel) return;
  const map = { digiuno: '08:00', colazione: '09:00', pranzo: '14:00', cena: '21:00' };
  const t = document.getElementById('glucTime');
  if (t) t.value = map[sel.value] || t.value;
  // anche pill timing: digiuno non ha timing, gli altri default 1h
  const row = document.getElementById('glucTimingRow');
  if (sel.value === 'digiuno') {
    row.querySelectorAll('.form-radio-pill').forEach(p => p.style.display = 'none');
  } else {
    row.querySelectorAll('.form-radio-pill').forEach(p => p.style.display = '');
  }
  // aggiorno style active radio
  document.querySelectorAll('.form-radio').forEach(r => r.classList.remove('active'));
  sel.parentElement.classList.add('active');
}

function renderKetoForm(m, dayKey) {
  const curVal = m ? m.value : null;
  const curNote = m ? (m.note || '') : '';
  const curTime = m ? fmtTime(m.ts) : '08:00';
  const choices = [
    { v: 0, lbl: 'Negativo' },
    { v: 5, lbl: 'Tracce' },
    { v: 15, lbl: '+' },
    { v: 40, lbl: '++' },
    { v: 80, lbl: '+++' },
    { v: 160, lbl: '++++' }
  ];
  const pills = choices.map(c =>
    `<button class="form-radio-pill${c.v === curVal ? ' active' : ''}" type="button" onclick="selectKetoEdit(${c.v}, this)">${c.lbl}</button>`
  ).join('');
  return `
    <div class="meas-form">
      <label class="form-label">Ora</label>
      <input type="time" id="ketoTime" class="appt-input" value="${curTime}">

      <label class="form-label">Risultato strisce</label>
      <div class="form-radio-row" id="ketoChoices">${pills}</div>
      <input type="hidden" id="ketoValueEdit" value="${curVal != null ? curVal : ''}">

      <label class="form-label">Nota (opzionale)</label>
      <textarea id="ketoNoteEdit" class="appt-input" rows="2" maxlength="500">${escapeHtml(curNote)}</textarea>

      <div class="meas-form-actions">
        ${m ? `<button class="appt-form-del" onclick="deleteMeasFromForm()">Elimina</button>` : ''}
        <button class="appt-form-save" onclick="saveMeasFromForm()">Salva</button>
      </div>
    </div>`;
}

function selectKetoEdit(v, btn) {
  document.querySelectorAll('#ketoChoices .form-radio-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ketoValueEdit').value = v;
}

function renderBpForm(m, dayKey) {
  const curSys = m ? m.value : '';
  const curDia = m ? m.value2 : '';
  const curNote = m ? (m.note || '') : '';
  const curTime = m ? fmtTime(m.ts) : '08:00';
  return `
    <div class="meas-form">
      <label class="form-label">Ora</label>
      <input type="time" id="bpTimeEdit" class="appt-input" value="${curTime}">

      <div class="form-row">
        <div>
          <label class="form-label">Massima</label>
          <input type="number" id="bpSysEdit" class="appt-input" inputmode="numeric" min="60" max="220" value="${curSys}">
        </div>
        <div>
          <label class="form-label">Minima</label>
          <input type="number" id="bpDiaEdit" class="appt-input" inputmode="numeric" min="40" max="140" value="${curDia}">
        </div>
      </div>

      <label class="form-label">Nota (opzionale)</label>
      <textarea id="bpNoteEdit" class="appt-input" rows="2" maxlength="500">${escapeHtml(curNote)}</textarea>

      <div class="meas-form-actions">
        ${m ? `<button class="appt-form-del" onclick="deleteMeasFromForm()">Elimina</button>` : ''}
        <button class="appt-form-save" onclick="saveMeasFromForm()">Salva</button>
      </div>
    </div>`;
}

function renderWeightForm(m, dayKey) {
  const curVal = m ? m.value : '';
  const curNote = m ? (m.note || '') : '';
  const curTime = m ? fmtTime(m.ts) : '08:00';
  return `
    <div class="meas-form">
      <label class="form-label">Ora</label>
      <input type="time" id="wTimeEdit" class="appt-input" value="${curTime}">

      <label class="form-label">Peso (kg)</label>
      <input type="number" id="wValueEdit" class="appt-input" inputmode="decimal" min="30" max="200" step="0.1" value="${curVal}">

      <label class="form-label">Nota (opzionale)</label>
      <textarea id="wNoteEdit" class="appt-input" rows="2" maxlength="500">${escapeHtml(curNote)}</textarea>

      <div class="meas-form-actions">
        ${m ? `<button class="appt-form-del" onclick="deleteMeasFromForm()">Elimina</button>` : ''}
        <button class="appt-form-save" onclick="saveMeasFromForm()">Salva</button>
      </div>
    </div>`;
}

/* ---------- SAVE / DELETE MISURAZIONE ---------- */
function buildTimestamp(dayKey, timeStr) {
  // Costruisco timestamp dal dayKey + HH:MM
  const parts = dayKey.split('-');
  const t = (timeStr || '08:00').split(':');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]),
                     parseInt(t[0]) || 0, parseInt(t[1]) || 0, 0, 0);
  return d.getTime();
}

function saveMeasFromForm() {
  const ctx = window._editingMeas;
  if (!ctx) return;
  const { id, dayKey, kind, isNew } = ctx;

  let rec = null;
  if (kind === 'glicemia') {
    const sub = document.querySelector('input[name="glucSub"]:checked')?.value || 'digiuno';
    const timing = parseInt(document.querySelector('input[name="glucTiming"]:checked')?.value || '1');
    const time = document.getElementById('glucTime').value;
    const val = parseInt(document.getElementById('glucValueEdit').value);
    const note = document.getElementById('glucNoteEdit').value.trim();
    if (isNaN(val)) { toast('Manca il valore'); return; }
    rec = {
      kind: 'glicemia',
      subkind: sub,
      timing: sub === 'digiuno' ? null : timing,
      value: val,
      note,
      ts: buildTimestamp(dayKey, time)
    };
  } else if (kind === 'chetoni') {
    const v = document.getElementById('ketoValueEdit').value;
    if (v === '' || v == null) { toast('Scegli un risultato'); return; }
    const time = document.getElementById('ketoTime').value;
    const note = document.getElementById('ketoNoteEdit').value.trim();
    rec = {
      kind: 'chetoni',
      subkind: 'mattina',
      value: parseInt(v),
      note,
      ts: buildTimestamp(dayKey, time)
    };
  } else if (kind === 'pressione') {
    const sys = parseInt(document.getElementById('bpSysEdit').value);
    const dia = parseInt(document.getElementById('bpDiaEdit').value);
    if (isNaN(sys) || isNaN(dia)) { toast('Mancano valori'); return; }
    const time = document.getElementById('bpTimeEdit').value;
    const note = document.getElementById('bpNoteEdit').value.trim();
    rec = {
      kind: 'pressione',
      value: sys, value2: dia,
      note,
      ts: buildTimestamp(dayKey, time)
    };
  } else if (kind === 'peso') {
    const val = parseFloat(document.getElementById('wValueEdit').value);
    if (isNaN(val) || val <= 0) { toast('Peso non valido'); return; }
    const time = document.getElementById('wTimeEdit').value;
    const note = document.getElementById('wNoteEdit').value.trim();
    rec = {
      kind: 'peso',
      value: val,
      note,
      ts: buildTimestamp(dayKey, time)
    };
  }

  if (!rec) return;

  if (isNew) {
    rec.id = uid();
    DATA.measurements.push(rec);
    saveData();
    if (typeof syncPushMeasurement === 'function') syncPushMeasurement(rec);
    toast('Aggiunta');
  } else {
    const ix = DATA.measurements.findIndex(x => x.id === id);
    if (ix >= 0) {
      rec.id = id;
      DATA.measurements[ix] = rec;
      saveData();
      if (typeof syncPushMeasurement === 'function') syncPushMeasurement(rec);
      toast('Aggiornata');
    }
  }
  window._editingMeas = null;
  // ritorno alla vista giorno
  openDayView(dayKey);
  // aggiorno calendario dietro
  if (typeof renderCalendario === 'function') renderCalendario();
}

function deleteMeasFromForm() {
  const ctx = window._editingMeas;
  if (!ctx || !ctx.id) return;
  showConfirm('Cancellare questa misurazione?', 'L\'azione non si può annullare.', () => {
    DATA.measurements = DATA.measurements.filter(x => x.id !== ctx.id);
    saveData();
    if (typeof syncDeleteMeasurement === 'function') syncDeleteMeasurement(ctx.id);
    window._editingMeas = null;
    toast('Cancellata');
    openDayView(ctx.dayKey);
    if (typeof renderCalendario === 'function') renderCalendario();
  });
}

/* ---------- MODIFICA PASTI DA CALENDARIO ---------- */
function openMealEditFromCalendar(mealId, dayKey) {
  // Se mealId è null → devo prima far scegliere lo slot
  if (!mealId) {
    openMealSlotChooser(dayKey);
    return;
  }
  // Cerco il meal
  const meal = DATA.meals.find(m => m.id === mealId);
  if (!meal) return;
  const slot = SLOT_BY_ID[meal.mealId];
  openMealEdit(meal, dayKey, slot ? slot.id : meal.mealId);
}

function openMealSlotChooser(dayKey) {
  const existing = DATA.meals.filter(m => dateOf(m.ts) === dayKey);
  const existingIds = new Set(existing.map(m => m.mealId));
  const pills = SLOTS.map(s => {
    const used = existingIds.has(s.id);
    if (used) {
      // Se esiste già, tap apre per modifica
      const existingMeal = existing.find(m => m.mealId === s.id);
      return `<button class="day-quick" onclick="openMealEditFromCalendar('${existingMeal.id}','${dayKey}')">
        <span class="day-quick-ico">${s.icon}</span><span>${s.name} ✓</span>
      </button>`;
    }
    return `<button class="day-quick" onclick="openMealEdit(null,'${dayKey}','${s.id}')">
      <span class="day-quick-ico">${s.icon}</span><span>${s.name}</span>
    </button>`;
  }).join('');
  document.getElementById('sheetTitle').textContent = 'Quale pasto?';
  document.getElementById('sheetSub').textContent = formatDateLong(dayKey);
  document.getElementById('sheetBody').innerHTML = `
    <div class="day-section-title">Scegli il pasto da aggiungere o modificare</div>
    <div class="day-quick-grid">${pills}</div>
    <button class="day-add-mini" style="width:100%;margin-top:8px" onclick="openDayView('${dayKey}')">‹ indietro</button>`;
}

function openMealEdit(meal, dayKey, slotId) {
  // Imposto stato per il modulo meals.js, ma in modalità "contestualizzata"
  const slot = SLOT_BY_ID[slotId];
  if (!slot) return;
  currentMeal = slotId;
  currentItems = meal && meal.items ? JSON.parse(JSON.stringify(meal.items)) : [];
  currentNote = meal && meal.note ? String(meal.note) : '';

  // Salvo contesto: stiamo modificando un meal di un giorno specifico
  window._editingMealCtx = {
    mealId: meal ? meal.id : null,
    dayKey,
    slotId,
    ts: meal ? meal.ts : buildTimestamp(dayKey, slot.time.split('-')[0] || '12:00')
  };

  document.getElementById('sheetTitle').textContent = (meal ? 'Modifica ' : 'Aggiungi ') + slot.name;
  document.getElementById('sheetSub').textContent = formatDateLong(dayKey);

  renderMealEditBody();
}

function renderMealEditBody() {
  const ctx = window._editingMealCtx;
  if (!ctx) return;
  const slot = SLOT_BY_ID[ctx.slotId];

  // Costruisco markup simile a renderMealDetail ma standalone
  let html = '<div class="meal-edit-from-cal">';

  // Lista alimenti
  if (currentItems.length > 0) {
    html += `<div class="meal-items">`;
    currentItems.forEach((it, idx) => {
      if (it.custom) {
        html += `<div class="meal-item">
          <div class="meal-item-main">
            <div class="meal-item-name">${escapeHtml(it.custom.name)} <span class="meal-item-custom-tag">tuo</span></div>
          </div>
          <div class="meal-item-qty">
            <button class="qty-btn" onclick="adjustQtyFromCal(${idx}, -1)">−</button>
            <span class="qty-val">${it.qty}<span class="qty-unit">${escapeHtml(it.custom.unit)}</span></span>
            <button class="qty-btn" onclick="adjustQtyFromCal(${idx}, 1)">+</button>
          </div>
          <button class="meal-item-del" onclick="removeItemFromCal(${idx})">✕</button>
        </div>`;
      } else {
        const f = FOOD_BY_ID[it.foodId];
        if (!f) return;
        html += `<div class="meal-item">
          <div class="meal-item-main">
            <div class="meal-item-name">${escapeHtml(f.name)}</div>
          </div>
          <div class="meal-item-qty">
            <button class="qty-btn" onclick="adjustQtyFromCal(${idx}, -1)">−</button>
            <span class="qty-val">${it.qty}<span class="qty-unit">${f.unit}</span></span>
            <button class="qty-btn" onclick="adjustQtyFromCal(${idx}, 1)">+</button>
          </div>
          <button class="meal-item-del" onclick="removeItemFromCal(${idx})">✕</button>
        </div>`;
      }
    });
    html += `</div>`;
  } else {
    html += `<div class="empty-meal"><div class="empty-meal-emoji">🍽️</div><div>Nessun alimento per ora.</div></div>`;
  }

  // Bottone aggiungi alimento — riusa openFoodSheet
  html += `<button class="add-item-btn" onclick="openFoodSheetFromCal()">+ aggiungi alimento</button>`;

  // Nota
  html += `
    <div class="meal-note-block">
      <label class="meal-note-label">Nota</label>
      <textarea id="mealNoteFromCal" class="meal-note-textarea" maxlength="500" rows="2"
        placeholder="(opzionale)">${escapeHtml(currentNote || '')}</textarea>
    </div>`;

  // Azioni
  html += `<div class="meas-form-actions">
    ${ctx.mealId ? `<button class="appt-form-del" onclick="deleteMealFromCal()">Elimina pasto</button>` : ''}
    <button class="appt-form-save" onclick="saveMealFromCal()">Salva</button>
  </div>`;

  html += '</div>';
  document.getElementById('sheetBody').innerHTML = html;

  // Listener nota
  const nt = document.getElementById('mealNoteFromCal');
  if (nt) {
    nt.addEventListener('input', () => { currentNote = nt.value; });
  }
}

function adjustQtyFromCal(idx, sign) {
  const it = currentItems[idx];
  if (!it) return;
  if (it.custom) {
    const step = it.custom.unit === 'pz' ? 1 : 10;
    const next = it.qty + (sign * step);
    if (next < step) return;
    it.qty = next;
    renderMealEditBody();
    return;
  }
  const f = FOOD_BY_ID[it.foodId];
  if (!f) return;
  const step = f.step || 10;
  const next = it.qty + (sign * step);
  if (next < step) return;
  if (next > f.qty * 5 + step) return;
  it.qty = next;
  renderMealEditBody();
}

function removeItemFromCal(idx) {
  currentItems.splice(idx, 1);
  renderMealEditBody();
}

function openFoodSheetFromCal() {
  // Riusa openFoodSheet del modulo meals.js — quando aggiunge, fa autosave
  // ma noi vogliamo solo currentItems aggiornata. autosave è "safe" qui
  // perché currentMeal è settato e la registrazione finirà sul giorno giusto solo
  // quando saveMealFromCal viene chiamato. Però autosave salverebbe ora.
  // Per evitare side effect, lo intercetto: temporaneamente disattivo autosave.
  window._suppressAutoSave = true;
  openFoodSheet();
}

function saveMealFromCal() {
  const ctx = window._editingMealCtx;
  if (!ctx) return;
  const hasItems = currentItems.length > 0;
  const hasNote = (currentNote || '').trim().length > 0;
  if (!hasItems && !hasNote) {
    toast('Aggiungi almeno un alimento o una nota');
    return;
  }
  let recId = ctx.mealId;
  const e = {
    id: recId || uid(),
    ts: ctx.ts,
    mealId: ctx.slotId,
    items: hasItems ? JSON.parse(JSON.stringify(currentItems)) : [],
    note: hasNote ? currentNote.trim() : null
  };
  const ix = DATA.meals.findIndex(m => m.id === e.id);
  if (ix >= 0) DATA.meals[ix] = e;
  else DATA.meals.push(e);
  saveData();
  if (typeof syncPushMeal === 'function') syncPushMeal(e);
  toast(recId ? 'Pasto aggiornato' : 'Pasto aggiunto');

  // reset
  currentItems = [];
  currentNote = '';
  currentMeal = null;
  const dk = ctx.dayKey;
  window._editingMealCtx = null;
  window._suppressAutoSave = false;
  openDayView(dk);
  if (typeof renderCalendario === 'function') renderCalendario();
}

function deleteMealFromCal() {
  const ctx = window._editingMealCtx;
  if (!ctx || !ctx.mealId) return;
  showConfirm('Cancellare questo pasto?', 'L\'azione non si può annullare.', () => {
    const id = ctx.mealId;
    DATA.meals = DATA.meals.filter(m => m.id !== id);
    saveData();
    if (typeof syncDeleteMeal === 'function') syncDeleteMeal(id);
    currentItems = []; currentNote = ''; currentMeal = null;
    const dk = ctx.dayKey;
    window._editingMealCtx = null;
    window._suppressAutoSave = false;
    toast('Pasto cancellato');
    openDayView(dk);
    if (typeof renderCalendario === 'function') renderCalendario();
  });
}

/* ---------- FORM APPUNTAMENTO ---------- */
function openApptForm(apptId, prefilledDate) {
  editingApptId = apptId || null;
  let appt = null;
  if (apptId) {
    appt = (DATA.appointments || []).find(a => a.id === apptId);
  }
  const isNew = !appt;
  const now = new Date();
  let date, time;
  if (appt) {
    const d = new Date(appt.date);
    date = calDayKey(d);
    time = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  } else if (prefilledDate) {
    date = prefilledDate;
    time = '10:00';
  } else {
    date = calDayKey(now);
    time = String(now.getHours()).padStart(2,'0') + ':00';
  }

  document.getElementById('sheetTitle').textContent = isNew ? 'Nuovo appuntamento' : 'Modifica appuntamento';
  document.getElementById('sheetSub').textContent = isNew ? 'compila i campi' : appt.title;

  const html = `
    <div class="appt-form">
      <label class="appt-form-label">Titolo</label>
      <input type="text" id="apptTitle" class="appt-input" placeholder="es. Visita ginecologa" maxlength="120" value="${escapeAttr(appt?.title || '')}">

      <div class="appt-form-row">
        <div>
          <label class="appt-form-label">Data</label>
          <input type="date" id="apptDate" class="appt-input" value="${date}">
        </div>
        <div>
          <label class="appt-form-label">Ora</label>
          <input type="time" id="apptTime" class="appt-input" value="${time}">
        </div>
      </div>

      <label class="appt-form-label">Luogo (opzionale)</label>
      <input type="text" id="apptLoc" class="appt-input" placeholder="es. Ospedale di Pescara" maxlength="200" value="${escapeAttr(appt?.location || '')}">

      <label class="appt-form-label">Nota (opzionale)</label>
      <textarea id="apptNote" class="appt-input" rows="2" maxlength="500" placeholder="es. portare risultati esami">${escapeHtml(appt?.note || '')}</textarea>

      <div class="appt-form-actions">
        ${appt ? `<button class="appt-form-del" onclick="deleteAppt('${appt.id}')">Elimina</button>` : ''}
        <button class="appt-form-save" onclick="saveAppt()">${isNew ? 'Aggiungi' : 'Salva'}</button>
      </div>
    </div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function escapeAttr(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function saveAppt() {
  const title = (document.getElementById('apptTitle')?.value || '').trim();
  const date = document.getElementById('apptDate')?.value;
  const time = document.getElementById('apptTime')?.value;
  const location = (document.getElementById('apptLoc')?.value || '').trim();
  const note = (document.getElementById('apptNote')?.value || '').trim();
  if (!title) { toast('Manca il titolo'); return; }
  if (!date || !time) { toast('Manca data o ora'); return; }
  const iso = `${date}T${time}:00`;
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) { toast('Data non valida'); return; }
  const isoString = dt.toISOString();

  if (!DATA.appointments) DATA.appointments = [];
  if (editingApptId) {
    const ix = DATA.appointments.findIndex(a => a.id === editingApptId);
    if (ix >= 0) {
      DATA.appointments[ix] = { ...DATA.appointments[ix], title, date: isoString, location, note };
      saveData();
      if (typeof syncPushAppt === 'function') syncPushAppt(DATA.appointments[ix]);
      toast('Appuntamento aggiornato');
    }
  } else {
    const a = { id: uid(), title, date: isoString, location, note };
    DATA.appointments.push(a);
    saveData();
    if (typeof syncPushAppt === 'function') syncPushAppt(a);
    toast('Appuntamento aggiunto');
  }
  editingApptId = null;
  closeSheet();
  renderCalendario();
}

function deleteAppt(id) {
  showConfirm('Cancellare l\'appuntamento?', 'L\'azione non si può annullare.', () => {
    if (!DATA.appointments) DATA.appointments = [];
    const a = DATA.appointments.find(x => x.id === id);
    DATA.appointments = DATA.appointments.filter(x => x.id !== id);
    saveData();
    if (a && typeof syncDeleteAppt === 'function') syncDeleteAppt(id);
    editingApptId = null;
    closeSheet();
    renderCalendario();
    toast('Cancellato');
  });
}

/* ---------- ICS EXPORT ---------- */
function downloadIcs(apptId) {
  const a = (DATA.appointments || []).find(x => x.id === apptId);
  if (!a) return;
  const d = new Date(a.date);
  const dtStart = fmtIcsDate(d);
  const dtEnd = fmtIcsDate(new Date(d.getTime() + 60 * 60 * 1000)); // 1 ora di default
  const uid_ = 'giada-' + a.id + '@giada-app';
  const now = fmtIcsDate(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Giada//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + uid_,
    'DTSTAMP:' + now,
    'DTSTART:' + dtStart,
    'DTEND:' + dtEnd,
    'SUMMARY:' + icsEsc(a.title),
    a.location ? 'LOCATION:' + icsEsc(a.location) : null,
    a.note ? 'DESCRIPTION:' + icsEsc(a.note) : null,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + icsEsc(a.title),
    'TRIGGER:-PT1H',
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + icsEsc(a.title),
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const an = document.createElement('a');
  an.href = url;
  an.download = `${(a.title || 'appuntamento').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.ics`;
  document.body.appendChild(an); an.click(); document.body.removeChild(an);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function icsEsc(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
function fmtIcsDate(d) {
  const pad = n => String(n).padStart(2,'0');
  return d.getUTCFullYear() +
    pad(d.getUTCMonth()+1) +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + 'Z';
}

/* ---------- DPP PICKER ---------- */
function openDppPicker() {
  document.getElementById('sheetTitle').textContent = 'Data presunta del parto';
  document.getElementById('sheetSub').textContent = 'serve solo a calcolare le settimane';
  const current = SYNC.profile?.due_date || '';
  const html = `
    <div class="appt-form">
      <label class="appt-form-label">Quando è la DPP?</label>
      <input type="date" id="dppDate" class="appt-input" value="${current}">
      <div class="muted small" style="margin-top:8px">Se non la sai con certezza puoi sempre cambiarla dopo dalle Impostazioni.</div>
      <div class="appt-form-actions">
        <button class="appt-form-save" onclick="saveDpp()">Salva</button>
      </div>
    </div>`;
  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

async function saveDpp() {
  const d = document.getElementById('dppDate')?.value;
  if (!d) { toast('Manca la data'); return; }
  if (typeof syncSetDueDate === 'function') {
    await syncSetDueDate(d);
    closeSheet();
    renderCalendario();
    if (typeof renderSettings === 'function') {
      // se la sezione settings è aperta, aggiorna
      const ss = document.getElementById('settingsContent');
      if (ss && document.getElementById('sec-set').classList.contains('active')) renderSettings();
    }
    toast('DPP salvata');
  }
}

/* ---------- DATE UTIL EXTRA ---------- */
function fmtDateShort(d) {
  const M = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${d.getDate()} ${M[d.getMonth()]}`;
}
function fmtDate(ts) {
  const d = new Date(ts);
  const M = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
}
