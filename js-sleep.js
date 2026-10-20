/* KIN · Sonno
   - Registrazione a un tap: "si è addormentato" / "si è svegliato"
   - Ore dormite nelle ultime 24h confrontate con i range indicativi per età
   - Prossimo sonno come FASCIA oraria (finestra di veglia), tarata sui dati reali
   - Registro dei posamenti (quando riesce a restare nel lettino)

   Modello dati (nessun SQL nuovo, usa la tabella kin_events):
     kind 'sleep'    ts = inizio
                     data { end_ts|null, type:'nap'|'night', place, wakes:[ts|null,...] }
     kind 'putdown'  ts = quando l'ho posato
                     data { sleep_id, after_min, place, result:null|'stayed'|'woke' }

   Fonti dei range (indicativi, non diagnostici):
     - Ore totali: National Sleep Foundation (2015), concordi con AASM/AAP
       0-3 mesi 14-17 h · 4-11 mesi 12-15 h · 1-2 anni 11-14 h
     - Finestre di veglia: indicazioni di uso comune tra i pediatri del sonno.
       NON hanno una base scientifica forte: servono come guida di massima.
   ========================================================= */
'use strict';

const MIN_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;
const PUTDOWN_STAY_MIN = 20;   // dorme ancora dopo 20 min dal posamento = "resta giù"

const SLEEP_PLACES = {
  arms:    { label: 'In braccio',     short: 'braccio', ico: '🤱' },
  carrier: { label: 'In fascia',      short: 'fascia',  ico: '🧣' },
  crib:    { label: 'Lettino / culla', short: 'lettino', ico: '🛏️' },
  bed:     { label: 'Nel lettone',    short: 'lettone', ico: '🛌' },
  other:   { label: 'Altro',          short: 'altro',   ico: '✨' }
};
const SLEEP_PLACE_ORDER = ['arms', 'carrier', 'crib', 'bed', 'other'];

/* Ore totali nelle 24h, per mesi (età corretta fino a 2 anni) */
const SLEEP_TOTAL_REF = [
  { fromM: 0,  toM: 4,  min: 14, max: 17 },
  { fromM: 4,  toM: 12, min: 12, max: 15 },
  { fromM: 12, toM: 36, min: 11, max: 14 }
];

/* Finestre di veglia (minuti), numero di pisolini e durata tipica di un pisolino (napMin,
   stima = sonno diurno indicativo / n. pisolini), per mesi */
const WAKE_WINDOWS = [
  { fromM: 0,  toM: 1,  min: 30,  max: 60,  naps: '4-6', napMin: 85 },
  { fromM: 1,  toM: 2,  min: 45,  max: 60,  naps: '4-5', napMin: 80 },
  { fromM: 2,  toM: 3,  min: 60,  max: 90,  naps: '4-5', napMin: 60 },
  { fromM: 3,  toM: 5,  min: 90,  max: 150, naps: '3-4', napMin: 75 },
  { fromM: 5,  toM: 8,  min: 120, max: 180, naps: '2-3', napMin: 95 },
  { fromM: 8,  toM: 11, min: 150, max: 210, naps: '2', napMin: 105 },
  { fromM: 11, toM: 13, min: 180, max: 240, naps: '2', napMin: 100 }
];

const PUTDOWN_TIPS = [
  'Aspetta il sonno profondo: braccia e mani molli, respiro lento e regolare, niente più smorfie o palpebre che si muovono. Di solito sono 15-20 minuti dopo l\'addormentamento (indicativo: ogni bambino è diverso).',
  'Scendi piano, tenendolo contro il tuo corpo fino all\'ultimo: prima sedere e schiena, poi la testa. Lascia una mano sul petto per 30-60 secondi.',
  'Sempre a pancia in su, su una superficie piana e rigida, senza cuscini, paracolpi o peluche.',
  'Se si sveglia subito, non insistere in loop: riprova al prossimo sonno. Anche un pisolino in braccio è un buon pisolino.',
  'Molte famiglie iniziano con un solo sonno al giorno nel lettino, quello in cui è più stanco (spesso il primo del mattino o la sera), e lasciano gli altri in braccio o in fascia.'
];

/* ---------- ETÀ E RIFERIMENTI ---------- */

function sleepEligible(child) {
  if (!child) return false;
  const a = ageOf(child.birth_date);
  return !a.isNegative && a.totalDays < 1096;   // fino a 3 anni
}

/* Mesi (con decimali) per i range: età CORRETTA se prematuro e sotto i 2 anni */
function sleepAgeMonths(child) {
  const real = ageOf(child.birth_date);
  if (real.isNegative) return 0;
  let days = real.totalDays;
  if (child.due_date && real.totalDays < 730) {
    const c = correctedAge(child.birth_date, child.due_date);
    if (c) days = Math.max(0, c.totalDays);
  }
  return days / 30.4375;
}

function sleepTotalRefFor(months) {
  return SLEEP_TOTAL_REF.find(r => months >= r.fromM && months < r.toM) || SLEEP_TOTAL_REF[SLEEP_TOTAL_REF.length - 1];
}
function wakeWindowFor(months) {
  return WAKE_WINDOWS.find(r => months >= r.fromM && months < r.toM) || null;
}

/* ---------- FORMATTAZIONE ---------- */

function fmtDur(min) {
  min = Math.max(0, Math.round(min));
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}
function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function sleepTypeFor(ts) {
  const h = new Date(ts).getHours();
  return (h >= 19 || h < 6) ? 'night' : 'nap';
}

/* ---------- QUERY SUI DATI ---------- */

