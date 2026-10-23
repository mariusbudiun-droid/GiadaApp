/* KIN · Sonno
   - Registrazione a un tap: "si è addormentato" / "si è svegliato"
   - Ore dormite nelle ultime 24h confrontate con i range indicativi per età
   - Prossimo sonno come FASCIA oraria (finestra di veglia), tarata sui dati reali
   - Registro dei posamenti (quando riesce a restare nel lettino)

   Modello dati (nessun SQL nuovo, usa la tabella kin_events):
     kind 'sleep'    ts = inizio
                     data { end_ts|null, type:'nap'|'night', place,
                            pauses:[{s, e|null}, ...] }   // pause = è sveglio dentro il sonno
                     (formato vecchio: wakes:[ts|null,...], ancora letto: ogni voce = pausa breve)
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
/* ---------- PAUSE (è sveglio dentro un sonno: poppata, pianto, cambio...) ---------- */

function sessionPauses(e) {
  const d = e.data || {};
  if (Array.isArray(d.pauses)) {
    return d.pauses.map(p => ({ s: Number(p.s), e: p.e != null ? Number(p.e) : null }));
  }
  // formato vecchio (v0.5.x): risvegli brevi = solo orari
  return (d.wakes || []).map(w => { const t = (w != null) ? Number(w) : e.ts; return { s: t, e: t }; });
}
function openPauseOf(e) {
  return sessionPauses(e).find(p => p.e == null) || null;
}
/* Converte il formato vecchio in pauses prima di modificare */
function ensurePauses(e) {
  if (Array.isArray(e.data.pauses)) return;
  e.data = Object.assign({}, e.data, { pauses: sessionPauses(e).map(p => ({ s: p.s, e: p.e })), wakes: [] });
}
/* minuti di pausa dentro [from, to] */
function pauseMinIn(e, from, to, now) {
  let ms = 0;
  sessionPauses(e).forEach(p => {
    const pe = p.e != null ? p.e : now;
    const a = Math.max(p.s, from), b = Math.min(pe, to);
    if (b > a) ms += b - a;
  });
  return ms / MIN_MS;
}
/* Minuti di sonno EFFETTIVO (durata meno pause) dentro [from, to] */
function sleepNetMin(e, from, to, now) {
  now = now || Date.now();
  if (from == null) from = -Infinity;
  if (to == null) to = Infinity;
  const en = sleepEndTs(e);
  const s = Math.max(e.ts, from);
  const t = Math.min(en != null ? en : now, to, now);
  if (t <= s) return 0;
  return Math.max(0, (t - s) / MIN_MS - pauseMinIn(e, s, t, now));
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
  const T = {
    nap:   { min: 0, count: 0, pauseN: 0, pauseMin: 0 },
    night: { min: 0, count: 0, pauseN: 0, pauseMin: 0 }
  };
  let firstTs = Infinity;
  sleepSessions(childId).forEach(e => {
    firstTs = Math.min(firstTs, e.ts);
    const en = sleepEndTs(e);
    const s = Math.max(e.ts, from), t = Math.min(en != null ? en : now, now);
    if (t <= s) return;
    const k = sleepType(e) === 'night' ? 'night' : 'nap';
    T[k].min += sleepNetMin(e, from, now, now);
    T[k].count++;
    sessionPauses(e).forEach(p => {
      if (p.s >= from && p.s <= now) T[k].pauseN++;
    });
    T[k].pauseMin += pauseMinIn(e, from, now, now);
  });
  return { nap: T.nap, night: T.night, total: T.nap.min + T.night.min, complete: isFinite(firstTs) && (now - firstTs) >= DAY_MS };
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

/* Durata media (effettiva) del 1°, 2°, 3°... pisolino negli ultimi 14 giorni:
   ogni posizione ha la sua media, mai una media di tutti i pisolini insieme */
const NAP_AVG_DAYS = 14;
function napAveragesByIndex(childId, now) {
  const from = now - NAP_AVG_DAYS * DAY_MS;
  const groups = {};
  napsByDayIndexed(childId).forEach(r => {
    const en = sleepEndTs(r.ev);
    if (en == null || r.ev.ts < from) return;
    const m = sleepNetMin(r.ev);
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
  const hh = new Date(startTs).getHours();
  const what = hh >= 19 ? 'nanna della sera' : (hh < 5 ? 'sonno' : 'pisolino');
  const next = hh >= 19 ? 'prossima ' : 'prossimo ';
  if (now < startTs) {
    const m = Math.ceil((startTs - now) / MIN_MS);
    return { cls: 'before', kicker: next + what, big: 'tra ' + fmtDur(m), small: `${fmtTime(startTs)}-${fmtTime(endTs)}`, advice: '' };
  }
  if (now <= endTs) {
    return { cls: 'open', kicker: 'finestra aperta', big: 'È ora', small: `fino alle ${fmtTime(endTs)}`, advice: 'Buon momento per provare a farlo dormire.' };
  }
  const late = Math.round((now - endTs) / MIN_MS);
  return { cls: 'late', kicker: 'finestra superata', big: '+' + fmtDur(late), small: `da ${fmtTime(endTs)}`, advice: 'Se è già agitato, prova subito a calmarlo e a farlo dormire.' };
}

/* Durata "tipica" del pisolino in corso: la media dei SUOI pisolini nella STESSA posizione
   della giornata (1°, 2°, 3°...), anche con pochi dati (n lo dice).
   Se per quella posizione non c'è ancora nessun dato: stima dai riferimenti per età.
   Non si usa mai la media di tutti i pisolini insieme. Minuti di sonno EFFETTIVO. */
function typicalNapMin(child, now, cur) {
  const r5 = m => Math.max(5, Math.round(m / 5) * 5);
  let idx = null;
  if (cur) {
    const me = napsByDayIndexed(child.id).find(x => x.ev.id === cur.id);
    if (me) {
      idx = me.idx;
      const row = napAveragesByIndex(child.id, now).find(x => x.idx === me.idx);
      if (row && row.n >= 1) return { min: r5(row.avg), kind: 'index', idx: me.idx, n: row.n };
    }
  }
  const ww = wakeWindowFor(sleepAgeMonths(child));
  return ww ? { min: ww.napMin, kind: 'ref', idx } : null;
}

/* Il prossimo pisolino di oggi sarà il N°: cosa dicono i suoi N° pisolini passati */
function nextNapInfo(child, now) {
  const today = dateOf(now);
  const done = napsByDayIndexed(child.id).filter(r => dateOf(r.ev.ts) === today).length;
  const idx = done + 1;
  const row = napAveragesByIndex(child.id, now).find(x => x.idx === idx) || null;
  return { idx, row };
}

/* Durata media (effettiva) delle sue notti, ultimi 14 giorni, se ne ha almeno 3 */
function averageNightMin(childId, now) {
  const from = now - 14 * DAY_MS;
  const durs = sleepSessions(childId)
    .filter(e => sleepEndTs(e) != null && e.ts >= from && sleepType(e) === 'night')
    .map(e => sleepNetMin(e))
    .filter(m => m >= 120 && m <= 960);
  return durs.length >= 3 ? durs.reduce((a, b) => a + b, 0) / durs.length : null;
}

/* ms di pausa già chiuse in una sessione */
function closedPauseMs(e) {
  return sessionPauses(e).reduce((t, p) => t + (p.e != null ? Math.max(0, p.e - p.s) : 0), 0);
}

function pctClamp(x) { return Math.max(0, Math.min(100, x)); }

/* ---------- AZIONI AL TAP ---------- */

/* Tipo scelto per il prossimo sonno: se non scelto, si deduce dall'ora (19-6 = notte) */
function currentTypeSel() {
  return window.__sleepTypeSel || sleepTypeFor(Date.now());
}
function setSleepTypeSel(t) {
  window.__sleepTypeSel = (t === 'night' || t === 'nap') ? t : null;
  renderSleepPageIfActive();
}

function sleepStart(place) {
  const child = getActiveChild();
  if (!child) return;
  if (currentSleep(child.id)) { toast('Un sonno è già in corso'); return; }
  const now = Date.now();
  const ev = {
    id: uid(), child_id: child.id, kind: 'sleep', ts: now,
    data: { end_ts: null, type: currentTypeSel(), place: SLEEP_PLACES[place] ? place : 'arms', pauses: [] }
  };
  window.__sleepTypeSel = null;
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
  const now = Date.now();
  ensurePauses(cur);
  // se era in pausa, la pausa finisce quando finisce il sonno
  const pauses = cur.data.pauses.map(p => p.e == null ? { s: p.s, e: Math.max(now, p.s) } : p);
  cur.data = Object.assign({}, cur.data, { end_ts: now, pauses });
  saveData();
  syncPushEvent(cur);
  refreshSleepViews();
}

/* In pausa e non si riaddormenta: il sonno finisce quando è INIZIATA la pausa
   (è lì che si è svegliato davvero) e da quel momento conta la veglia. */
function sleepWakeAtPause() {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur) return;
  const open = openPauseOf(cur);
  if (!open) { sleepWake(); return; }
  ensurePauses(cur);
  const end = Math.max(open.s, cur.ts + MIN_MS);
  const pauses = cur.data.pauses.filter(p => p.e != null && p.s < end);
  cur.data = Object.assign({}, cur.data, { end_ts: end, pauses });
  saveData();
  syncPushEvent(cur);
  toast('Sonno finito alle ' + fmtTime(end));
  refreshSleepViews();
}

/* ---------- PAUSE: azioni ---------- */

function _savePausesFor(cur, pauses, msg) {
  cur.data = Object.assign({}, cur.data, { pauses });
  saveData();
  syncPushEvent(cur);
  closeSheet();
  if (msg) toast(msg);
  refreshSleepViews();
}

function startPause() {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur || openPauseOf(cur)) { closeSheet(); return; }
  ensurePauses(cur);
  _savePausesFor(cur, cur.data.pauses.concat([{ s: Date.now(), e: null }]), 'Pausa iniziata');
}

function endPause() {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur) return;
  ensurePauses(cur);
  const now = Date.now();
  _savePausesFor(cur, cur.data.pauses.map(p => p.e == null ? { s: p.s, e: Math.max(now, p.s) } : p), 'Riprende a dormire');
}

