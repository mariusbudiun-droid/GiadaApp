/* KIN · Salute
   Tab con 4 sotto-sezioni: Vaccini, Crescita, Appuntamenti, Farmaci/Sintomi
   ========================================================= */
'use strict';

let currentHealthTab = 'vaccini'; // 'vaccini' | 'crescita' | 'denti' | 'primevolte' | 'appuntamenti' | 'farmaci'

function renderHealth() {
  const c = document.getElementById('healthContent');
  if (!c) return;
  const child = getActiveChild();
  if (!child) { c.innerHTML = renderEmptyHome(); return; }

  let html = '';
  html += renderChildSwitcher();
  html += `<div class="hdr-block">
    <div class="hdr-eyebrow">salute</div>
    <h1 class="hdr-title">${escapeHtml(child.name)}</h1>
  </div>`;

  html += `<div class="health-tabs">
    <button class="health-tab ${currentHealthTab==='vaccini'?'active':''}" onclick="setHealthTab('vaccini')">Vaccini</button>
    <button class="health-tab ${currentHealthTab==='crescita'?'active':''}" onclick="setHealthTab('crescita')">Crescita</button>
    <button class="health-tab ${currentHealthTab==='denti'?'active':''}" onclick="setHealthTab('denti')">Denti</button>
    <button class="health-tab ${currentHealthTab==='primevolte'?'active':''}" onclick="setHealthTab('primevolte')">Prime volte</button>
    <button class="health-tab ${currentHealthTab==='appuntamenti'?'active':''}" onclick="setHealthTab('appuntamenti')">Appuntamenti</button>
    <button class="health-tab ${currentHealthTab==='farmaci'?'active':''}" onclick="setHealthTab('farmaci')">Farmaci</button>
  </div>`;

  if (currentHealthTab === 'vaccini') html += renderVaccineSection(child);
  else if (currentHealthTab === 'crescita') html += renderGrowthSection(child);
  else if (currentHealthTab === 'denti') html += renderTeethSection(child);
  else if (currentHealthTab === 'primevolte') html += renderFirstsSection(child);
  else if (currentHealthTab === 'appuntamenti') html += renderAppointmentsSection(child);
  else if (currentHealthTab === 'farmaci') html += renderMedsSection(child);

  c.innerHTML = html;
}

function setHealthTab(tab) {
  currentHealthTab = tab;
  renderHealth();
}

/* ============================================================
   VACCINI
   ============================================================ */
function renderVaccineSection(child) {
  const schedule = sortedVaccineSchedule();
  const today = new Date(); today.setHours(0,0,0,0);

  let html = '';
  const doneCount = schedule.filter(v => vaccineStatusForChild(child.id, v.id).status === 'done').length;
  html += `<div class="vaccine-progress">
    <div class="vaccine-progress-num">${doneCount} / ${schedule.length}</div>
    <div class="vaccine-progress-label">dosi completate</div>
  </div>`;

  schedule.forEach(v => {
    const st = vaccineStatusForChild(child.id, v.id);
    const suggestedDate = suggestedVaccineDate(child, v);
    const isPast = suggestedDate.getTime() < today.getTime();

    let statusBadge = '';
    let statusClass = '';
    if (st.status === 'done') {
      const doneDate = st.event ? parseDateStr(dateOf(st.event.ts)) : null;
      statusBadge = doneDate ? `fatto il ${fmtDateShort(doneDate)}` : 'fatto';
      statusClass = 'vx-done';
    } else if (st.status === 'scheduled') {
      const schedDate = st.event ? parseDateStr(dateOf(st.event.ts)) : null;
      statusBadge = schedDate ? `programmato per ${fmtDateShort(schedDate)}` : 'programmato';
      statusClass = 'vx-scheduled';
    } else {
      statusBadge = isPast ? `consigliato dal ${fmtDateShort(suggestedDate)}` : `previsto dal ${fmtDateShort(suggestedDate)}`;
      statusClass = isPast ? 'vx-overdue' : 'vx-todo';
    }

    html += `<div class="vaccine-card ${statusClass}" onclick="openVaccineDetail('${v.id}')">
      <div class="vaccine-card-head">
        <div class="vaccine-card-name">${escapeHtml(v.name)}</div>
        <div class="vaccine-card-age">${escapeHtml(v.ageLabel)}</div>
      </div>
      <div class="vaccine-card-status">${escapeHtml(statusBadge)}</div>
    </div>`;
  });

  return html;
}

