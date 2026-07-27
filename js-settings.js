/* KIN · Impostazioni */
'use strict';

function renderSettings() {
  const c = document.getElementById('settingsContent');
  if (!c) return;

  const inviteCode = SYNC.inviteCode || '——————';
  const displayName = SYNC.profile?.display_name || 'Genitore';

  let html = '';
  html += `<div class="hdr-block">
    <div class="hdr-eyebrow">altro</div>
    <h1 class="hdr-title">Impostazioni</h1>
  </div>`;

  // Chi sono
  html += `<div class="card-eyebrow">tu</div>
    <div class="set-row" style="cursor:default"><div>
      <div class="set-row-label">${escapeHtml(displayName)}</div>
      <div class="set-row-sub">${SYNC.householdId ? 'famiglia collegata' : 'nessuna famiglia'}</div>
    </div></div>`;

  // Condivisione
  if (SYNC.householdId) {
    html += `<div class="card-eyebrow eb-spaced">condivisione</div>
      <div class="invite-card">
        <div class="invite-eyebrow">codice della famiglia</div>
        <div class="invite-code">${escapeHtml(inviteCode)}</div>
        <div class="invite-hint">Dallo all'altro genitore per collegarsi. Entrambi vedete e modificate tutto.</div>
      </div>`;
  }

  // Figli
  html += `<div class="card-eyebrow eb-spaced">figli</div>`;
  DATA.children.forEach(child => {
    const age = ageOf(child.birth_date);
    const shortAge = shortAgeLabel(age);
    html += `<button class="set-row" onclick="openEditChild('${child.id}')">
      <div>
        <div class="set-row-label">${escapeHtml(child.name)}</div>
        <div class="set-row-sub">${shortAge} · nato/a il ${fmtDateShort(parseDateStr(child.birth_date))}</div>
      </div>
      <span class="set-row-caret">›</span>
    </button>`;
  });
  html += `<button class="set-row set-row-add" onclick="openAddChild()">
    <div><div class="set-row-label">+ Aggiungi un figlio</div></div>
  </button>`;

  // Tema
  html += `<div class="card-eyebrow eb-spaced">aspetto</div>
    <div class="theme-toggle">
      <button class="theme-opt ${CURRENT_THEME==='light'?'active':''}" onclick="selectTheme('light')">Chiara</button>
      <button class="theme-opt ${CURRENT_THEME==='dark'?'active':''}" onclick="selectTheme('dark')">Scura</button>
      <button class="theme-opt ${CURRENT_THEME==='auto'?'active':''}" onclick="selectTheme('auto')">Auto</button>
    </div>
    <div class="muted small">"Auto" segue le impostazioni del telefono.</div>`;

  html += `<div class="muted center" style="margin-top:24px;font-size:12px;">Kin v${APP_VERSION}</div>`;

  c.innerHTML = html;
}

/* ---------- ADD / EDIT CHILD ---------- */
let editingChildId = null;

function openAddChild() {
  editingChildId = null;
  renderChildForm(null);
}
function openEditChild(id) {
  editingChildId = id;
  const child = getChild(id);
  if (!child) return;
  renderChildForm(child);
}

function renderChildForm(child) {
  document.getElementById('sheetTitle').textContent = child ? 'Modifica figlio' : 'Aggiungi figlio';
  document.getElementById('sheetSub').textContent = child ? child.name : 'nuovo profilo';

  const gender = child?.gender || '';
  const html = `
    <div class="ev-form">
      <label class="ev-label">Nome</label>
      <input type="text" id="chName" class="ev-input" maxlength="40" value="${escapeAttr(child?.name || '')}">

      <label class="ev-label">Data di nascita</label>
      <input type="date" id="chBirth" class="ev-input" value="${child?.birth_date || ''}">

      <label class="ev-label">Data presunta del parto <span class="ev-hint-inline">(opzionale)</span></label>
      <input type="date" id="chDpp" class="ev-input" value="${child?.due_date || ''}">

      <label class="ev-label">Sesso</label>
      <div class="ev-choice">
        <button type="button" class="ev-choice-btn ${gender==='F'?'selected':''}" data-g="F" onclick="setChildFormGender('F')">Femmina</button>
        <button type="button" class="ev-choice-btn ${gender==='M'?'selected':''}" data-g="M" onclick="setChildFormGender('M')">Maschio</button>
        <button type="button" class="ev-choice-btn ${gender==='X'?'selected':''}" data-g="X" onclick="setChildFormGender('X')">Altro</button>
      </div>
      <input type="hidden" id="chGender" value="${gender}">

      <div class="ev-actions">
        ${child ? `<button class="ev-delete" onclick="deleteChild('${child.id}')">Elimina</button>` : ''}
        <button class="ev-save" onclick="saveChild()">${child ? 'Salva' : 'Aggiungi'}</button>
      </div>
    </div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function setChildFormGender(g) {
  document.getElementById('chGender').value = g;
  document.querySelectorAll('.ev-choice-btn[data-g]').forEach(b => b.classList.toggle('selected', b.dataset.g === g));
}

async function saveChild() {
  const name = (document.getElementById('chName')?.value || '').trim();
  const birth = document.getElementById('chBirth')?.value;
  const dpp = document.getElementById('chDpp')?.value;
  const gender = document.getElementById('chGender')?.value;
  if (!name) { toast('Serve il nome'); return; }
  if (!birth) { toast('Serve la data di nascita'); return; }

  let child;
  if (editingChildId) {
    const ix = DATA.children.findIndex(x => x.id === editingChildId);
    if (ix >= 0) {
      child = { ...DATA.children[ix], name, birth_date: birth, due_date: dpp || undefined, gender: gender || undefined };
      DATA.children[ix] = child;
    }
  } else {
    child = {
      id: crypto.randomUUID(),
      name, birth_date: birth, due_date: dpp || undefined, gender: gender || undefined,
      ord: DATA.children.length
    };
    DATA.children.push(child);
  }
  saveData();
  if (child) await syncPushChild(child);
  if (!editingChildId) setActiveChildId(child.id);
  editingChildId = null;
  closeSheet();
  renderSettings();
  renderHome();
  toast('Salvato');
}

function deleteChild(id) {
  const child = getChild(id);
  if (!child) return;
  showConfirm(
    `Eliminare ${child.name}?`,
    'Verranno cancellati anche tutti i dati registrati.',
    () => {
      DATA.children = DATA.children.filter(c => c.id !== id);
      DATA.events = DATA.events.filter(e => e.child_id !== id);
      saveData();
      syncDeleteChild(id);
      if (getActiveChildId() === id) {
        const other = DATA.children[0];
        if (other) setActiveChildId(other.id);
        else localStorage.removeItem(ACTIVE_CHILD_KEY);
      }
      editingChildId = null;
      closeSheet();
      renderSettings();
      renderHome();
      toast('Eliminato');
    }
  );
}