function sleepSessions(childId) {
  return eventsForChild(childId).filter(e => e.kind === 'sleep' && e.data).sort((a, b) => a.ts - b.ts);
}
function sleepEndTs(e) {
  return (e && e.data && e.data.end_ts != null) ? Number(e.data.end_ts) : null;
}
function sleepType(e) {
  return (e.data && e.data.type) || sleepTypeFor(e.ts);
}
function currentSleep(childId) {
  const open = sleepSessions(childId).filter(e => sleepEndTs(e) == null);
  return open.length ? open[open.length - 1] : null;
}
function lastWakeTs(childId) {
  let best = null;
  sleepSessions(childId).forEach(e => {
    const en = sleepEndTs(e);
    if (en != null && (best == null || en > best)) best = en;
  });
  return best;
}
function putdownsFor(childId) {
  return eventsForChild(childId).filter(e => e.kind === 'putdown' && e.data).sort((a, b) => b.ts - a.ts);
}
function latestPutdownForSleep(sleepId) {
  const list = DATA.events.filter(e => e.kind === 'putdown' && e.data && e.data.sleep_id === sleepId);
  list.sort((a, b) => b.ts - a.ts);
  return list[0] || null;
}
function median(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* Esito di un posamento: 'stayed' | 'woke' | 'pending' | 'unknown' */
function putdownResult(pd, now) {
  if (pd.data.result === 'stayed' || pd.data.result === 'woke') return pd.data.result;
  const s = DATA.events.find(e => e.id === pd.data.sleep_id && e.kind === 'sleep');
  if (!s) return 'unknown';
  const end = sleepEndTs(s);
  now = now || Date.now();
  if (end != null) return ((end - pd.ts) / MIN_MS) < PUTDOWN_STAY_MIN ? 'woke' : 'stayed';
  return ((now - pd.ts) / MIN_MS) >= PUTDOWN_STAY_MIN ? 'stayed' : 'pending';
}

/* ---------- CALCOLI ---------- */

function sleepTotals(childId, now) {
  const from = now - DAY_MS;
  let nap = 0, night = 0, firstTs = Infinity;
  sleepSessions(childId).forEach(e => {
    firstTs = Math.min(firstTs, e.ts);
    const en = sleepEndTs(e);
    const s = Math.max(e.ts, from);
    const t = Math.min(en != null ? en : now, now);
    if (t <= s) return;
    const min = (t - s) / MIN_MS;
    if (sleepType(e) === 'night') night += min; else nap += min;
  });
  return { nap, night, total: nap + night, complete: isFinite(firstTs) && (now - firstTs) >= DAY_MS };
}

function sleepTotalVerdict(totalMin, ref) {
  const h = totalMin / 60;
  if (h < ref.min) return { cls: 'low', text: 'sotto il range indicativo' };
  if (h > ref.max) return { cls: 'high', text: 'sopra il range indicativo' };
  return { cls: 'ok', text: 'nel range indicativo' };
}

function personalWakeWindows(childId, now) {
  const from = now - 7 * DAY_MS;
  const s = sleepSessions(childId).filter(x => sleepEndTs(x) != null);
  const out = [];
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1];
    if (b.ts < from) continue;
    if (sleepType(b) !== 'nap') continue;
    const gap = (b.ts - sleepEndTs(a)) / MIN_MS;
    if (gap >= 20 && gap <= 240) out.push(gap);
  }
  return out;
}

function averageNapMin(childId, now) {
  const from = now - 7 * DAY_MS;
  const durs = sleepSessions(childId)
    .filter(e => sleepEndTs(e) != null && e.ts >= from && sleepType(e) === 'nap')
    .map(e => (sleepEndTs(e) - e.ts) / MIN_MS)
    .filter(m => m >= 5 && m <= 240);
  return durs.length >= 3 ? durs.reduce((a, b) => a + b, 0) / durs.length : null;
}

/* I pisolini della giornata numerati in ordine: 1°, 2°, 3°... (giorno di calendario) */
function napsByDayIndexed(childId) {
  const naps = sleepSessions(childId).filter(e => sleepType(e) === 'nap');
  const counters = {};
  return naps.map(e => {
    const k = dateOf(e.ts);
    counters[k] = (counters[k] || 0) + 1;
    return { ev: e, idx: counters[k] };
  });
}

/* Durata media del 1°, 2°, 3°... pisolino negli ultimi 7 giorni */
function napAveragesByIndex(childId, now) {
  const from = now - 7 * DAY_MS;
  const groups = {};
  napsByDayIndexed(childId).forEach(r => {
    const en = sleepEndTs(r.ev);
    if (en == null || r.ev.ts < from) return;
    const m = (en - r.ev.ts) / MIN_MS;
    if (m >= 5 && m <= 240) (groups[r.idx] = groups[r.idx] || []).push(m);
  });
  return Object.keys(groups).map(Number).sort((a, b) => a - b).map(i => ({
    idx: i, n: groups[i].length, avg: groups[i].reduce((a, b) => a + b, 0) / groups[i].length
  }));
}

/* Previsione del prossimo sonno: fascia, non orario preciso */
function predictNextSleep(child, now) {
  const months = sleepAgeMonths(child);
  const ww = wakeWindowFor(months);
  if (!ww) return { kind: 'none' };
  const lastEnd = lastWakeTs(child.id);
  if (lastEnd == null) return { kind: 'nodata', ww };
  if (now - lastEnd > 5 * HOUR_MS) return { kind: 'stale', ww, lastEnd };

  let lo = ww.min, hi = ww.max, personal = false;
  const mine = personalWakeWindows(child.id, now);
  if (mine.length >= 5) {
    const mid = (ww.min + ww.max) / 2;
    const center = Math.min(ww.max * 1.5, Math.max(ww.min * 0.6, 0.7 * median(mine) + 0.3 * mid));
    lo = Math.round(center - 15);
    hi = Math.round(center + 15);
    personal = true;
  }
  return {
    kind: 'ok', ww, personal, n: mine.length, lo, hi, lastEnd,
    start: lastEnd + lo * MIN_MS,
    end: lastEnd + hi * MIN_MS
  };
}

function napStatus(startTs, endTs, now) {
  if (now < startTs) {
    const m = Math.ceil((startTs - now) / MIN_MS);
    const hh = new Date(startTs).getHours();
    const eve = (hh >= 19) ? ' · probabilmente la nanna della sera' : '';
    return { cls: 'before', big: 'tra ' + fmtDur(m), small: `Prossimo sonno · ${fmtTime(startTs)}-${fmtTime(endTs)}${eve}` };
  }
  if (now <= endTs) {
    return { cls: 'open', big: 'È il momento', small: `Finestra aperta fino alle ${fmtTime(endTs)}: prova a farlo dormire` };
  }
  const late = Math.round((now - endTs) / MIN_MS);
  return { cls: 'late', big: 'oltre di ' + fmtDur(late), small: 'Finestra superata: se è già agitato, prova subito a calmarlo e a farlo dormire' };
}

/* ---------- AZIONI AL TAP ---------- */