/* Pausa già finita: "è stato sveglio N minuti" (finisce adesso) */
function addPastPause(min) {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur) { closeSheet(); return; }
  min = Math.round(Number(min));
  if (!(min >= 1 && min <= 240)) { toast('Metti un numero di minuti tra 1 e 240'); return; }
  const now = Date.now();
  const s = Math.max(cur.ts, now - min * MIN_MS);
  ensurePauses(cur);
  _savePausesFor(cur, cur.data.pauses.concat([{ s, e: now }]).sort((a, b) => a.s - b.s), `Pausa di ${min} min segnata`);
}
function addCustomPause() {
  addPastPause(parseDecimalInput(document.getElementById('pzMin').value));
}

function openPauseSheet() {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur) { toast('Prima segna che si è addormentato'); return; }
  document.getElementById('sheetTitle').textContent = 'Pausa';
  document.getElementById('sheetSub').textContent = child.name;
  document.getElementById('sheetBody').innerHTML = `
    <div class="phase-section-body">Si è svegliato dentro il sonno (poppata, pianto, cambio…) ma il sonno non è finito.</div>
    <button class="sleep-main-btn" onclick="startPause()">⏸️ Inizia pausa adesso</button>
    <div class="ev-hint" style="margin-top:6px">Quando si riaddormenta tocca «Riprende a dormire»: conto io i minuti.</div>
    <label class="ev-label" style="margin-top:16px">Oppure: è già ripreso. Quanti minuti è stato sveglio?</label>
    <div class="ev-choice">
      ${[1, 2, 3, 5, 10, 15, 20, 30].map(m => `<button type="button" class="ev-choice-btn" style="min-width:64px" onclick="addPastPause(${m})">${m} min</button>`).join('')}
    </div>
    <div class="ev-form-row two" style="margin-top:10px">
      <input type="text" id="pzMin" class="ev-input" inputmode="numeric" placeholder="altro: minuti">
      <button class="ev-save" onclick="addCustomPause()">Aggiungi</button>
    </div>`;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
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

