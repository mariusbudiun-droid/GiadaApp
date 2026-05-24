/* =========================================================
   GIADA · UI
   Misurazioni, chetoni, diario, stats, settings, temi
   ========================================================= */
'use strict';

/* ---------- MISURAZIONI ---------- */
let glucKind = null;
let ketoChoice = null;

function renderMisurazioni() {
  const t = getTimingForToday();
  document.querySelectorAll('.timing-opt').forEach(b => b.classList.toggle('active', parseInt(b.dataset.t) === t));
  document.getElementById('lblColazione').textContent = t+'h dal pasto';
  document.getElementById('lblPranzo').textContent = t+'h dal pasto';
  document.getElementById('lblCena').textContent = t+'h dal pasto';
  switchMeasTab('glicemia');
  closeGluc();
}

function getTimingForToday() {
  const today = todayStr();
  if (DATA.prefs && DATA.prefs.timingToday && DATA.prefs.timingToday.date === today) {
    return DATA.prefs.timingToday.timing;
  }
  const d = new Date().getDate();
  return (d % 2 === 0) ? 2 : 1;
}

function setTiming(t) {
  DATA.prefs = DATA.prefs || {};
  DATA.prefs.timingToday = { date: todayStr(), timing: t };
  saveData();
  renderMisurazioni();
}

function switchMeasTab(w) {
  document.querySelectorAll('.meas-tab').forEach(b => b.classList.toggle('active', b.dataset.mtab === w));
  document.getElementById('measGlicemia').classList.toggle('hidden', w !== 'glicemia');
  document.getElementById('measChetoni').classList.toggle('hidden', w !== 'chetoni');
  if (w === 'chetoni') resetKeto();
}

function openGluc(k) {
  glucKind = k;
  document.getElementById('glucPicker').classList.add('hidden');
  document.getElementById('glucInput').classList.remove('hidden');
  const L = { digiuno:'a digiuno (mattina)', colazione:'dopo colazione', pranzo:'dopo pranzo', cena:'dopo cena' };
  document.getElementById('glucKindLabel').textContent = L[k];
  document.getElementById('glucTimingLabel').textContent = (k === 'digiuno') ? 'misurazione appena sveglia' : getTimingForToday()+' ora/e dall\'inizio del pasto';
  document.getElementById('glucValue').value = '';
  document.getElementById('glucNoteText').value = '';
  document.getElementById('glucNote').classList.remove('show');
  document.getElementById('glucFeedback').classList.remove('show');
  document.getElementById('saveGlucBtn').disabled = true;
  setTimeout(() => document.getElementById('glucValue').focus(), 100);
}

function closeGluc() {
  document.getElementById('glucPicker').classList.remove('hidden');
  document.getElementById('glucInput').classList.add('hidden');
  glucKind = null;
}

function evaluateGluc(k, v, t) {
  if (k === 'digiuno') {
    if (v < 90) return { level:'great', icon:'ben fatto', text:'Sei sotto 90, il target italiano per il digiuno è sotto 90-95. Numero ottimo.' };
    if (v <= 95) return { level:'great', icon:'a posto', text:'Sotto 95: sei nel range italiano per il digiuno. Tutto bene.' };
    if (v <= 100) return { level:'ok', icon:'tranquilla', text:'Un pochino sopra il range ideale ma non è un dramma. Hai dormito bene? Mangiato lo spuntino notturno?' };
    return { level:'gentle', icon:'registriamo', text:'Più alto del solito. Capita, soprattutto se la notte non è stata serena. Se si ripete nei prossimi giorni, sentiamo la dottoressa.' };
  }
  if (t === 1) {
    if (v < 130) return { level:'great', icon:'ben fatto', text:'Sotto 130 a un\'ora: numero ottimo. Hai gestito bene il pasto.' };
    if (v <= 140) return { level:'ok', icon:'tranquilla', text:'Sei tra 130 e 140, ma in Italia sotto 140 a un\'ora è considerato buono. Sei a posto.' };
    if (v <= 160) return { level:'gentle', icon:'normale', text:'Un po\' sopra. Ricordi l\'ordine? Verdure, poi proteine, poi carboidrati. E lo stress, il sonno, gli ormoni contano: non è solo cosa hai mangiato.' };
    return { level:'alert', icon:'registriamo', text:'Valore alto. Non è colpa tua, può capitare con il GDM. Annotiamo per la dottoressa.' };
  } else {
    if (v < 120) return { level:'great', icon:'ottimo', text:'Sotto 120 a due ore: sei perfettamente nel target italiano. Brava davvero.' };
    if (v <= 130) return { level:'ok', icon:'a posto', text:'Tra 120 e 130 a due ore. Sei a posto, è vicino al target.' };
    if (v <= 150) return { level:'gentle', icon:'tranquilla', text:'Un po\' sopra il target. Magari il pasto più ricco di carboidrati, o lo stress. Registriamo.' };
    return { level:'alert', icon:'registriamo', text:'Valore alto a due ore. Annotiamo per la dottoressa.' };
  }
}

