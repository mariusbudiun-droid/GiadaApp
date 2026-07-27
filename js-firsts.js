/* KIN · Prime volte
   Lista curata di traguardi comuni, più la possibilità di aggiungerne
   di personalizzati (utile anche per i bambini più grandi).
   ========================================================= */
'use strict';

const FIRSTS_LIST = [
  { id: 'first_smile', name: 'Primo sorriso', icon: '😊' },
  { id: 'first_laugh', name: 'Prima risata', icon: '😄' },
  { id: 'first_roll', name: 'Primo rotolamento', icon: '🔄' },
  { id: 'first_sit', name: 'Prima volta seduto/a da solo/a', icon: '🪑' },
  { id: 'first_tooth', name: 'Primo dente (visto)', icon: '🦷' },
  { id: 'first_solid', name: 'Primo assaggio di cibo solido', icon: '🥄' },
  { id: 'first_crawl', name: 'Primo gattonamento', icon: '🐛' },
  { id: 'first_stand', name: 'Prima volta in piedi', icon: '🧍' },
  { id: 'first_steps', name: 'Primi passi', icon: '👣' },
  { id: 'first_word', name: 'Prima parola', icon: '💬' },
  { id: 'first_wave', name: 'Primo ciao con la manina', icon: '👋' },
  { id: 'first_haircut', name: 'Primo taglio di capelli', icon: '✂️' },
  { id: 'first_shoes', name: 'Prime scarpe', icon: '👟' },
  { id: 'first_book', name: 'Primo libro preferito', icon: '📖' },
  { id: 'first_friend', name: 'Primo amico/a', icon: '🤝' },
  { id: 'first_school', name: 'Primo giorno di scuola/nido', icon: '🎒' },
  { id: 'first_bike', name: 'Prima volta in bici/senza rotelle', icon: '🚲' },
  { id: 'first_swim', name: 'Prima nuotata', icon: '🏊' }
];

function firstEventForChild(childId, firstId) {
  return eventsForChild(childId).find(e => e.kind === 'first' && e.data && e.data.firstId === firstId) || null;
}

function customFirstsForChild(childId) {
  return eventsForChild(childId)
    .filter(e => e.kind === 'first' && e.data && e.data.custom)
    .sort((a,b) => b.ts - a.ts);
}

function renderFirstsSection(child) {
  const achievedCount = FIRSTS_LIST.filter(f => firstEventForChild(child.id, f.id)).length;

  let html = `<div class="vaccine-progress">
    <div class="vaccine-progress-num">${achievedCount} / ${FIRSTS_LIST.length}</div>
    <div class="vaccine-progress-label">traguardi raggiunti</div>
  </div>`;

  html += `<button class="add-growth-btn" onclick="openCustomFirstForm()">+ aggiungi una prima volta personalizzata</button>`;

  // Custom firsts già aggiunti
  const customs = customFirstsForChild(child.id);
  if (customs.length > 0) {
    html += `<div class="card-eyebrow eb-spaced">le tue</div>`;
    customs.forEach(ev => {
      const d = parseDateStr(dateOf(ev.ts));
      html += `<div class="first-card achieved" onclick="openCustomFirstForm('${ev.id}')">
        <span class="first-card-ico">⭐</span>
        <div class="first-card-body">
          <div class="first-card-name">${escapeHtml(ev.data.name)}</div>
          <div class="first-card-date">${fmtDateShort(d)}</div>
        </div>
      </div>`;
    });
  }

  html += `<div class="card-eyebrow eb-spaced">traguardi comuni</div>`;
  FIRSTS_LIST.forEach(f => {
    const ev = firstEventForChild(child.id, f.id);
    const achieved = !!ev;
    const dateLabel = achieved ? fmtDateShort(parseDateStr(dateOf(ev.ts))) : 'non ancora';
    html += `<div class="first-card ${achieved ? 'achieved' : ''}" onclick="openFirstForm('${f.id}')">
      <span class="first-card-ico">${f.icon}</span>
      <div class="first-card-body">
        <div class="first-card-name">${escapeHtml(f.name)}</div>
        <div class="first-card-date">${dateLabel}</div>
      </div>
    </div>`;
  });

  return html;
}