function sleepStart(place) {
  const child = getActiveChild();
  if (!child) return;
  if (currentSleep(child.id)) { toast('Un sonno è già in corso'); return; }
  const now = Date.now();
  const ev = {
    id: uid(), child_id: child.id, kind: 'sleep', ts: now,
    data: { end_ts: null, type: sleepTypeFor(now), place: SLEEP_PLACES[place] ? place : 'arms', wakes: [] }
  };
  DATA.events.push(ev);
  saveData();
  syncPushEvent(ev);
  refreshSleepViews();
}

function sleepWake() {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur) return;
  cur.data = Object.assign({}, cur.data, { end_ts: Date.now() });
  saveData();
  syncPushEvent(cur);
  refreshSleepViews();
}

function sleepBriefWake() {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur) return;
  const wakes = (cur.data.wakes || []).concat([Date.now()]);
  cur.data = Object.assign({}, cur.data, { wakes });
  saveData();
  syncPushEvent(cur);
  toast('Risveglio breve segnato');
  refreshSleepViews();
}

/* ---------- POSAMENTO ---------- */

function openPutdownSheet() {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur) { toast('Prima segna che si è addormentato'); return; }
  const after = Math.max(0, Math.round((Date.now() - cur.ts) / MIN_MS));

  let hint = '';
  if (after < 10) hint = 'È ancora presto: di solito conviene aspettare il sonno profondo (15-20 min). Decidi tu.';
  else if (after <= 25) hint = 'Ci siamo: guarda se braccia e mani sono molli e il respiro è lento e regolare.';

  document.getElementById('sheetTitle').textContent = 'Posamento';
  document.getElementById('sheetSub').textContent = child.name;
  document.getElementById('sheetBody').innerHTML = `
    <div class="phase-section-body">Addormentato da <strong>${after} min</strong>. Dove lo posi?</div>
    ${hint ? `<div class="ev-hint" style="margin:8px 0 0">${escapeHtml(hint)}</div>` : ''}
    <div class="sleep-places three" style="margin-top:14px">
      <button onclick="confirmPutdown('crib')"><span class="sp-ico">🛏️</span><span>Lettino / culla</span></button>
      <button onclick="confirmPutdown('bed')"><span class="sp-ico">🛌</span><span>Lettone</span></button>
      <button onclick="confirmPutdown('other')"><span class="sp-ico">✨</span><span>Altro</span></button>
    </div>
    <div class="ev-hint" style="margin-top:12px">L'esito lo capisco io: se dorme ancora dopo ${PUTDOWN_STAY_MIN} minuti vale come «resta giù», se si sveglia prima come «si è svegliato». Puoi correggerlo dopo.</div>
    <div class="phase-flag" style="margin-top:14px">Sicurezza: sempre a pancia in su, su superficie piana e rigida. Se si è addormentato in fascia o in braccio, tienilo d'occhio con il viso libero e il mento staccato dal petto. Se rischi di addormentarti tu, mai su divano o poltrona.</div>`;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function confirmPutdown(place) {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur) { closeSheet(); return; }
  const now = Date.now();
  const pd = {
    id: uid(), child_id: child.id, kind: 'putdown', ts: now,
    data: { sleep_id: cur.id, after_min: Math.max(0, Math.round((now - cur.ts) / MIN_MS)), place, result: null }
  };
  DATA.events.push(pd);
  cur.data = Object.assign({}, cur.data, { place });
  saveData();
  syncPushEvent(pd);
  syncPushEvent(cur);
  closeSheet();
  toast('Posato. Se si sveglia tocca «Si è svegliato»');
  refreshSleepViews();
}

let editingPutdownId = null;