function showGlucFeedback() {
  const v = parseInt(document.getElementById('glucValue').value);
  const fb = document.getElementById('glucFeedback');
  if (isNaN(v) || v < 30 || v > 400) {
    fb.classList.remove('show');
    document.getElementById('saveGlucBtn').disabled = true;
    return;
  }
  const t = (glucKind === 'digiuno') ? null : getTimingForToday();
  const ev = evaluateGluc(glucKind, v, t);
  fb.className = 'feedback show '+ev.level;
  document.getElementById('glucFbIcon').textContent = ev.icon;
  document.getElementById('glucFbText').textContent = ev.text;
  document.getElementById('saveGlucBtn').disabled = false;
}

function saveGluc() {
  const v = parseInt(document.getElementById('glucValue').value);
  if (isNaN(v)) return;
  const rec = {
    id: uid(), ts: Date.now(),
    kind: 'glicemia', subkind: glucKind,
    timing: (glucKind === 'digiuno') ? null : getTimingForToday(),
    value: v,
    note: document.getElementById('glucNoteText').value.trim()
  };
  DATA.measurements.push(rec);
  saveData();
  if (typeof syncPushMeasurement === 'function') syncPushMeasurement(rec);
  toast('Misurazione salvata');
  closeGluc();
  goTo('home');
}