function openFirstForm(firstId) {
  const child = getActiveChild();
  if (!child) return;
  const f = FIRSTS_LIST.find(x => x.id === firstId);
  if (!f) return;
  const ev = firstEventForChild(child.id, firstId);

  document.getElementById('sheetTitle').textContent = f.name;
  document.getElementById('sheetSub').textContent = child.name;

  const dateStr = ev ? dateOf(ev.ts) : todayStr();
  const html = `<div class="ev-form">
    <label class="ev-label">Quando è successo?</label>
    <input type="date" id="firstDate" class="ev-input" value="${dateStr}">
    <label class="ev-label">Nota (opzionale)</label>
    <textarea id="firstNote" class="ev-input" rows="2" maxlength="300">${escapeHtml(ev?.note || '')}</textarea>
    <div class="ev-actions">
      ${ev ? `<button class="ev-delete" onclick="clearFirst('${firstId}')">Non ancora / cancella</button>` : ''}
      <button class="ev-save" onclick="saveFirst('${firstId}')">${ev ? 'Salva' : 'Segna come raggiunto'}</button>
    </div>
  </div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function saveFirst(firstId) {
  const child = getActiveChild();
  if (!child) return;
  const dateStr = document.getElementById('firstDate')?.value || todayStr();
  const note = (document.getElementById('firstNote')?.value || '').trim();
  const ts = parseDateStr(dateStr).getTime();
  const existing = eventsForChild(child.id).find(e => e.kind === 'first' && e.data && e.data.firstId === firstId);

  let ev;
  if (existing) {
    ev = { ...existing, ts, note: note || undefined };
    const ix = DATA.events.findIndex(e => e.id === existing.id);
    DATA.events[ix] = ev;
  } else {
    ev = { id: uid(), child_id: child.id, kind: 'first', ts, data: { firstId }, note: note || undefined };
    DATA.events.push(ev);
  }
  saveData();
  syncPushEvent(ev);
  closeSheet();
  renderHealth();
  toast('Salvato');
}

function clearFirst(firstId) {
  const child = getActiveChild();
  if (!child) return;
  const existing = eventsForChild(child.id).find(e => e.kind === 'first' && e.data && e.data.firstId === firstId);
  if (existing) {
    DATA.events = DATA.events.filter(e => e.id !== existing.id);
    saveData();
    syncDeleteEvent(child.id, existing.id);
  }
  closeSheet();
  renderHealth();
  toast('Aggiornato');
}

/* ---------- PRIME VOLTE PERSONALIZZATE ---------- */
function openCustomFirstForm(evId) {
  const child = getActiveChild();
  if (!child) return;
  let existing = null;
  if (evId) existing = DATA.events.find(e => e.id === evId);

  document.getElementById('sheetTitle').textContent = existing ? 'Modifica' : 'Nuova prima volta';
  document.getElementById('sheetSub').textContent = child.name;

  const dateStr = existing ? dateOf(existing.ts) : todayStr();
  const html = `<div class="ev-form">
    <label class="ev-label">Cosa è successo</label>
    <input type="text" id="cfName" class="ev-input" maxlength="150" value="${escapeAttr(existing?.data?.name || '')}" placeholder="es. Prima volta al mare">
    <label class="ev-label">Quando</label>
    <input type="date" id="cfDate" class="ev-input" value="${dateStr}">
    <label class="ev-label">Nota (opzionale)</label>
    <textarea id="cfNote" class="ev-input" rows="2" maxlength="300">${escapeHtml(existing?.note || '')}</textarea>
    <div class="ev-actions">
      ${existing ? `<button class="ev-delete" onclick="deleteCustomFirst('${existing.id}')">Elimina</button>` : ''}
      <button class="ev-save" onclick="saveCustomFirst('${existing ? existing.id : ''}')">${existing ? 'Salva' : 'Aggiungi'}</button>
    </div>
  </div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function saveCustomFirst(evId) {
  const child = getActiveChild();
  if (!child) return;
  const name = (document.getElementById('cfName')?.value || '').trim();
  const dateStr = document.getElementById('cfDate')?.value || todayStr();
  const note = (document.getElementById('cfNote')?.value || '').trim();
  if (!name) { toast('Scrivi cosa è successo'); return; }
  const ts = parseDateStr(dateStr).getTime();

  let ev;
  if (evId) {
    const ix = DATA.events.findIndex(e => e.id === evId);
    if (ix >= 0) {
      ev = { ...DATA.events[ix], ts, data: { custom: true, name }, note: note || undefined };
      DATA.events[ix] = ev;
    }
  } else {
    ev = { id: uid(), child_id: child.id, kind: 'first', ts, data: { custom: true, name }, note: note || undefined };
    DATA.events.push(ev);
  }
  saveData();
  if (ev) syncPushEvent(ev);
  closeSheet();
  renderHealth();
  toast('Salvato');
}

function deleteCustomFirst(evId) {
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
