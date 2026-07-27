/* KIN · Denti da latte
   Schema bocca (20 denti decidui), tap per segnare data di eruzione.
   ========================================================= */
'use strict';

/* Denti da latte, con fascia d'età tipica di eruzione (mesi) — solo indicativa */
const TEETH_LIST = [
  { id: 'ui_ci_l', name: 'Incisivo centrale superiore sinistro', arch: 'up', pos: 4, typical: '8-12 mesi' },
  { id: 'ui_ci_r', name: 'Incisivo centrale superiore destro', arch: 'up', pos: 5, typical: '8-12 mesi' },
  { id: 'ui_li_l', name: 'Incisivo laterale superiore sinistro', arch: 'up', pos: 3, typical: '9-13 mesi' },
  { id: 'ui_li_r', name: 'Incisivo laterale superiore destro', arch: 'up', pos: 6, typical: '9-13 mesi' },
  { id: 'ui_cn_l', name: 'Canino superiore sinistro', arch: 'up', pos: 2, typical: '16-22 mesi' },
  { id: 'ui_cn_r', name: 'Canino superiore destro', arch: 'up', pos: 7, typical: '16-22 mesi' },
  { id: 'ui_m1_l', name: 'Primo molare superiore sinistro', arch: 'up', pos: 1, typical: '13-19 mesi' },
  { id: 'ui_m1_r', name: 'Primo molare superiore destro', arch: 'up', pos: 8, typical: '13-19 mesi' },
  { id: 'ui_m2_l', name: 'Secondo molare superiore sinistro', arch: 'up', pos: 0, typical: '25-33 mesi' },
  { id: 'ui_m2_r', name: 'Secondo molare superiore destro', arch: 'up', pos: 9, typical: '25-33 mesi' },

  { id: 'lo_ci_l', name: 'Incisivo centrale inferiore sinistro', arch: 'lo', pos: 4, typical: '6-10 mesi' },
  { id: 'lo_ci_r', name: 'Incisivo centrale inferiore destro', arch: 'lo', pos: 5, typical: '6-10 mesi' },
  { id: 'lo_li_l', name: 'Incisivo laterale inferiore sinistro', arch: 'lo', pos: 3, typical: '10-16 mesi' },
  { id: 'lo_li_r', name: 'Incisivo laterale inferiore destro', arch: 'lo', pos: 6, typical: '10-16 mesi' },
  { id: 'lo_cn_l', name: 'Canino inferiore sinistro', arch: 'lo', pos: 2, typical: '17-23 mesi' },
  { id: 'lo_cn_r', name: 'Canino inferiore destro', arch: 'lo', pos: 7, typical: '17-23 mesi' },
  { id: 'lo_m1_l', name: 'Primo molare inferiore sinistro', arch: 'lo', pos: 1, typical: '14-18 mesi' },
  { id: 'lo_m1_r', name: 'Primo molare inferiore destro', arch: 'lo', pos: 8, typical: '14-18 mesi' },
  { id: 'lo_m2_l', name: 'Secondo molare inferiore sinistro', arch: 'lo', pos: 0, typical: '23-31 mesi' },
  { id: 'lo_m2_r', name: 'Secondo molare inferiore destro', arch: 'lo', pos: 9, typical: '23-31 mesi' }
];

function toothEventForChild(childId, toothId) {
  return eventsForChild(childId).find(e => e.kind === 'tooth' && e.data && e.data.toothId === toothId) || null;
}

function renderTeethSection(child) {
  const upTeeth = TEETH_LIST.filter(t => t.arch === 'up').sort((a,b) => a.pos - b.pos);
  const loTeeth = TEETH_LIST.filter(t => t.arch === 'lo').sort((a,b) => a.pos - b.pos);
  const eruptedCount = TEETH_LIST.filter(t => toothEventForChild(child.id, t.id)).length;

  let html = `<div class="vaccine-progress">
    <div class="vaccine-progress-num">${eruptedCount} / 20</div>
    <div class="vaccine-progress-label">denti spuntati</div>
  </div>`;

  html += `<div class="teeth-arch-label">arcata superiore</div>`;
  html += `<div class="teeth-row">`;
  upTeeth.forEach(t => { html += renderToothButton(child, t); });
  html += `</div>`;

  html += `<div class="teeth-arch-label">arcata inferiore</div>`;
  html += `<div class="teeth-row">`;
  loTeeth.forEach(t => { html += renderToothButton(child, t); });
  html += `</div>`;

  html += `<div class="teeth-hint">Tocca un dente per segnare (o correggere) quando è spuntato.</div>`;

  return html;
}

function renderToothButton(child, tooth) {
  const ev = toothEventForChild(child.id, tooth.id);
  const erupted = !!ev;
  return `<button class="tooth-btn ${erupted ? 'erupted' : ''}" onclick="openToothForm('${tooth.id}')" title="${escapeAttr(tooth.name)}">
    ${erupted ? '●' : '○'}
  </button>`;
}

function openToothForm(toothId) {
  const child = getActiveChild();
  if (!child) return;
  const tooth = TEETH_LIST.find(t => t.id === toothId);
  if (!tooth) return;
  const ev = toothEventForChild(child.id, toothId);

  document.getElementById('sheetTitle').textContent = tooth.name;
  document.getElementById('sheetSub').textContent = 'di solito spunta a ' + tooth.typical;

  const dateStr = ev ? dateOf(ev.ts) : todayStr();
  const html = `<div class="ev-form">
    <label class="ev-label">${ev ? 'Data in cui è spuntato' : 'È già spuntato?'}</label>
    <input type="date" id="toothDate" class="ev-input" value="${dateStr}">
    <div class="ev-actions">
      ${ev ? `<button class="ev-delete" onclick="clearTooth('${toothId}')">Non ancora / cancella</button>` : ''}
      <button class="ev-save" onclick="saveTooth('${toothId}')">${ev ? 'Salva' : 'Segna come spuntato'}</button>
    </div>
  </div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function saveTooth(toothId) {
  const child = getActiveChild();
  if (!child) return;
  const dateStr = document.getElementById('toothDate')?.value || todayStr();
  const ts = parseDateStr(dateStr).getTime();
  const existing = eventsForChild(child.id).find(e => e.kind === 'tooth' && e.data && e.data.toothId === toothId);

  let ev;
  if (existing) {
    ev = { ...existing, ts };
    const ix = DATA.events.findIndex(e => e.id === existing.id);
    DATA.events[ix] = ev;
  } else {
    ev = { id: uid(), child_id: child.id, kind: 'tooth', ts, data: { toothId } };
    DATA.events.push(ev);
  }
  saveData();
  syncPushEvent(ev);
  closeSheet();
  renderHealth();
  toast('Salvato');
}

function clearTooth(toothId) {
  const child = getActiveChild();
  if (!child) return;
  const existing = eventsForChild(child.id).find(e => e.kind === 'tooth' && e.data && e.data.toothId === toothId);
  if (existing) {
    DATA.events = DATA.events.filter(e => e.id !== existing.id);
    saveData();
    syncDeleteEvent(child.id, existing.id);
  }
  closeSheet();
  renderHealth();
  toast('Aggiornato');
}