function openPutdownEdit(id) {
  const pd = DATA.events.find(e => e.id === id && e.kind === 'putdown');
  if (!pd) return;
  editingPutdownId = id;
  const child = getChild(pd.child_id);
  document.getElementById('sheetTitle').textContent = 'Modifica posamento';
  document.getElementById('sheetSub').textContent = (child ? child.name + ' · ' : '') + fmtDateShort(new Date(pd.ts)) + ' ' + fmtTime(pd.ts);
  const res = pd.data.result || 'auto';
  const chip = (g, v, label, cur) => `<button type="button" class="ev-choice-btn ${cur === v ? 'selected' : ''}" data-g="${g}" data-v="${v}" onclick="setSleepChip('${g}','${v}')">${label}</button>`;
  document.getElementById('sheetBody').innerHTML = `
    <div class="ev-form">
      <label class="ev-label">Dopo quanti minuti dall'addormentamento</label>
      <input type="text" id="pdAfter" class="ev-input" inputmode="numeric" value="${pd.data.after_min != null ? pd.data.after_min : ''}">
      <label class="ev-label">Dove</label>
      <div class="ev-choice">${chip('pdPlace', 'crib', '🛏️ Lettino', pd.data.place)}${chip('pdPlace', 'bed', '🛌 Lettone', pd.data.place)}${chip('pdPlace', 'other', '✨ Altro', pd.data.place)}</div>
      <label class="ev-label">Com'è andata</label>
      <div class="ev-choice">${chip('pdRes', 'auto', 'Automatico', res)}${chip('pdRes', 'stayed', 'Resta giù', res)}${chip('pdRes', 'woke', 'Si è svegliato', res)}</div>
      <input type="hidden" id="pdPlaceV" value="${pd.data.place || 'crib'}">
      <input type="hidden" id="pdResV" value="${res}">
      <div class="ev-actions">
        <button class="ev-delete" onclick="deletePutdown('${pd.id}')">Elimina</button>
        <button class="ev-save" onclick="savePutdownEdit()">Salva</button>
      </div>
    </div>`;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function savePutdownEdit() {
  const pd = DATA.events.find(e => e.id === editingPutdownId && e.kind === 'putdown');
  if (!pd) { closeSheet(); return; }
  const after = parseInt(document.getElementById('pdAfter').value, 10);
  const place = document.getElementById('pdPlaceV').value || 'crib';
  const res = document.getElementById('pdResV').value;
  pd.data = Object.assign({}, pd.data, {
    after_min: isNaN(after) ? pd.data.after_min : Math.max(0, after),
    place,
    result: (res === 'stayed' || res === 'woke') ? res : null
  });
  saveData();
  syncPushEvent(pd);
  editingPutdownId = null;
  closeSheet();
  toast('Salvato');
  refreshSleepViews();
}

function deletePutdown(id) {
  showConfirm('Cancellare il posamento?', 'L\'azione non si può annullare.', () => {
    const pd = DATA.events.find(e => e.id === id);
    if (!pd) return;
    DATA.events = DATA.events.filter(e => e.id !== id);
    saveData();
    syncDeleteEvent(pd.child_id, id);
    editingPutdownId = null;
    closeSheet();
    toast('Cancellato');
    refreshSleepViews();
  });
}

/* chip generico dentro i form (seleziona e scrive nel campo nascosto) */
function setSleepChip(group, val) {
  document.querySelectorAll('.ev-choice-btn[data-g="' + group + '"]').forEach(b => b.classList.toggle('selected', b.dataset.v === val));
  const hidden = document.getElementById(group + 'V');
  if (hidden) hidden.value = val;
}

/* ---------- FORM SESSIONE (aggiungi / modifica) ---------- */

let editingSleepId = null;

function _dtParts(ts) {
  const d = new Date(ts);
  return { date: dateOf(ts), time: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') };
}
function _dtParse(dateStr, timeStr) {
  const d = parseDateStr(dateStr);
  if (!d) return NaN;
  const [h, m] = String(timeStr || '00:00').split(':');
  d.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
  return d.getTime();
}

function openSleepForm(evId) {
  const child = getActiveChild();
  if (!child) { toast('Aggiungi prima un figlio'); return; }
  const ex = evId ? DATA.events.find(e => e.id === evId && e.kind === 'sleep') : null;
  editingSleepId = ex ? ex.id : null;

  const now = Date.now();
  const startTs = ex ? ex.ts : now - HOUR_MS;
  const endTs = ex ? sleepEndTs(ex) : now;
  const ongoing = ex ? endTs == null : false;
  const type = ex ? sleepType(ex) : sleepTypeFor(startTs);
  const place = ex ? (ex.data.place || 'arms') : 'arms';
  const wakesN = ex ? (ex.data.wakes || []).length : 0;
  const sp = _dtParts(startTs), ep = _dtParts(endTs != null ? endTs : now);
  const chip = (g, v, label, cur) => `<button type="button" class="ev-choice-btn ${cur === v ? 'selected' : ''}" data-g="${g}" data-v="${v}" onclick="setSleepChip('${g}','${v}')">${label}</button>`;

  document.getElementById('sheetTitle').textContent = ex ? 'Modifica sonno' : 'Aggiungi sonno';
  document.getElementById('sheetSub').textContent = child.name;
  document.getElementById('sheetBody').innerHTML = `
    <div class="ev-form">
      <label class="ev-label">Tipo</label>
      <div class="ev-choice">${chip('slType', 'nap', '☀️ Pisolino', type)}${chip('slType', 'night', '🌙 Notte', type)}</div>
      <input type="hidden" id="slTypeV" value="${type}">
      <label class="ev-label">Dove dorme</label>
      <div class="ev-choice">${SLEEP_PLACE_ORDER.map(k => chip('slPlace', k, SLEEP_PLACES[k].ico + ' ' + SLEEP_PLACES[k].short, place)).join('')}</div>
      <input type="hidden" id="slPlaceV" value="${place}">
      <label class="ev-label">Si è addormentato</label>
      <div class="ev-form-row two">
        <input type="date" id="slSD" class="ev-input" value="${sp.date}">
        <input type="time" id="slST" class="ev-input" value="${sp.time}">
      </div>
      <label class="ev-label">Si è svegliato</label>
      <div class="ev-form-row two">
        <input type="date" id="slED" class="ev-input" value="${ep.date}">
        <input type="time" id="slET" class="ev-input" value="${ep.time}">
      </div>
      <label class="sleep-check"><input type="checkbox" id="slOngoing" ${ongoing ? 'checked' : ''}> sta ancora dormendo</label>
      <label class="ev-label">Risvegli brevi (si è riaddormentato subito)</label>
      <input type="text" id="slWakes" class="ev-input" inputmode="numeric" value="${wakesN}">
      <label class="ev-label">Nota (opzionale)</label>
      <textarea id="slNote" class="ev-input" rows="2" maxlength="300">${escapeHtml(ex?.note || '')}</textarea>
      <div class="ev-actions">
        ${ex ? `<button class="ev-delete" onclick="deleteSleep('${ex.id}')">Elimina</button>` : ''}
        <button class="ev-save" onclick="saveSleepForm()">${ex ? 'Salva' : 'Aggiungi'}</button>
      </div>
    </div>`;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function saveSleepForm() {
  const child = getActiveChild();
  if (!child) return;
  const startTs = _dtParse(document.getElementById('slSD').value, document.getElementById('slST').value);
  if (isNaN(startTs)) { toast('Manca l\'ora di addormentamento'); return; }
  if (startTs > Date.now() + 5 * MIN_MS) { toast('L\'addormentamento è nel futuro'); return; }

  const ongoing = document.getElementById('slOngoing').checked;
  let endTs = null;
  if (!ongoing) {
    endTs = _dtParse(document.getElementById('slED').value, document.getElementById('slET').value);
    if (isNaN(endTs)) { toast('Manca l\'ora di risveglio'); return; }
    if (endTs <= startTs) { toast('Il risveglio deve essere dopo l\'addormentamento'); return; }
    if (endTs - startTs > 20 * HOUR_MS) { toast('Più di 20 ore di fila: controlla le date'); return; }
  } else {
    const other = currentSleep(child.id);
    if (other && other.id !== editingSleepId) { toast('C\'è già un sonno in corso'); return; }
  }

  const type = document.getElementById('slTypeV').value || sleepTypeFor(startTs);
  const place = document.getElementById('slPlaceV').value || 'arms';
  const wantN = Math.max(0, parseInt(document.getElementById('slWakes').value, 10) || 0);
  const note = (document.getElementById('slNote').value || '').trim();

  const ex = editingSleepId ? DATA.events.find(e => e.id === editingSleepId && e.kind === 'sleep') : null;
  let wakes = ex ? (ex.data.wakes || []).slice() : [];
  if (wantN < wakes.length) wakes = wakes.slice(0, wantN);
  while (wakes.length < wantN) wakes.push(null);

  let ev;
  if (ex) {
    ex.ts = startTs;
    ex.data = Object.assign({}, ex.data, { end_ts: endTs, type, place, wakes });
    ex.note = note || undefined;
    ev = ex;
  } else {
    ev = {
      id: uid(), child_id: child.id, kind: 'sleep', ts: startTs,
      data: { end_ts: endTs, type, place, wakes },
      note: note || undefined
    };
    DATA.events.push(ev);
  }
  saveData();
  syncPushEvent(ev);
  editingSleepId = null;
  closeSheet();
  toast('Salvato');
  refreshSleepViews();
}

function deleteSleep(id) {
  showConfirm('Cancellare questo sonno?', 'L\'azione non si può annullare.', () => {
    const ev = DATA.events.find(e => e.id === id && e.kind === 'sleep');
    if (!ev) return;
    // I posamenti collegati conservano l'esito già calcolato
    DATA.events.filter(e => e.kind === 'putdown' && e.data && e.data.sleep_id === id).forEach(pd => {
      const r = putdownResult(pd);
      if (r === 'stayed' || r === 'woke') {
        pd.data = Object.assign({}, pd.data, { result: r });
        syncPushEvent(pd);
      }
    });
    DATA.events = DATA.events.filter(e => e.id !== id);
    saveData();
    syncDeleteEvent(ev.child_id, id);
    editingSleepId = null;
    closeSheet();
    toast('Cancellato');
    refreshSleepViews();
  });
}

/* ---------- RENDER: CARD (home e pagina sonno) ---------- */

/* Durata "tipica" del pisolino in corso. In ordine di preferenza:
   1) la media dei suoi pisolini nella STESSA posizione della giornata (1°, 2°, 3°...),
      se ne ha almeno 3 negli ultimi 7 giorni
   2) la media di tutti i suoi pisolini, se sono almeno 3
   3) una stima dai riferimenti per età (indicativa) */
function typicalNapMin(child, now, cur) {
  const r5 = m => Math.max(5, Math.round(m / 5) * 5);
  if (cur) {
    const me = napsByDayIndexed(child.id).find(x => x.ev.id === cur.id);
    if (me) {
      const row = napAveragesByIndex(child.id, now).find(x => x.idx === me.idx);
      if (row && row.n >= 3) return { min: r5(row.avg), kind: 'index', idx: me.idx };
    }
  }
  const avg = averageNapMin(child.id, now);
  if (avg) return { min: r5(avg), kind: 'all' };
  const ww = wakeWindowFor(sleepAgeMonths(child));
  return ww ? { min: ww.napMin, kind: 'ref' } : null;
}

function pctClamp(x) { return Math.max(0, Math.min(100, x)); }

function dayBarModel(totalMin, ref, complete) {
  const scale = ref.max + 2;                         // ore: un po' di margine oltre il massimo
  const hours = totalMin / 60;
  const verdict = complete ? sleepTotalVerdict(totalMin, ref) : null;
  return {
    fill: pctClamp(hours / scale * 100),
    bandLeft: ref.min / scale * 100,
    bandWidth: (ref.max - ref.min) / scale * 100,
    verdict
  };
}

function renderDayBar(child, now, ref) {
  const tot = sleepTotals(child.id, now);
  const m = dayBarModel(tot.total, ref, tot.complete);
  return `<div class="sleep-day js-sleep-day" data-child="${child.id}" data-min="${ref.min}" data-max="${ref.max}">
    <div class="sleep-day-head">
      <span class="sd-lbl">Sonno nelle ultime 24 h</span>
      <span class="sd-val"><strong class="js-day-val">${fmtDur(tot.total)}</strong> su ${ref.min}-${ref.max} h</span>
    </div>
    <div class="sbar"><i class="js-day-fill" style="width:${m.fill.toFixed(1)}%"></i><b class="sband" style="left:${m.bandLeft.toFixed(1)}%;width:${m.bandWidth.toFixed(1)}%"></b></div>
    <div class="sd-note js-day-note ${m.verdict ? m.verdict.cls : ''}">${m.verdict ? m.verdict.text : 'Il confronto parte dopo un giorno intero di registrazioni'}</div>
  </div>`;
}

function renderSleepCard(child, inPage) {
  const now = Date.now();
  const cur = currentSleep(child.id);
  const months = sleepAgeMonths(child);
  const ref = sleepTotalRefFor(months);
  let h = `<div class="sleep-card ${cur ? 'is-sleeping' : ''}">`;

  if (cur) {
    const place = SLEEP_PLACES[cur.data.place] || SLEEP_PLACES.other;
    const wakesN = (cur.data.wakes || []).length;
    const pd = latestPutdownForSleep(cur.id);
    const isNap = sleepType(cur) === 'nap';
    h += `<div class="sleep-top">
        <div class="sleep-state-lbl">${isNap ? '😴 Pisolino in corso' : '🌙 Notte in corso'}</div>
        <button class="sleep-edit" onclick="openSleepForm('${cur.id}')">modifica</button>
      </div>
      <div class="sleep-timer js-sleep-tick" data-fmt="timer" data-since="${cur.ts}">${fmtElapsed(now - cur.ts)}</div>`;

    const typ = isNap ? typicalNapMin(child, now, cur) : null;
    if (typ) {
      const full = typ.min * MIN_MS;
      const pct = pctClamp((now - cur.ts) / full * 100);
      h += `<div class="sbar nap"><i class="js-nap-fill ${now - cur.ts >= full ? 'over' : ''}" data-since="${cur.ts}" data-full="${full}" style="width:${Math.max(2, pct).toFixed(1)}%"></i></div>
        <div class="sbar-labels"><span>dalle ${fmtTime(cur.ts)}</span><span>${typ.kind === 'index' ? `media dei suoi ${typ.idx}° pisolini` : (typ.kind === 'all' ? 'media dei suoi pisolini' : 'pisolino tipico per l\'età')}: ~${fmtDur(typ.min)}</span></div>`;
    } else {
      h += `<div class="sbar-labels"><span>dalle ${fmtTime(cur.ts)}</span><span></span></div>`;
    }

    h += `<div class="sleep-chips">
        <span class="chip">${place.ico} ${place.label}</span>
        ${wakesN ? `<span class="chip">👁️ ${wakesN} ${wakesN === 1 ? 'risveglio breve' : 'risvegli brevi'}</span>` : ''}
      </div>`;
    if (pd) {
      h += `<div class="sleep-sub">Posato alle ${fmtTime(pd.ts)} (dopo ${pd.data.after_min} min). Se si sveglia, tocca «Si è svegliato».</div>`;
    }
    if (cur.data.place === 'bed') {
      h += `<div class="sleep-sub">Nel lettone: niente cuscini o coperte vicino a lui e, se puoi, rimettilo nel suo spazio appena possibile.</div>`;
    }
    h += `<button class="sleep-main-btn wake" onclick="sleepWake()">☀️ Si è svegliato</button>
      <div class="sleep-actions">
        <button onclick="openPutdownSheet()">🛏️ L'ho posato</button>
        <button onclick="sleepBriefWake()">👁️ Risveglio breve</button>
      </div>`;
  } else {
    const lastEnd = lastWakeTs(child.id);
    h += `<div class="sleep-top"><div class="sleep-state-lbl">☀️ Sveglio${lastEnd ? ` da <span class="js-sleep-tick" data-fmt="dur" data-since="${lastEnd}">${fmtDur((now - lastEnd) / MIN_MS)}</span>` : ''}</div></div>`;

    const pred = predictNextSleep(child, now);
    if (pred.kind === 'ok') {
      const st = napStatus(pred.start, pred.end, now);
      const scale = pred.hi * 1.3 * MIN_MS;
      const pct = pctClamp((now - pred.lastEnd) / scale * 100);
      const bandL = pred.lo / (pred.hi * 1.3) * 100, bandW = (pred.hi - pred.lo) / (pred.hi * 1.3) * 100;
      h += `<div class="sleep-next ${st.cls} js-sleep-next" data-start="${pred.start}" data-end="${pred.end}" data-since="${pred.lastEnd}" data-scale="${scale}">
          <div class="sn-big js-sn-big">${escapeHtml(st.big)}</div>
          <div class="sn-small js-sn-small">${escapeHtml(st.small)}</div>
          <div class="sbar awake"><i class="js-awake-fill" style="width:${Math.max(2, pct).toFixed(1)}%"></i><b class="sband" style="left:${bandL.toFixed(1)}%;width:${bandW.toFixed(1)}%"></b></div>
          <div class="sbar-labels"><span>risveglio ${fmtTime(pred.lastEnd)}</span><span>fascia ${pred.lo}-${pred.hi} min di veglia</span></div>
        </div>`;
      h += `<div class="sleep-sub">${pred.personal
        ? `Fascia tarata sui suoi ultimi ${pred.n} pisolini.`
        : 'Fascia indicativa per questa età. Si affina da sola dopo qualche giorno di registrazioni.'}</div>`;
    } else if (pred.kind === 'stale') {
      h += `<div class="sleep-sub">Ultimo risveglio registrato alle ${fmtTime(pred.lastEnd)}. Se ha dormito dopo, aggiungilo con «+ sonno».</div>`;
    } else if (pred.kind === 'nodata') {
      h += `<div class="sleep-sub">Segna il primo sonno: da lì calcolo la fascia del prossimo.</div>`;
    }

    h += `<div class="sleep-start-label">Si è addormentato…</div>
      <div class="sleep-places">
        ${SLEEP_PLACE_ORDER.map(k => `<button onclick="sleepStart('${k}')"><span class="sp-ico">${SLEEP_PLACES[k].ico}</span><span>${SLEEP_PLACES[k].short}</span></button>`).join('')}
      </div>`;
  }

  h += renderDayBar(child, now, ref);

  if (!inPage) {
    h += `<button class="sleep-more" onclick="goTo('sonno')">Posamenti, orari e consigli ›</button>`;
  }
  h += `</div>`;
  return h;
}

/* ---------- RENDER: PAGINA SONNO ---------- */

function renderSleepPage() {
  const c = document.getElementById('sleepContent');
  if (!c) return;
  const child = getActiveChild();
  if (!child) { c.innerHTML = renderEmptyHome(); return; }

  let html = `<button class="back-link" onclick="goTo('home')">‹ Home</button>`;
  html += renderChildSwitcher();
  html += `<div class="hdr-block">
    <div class="hdr-eyebrow">sonno</div>
    <h1 class="hdr-title">${escapeHtml(child.name)}</h1>
  </div>`;

  if (!sleepEligible(child)) {
    html += `<div class="empty-card"><div class="empty-text">Il registro del sonno è pensato per i bambini fino a 3 anni.</div></div>`;
    c.innerHTML = html;
    return;
  }

  const now = Date.now();
  const months = sleepAgeMonths(child);
  const ref = sleepTotalRefFor(months);
  const ww = wakeWindowFor(months);
  const real = ageOf(child.birth_date);
  const usesCorrected = child.due_date && real.totalDays < 730 && correctedAge(child.birth_date, child.due_date);

  html += renderSleepCard(child, true);

  // Riferimenti per età
  html += `<div class="card-eyebrow eb-spaced">per la sua età${usesCorrected ? ' (corretta)' : ''}</div>
    <div class="sleep-ref">
      <div><span class="sr-num">${ref.min}-${ref.max} h</span><span class="sr-lbl">sonno totale nelle 24 h</span></div>
      ${ww ? `<div><span class="sr-num">${ww.min}-${ww.max} min</span><span class="sr-lbl">veglia tra un sonno e l'altro</span></div>
      <div><span class="sr-num">${ww.naps}</span><span class="sr-lbl">pisolini al giorno</span></div>` : ''}
    </div>
    <div class="ev-hint" style="margin:6px 4px 0">Sono medie, non regole: l'età è quella corretta se è nato prematuro. Le finestre di veglia sono una guida di uso comune, non hanno una base scientifica forte.</div>`;

  // Durata dei pisolini per posizione nella giornata
  html += renderNapAveragesSection(child, now);

  // Posamenti
  html += renderPutdownSection(child, now);

  // Dove dorme (7 giorni)
  html += renderPlaceSection(child, now);

  // Cosa aspettarti (fasi sul sonno)
  const phases = (typeof getCurrentPhases === 'function') ? getCurrentPhases(child, 'sleep') : [];
  if (phases.length) {
    html += `<div class="card-eyebrow eb-spaced">cosa aspettarti sul sonno</div><div class="phase-list-wrap">`;
    phases.forEach(p => { html += renderPhaseTeaser(p); });
    html += `</div>`;
  }

  // Storico
  html += renderSleepHistory(child, now);

  html += `<div class="phase-flag" style="margin-top:22px"><strong>Quando chiamare il pediatra —</strong> respiro affannoso o con pause lunghe, colorito pallido o bluastro, pianto inconsolabile e diverso dal solito, vomito ripetuto, difficoltà a svegliarlo per mangiare, febbre (sotto i 3 mesi anche 38 °C va valutata subito). Se non risponde o è bluastro, chiama il 112.</div>`;
  html += `<div class="ev-hint" style="margin:10px 4px 0">Sicurezza del sonno (AAP): sempre a pancia in su, su superficie piana e rigida, senza cuscini o peluche. Se si addormenta in fascia o in braccio, spostalo appena puoi. Mai addormentarsi con lui su divano o poltrona. Nel lettone l'AAP sconsiglia di dormire insieme nei primi mesi e nei nati prematuri: il rischio è più alto sotto i 4 mesi ed è molto più alto se un adulto ha bevuto alcol, preso farmaci che appesantiscono il sonno o fuma. La soluzione che l'AAP indica è tenere il suo spazio vicino al vostro letto (stanza condivisa, letto separato) per almeno 6 mesi.</div>`;

  c.innerHTML = html;
}

function renderNapAveragesSection(child, now) {
  const rows = napAveragesByIndex(child.id, now).filter(r => r.n >= 2);
  if (!rows.length) return '';
  const max = Math.max(...rows.map(r => r.avg));
  let h = `<div class="card-eyebrow eb-spaced">durata dei pisolini · ultimi 7 giorni</div><div class="sleep-panel"><div class="pd-table">`;
  rows.forEach(r => {
    h += `<div class="pd-row wide"><span class="pd-lbl">${r.idx}° · ${r.n} volte</span><span class="pd-bar"><i style="width:${Math.round(100 * r.avg / max)}%"></i></span><span class="pd-val">${fmtDur(r.avg)}</span></div>`;
  });
  h += `</div><div class="ev-hint">Il numero è la posizione nella giornata. Se un pisolino non viene segnato, quelli dopo si spostano: puoi recuperarlo con «+ sonno».</div></div>`;
  return h;
}

function renderPutdownSection(child, now) {
  const pds = putdownsFor(child.id).map(p => ({ p, res: putdownResult(p, now) }));
  const bedN = pds.filter(x => x.p.data.place === 'bed').length;
  const resolved = pds.filter(x => (x.res === 'stayed' || x.res === 'woke') && x.p.data.place !== 'bed');
  const stayed = resolved.filter(x => x.res === 'stayed').length;

  let h = `<div class="card-eyebrow eb-spaced">posarlo senza svegliarlo</div><div class="sleep-panel">`;

  if (resolved.length === 0) {
    h += `<div class="sp-text">Quando si addormenta in braccio, tocca «L'ho posato» al momento giusto: segno dopo quanti minuti l'hai fatto e come è andata. Dopo una decina di tentativi vedi quando ha più probabilità di restare giù.</div>`;
  } else {
    h += `<div class="sp-text"><strong>${stayed} su ${resolved.length}</strong> posamenti riusciti (restava giù almeno ${PUTDOWN_STAY_MIN} min).</div>`;

    const buckets = [
      { label: 'meno di 10 min', a: 0, b: 10 },
      { label: '10-14 min', a: 10, b: 15 },
      { label: '15-19 min', a: 15, b: 20 },
      { label: '20-29 min', a: 20, b: 30 },
      { label: '30 min o più', a: 30, b: 1e9 }
    ].map(bk => {
      const list = resolved.filter(x => x.p.data.after_min >= bk.a && x.p.data.after_min < bk.b);
      return Object.assign(bk, { n: list.length, ok: list.filter(x => x.res === 'stayed').length });
    });
    h += `<div class="pd-table">`;
    buckets.forEach(bk => {
      if (!bk.n) return;
      const pct = Math.round(100 * bk.ok / bk.n);
      h += `<div class="pd-row"><span class="pd-lbl">dopo ${bk.label}</span><span class="pd-bar"><i style="width:${pct}%"></i></span><span class="pd-val">${bk.ok}/${bk.n}</span></div>`;
    });
    h += `</div>`;

    if (resolved.length >= 8) {
      const cands = buckets.filter(bk => bk.n >= 3).sort((x, y) => (y.ok / y.n) - (x.ok / x.n) || y.n - x.n);
      if (cands.length) {
        const best = cands[0];
        h += `<div class="sp-insight">Finora funziona meglio posarlo <strong>dopo ${best.label}</strong> (${best.ok} su ${best.n}). Sono pochi dati: prendilo come indicazione, non come regola.</div>`;
      }
    } else {
      h += `<div class="ev-hint">Ancora pochi tentativi (${resolved.length}): ne servono almeno 8 per un'indicazione.</div>`;
    }
  }

  if (bedN > 0) {
    h += `<div class="ev-hint">I posamenti nel lettone (${bedN}) restano nell'elenco ma non entrano nelle percentuali, che servono a capire il lettino.</div>`;
  }

  const recent = pds.slice(0, 6);
  if (recent.length) {
    h += `<div class="pd-list">`;
    recent.forEach(({ p, res }) => {
      const resTxt = { stayed: '✓ resta giù', woke: '✗ si è svegliato', pending: '… in corso', unknown: '?' }[res];
      const where = (SLEEP_PLACES[p.data.place] || SLEEP_PLACES.other).ico;
      h += `<button class="pd-item ${res}" onclick="openPutdownEdit('${p.id}')">
        <span>${fmtDateShort(new Date(p.ts))} ${fmtTime(p.ts)} · dopo ${p.data.after_min} min ${where}</span><span>${resTxt}</span></button>`;
    });
    h += `</div>`;
  }

  h += `<details class="sleep-tips"><summary>Come posarlo: consigli</summary><ul class="phase-list">`;
  PUTDOWN_TIPS.forEach(t => { h += `<li>${escapeHtml(t)}</li>`; });
  h += `</ul>
    <div class="ev-hint">Sono consigli comuni, non garanzie: per questo li misuriamo sui vostri tentativi.</div>
    </details></div>`;
  return h;
}

function renderPlaceSection(child, now) {
  const from = now - 7 * DAY_MS;
  const mins = { arms: 0, carrier: 0, crib: 0, bed: 0, other: 0 };
  let total = 0;
  sleepSessions(child.id).forEach(e => {
    const s = Math.max(e.ts, from);
    const en = sleepEndTs(e);
    const t = Math.min(en != null ? en : now, now);
    if (t <= s) return;
    const m = (t - s) / MIN_MS;
    const k = mins[e.data.place] != null ? e.data.place : 'other';
    mins[k] += m; total += m;
  });
  if (total < 60) return '';
  let h = `<div class="card-eyebrow eb-spaced">dove ha dormito · ultimi 7 giorni</div><div class="sleep-panel"><div class="pd-table">`;
  SLEEP_PLACE_ORDER.forEach(k => {
    if (!mins[k]) return;
    const pct = Math.round(100 * mins[k] / total);
    h += `<div class="pd-row"><span class="pd-lbl">${SLEEP_PLACES[k].ico} ${SLEEP_PLACES[k].short}</span><span class="pd-bar"><i style="width:${pct}%"></i></span><span class="pd-val">${pct}%</span></div>`;
  });
  h += `</div><div class="ev-hint">Serve a vedere i progressi verso il lettino, settimana dopo settimana.</div></div>`;
  return h;
}

function renderSleepHistory(child, now) {
  const from = now - 14 * DAY_MS;
  const list = sleepSessions(child.id).filter(e => e.ts >= from).sort((a, b) => b.ts - a.ts);
  let h = `<div class="card-eyebrow eb-spaced">ultimi sonni</div>
    <button class="diary-add-btn sleep-add" onclick="openSleepForm()">+ sonno (a mano)</button>`;
  if (!list.length) {
    return h + `<div class="empty-card" style="margin-top:10px"><div class="empty-text">Ancora niente. Usa i tasti qui sopra, oppure aggiungi un sonno a mano.</div></div>`;
  }
  const byDay = {};
  list.forEach(e => { (byDay[dateOf(e.ts)] = byDay[dateOf(e.ts)] || []).push(e); });
  Object.keys(byDay).sort((a, b) => b.localeCompare(a)).forEach(dayKey => {
    const items = byDay[dayKey];
    const dayMin = items.reduce((s, e) => {
      const en = sleepEndTs(e);
      return s + ((en != null ? en : now) - e.ts) / MIN_MS;
    }, 0);
    let label = fmtDateLong(parseDateStr(dayKey));
    if (dayKey === todayStr()) label = 'oggi';
    else if (dayKey === dateOf(now - DAY_MS)) label = 'ieri';
    h += `<div class="tk-day-eyebrow">${label} · ${fmtDur(dayMin)}</div>`;
    items.forEach(e => {
      const en = sleepEndTs(e);
      const place = SLEEP_PLACES[e.data.place] || SLEEP_PLACES.other;
      const wakesN = (e.data.wakes || []).length;
      const wakeTimes = (e.data.wakes || []).filter(Boolean).map(fmtTime).join(', ');
      h += `<div class="tk-row" onclick="openSleepForm('${e.id}')">
        <div class="tk-row-icon">${sleepType(e) === 'night' ? '🌙' : '😴'}</div>
        <div class="tk-row-body">
          <div class="tk-row-head">
            <span class="tk-row-label">${fmtTime(e.ts)} → ${en != null ? fmtTime(en) : 'in corso'}</span>
            <span class="tk-row-time">${fmtDur(((en != null ? en : now) - e.ts) / MIN_MS)}</span>
          </div>
          <div class="tk-row-desc">${place.ico} ${place.short}${wakesN ? ` · ${wakesN} ${wakesN === 1 ? 'risveglio breve' : 'risvegli brevi'}${wakeTimes ? ' (' + wakeTimes + ')' : ''}` : ''}</div>
          ${e.note ? `<div class="tk-row-note">"${escapeHtml(e.note)}"</div>` : ''}
        </div>
      </div>`;
    });
  });
  return h;
}

/* ---------- AGGIORNAMENTO VISTE + TIMER ---------- */

function renderSleepPageIfActive() {
  if (document.getElementById('sec-sonno')?.classList.contains('active')) renderSleepPage();
}
function refreshSleepViews() {
  if (document.getElementById('sec-home')?.classList.contains('active')) renderHome();
  renderSleepPageIfActive();
}

/* Aggiorna solo testi e larghezze (mai i bottoni: ridisegnarli mentre li tocchi fa perdere i tap) */
let _sleepTickN = 0;

function updateNextBlock(el, now) {
  const start = Number(el.dataset.start), end = Number(el.dataset.end);
  const since = Number(el.dataset.since), scale = Number(el.dataset.scale);
  const st = napStatus(start, end, now);
  el.className = 'sleep-next ' + st.cls + ' js-sleep-next';
  const big = el.querySelector('.js-sn-big'), small = el.querySelector('.js-sn-small'), fill = el.querySelector('.js-awake-fill');
  if (big) big.textContent = st.big;
  if (small) small.textContent = st.small;
  if (fill) fill.style.width = Math.max(2, pctClamp((now - since) / scale * 100)).toFixed(1) + '%';
}

function updateDayBar(el, now) {
  const child = getChild(el.dataset.child);
  if (!child) return;
  const ref = { min: Number(el.dataset.min), max: Number(el.dataset.max) };
  const tot = sleepTotals(child.id, now);
  const m = dayBarModel(tot.total, ref, tot.complete);
  const val = el.querySelector('.js-day-val'), fill = el.querySelector('.js-day-fill'), note = el.querySelector('.js-day-note');
  if (val) val.textContent = fmtDur(tot.total);
  if (fill) fill.style.width = m.fill.toFixed(1) + '%';
  if (note) {
    note.textContent = m.verdict ? m.verdict.text : 'Il confronto parte dopo un giorno intero di registrazioni';
    note.className = 'sd-note js-day-note ' + (m.verdict ? m.verdict.cls : '');
  }
}

function sleepTick() {
  if (document.hidden) return;
  const now = Date.now();
  _sleepTickN++;
  document.querySelectorAll('.js-sleep-tick').forEach(el => {
    const since = Number(el.dataset.since);
    el.textContent = el.dataset.fmt === 'timer' ? fmtElapsed(now - since) : fmtDur((now - since) / MIN_MS);
  });
  document.querySelectorAll('.js-sleep-next').forEach(el => updateNextBlock(el, now));
  document.querySelectorAll('.js-nap-fill').forEach(el => {
    const since = Number(el.dataset.since), full = Number(el.dataset.full);
    el.style.width = Math.max(2, pctClamp((now - since) / full * 100)).toFixed(1) + '%';
    el.classList.toggle('over', now - since >= full);
  });
  if (_sleepTickN % 15 === 0) document.querySelectorAll('.js-sleep-day').forEach(el => updateDayBar(el, now));
}
setInterval(sleepTick, 1000);