function openVaccineDetail(vaccineId) {
  const v = VACCINE_SCHEDULE.find(x => x.id === vaccineId);
  const child = getActiveChild();
  if (!v || !child) return;
  const st = vaccineStatusForChild(child.id, v.id);
  const suggestedDate = suggestedVaccineDate(child, v);

  document.getElementById('sheetTitle').textContent = v.name;
  document.getElementById('sheetSub').textContent = v.ageLabel;

  let html = `<div class="phase-detail">`;
  html += `<div class="phase-section-label">protegge da</div><div class="phase-section-body">${escapeHtml(v.protects)}</div>`;
  html += `<div class="phase-section-label">perché in questo periodo</div><div class="phase-section-body">${escapeHtml(v.why)}</div>`;
  html += `<div class="phase-section-label">cosa aspettarsi dopo</div><div class="phase-section-body">${escapeHtml(v.afterEffects)}</div>`;
  html += `<div class="phase-section-label">cosa puoi fare</div><ul class="phase-list">`;
  v.whatToDo.forEach(tip => { html += `<li>${escapeHtml(tip)}</li>`; });
  html += `</ul>`;
  if (v.flag) {
    html += `<div class="phase-flag"><strong>Quando parlare con il pediatra —</strong> ${escapeHtml(v.flag)}</div>`;
  }

  // Stato attuale + azioni
  html += `<div class="phase-section-label">stato</div>`;
  html += `<div class="vx-status-row">
    <label class="vx-radio"><input type="radio" name="vxStatus" value="todo" ${st.status==='todo'?'checked':''} onchange="setVxStatusUI('todo')"> Da fare</label>
    <label class="vx-radio"><input type="radio" name="vxStatus" value="scheduled" ${st.status==='scheduled'?'checked':''} onchange="setVxStatusUI('scheduled')"> Programmato</label>
    <label class="vx-radio"><input type="radio" name="vxStatus" value="done" ${st.status==='done'?'checked':''} onchange="setVxStatusUI('done')"> Fatto</label>
  </div>`;
  const existingDateStr = st.event ? dateOf(st.event.ts) : dateOf(suggestedDate.getTime());
  html += `<div id="vxDateBox" class="${st.status==='todo'?'hidden':''}">
    <label class="ev-label">Data</label>
    <input type="date" id="vxDate" class="ev-input" value="${existingDateStr}">
  </div>`;
  html += `<div class="ev-actions">
    <button class="ev-save" onclick="saveVaccineStatus('${v.id}')">Salva</button>
  </div>`;
  html += `</div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function setVxStatusUI(status) {
  const box = document.getElementById('vxDateBox');
  if (box) box.classList.toggle('hidden', status === 'todo');
}

function saveVaccineStatus(vaccineId) {
  const child = getActiveChild();
  if (!child) return;
  const status = document.querySelector('input[name="vxStatus"]:checked')?.value || 'todo';
  const dateStr = document.getElementById('vxDate')?.value;

  const existing = eventsForChild(child.id).find(e => e.kind === 'vaccine' && e.data && e.data.vaccineId === vaccineId);

  if (status === 'todo') {
    // Rimuovo l'eventuale evento esistente
    if (existing) {
      DATA.events = DATA.events.filter(e => e.id !== existing.id);
      saveData();
      syncDeleteEvent(child.id, existing.id);
    }
  } else {
    const ts = dateStr ? parseDateStr(dateStr).getTime() : Date.now();
    let ev;
    if (existing) {
      ev = { ...existing, ts, data: { vaccineId, status } };
      const ix = DATA.events.findIndex(e => e.id === existing.id);
      DATA.events[ix] = ev;
    } else {
      ev = { id: uid(), child_id: child.id, kind: 'vaccine', ts, data: { vaccineId, status } };
      DATA.events.push(ev);
    }
    saveData();
    syncPushEvent(ev);
  }

  closeSheet();
  renderHealth();
  toast('Salvato');
}

/* ============================================================
   APPUNTAMENTI
   ============================================================ */
function renderAppointmentsSection(child) {
  const today = new Date(); today.setHours(0,0,0,0);
  const appts = eventsForChild(child.id)
    .filter(e => e.kind === 'appointment')
    .sort((a,b) => a.ts - b.ts);

  const upcoming = appts.filter(a => a.ts >= today.getTime());
  const past = appts.filter(a => a.ts < today.getTime()).sort((a,b) => b.ts - a.ts);

  let html = `<button class="add-growth-btn" onclick="openAppointmentForm()">+ aggiungi appuntamento</button>`;

  html += `<div class="card-eyebrow eb-spaced">prossimi</div>`;
  if (upcoming.length === 0) {
    html += `<div class="empty-card"><div class="empty-text">Nessun appuntamento in programma.</div></div>`;
  } else {
    upcoming.forEach(a => { html += renderAppointmentCard(a); });
  }

  if (past.length > 0) {
    html += `<div class="card-eyebrow eb-spaced">passati</div>`;
    past.slice(0, 10).forEach(a => { html += renderAppointmentCard(a); });
  }

  return html;
}

function renderAppointmentCard(a) {
  const d = new Date(a.ts);
  const dayLabel = fmtDateShort(d);
  const timeLabel = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  const title = a.data?.title || 'Appuntamento';
  const location = a.data?.location || '';
  return `<div class="appt-card" onclick="openAppointmentForm('${a.id}')">
    <div class="appt-when">
      <div class="appt-when-day">${dayLabel}</div>
      <div class="appt-when-time">${timeLabel}</div>
    </div>
    <div class="appt-body">
      <div class="appt-title">${escapeHtml(title)}</div>
      ${location ? `<div class="appt-loc">📍 ${escapeHtml(location)}</div>` : ''}
    </div>
  </div>`;
}

function openAppointmentForm(evId) {
  const child = getActiveChild();
  if (!child) return;
  let existing = null;
  if (evId) existing = DATA.events.find(e => e.id === evId);

  document.getElementById('sheetTitle').textContent = existing ? 'Modifica appuntamento' : 'Nuovo appuntamento';
  document.getElementById('sheetSub').textContent = child.name;

  const now = existing ? new Date(existing.ts) : new Date();
  const dateStr = dateOf(now.getTime());
  const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  const html = `<div class="ev-form">
    <label class="ev-label">Titolo</label>
    <input type="text" id="apTitle" class="ev-input" maxlength="120" value="${escapeAttr(existing?.data?.title || '')}" placeholder="es. Bilancio di salute 6 mesi">
    <div class="ev-form-row two">
      <div><label class="ev-label">Data</label><input type="date" id="apDate" class="ev-input" value="${dateStr}"></div>
      <div><label class="ev-label">Ora</label><input type="time" id="apTime" class="ev-input" value="${timeStr}"></div>
    </div>
    <label class="ev-label">Luogo (opzionale)</label>
    <input type="text" id="apLoc" class="ev-input" maxlength="200" value="${escapeAttr(existing?.data?.location || '')}">
    <label class="ev-label">Nota (opzionale)</label>
    <textarea id="apNote" class="ev-input" rows="2" maxlength="500">${escapeHtml(existing?.note || '')}</textarea>
    <div class="ev-actions">
      ${existing ? `<button class="ev-delete" onclick="deleteAppointment('${existing.id}')">Elimina</button>` : ''}
      <button class="ev-save" onclick="saveAppointment('${existing ? existing.id : ''}')">${existing ? 'Salva' : 'Aggiungi'}</button>
    </div>
  </div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function saveAppointment(evId) {
  const child = getActiveChild();
  if (!child) return;
  const title = (document.getElementById('apTitle')?.value || '').trim();
  const dateStr = document.getElementById('apDate')?.value;
  const timeStr = document.getElementById('apTime')?.value || '09:00';
  const location = (document.getElementById('apLoc')?.value || '').trim();
  const note = (document.getElementById('apNote')?.value || '').trim();
  if (!title) { toast('Serve un titolo'); return; }
  if (!dateStr) { toast('Serve una data'); return; }
  const [h,m] = timeStr.split(':');
  const d = parseDateStr(dateStr);
  d.setHours(parseInt(h)||9, parseInt(m)||0, 0, 0);
  const ts = d.getTime();

  let ev;
  if (evId) {
    const ix = DATA.events.findIndex(e => e.id === evId);
    if (ix >= 0) {
      ev = { ...DATA.events[ix], ts, data: { title, location: location || undefined }, note: note || undefined };
      DATA.events[ix] = ev;
    }
  } else {
    ev = { id: uid(), child_id: child.id, kind: 'appointment', ts, data: { title, location: location || undefined }, note: note || undefined };
    DATA.events.push(ev);
  }
  saveData();
  if (ev) syncPushEvent(ev);
  closeSheet();
  renderHealth();
  toast('Salvato');
}

function deleteAppointment(evId) {
  showConfirm('Cancellare l\'appuntamento?', 'L\'azione non si può annullare.', () => {
    const child = getActiveChild();
    DATA.events = DATA.events.filter(e => e.id !== evId);
    saveData();
    if (child) syncDeleteEvent(child.id, evId);
    closeSheet();
    renderHealth();
    toast('Cancellato');
  });
}

/* ============================================================
   FARMACI / SINTOMI
   ============================================================ */
function renderMedsSection(child) {
  const events = eventsForChild(child.id)
    .filter(e => e.kind === 'meds' || e.kind === 'symptom')
    .sort((a,b) => b.ts - a.ts);

  let html = `<div class="meds-add-row">
    <button class="add-growth-btn" onclick="openMedsForm('meds')">+ farmaco</button>
    <button class="add-growth-btn" onclick="openMedsForm('symptom')">+ sintomo/malattia</button>
  </div>`;

  if (events.length === 0) {
    html += `<div class="empty-card"><div class="empty-text">Nessun farmaco o sintomo registrato.</div></div>`;
  } else {
    html += `<div class="card-eyebrow eb-spaced">storico</div>`;
    events.forEach(e => {
      const d = new Date(e.ts);
      const dayLabel = fmtDateShort(d);
      const timeLabel = fmtTime(e.ts);
      if (e.kind === 'meds') {
        html += `<div class="tk-row" onclick="openMedsForm('meds','${e.id}')">
          <div class="tk-row-icon">💊</div>
          <div class="tk-row-body">
            <div class="tk-row-head"><span class="tk-row-label">${escapeHtml(e.data?.name || 'Farmaco')}</span><span class="tk-row-time">${dayLabel} · ${timeLabel}</span></div>
            <div class="tk-row-desc">${escapeHtml(e.data?.dose || '')}</div>
          </div>
        </div>`;
      } else {
        html += `<div class="tk-row" onclick="openMedsForm('symptom','${e.id}')">
          <div class="tk-row-icon">🤒</div>
          <div class="tk-row-body">
            <div class="tk-row-head"><span class="tk-row-label">${escapeHtml(e.data?.name || 'Sintomo')}</span><span class="tk-row-time">${dayLabel} · ${timeLabel}</span></div>
            <div class="tk-row-desc">${escapeHtml(e.note || '')}</div>
          </div>
        </div>`;
      }
    });
  }

  return html;
}

function openMedsForm(kind, evId) {
  const child = getActiveChild();
  if (!child) return;
  let existing = null;
  if (evId) existing = DATA.events.find(e => e.id === evId);

  document.getElementById('sheetTitle').textContent = (existing ? 'Modifica ' : 'Nuovo ') + (kind === 'meds' ? 'farmaco' : 'sintomo');
  document.getElementById('sheetSub').textContent = child.name;

  const now = existing ? new Date(existing.ts) : new Date();
  const dateStr = dateOf(now.getTime());
  const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  let html = `<div class="ev-form">`;
  html += `<label class="ev-label">${kind==='meds' ? 'Nome del farmaco' : 'Sintomo o malattia'}</label>
    <input type="text" id="mdName" class="ev-input" maxlength="120" value="${escapeAttr(existing?.data?.name || '')}" placeholder="${kind==='meds' ? 'es. Paracetamolo' : 'es. Raffreddore'}">`;
  if (kind === 'meds') {
    html += `<label class="ev-label">Dose (opzionale)</label>
      <input type="text" id="mdDose" class="ev-input" maxlength="80" value="${escapeAttr(existing?.data?.dose || '')}" placeholder="es. 2.5 ml">`;
  }
  html += `<div class="ev-form-row two">
      <div><label class="ev-label">Data</label><input type="date" id="mdDate" class="ev-input" value="${dateStr}"></div>
      <div><label class="ev-label">Ora</label><input type="time" id="mdTime" class="ev-input" value="${timeStr}"></div>
    </div>`;
  html += `<label class="ev-label">Nota (opzionale)</label>
    <textarea id="mdNote" class="ev-input" rows="2" maxlength="500">${escapeHtml(existing?.note || '')}</textarea>`;
  html += `<div class="ev-actions">
      ${existing ? `<button class="ev-delete" onclick="deleteMedsEvent('${existing.id}')">Elimina</button>` : ''}
      <button class="ev-save" onclick="saveMedsEvent('${kind}','${existing ? existing.id : ''}')">${existing ? 'Salva' : 'Aggiungi'}</button>
    </div></div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function saveMedsEvent(kind, evId) {
  const child = getActiveChild();
  if (!child) return;
  const name = (document.getElementById('mdName')?.value || '').trim();
  const dose = kind === 'meds' ? (document.getElementById('mdDose')?.value || '').trim() : undefined;
  const dateStr = document.getElementById('mdDate')?.value;
  const timeStr = document.getElementById('mdTime')?.value || '12:00';
  const note = (document.getElementById('mdNote')?.value || '').trim();
  if (!name) { toast('Serve un nome'); return; }
  const [h,m] = timeStr.split(':');
  const d = parseDateStr(dateStr);
  d.setHours(parseInt(h)||12, parseInt(m)||0, 0, 0);
  const ts = d.getTime();

  let ev;
  const data = kind === 'meds' ? { name, dose: dose || undefined } : { name };
  if (evId) {
    const ix = DATA.events.findIndex(e => e.id === evId);
    if (ix >= 0) {
      ev = { ...DATA.events[ix], ts, data, note: note || undefined };
      DATA.events[ix] = ev;
    }
  } else {
    ev = { id: uid(), child_id: child.id, kind, ts, data, note: note || undefined };
    DATA.events.push(ev);
  }
  saveData();
  if (ev) syncPushEvent(ev);
  closeSheet();
  renderHealth();
  toast('Salvato');
}

function deleteMedsEvent(evId) {
  showConfirm('Cancellare?', 'L\'azione non si può annullare.', () => {
    const child = getActiveChild();
    DATA.events = DATA.events.filter(e => e.id !== evId);
    saveData();
    if (child) syncDeleteEvent(child.id, evId);
    closeSheet();
    renderHealth();
    toast('Cancellato');
  });
}