/* ---------- CHETONI ---------- */
function resetKeto() {
  ketoChoice = null;
  document.querySelectorAll('.keto-chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('ketoFeedback').classList.remove('show');
  document.getElementById('saveKetoBtn').disabled = true;
  document.getElementById('ketoNoteText').value = '';
  document.getElementById('ketoNote').classList.remove('show');
}

function selectKeto(chip) {
  const v = parseInt(chip.dataset.k);
  ketoChoice = v;
  document.querySelectorAll('.keto-chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
  const fb = document.getElementById('ketoFeedback');
  let l, i, t;
  if (v === 0) { l = 'great'; i = 'perfetto'; t = 'Chetoni negativi: lo spuntino notturno ha funzionato. Continua così.'; }
  else if (v === 5) { l = 'ok'; i = 'tranquilla'; t = 'Solo tracce. Idratati bene e non saltare lo spuntino notturno. Se si ripete, segnaliamolo alla dottoressa.'; }
  else if (v === 15) { l = 'gentle'; i = 'attenzione'; t = 'Lievemente positivi. Capita, soprattutto se la notte è stata lunga. Se domani sono di nuovo positivi, sentiamo la dottoressa.'; }
  else { l = 'alert'; i = 'chiama la dottoressa'; t = 'Chetoni moderati/alti: meglio sentire la dottoressa oggi stesso. Non è una catastrofe, ma vuole sapere.'; }
  fb.className = 'feedback show '+l;
  document.getElementById('ketoFbIcon').textContent = i;
  document.getElementById('ketoFbText').textContent = t;
  document.getElementById('saveKetoBtn').disabled = false;
}

function saveKeto() {
  if (ketoChoice == null) return;
  const rec = {
    id: uid(), ts: Date.now(),
    kind: 'chetoni', subkind: 'mattina',
    value: ketoChoice,
    note: document.getElementById('ketoNoteText').value.trim()
  };
  DATA.measurements.push(rec);
  saveData();
  if (typeof syncPushMeasurement === 'function') syncPushMeasurement(rec);
  toast('Misurazione salvata');
  resetKeto();
  goTo('home');
}

function toggleNote(id) { document.getElementById(id).classList.toggle('show'); }

/* ---------- DIARIO ---------- */
function renderDiario() {
  const all = [];
  DATA.measurements.forEach(m => all.push(Object.assign({type:'meas'}, m)));
  DATA.meals.forEach(m => all.push(Object.assign({type:'meal'}, m)));
  all.sort((a,b) => b.ts - a.ts);
  const c = document.getElementById('diaryContent');
  if (!all.length) {
    c.innerHTML = '<div class="diary-empty">Ancora nulla qui.<br>Registra un pasto o una misurazione.</div>';
    return;
  }
  const g = {};
  all.forEach(e => { const d = dateOf(e.ts); if (!g[d]) g[d] = []; g[d].push(e); });
  const today = todayStr();
  c.innerHTML = '';
  Object.keys(g).sort((a,b) => b.localeCompare(a)).forEach(d => {
    const dd = document.createElement('div');
    dd.className = 'diary-day';
    const lbl = (d === today) ? 'oggi · '+fmtDate(d) : fmtDate(d);
    dd.innerHTML = `<div class="diary-date ${d===today?'today':''}">${lbl}</div>`;
    g[d].forEach(e => { dd.innerHTML += renderEntry(e); });
    c.appendChild(dd);
  });
}

function renderEntry(e) {
  if (e.type === 'meas') {
    if (e.kind === 'glicemia') {
      const sk = { digiuno:'glicemia a digiuno', colazione:'dopo colazione', pranzo:'dopo pranzo', cena:'dopo cena' }[e.subkind];
      const tg = e.timing ? ' ('+e.timing+'h)' : '';
      return `<div class="diary-entry"><div class="diary-time">${fmtTime(e.ts)}</div><div class="diary-body"><div class="diary-kind">${sk}${tg}</div><div class="diary-content"><span class="diary-value">${e.value}</span> mg/dL</div>${e.note ? `<div class="diary-note">"${escapeHtml(e.note)}"</div>` : ''}</div><button class="diary-del" onclick="confirmDelMeas('${e.id}')">×</button></div>`;
    } else {
      return `<div class="diary-entry"><div class="diary-time">${fmtTime(e.ts)}</div><div class="diary-body"><div class="diary-kind">chetoni</div><div class="diary-content"><span class="diary-value">${ketoLabel(e.value)}</span></div>${e.note ? `<div class="diary-note">"${escapeHtml(e.note)}"</div>` : ''}</div><button class="diary-del" onclick="confirmDelMeas('${e.id}')">×</button></div>`;
    }
  } else {
    const slot = SLOT_BY_ID[e.mealId];
    // nuova struttura: items[]
    let items = [];
    if (e.items && e.items.length) {
      items = e.items.map(it => {
        const f = FOOD_BY_ID[it.foodId];
        if (!f) return null;
        return `${f.name} (${it.qty}${f.unit})`;
      }).filter(Boolean);
    } else if (e.choices) {
      // backward-compat con vecchie voci
      items = Object.values(e.choices).map(c => {
        let s = c.name;
        if (c.count) s += ` (${c.count} ${c.unit || ''})`;
        else if (c.g != null) s += ` (${c.g}g)`;
        return s;
      });
    }
    return `<div class="diary-entry"><div class="diary-time">${fmtTime(e.ts)}</div><div class="diary-body"><div class="diary-kind">${slot ? slot.name : 'pasto'}</div><div class="diary-content" style="font-size:13px;">${items.join(' · ')}</div></div><button class="diary-del" onclick="confirmDelMeal('${e.id}')">×</button></div>`;
  }
}

function confirmDelMeas(id) {
  showConfirm('Cancellare questa misurazione?', 'L\'azione non si può annullare.', () => {
    DATA.measurements = DATA.measurements.filter(m => m.id !== id);
    saveData();
    if (typeof syncDeleteMeasurement === 'function') syncDeleteMeasurement(id);
    renderDiario(); toast('Cancellata');
  });
}
function confirmDelMeal(id) {
  showConfirm('Cancellare questo pasto?', 'L\'azione non si può annullare.', () => {
    DATA.meals = DATA.meals.filter(m => m.id !== id);
    saveData();
    if (typeof syncDeleteMeal === 'function') syncDeleteMeal(id);
    renderDiario(); toast('Pasto cancellato');
  });
}

/* ---------- STATISTICHE ---------- */
function renderStats() {
  const c = document.getElementById('statsContent');
  const all = DATA.measurements.filter(m => m.kind === 'glicemia');
  if (all.length < 3) {
    c.innerHTML = '<div class="diary-empty">Servono almeno qualche misurazione per vedere le statistiche.<br>Registra qualche glicemia e torna qui.</div>';
    return;
  }
  const byKind = (s) => all.filter(m => m.subkind === s);
  const avg = (a) => a.length ? Math.round(a.reduce((s,m) => s+m.value, 0) / a.length) : null;
  const a1=avg(byKind('digiuno')), a2=avg(byKind('colazione')), a3=avg(byKind('pranzo')), a4=avg(byKind('cena'));
  const inT = (m) => {
    if (m.subkind === 'digiuno') return m.value <= 95;
    if (m.timing === 1) return m.value <= 140;
    if (m.timing === 2) return m.value <= 120;
    return m.value <= 130;
  };
  const ok = all.filter(inT).length;
  const pct = Math.round(ok / all.length * 100);
  const great = all.filter(m => {
    if (m.subkind === 'digiuno') return m.value < 90;
    if (m.timing === 1) return m.value < 130;
    if (m.timing === 2) return m.value < 120;
    return m.value < 120;
  }).length;
  const high = all.filter(m => {
    if (m.subkind === 'digiuno') return m.value > 100;
    if (m.timing === 1) return m.value > 140;
    if (m.timing === 2) return m.value > 130;
    return m.value > 130;
  }).length;
  const okMid = all.length - great - high;
  const pG = Math.round(great/all.length*100), pM = Math.round(okMid/all.length*100), pH = 100-pG-pM;
  c.innerHTML = `
    <div class="card stats-card">
      <div class="card-eyebrow">% in target</div>
      <div class="big-num">${pct}<span style="font-size:18px;color:var(--text-medium)">%</span></div>
      <div class="muted" style="font-size:13px;margin-top:2px;">su ${all.length} misurazioni totali</div>
      <div class="bar-row"><div class="bar-seg great" style="width:${pG}%"></div><div class="bar-seg ok" style="width:${pM}%"></div><div class="bar-seg high" style="width:${pH}%"></div></div>
      <div class="bar-legend">
        <span><span class="bar-dot" style="background:var(--accent)"></span>Ottimo ${pG}%</span>
        <span><span class="bar-dot" style="background:var(--warn-border)"></span>Buono ${pM}%</span>
        <span><span class="bar-dot" style="background:var(--alert-text)"></span>Sopra ${pH}%</span>
      </div>
    </div>
    <div class="card">
      <h3 class="card-title">Medie per fascia</h3>
      <div class="stats-row">
        <div class="stats-mini"><div class="stats-mini-label">Digiuno</div><div class="stats-mini-val">${a1 ?? '—'}${a1 ? '<span style="font-size:11px;color:var(--text-medium)"> mg/dL</span>' : ''}</div><div class="stats-mini-sub">target &lt; 95</div></div>
        <div class="stats-mini"><div class="stats-mini-label">Dopo colazione</div><div class="stats-mini-val">${a2 ?? '—'}${a2 ? '<span style="font-size:11px;color:var(--text-medium)"> mg/dL</span>' : ''}</div><div class="stats-mini-sub">target 1h &lt; 140</div></div>
        <div class="stats-mini"><div class="stats-mini-label">Dopo pranzo</div><div class="stats-mini-val">${a3 ?? '—'}${a3 ? '<span style="font-size:11px;color:var(--text-medium)"> mg/dL</span>' : ''}</div><div class="stats-mini-sub">target 1h &lt; 140</div></div>
        <div class="stats-mini"><div class="stats-mini-label">Dopo cena</div><div class="stats-mini-val">${a4 ?? '—'}${a4 ? '<span style="font-size:11px;color:var(--text-medium)"> mg/dL</span>' : ''}</div><div class="stats-mini-sub">target 1h &lt; 140</div></div>
      </div>
    </div>`;
}

/* ---------- IMPOSTAZIONI / TEMI ---------- */
function renderSettings() {
  const c = document.getElementById('settingsContent');
  if (!c) return;
  const shareBlock = renderShareSection();
  c.innerHTML = `
    ${shareBlock}
    <div class="card-eyebrow" style="margin:18px 4px 8px">aspetto</div>
    <div class="theme-grid">
      ${THEMES.map(t => `
        <button class="theme-card ${CURRENT_THEME.palette === t.id ? 'selected' : ''}" onclick="selectPalette('${t.id}')">
          <div class="theme-card-preview" style="background: linear-gradient(135deg, ${t.preview.bg} 0%, ${t.preview.accent}33 100%)">
            <div class="theme-card-preview-dot" style="background:${t.preview.accent};width:32px;height:32px;top:18px;left:18px"></div>
            <div class="theme-card-preview-dot" style="background:${t.preview.accent2};width:22px;height:22px;top:30px;left:46px"></div>
            <div class="theme-card-preview-dot" style="background:${t.preview.text};width:14px;height:14px;top:48px;left:64px;opacity:0.4"></div>
            <div class="theme-card-check">✓</div>
          </div>
          <div class="theme-card-name">${t.name}</div>
          <div class="theme-card-desc">${t.desc}</div>
        </button>`).join('')}
    </div>
    <div class="card-eyebrow" style="margin:14px 4px 6px">modalità</div>
    <div class="mode-toggle">
      <button class="mode-opt ${CURRENT_THEME.mode === 'light' ? 'active' : ''}" onclick="selectMode('light')">Chiara</button>
      <button class="mode-opt ${CURRENT_THEME.mode === 'dark' ? 'active' : ''}" onclick="selectMode('dark')">Scura</button>
      <button class="mode-opt ${CURRENT_THEME.mode === 'auto' ? 'active' : ''}" onclick="selectMode('auto')">Auto</button>
    </div>
    <div class="muted" style="font-size:12px;margin:0 4px 18px;">"Auto" segue le impostazioni del telefono.</div>

    <div class="card-eyebrow" style="margin:14px 4px 8px">dati</div>
    <button class="set-row" onclick="exportBackup()"><div><div class="set-row-label">Esporta backup</div><div class="set-row-sub">Salva un file con tutti i tuoi dati</div></div><span style="color:var(--text-light)">›</span></button>
    <label class="set-row" for="importFile" style="cursor:pointer;"><div><div class="set-row-label">Importa backup</div><div class="set-row-sub">Ripristina da un file salvato</div></div><span style="color:var(--text-light)">›</span><input type="file" id="importFile" accept=".json,application/json" style="display:none" onchange="importBackup(event)"></label>
    <button class="set-row" onclick="exportDiarioTxt()"><div><div class="set-row-label">Esporta diario per la dottoressa</div><div class="set-row-sub">File leggibile da stampare</div></div><span style="color:var(--text-light)">›</span></button>
    <button class="set-row" onclick="confirmReset()"><div><div class="set-row-label" style="color:var(--alert-text)">Cancella tutti i dati</div><div class="set-row-sub">Non si può annullare</div></div><span style="color:var(--alert-text)">›</span></button>

    <div class="muted center" style="margin-top:20px;font-size:12px;">Giada v${APP_VERSION}</div>
  `;
}

function renderShareSection() {
  if (typeof SYNC === 'undefined' || !SYNC.role) return '';

  if (SYNC.role === 'owner') {
    const code = SYNC.profile?.user_code || '------';
    const pausedLabel = SYNC.paused ? 'in pausa' : 'attiva';
    const pausedClass = SYNC.paused ? 'paused' : 'active';
    return `
      <div class="card-eyebrow" style="margin:4px 4px 8px">condivisione</div>
      <div class="share-card">
        <div class="share-label">Il tuo codice da dare al partner</div>
        <div class="share-code">${code}</div>
        <div class="share-hint">Solo chi ha questo codice può vedere i tuoi dati.</div>
        <div class="share-toggle-row">
          <div>
            <div class="share-toggle-label">Condivisione</div>
            <div class="share-toggle-state ${pausedClass}">${pausedLabel}</div>
          </div>
          <button class="share-toggle ${SYNC.paused ? '' : 'on'}" onclick="toggleShare()">
            <div class="share-toggle-knob"></div>
          </button>
        </div>
        <button class="share-unlink" onclick="confirmUnpair()">Disattiva sincronizzazione</button>
      </div>`;
  }

  // partner
  const ownerName = SYNC.ownerProfile?.display_name || 'Giada';
  const pausedNote = SYNC.paused
    ? `<div class="share-note paused">${ownerName} ha messo in pausa la condivisione. I dati che vedi sono quelli dell'ultima volta.</div>`
    : `<div class="share-note">Stai vedendo i dati di ${ownerName} in sola lettura. Si aggiornano da soli.</div>`;
  return `
    <div class="card-eyebrow" style="margin:4px 4px 8px">modalità partner</div>
    <div class="share-card partner">
      ${pausedNote}
      <button class="share-row" onclick="forcePull()">
        <div><div class="set-row-label">Aggiorna ora</div><div class="set-row-sub">Forza la sincronizzazione</div></div>
        <span style="color:var(--text-light)">↻</span>
      </button>
      <button class="share-unlink" onclick="confirmUnpair()">Scollegami</button>
    </div>`;
}

async function toggleShare() {
  if (SYNC.role !== 'owner') return;
  try {
    await syncSetPaused(!SYNC.paused);
    toast(SYNC.paused ? 'Condivisione in pausa' : 'Condivisione riattivata');
    renderSettings();
  } catch(e) {
    toast('Errore: ' + e.message);
  }
}

function forcePull() {
  if (typeof syncPullAll === 'function') {
    syncPullAll().then(() => toast('Dati aggiornati'));
  }
}

function confirmUnpair() {
  const msg = SYNC.role === 'owner'
    ? 'Vuoi disattivare la sincronizzazione? I tuoi dati restano sul telefono ma non saranno più condivisi con il partner.'
    : 'Vuoi scollegarti da Giada? I dati salvati localmente saranno cancellati.';
  showConfirm('Conferma', msg, () => {
    if (typeof syncReset === 'function') syncReset();
    if (SYNC.role !== 'owner') {
      // partner: pulisco i dati copia
      DATA = { meals:[], measurements:[], settings: DATA.settings || {} };
      saveData();
    }
    location.reload();
  });
}

function selectPalette(id) {
  CURRENT_THEME.palette = id;
  applyTheme(CURRENT_THEME);
  saveTheme(CURRENT_THEME);
  renderSettings();
}
function selectMode(mode) {
  CURRENT_THEME.mode = mode;
  applyTheme(CURRENT_THEME);
  saveTheme(CURRENT_THEME);
  renderSettings();
}

/* ---------- BACKUP / RESTORE / EXPORT ---------- */
function exportBackup() {
  const json = JSON.stringify(DATA, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `giada-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup esportato');
}

function importBackup(ev) {
  const f = ev.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const o = JSON.parse(r.result);
      if (!o.measurements || !Array.isArray(o.measurements)) throw new Error();
      showConfirm('Importare questo backup?', 'I dati attuali verranno sostituiti.', () => {
        DATA = Object.assign({measurements:[], meals:[], prefs:{}}, o);
        saveData(); toast('Backup importato'); goTo('home');
      });
    } catch(e) { toast('File non valido'); }
  };
  r.readAsText(f);
  ev.target.value = '';
}

function exportDiarioTxt() {
  const all = [];
  DATA.measurements.forEach(m => all.push(Object.assign({type:'meas'}, m)));
  DATA.meals.forEach(m => all.push(Object.assign({type:'meal'}, m)));
  all.sort((a,b) => a.ts - b.ts);
  if (!all.length) { toast('Niente da esportare'); return; }
  const g = {};
  all.forEach(e => { const d = dateOf(e.ts); if (!g[d]) g[d] = []; g[d].push(e); });
  let txt = 'DIARIO GIADA · diabete gestazionale\nEsportato il '+new Date().toLocaleString('it-IT')+'\n═══════════════════════════════════\n\n';
  Object.keys(g).sort().forEach(d => {
    txt += '── '+fmtDate(d).toUpperCase()+' ──\n\n';
    g[d].forEach(e => {
      const t = fmtTime(e.ts);
      if (e.type === 'meas' && e.kind === 'glicemia') {
        const sk = { digiuno:'A digiuno', colazione:'Dopo colazione', pranzo:'Dopo pranzo', cena:'Dopo cena' }[e.subkind];
        const tg = e.timing ? ' ('+e.timing+'h)' : '';
        txt += `${t}  ${sk}${tg}: ${e.value} mg/dL`;
        if (e.note) txt += `  · nota: ${e.note}`;
        txt += '\n';
      } else if (e.type === 'meas' && e.kind === 'chetoni') {
        txt += `${t}  Chetoni: ${ketoLabel(e.value)}`;
        if (e.note) txt += `  · nota: ${e.note}`;
        txt += '\n';
      } else {
        const slot = SLOT_BY_ID[e.mealId];
        txt += `${t}  ${slot ? slot.name : 'Pasto'}:\n`;
        if (e.items && e.items.length) {
          e.items.forEach(it => {
            const f = FOOD_BY_ID[it.foodId];
            if (!f) return;
            txt += `    · ${f.name} ${it.qty}${f.unit}\n`;
          });
        } else if (e.choices) {
          Object.values(e.choices).forEach(c => {
            let l = '    · ' + c.name;
            if (c.count) l += ` ${c.count} ${c.unit || ''}`;
            else if (c.g != null) l += ` ${c.g}g`;
            if (c.extra) l += ' ' + c.extra;
            txt += l + '\n';
          });
        }
      }
    });
    txt += '\n';
  });
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `giada-diario-${new Date().toISOString().slice(0,10)}.txt`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Diario esportato');
}

function confirmReset() {
  showConfirm('Cancellare tutti i dati?', 'Misurazioni e pasti verranno eliminati. Considera prima di esportare un backup.', () => {
    DATA = { measurements: [], meals: [], prefs: {} };
    saveData(); toast('Dati cancellati'); goTo('home');
  });
}

/* ---------- CONFIRM DIALOG ---------- */
function showConfirm(title, msg, onYes) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmYes').onclick = () => { closeConfirm(); onYes(); };
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open');
}

/* ---------- INIT ---------- */
function init() {
  applyTheme(CURRENT_THEME);
  loadData();

  // Decido se mostrare welcome o partire
  if (typeof isUnpaired === 'function' && isUnpaired()) {
    showWelcome();
  } else {
    onSyncReady();
  }

  // Listener per la glicemia
  const gv = document.getElementById('glucValue');
  if (gv) gv.addEventListener('input', showGlucFeedback);
  // Listener chetoni delegato
  document.addEventListener('click', function(e) {
    const chip = e.target.closest('.keto-chip');
    if (!chip || !chip.parentElement || chip.parentElement.id !== 'ketoGrid') return;
    if (typeof isPartnerMode === 'function' && isPartnerMode()) return;
    selectKeto(chip);
  });
  // Aggiorna l'header ogni minuto
  setInterval(renderHeader, 60000);
  // Aggiorna theme-color quando cambia prefers-color-scheme
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => updateThemeMeta(CURRENT_THEME));
  }
  // Service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner();
            }
          });
        });
      }).catch(err => console.warn('SW error', err));
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

function showUpdateBanner() {
  const b = document.getElementById('updateBanner');
  if (b) b.classList.add('show');
}
function applyUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  }
}

function onSyncReady() {
  // applico classi al body per stilizzare partner-mode
  document.body.classList.toggle('partner-mode', typeof isPartnerMode === 'function' && isPartnerMode());
  document.body.classList.toggle('owner-mode', typeof isOwnerMode === 'function' && isOwnerMode());
  renderHeader();
  renderHome();
  // se partner, avvia il polling dati
  if (typeof isPartnerMode === 'function' && isPartnerMode()) {
    startPartnerSync();
  }
  // polling note (sia owner che partner)
  if (typeof startNotePolling === 'function') {
    startNotePolling();
  }
}

document.addEventListener('DOMContentLoaded', init);
