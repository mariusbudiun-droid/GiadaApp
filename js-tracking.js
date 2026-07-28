/* KIN · Tracking (feed/sleep/diaper/growth/temperature/note) */
'use strict';

/* ---------- OPEN FORMS FROM HOME SHORTCUT ---------- */
function openQuickFeed(evId) { openEventForm('feed', evId); }
function openQuickSleep(evId) { openEventForm('sleep', evId); }
function openQuickDiaper(evId) { openEventForm('diaper', evId); }
function openQuickGrowth(evId) { openEventForm('growth', evId); }
function openQuickTemp(evId) { openEventForm('temperature', evId); }
function openQuickNote(evId) { openEventForm('note', evId); }

let editingEventId = null;

function openEventForm(kind, evId) {
  const child = getActiveChild();
  if (!child) { toast('Aggiungi prima un figlio'); return; }
  editingEventId = evId || null;
  let existing = null;
  if (evId) {
    existing = DATA.events.find(e => e.id === evId);
    if (existing) kind = existing.kind;
  }

  const kindLabels = {
    feed: 'Poppata',
    sleep: 'Sonno',
    diaper: 'Cambio',
    growth: 'Misurazione',
    temperature: 'Febbre',
    note: 'Nota',
    meds: 'Farmaco'
  };
  document.getElementById('sheetTitle').textContent = existing ? 'Modifica ' + kindLabels[kind].toLowerCase() : kindLabels[kind];
  document.getElementById('sheetSub').textContent = child.name;

  let html = '<div class="ev-form">';

  if (kind === 'feed') html += renderFeedForm(existing);
  else if (kind === 'sleep') html += renderSleepForm(existing);
  else if (kind === 'diaper') html += renderDiaperForm(existing);
  else if (kind === 'growth') html += renderGrowthForm(existing);
  else if (kind === 'temperature') html += renderTempForm(existing);
  else if (kind === 'note') html += renderNoteForm(existing);

  // Ora & data comuni a tutti
  const nowD = existing ? new Date(existing.ts) : new Date();
  const dateStr = dateOf(nowD.getTime());
  const timeStr = String(nowD.getHours()).padStart(2,'0') + ':' + String(nowD.getMinutes()).padStart(2,'0');
  html += `
    <div class="ev-form-row two">
      <div>
        <label class="ev-label">Data</label>
        <input type="date" id="evDate" class="ev-input" value="${dateStr}">
      </div>
      <div>
        <label class="ev-label">Ora</label>
        <input type="time" id="evTime" class="ev-input" value="${timeStr}">
      </div>
    </div>
    <label class="ev-label">Nota (opzionale)</label>
    <textarea id="evNote" class="ev-input" rows="2" maxlength="500">${escapeHtml(existing?.note || '')}</textarea>

    <div class="ev-actions">
      ${existing ? `<button class="ev-delete" onclick="deleteEvent('${existing.id}')">Elimina</button>` : ''}
      <button class="ev-save" onclick="saveEvent('${kind}')">${existing ? 'Salva' : 'Aggiungi'}</button>
    </div>
    </div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

/* ---------- FEED ---------- */
function renderFeedForm(ex) {
  const d = ex?.data || {};
  const type = d.type || 'breast';
  const side = d.side || 'left';
  const dur = d.duration_min || '';
  const ml = d.ml || '';
  const content = d.content || 'formula';

  return `
    <label class="ev-label">Tipo</label>
    <div class="ev-choice">
      <button type="button" class="ev-choice-btn ${type==='breast'?'selected':''}" data-t="breast" onclick="setFeedType('breast')">Seno</button>
      <button type="button" class="ev-choice-btn ${type==='bottle'?'selected':''}" data-t="bottle" onclick="setFeedType('bottle')">Biberon</button>
      <button type="button" class="ev-choice-btn ${type==='solid'?'selected':''}" data-t="solid" onclick="setFeedType('solid')">Solidi</button>
    </div>
    <input type="hidden" id="fedType" value="${type}">

    <div id="fedBreastBox" class="${type==='breast'?'':'hidden'}">
      <label class="ev-label">Da quale seno?</label>
      <div class="ev-choice">
        <button type="button" class="ev-choice-btn ${side==='left'?'selected':''}" data-s="left" onclick="setFeedSide('left')">Sinistro</button>
        <button type="button" class="ev-choice-btn ${side==='right'?'selected':''}" data-s="right" onclick="setFeedSide('right')">Destro</button>
        <button type="button" class="ev-choice-btn ${side==='both'?'selected':''}" data-s="both" onclick="setFeedSide('both')">Entrambi</button>
      </div>
      <input type="hidden" id="fedSide" value="${side}">
      <label class="ev-label">Durata (minuti)</label>
      <input type="number" id="fedDur" class="ev-input" inputmode="numeric" min="1" max="120" value="${dur}" placeholder="es. 15">
    </div>

    <div id="fedBottleBox" class="${type==='bottle'?'':'hidden'}">
      <label class="ev-label">Quantità (ml)</label>
      <input type="number" id="fedMl" class="ev-input" inputmode="numeric" min="1" max="500" value="${ml}" placeholder="es. 90">
      <label class="ev-label">Cosa</label>
      <div class="ev-choice">
        <button type="button" class="ev-choice-btn ${content==='formula'?'selected':''}" data-c="formula" onclick="setFeedContent('formula')">Formula</button>
        <button type="button" class="ev-choice-btn ${content==='breast_milk'?'selected':''}" data-c="breast_milk" onclick="setFeedContent('breast_milk')">Latte materno</button>
        <button type="button" class="ev-choice-btn ${content==='other'?'selected':''}" data-c="other" onclick="setFeedContent('other')">Altro</button>
      </div>
      <input type="hidden" id="fedContent" value="${content}">
    </div>

    <div id="fedSolidBox" class="${type==='solid'?'':'hidden'}">
      <label class="ev-label">Cosa ha mangiato</label>
      <input type="text" id="fedWhat" class="ev-input" maxlength="200" value="${escapeAttr(d.what || '')}" placeholder="es. mela grattugiata">
    </div>
  `;
}

function setFeedType(t) {
  document.getElementById('fedType').value = t;
  document.querySelectorAll('.ev-choice-btn[data-t]').forEach(b => b.classList.toggle('selected', b.dataset.t === t));
  document.getElementById('fedBreastBox').classList.toggle('hidden', t !== 'breast');
  document.getElementById('fedBottleBox').classList.toggle('hidden', t !== 'bottle');
  document.getElementById('fedSolidBox').classList.toggle('hidden', t !== 'solid');
}
function setFeedSide(s) {
  document.getElementById('fedSide').value = s;
  document.querySelectorAll('.ev-choice-btn[data-s]').forEach(b => b.classList.toggle('selected', b.dataset.s === s));
}
function setFeedContent(c) {
  document.getElementById('fedContent').value = c;
  document.querySelectorAll('.ev-choice-btn[data-c]').forEach(b => b.classList.toggle('selected', b.dataset.c === c));
}

/* ---------- SLEEP ---------- */
function renderSleepForm(ex) {
  const d = ex?.data || {};
  const status = d.status || 'ended';
  const dur = d.duration_min || '';
  return `
    <label class="ev-label">Stato</label>
    <div class="ev-choice">
      <button type="button" class="ev-choice-btn ${status==='ended'?'selected':''}" data-st="ended" onclick="setSleepStatus('ended')">Ha dormito</button>
      <button type="button" class="ev-choice-btn ${status==='ongoing'?'selected':''}" data-st="ongoing" onclick="setSleepStatus('ongoing')">Sta dormendo ora</button>
    </div>
    <input type="hidden" id="slpStatus" value="${status}">
    <div id="slpDurBox" class="${status==='ended'?'':'hidden'}">
      <label class="ev-label">Durata (minuti)</label>
      <input type="number" id="slpDur" class="ev-input" inputmode="numeric" min="1" max="1440" value="${dur}" placeholder="es. 45">
      <div class="ev-hint">L'ora sopra rappresenta quando si è svegliato/a.</div>
    </div>
    <div id="slpOngoingHint" class="${status==='ongoing'?'':'hidden'}">
      <div class="ev-hint" style="margin-top:8px">L'ora sopra rappresenta quando si è addormentato/a. Modifica dopo per registrare il risveglio.</div>
    </div>
  `;
}
function setSleepStatus(s) {
  document.getElementById('slpStatus').value = s;
  document.querySelectorAll('.ev-choice-btn[data-st]').forEach(b => b.classList.toggle('selected', b.dataset.st === s));
  document.getElementById('slpDurBox').classList.toggle('hidden', s !== 'ended');
  document.getElementById('slpOngoingHint').classList.toggle('hidden', s !== 'ongoing');
}

/* ---------- DIAPER ---------- */
function renderDiaperForm(ex) {
  const d = ex?.data || {};
  return `
    <label class="ev-label">Cosa c'era</label>
    <div class="ev-choice checks">
      <button type="button" class="ev-choice-btn ${d.pee?'selected':''}" id="dpPee" onclick="toggleDiaper('pee')">Pipì</button>
      <button type="button" class="ev-choice-btn ${d.poop?'selected':''}" id="dpPoop" onclick="toggleDiaper('poop')">Cacca</button>
    </div>
    <input type="hidden" id="dpPeeV" value="${d.pee?'1':''}">
    <input type="hidden" id="dpPoopV" value="${d.poop?'1':''}">
    <div id="dpPoopColorBox" class="${d.poop?'':'hidden'}">
      <label class="ev-label">Colore/consistenza (opzionale)</label>
      <input type="text" id="dpColor" class="ev-input" maxlength="80" value="${escapeAttr(d.color || '')}" placeholder="es. gialla morbida">
    </div>
  `;
}
function toggleDiaper(what) {
  const btn = document.getElementById('dp' + (what === 'pee' ? 'Pee' : 'Poop'));
  const hidden = document.getElementById('dp' + (what === 'pee' ? 'Pee' : 'Poop') + 'V');
  const nowSelected = !btn.classList.contains('selected');
  btn.classList.toggle('selected', nowSelected);
  hidden.value = nowSelected ? '1' : '';
  if (what === 'poop') {
    document.getElementById('dpPoopColorBox').classList.toggle('hidden', !nowSelected);
  }
}

/* ---------- GROWTH ---------- */
function renderGrowthForm(ex) {
  const d = ex?.data || {};
  return `
    <label class="ev-label">Peso (kg)</label>
    <input type="text" id="gwWeight" class="ev-input" inputmode="decimal" value="${d.weight_kg != null ? String(d.weight_kg).replace('.', ',') : ''}" placeholder="es. 4,2">
    <label class="ev-label">Altezza/lunghezza (cm)</label>
    <input type="text" id="gwHeight" class="ev-input" inputmode="decimal" value="${d.height_cm != null ? String(d.height_cm).replace('.', ',') : ''}" placeholder="es. 55">
    <label class="ev-label">Circonferenza cranica (cm) <span class="ev-hint-inline">(opzionale)</span></label>
    <input type="text" id="gwHead" class="ev-input" inputmode="decimal" value="${d.head_cm != null ? String(d.head_cm).replace('.', ',') : ''}" placeholder="es. 36">
    <div class="ev-hint">Puoi compilare solo alcuni campi.</div>
  `;
}

/* ---------- TEMPERATURE ---------- */
function renderTempForm(ex) {
  const d = ex?.data || {};
  return `
    <label class="ev-label">Temperatura (°C)</label>
    <input type="text" id="tpVal" class="ev-input" inputmode="decimal" value="${d.value_c != null ? String(d.value_c).replace('.', ',') : ''}" placeholder="es. 37,8">
    <label class="ev-label">Come misurata</label>
    <div class="ev-choice">
      <button type="button" class="ev-choice-btn ${d.method==='axillary'?'selected':''}" data-m="axillary" onclick="setTempMethod('axillary')">Ascellare</button>
      <button type="button" class="ev-choice-btn ${d.method==='rectal'?'selected':''}" data-m="rectal" onclick="setTempMethod('rectal')">Rettale</button>
      <button type="button" class="ev-choice-btn ${d.method==='ear'?'selected':''}" data-m="ear" onclick="setTempMethod('ear')">Auricolare</button>
      <button type="button" class="ev-choice-btn ${d.method==='forehead'?'selected':''}" data-m="forehead" onclick="setTempMethod('forehead')">Fronte</button>
    </div>
    <input type="hidden" id="tpMethod" value="${d.method || 'axillary'}">
  `;
}
function setTempMethod(m) {
  document.getElementById('tpMethod').value = m;
  document.querySelectorAll('.ev-choice-btn[data-m]').forEach(b => b.classList.toggle('selected', b.dataset.m === m));
}

/* ---------- NOTE ---------- */
function renderNoteForm(ex) {
  const d = ex?.data || {};
  return `
    <label class="ev-label">Cosa vuoi ricordare?</label>
    <textarea id="ntText" class="ev-input" rows="4" maxlength="2000" placeholder="Una piccola cosa, un pensiero, un evento…">${escapeHtml(d.text || '')}</textarea>
  `;
}

/* ---------- SAVE ---------- */
function saveEvent(kind) {
  const child = getActiveChild();
  if (!child) return;
  const dateStr = document.getElementById('evDate')?.value;
  const timeStr = document.getElementById('evTime')?.value || '12:00';
  if (!dateStr) { toast('Manca la data'); return; }
  const [h, m] = timeStr.split(':');
  const d = parseDateStr(dateStr);
  d.setHours(parseInt(h) || 12, parseInt(m) || 0, 0, 0);
  const ts = d.getTime();
  const note = (document.getElementById('evNote')?.value || '').trim();

  let data = {};

  if (kind === 'feed') {
    const type = document.getElementById('fedType').value;
    data.type = type;
    if (type === 'breast') {
      data.side = document.getElementById('fedSide').value;
      const dur = parseInt(document.getElementById('fedDur')?.value);
      if (!isNaN(dur)) data.duration_min = dur;
    } else if (type === 'bottle') {
      const ml = parseInt(document.getElementById('fedMl')?.value);
      if (!isNaN(ml)) data.ml = ml;
      data.content = document.getElementById('fedContent').value;
    } else if (type === 'solid') {
      const what = (document.getElementById('fedWhat')?.value || '').trim();
      if (what) data.what = what;
    }
  }
  else if (kind === 'sleep') {
    const st = document.getElementById('slpStatus').value;
    data.status = st;
    if (st === 'ended') {
      const dur = parseInt(document.getElementById('slpDur')?.value);
      if (!isNaN(dur)) data.duration_min = dur;
    }
  }
  else if (kind === 'diaper') {
    data.pee = document.getElementById('dpPeeV').value === '1';
    data.poop = document.getElementById('dpPoopV').value === '1';
    if (data.poop) {
      const col = (document.getElementById('dpColor')?.value || '').trim();
      if (col) data.color = col;
    }
    if (!data.pee && !data.poop) { toast('Segna almeno pipì o cacca'); return; }
  }
  else if (kind === 'growth') {
    const w = parseDecimalInput(document.getElementById('gwWeight')?.value);
    const h_ = parseDecimalInput(document.getElementById('gwHeight')?.value);
    const hd = parseDecimalInput(document.getElementById('gwHead')?.value);
    if (!isNaN(w)) data.weight_kg = w;
    if (!isNaN(h_)) data.height_cm = h_;
    if (!isNaN(hd)) data.head_cm = hd;
    if (Object.keys(data).length === 0) { toast('Metti almeno un valore'); return; }
  }
  else if (kind === 'temperature') {
    const v = parseDecimalInput(document.getElementById('tpVal')?.value);
    if (isNaN(v)) { toast('Manca il valore'); return; }
    data.value_c = v;
    data.method = document.getElementById('tpMethod').value;
  }
  else if (kind === 'note') {
    const t = (document.getElementById('ntText')?.value || '').trim();
    if (!t) { toast('Scrivi qualcosa'); return; }
    data.text = t;
  }

  let ev;
  if (editingEventId) {
    const ix = DATA.events.findIndex(x => x.id === editingEventId);
    if (ix >= 0) {
      ev = { ...DATA.events[ix], ts, data, note: note || undefined };
      DATA.events[ix] = ev;
    }
  } else {
    ev = {
      id: uid(),
      child_id: child.id,
      kind,
      ts,
      data,
      note: note || undefined
    };
    DATA.events.push(ev);
  }
  saveData();
  if (ev) syncPushEvent(ev);
  editingEventId = null;
  closeSheet();
  toast('Salvato');
  if (typeof renderHome === 'function') renderHome();
  if (typeof renderTracking === 'function') renderTracking();
  if (typeof renderDiary === 'function') renderDiary();
}

function deleteEvent(id) {
  showConfirm('Cancellare?', 'L\'azione non si può annullare.', () => {
    const ev = DATA.events.find(e => e.id === id);
    if (!ev) return;
    DATA.events = DATA.events.filter(e => e.id !== id);
    saveData();
    syncDeleteEvent(ev.child_id, id);
    editingEventId = null;
    closeSheet();
    toast('Cancellato');
    if (typeof renderHome === 'function') renderHome();
    if (typeof renderTracking === 'function') renderTracking();
    if (typeof renderDiary === 'function') renderDiary();
  });
}

/* ---------- RENDER TRACKING TAB ---------- */
function renderTracking() {
  const c = document.getElementById('trackingContent');
  if (!c) return;
  const child = getActiveChild();
  if (!child) {
    c.innerHTML = renderEmptyHome();
    return;
  }

  let html = '';
  html += renderChildSwitcher();
  html += `<div class="hdr-block">
    <div class="hdr-eyebrow">tracking</div>
    <h1 class="hdr-title">${escapeHtml(child.name)}</h1>
  </div>`;

  // Filtro tipi — diverso in base all'età
  const infantMode = isInfantChild(child);
  const kinds = infantMode
    ? [
        { key: 'all', label: 'Tutto' },
        { key: 'feed', label: 'Poppate' },
        { key: 'sleep', label: 'Sonno' },
        { key: 'diaper', label: 'Cambi' },
        { key: 'growth', label: 'Crescita' },
        { key: 'temperature', label: 'Febbre' }
      ]
    : [
        { key: 'all', label: 'Tutto' },
        { key: 'growth', label: 'Crescita' },
        { key: 'temperature', label: 'Febbre' },
        { key: 'note', label: 'Note' }
      ];
  let filterKind = window.__trackingFilter || 'all';
  if (!kinds.some(k => k.key === filterKind)) {
    filterKind = 'all';
    window.__trackingFilter = 'all';
  }
  html += `<div class="tk-filter">`;
  kinds.forEach(k => {
    html += `<button class="tk-filter-btn ${filterKind===k.key?'active':''}" onclick="setTrackingFilter('${k.key}')">${k.label}</button>`;
  });
  html += `</div>`;

  // Lista eventi ordinata desc
  let list = eventsForChild(child.id).slice().sort((a,b) => b.ts - a.ts);
  if (filterKind !== 'all') list = list.filter(e => e.kind === filterKind);

  if (list.length === 0) {
    html += `<div class="empty-card"><div class="empty-text">Ancora niente da mostrare.</div></div>`;
  } else {
    // raggruppa per data
    const byDay = {};
    list.forEach(e => {
      const k = dateOf(e.ts);
      (byDay[k] = byDay[k] || []).push(e);
    });
    Object.keys(byDay).sort((a,b) => b.localeCompare(a)).forEach(dayKey => {
      const d = parseDateStr(dayKey);
      const today = todayStr();
      const yesterday = dateOf(Date.now() - 86400000);
      let label;
      if (dayKey === today) label = 'oggi';
      else if (dayKey === yesterday) label = 'ieri';
      else label = fmtDateLong(d);
      html += `<div class="tk-day-eyebrow">${label}</div>`;
      byDay[dayKey].forEach(e => {
        html += renderTrackingRow(e);
      });
    });
  }

  c.innerHTML = html;
}

function setTrackingFilter(k) {
  window.__trackingFilter = k;
  renderTracking();
}

function renderTrackingRow(e) {
  const time = fmtTime(e.ts);
  let icon = '📝', label = e.kind, desc = '';
  if (e.kind === 'feed') { icon = '🍼'; label = 'Poppata'; desc = describeFeed(e); }
  else if (e.kind === 'sleep') { icon = '💤'; label = 'Sonno'; desc = describeSleep(e); }
  else if (e.kind === 'diaper') { icon = '👶'; label = 'Cambio'; desc = describeDiaper(e); }
  else if (e.kind === 'growth') {
    icon = '📏'; label = 'Crescita';
    const parts = [];
    if (e.data?.weight_kg) parts.push(`${e.data.weight_kg} kg`);
    if (e.data?.height_cm) parts.push(`${e.data.height_cm} cm`);
    if (e.data?.head_cm) parts.push(`testa ${e.data.head_cm} cm`);
    desc = parts.join(' · ');
  }
  else if (e.kind === 'temperature') {
    icon = '🌡️'; label = 'Febbre';
    desc = `${e.data?.value_c}°C${e.data?.method ? ' (' + methodLabel(e.data.method) + ')' : ''}`;
  }
  else if (e.kind === 'note') { icon = '📝'; label = 'Nota'; desc = (e.data?.text || '').slice(0, 100); }

  const noteHtml = e.note ? `<div class="tk-row-note">"${escapeHtml(e.note)}"</div>` : '';

  return `<div class="tk-row" onclick="openEventForm('${e.kind}', '${e.id}')">
    <div class="tk-row-icon">${icon}</div>
    <div class="tk-row-body">
      <div class="tk-row-head">
        <span class="tk-row-label">${label}</span>
        <span class="tk-row-time">${time}</span>
      </div>
      <div class="tk-row-desc">${escapeHtml(desc)}</div>
      ${noteHtml}
    </div>
  </div>`;
}

function methodLabel(m) {
  return {
    axillary:'ascellare', rectal:'rettale', ear:'auricolare', forehead:'fronte'
  }[m] || m;
}

/* ---------- SHEET CLOSE ---------- */
function closeSheet() {
  document.getElementById('sheetOverlay')?.classList.remove('open');
  document.getElementById('sheet')?.classList.remove('open');
}