/* ---------- MODIFICHE RAPIDE (orari e luogo, dalla card) ---------- */

function lastClosedSleep(childId) {
  let best = null;
  sleepSessions(childId).forEach(e => {
    const en = sleepEndTs(e);
    if (en != null && (best == null || en > sleepEndTs(best))) best = e;
  });
  return best;
}

let quickTimeCtx = null;

function openQuickTime(which) {
  const child = getActiveChild();
  if (!child) return;
  let ev = null, ts = null;
  if (which === 'start') {
    ev = currentSleep(child.id);
    ts = ev ? ev.ts : null;
  } else {
    if (currentSleep(child.id)) { toast('Sta dormendo: tocca «modifica» sul sonno in corso'); return; }
    ev = lastClosedSleep(child.id);
    ts = ev ? sleepEndTs(ev) : null;
  }
  if (!ev || ts == null) return;
  quickTimeCtx = { which, id: ev.id };

  const p = _dtParts(ts);
  const presets = [0, 5, 10, 15, 20, 30, 45, 60];
  document.getElementById('sheetTitle').textContent = which === 'start' ? 'A che ora si è addormentato?' : 'A che ora si è svegliato?';
  document.getElementById('sheetSub').textContent = child.name;
  document.getElementById('sheetBody').innerHTML = `
    <div class="ev-form">
      <div class="phase-section-body">Segnato alle <strong>${fmtTime(ts)}</strong>. Se l'hai registrato in ritardo, scegli quanto tempo fa è successo:</div>
      <div class="ev-choice" style="margin-top:10px">
        ${presets.map(m => `<button type="button" class="ev-choice-btn" style="min-width:70px" onclick="setQuickTimeAgo(${m})">${m === 0 ? 'adesso' : (m < 60 ? m + ' min fa' : '1 h fa')}</button>`).join('')}
      </div>
      <label class="ev-label">Oppure imposta l'ora esatta</label>
      <div class="ev-form-row two">
        <input type="date" id="qtD" class="ev-input" value="${p.date}">
        <input type="time" id="qtT" class="ev-input" value="${p.time}">
      </div>
      <div class="ev-actions">
        <button class="ev-delete" style="color:var(--text-medium)" onclick="openSleepForm('${ev.id}')">Modifica tutto</button>
        <button class="ev-save" onclick="saveQuickTime()">Salva</button>
      </div>
    </div>`;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function setQuickTimeAgo(min) {
  const p = _dtParts(Date.now() - min * MIN_MS);
  document.getElementById('qtD').value = p.date;
  document.getElementById('qtT').value = p.time;
}

function saveQuickTime() {
  const child = getActiveChild();
  if (!child || !quickTimeCtx) return;
  const ev = DATA.events.find(e => e.id === quickTimeCtx.id && e.kind === 'sleep');
  if (!ev) { closeSheet(); return; }
  const ts = _dtParse(document.getElementById('qtD').value, document.getElementById('qtT').value);
  if (isNaN(ts)) { toast('Manca l\'ora'); return; }
  if (ts > Date.now() + MIN_MS) { toast('L\'orario è nel futuro'); return; }

  const all = sleepSessions(child.id);
  const i = all.findIndex(e => e.id === ev.id);
  const prev = i > 0 ? all[i - 1] : null;
  const next = i >= 0 && i < all.length - 1 ? all[i + 1] : null;

  if (quickTimeCtx.which === 'start') {
    const prevEnd = prev ? sleepEndTs(prev) : null;
    if (prevEnd != null && ts < prevEnd) { toast(`Si sovrappone al sonno precedente (finito alle ${fmtTime(prevEnd)})`); return; }
    ev.ts = ts;
    // i posamenti collegati ricalcolano "dopo quanti minuti"
    DATA.events.filter(e => e.kind === 'putdown' && e.data && e.data.sleep_id === ev.id).forEach(pd => {
      pd.data = Object.assign({}, pd.data, { after_min: Math.max(0, Math.round((pd.ts - ts) / MIN_MS)) });
      syncPushEvent(pd);
    });
  } else {
    if (ts <= ev.ts + MIN_MS) { toast(`Il risveglio deve essere dopo l'addormentamento (${fmtTime(ev.ts)})`); return; }
    if (next && ts > next.ts) { toast(`È dopo l'addormentamento successivo (${fmtTime(next.ts)})`); return; }
    ev.data = Object.assign({}, ev.data, { end_ts: ts });
  }
  saveData();
  syncPushEvent(ev);
  quickTimeCtx = null;
  closeSheet();
  toast('Orario aggiornato');
  refreshSleepViews();
}

function openQuickPlace() {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur) return;
  document.getElementById('sheetTitle').textContent = 'Dove dorme?';
  document.getElementById('sheetSub').textContent = child.name;
  document.getElementById('sheetBody').innerHTML = `
    <div class="sleep-places">
      ${SLEEP_PLACE_ORDER.map(k => `<button class="${cur.data.place === k ? 'is-current' : ''}" onclick="setCurrentPlace('${k}')"><span class="sp-ico">${SLEEP_PLACES[k].ico}</span><span>${SLEEP_PLACES[k].short}</span></button>`).join('')}
    </div>`;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function setCurrentPlace(place) {
  const child = getActiveChild();
  if (!child) return;
  const cur = currentSleep(child.id);
  if (!cur || !SLEEP_PLACES[place]) { closeSheet(); return; }
  cur.data = Object.assign({}, cur.data, { place });
  saveData();
  syncPushEvent(cur);
  closeSheet();
  refreshSleepViews();
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

let formPauses = [];

function pauseRowsHtml() {
  if (!formPauses.length) return '<div class="ev-hint">Nessuna pausa.</div>';
  return formPauses.map((p, i) => {
    const dur = p.e == null ? 'in corso' : (p.e - p.s < MIN_MS ? 'breve' : fmtDur((p.e - p.s) / MIN_MS));
    return `<div class="pz-row"><span><strong>${fmtTime(p.s)}</strong> · ${dur}</span><button type="button" class="pz-del" onclick="removeFormPause(${i})" aria-label="Elimina pausa">✕</button></div>`;
  }).join('');
}
function removeFormPause(i) {
  formPauses.splice(i, 1);
  const el = document.getElementById('slPauseList');
  if (el) el.innerHTML = pauseRowsHtml();
}
function addFormPause() {
  const startTs = _dtParse(document.getElementById('slSD').value, document.getElementById('slST').value);
  if (isNaN(startTs)) { toast('Prima metti l\'ora di addormentamento'); return; }
  const ongoing = document.getElementById('slOngoing').checked;
  const endTs = ongoing ? null : _dtParse(document.getElementById('slED').value, document.getElementById('slET').value);
  const limit = (endTs != null && !isNaN(endTs)) ? endTs : Date.now();
  const tStr = document.getElementById('slPT').value;
  const min = Math.round(parseDecimalInput(document.getElementById('slPM').value));
  if (!tStr) { toast('Metti a che ora è iniziata la pausa'); return; }
  if (!(min >= 1 && min <= 240)) { toast('Metti i minuti di pausa (da 1 a 240)'); return; }
  // la data si ricava dal sonno: il primo giorno utile in cui la pausa sta dentro il sonno
  let s = null;
  for (let d = 0; d <= 2; d++) {
    const n = new Date(startTs); n.setHours(12, 0, 0, 0); n.setDate(n.getDate() + d);
    const cand = _dtParse(dateOf(n.getTime()), tStr);
    if (cand >= startTs && cand + min * MIN_MS <= limit) { s = cand; break; }
  }
  if (s == null) { toast('La pausa deve stare dentro il sonno'); return; }
  const e = s + min * MIN_MS;
  const clash = formPauses.some(p => s < (p.e != null ? p.e : limit) && e > p.s);
  if (clash) { toast('Si sovrappone a un\'altra pausa'); return; }
  formPauses.push({ s, e });
  formPauses.sort((a, b) => a.s - b.s);
  document.getElementById('slPauseList').innerHTML = pauseRowsHtml();
  document.getElementById('slPM').value = '';
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
  formPauses = ex ? sessionPauses(ex).map(p => ({ s: p.s, e: p.e })) : [];
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
      <label class="ev-label">Pause (è stato sveglio ma il sonno non è finito)</label>
      <div id="slPauseList" class="pz-list">${pauseRowsHtml()}</div>
      <div class="pz-add">
        <input type="time" id="slPT" class="ev-input" value="${sp.time}" aria-label="Ora di inizio pausa">
        <input type="text" id="slPM" class="ev-input" inputmode="numeric" placeholder="minuti" aria-label="Minuti di pausa">
        <button type="button" class="pz-add-btn" onclick="addFormPause()">+ pausa</button>
      </div>
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
  const limit = endTs != null ? endTs : Date.now() + 5 * MIN_MS;
  const pauses = formPauses.map(p => ({ s: p.s, e: (p.e == null && endTs != null) ? endTs : p.e }));
  if (pauses.some(p => p.s < startTs || p.s > limit || (p.e != null && p.e > limit))) {
    toast('Ci sono pause fuori dall\'orario del sonno: controlla gli orari'); return;
  }
  const note = (document.getElementById('slNote').value || '').trim();

  const ex = editingSleepId ? DATA.events.find(e => e.id === editingSleepId && e.kind === 'sleep') : null;
  let ev;
  if (ex) {
    ex.ts = startTs;
    ex.data = Object.assign({}, ex.data, { end_ts: endTs, type, place, pauses, wakes: [] });
    ex.note = note || undefined;
    ev = ex;
  } else {
    ev = {
      id: uid(), child_id: child.id, kind: 'sleep', ts: startTs,
      data: { end_ts: endTs, type, place, pauses },
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
