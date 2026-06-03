/* =========================================================
   GIADA · Sync layer (Supabase)
   - Auto-registrazione owner/partner al primo avvio
   - Pairing tramite codice a 6 caratteri
   - Push: ogni cambio locale → cloud
   - Pull: realtime + polling fallback ogni 30s
   ========================================================= */
'use strict';

const SUPA_URL = SUPABASE_CONFIG.url;
const SUPA_KEY = SUPABASE_CONFIG.anonKey;

const SYNC_KEY = 'giada_sync_v1';

let SYNC = loadSync();
let syncPullTimer = null;
let syncIsPulling = false;

function loadSync() {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (!raw) return { role:null, profile:null, ownerProfile:null, paused:false, lastPull:0 };
    return JSON.parse(raw);
  } catch(_) {
    return { role:null, profile:null, ownerProfile:null, paused:false, lastPull:0 };
  }
}
function saveSync() {
  localStorage.setItem(SYNC_KEY, JSON.stringify(SYNC));
}

/* ---------- API HTTP ---------- */
async function supaReq(path, opts = {}) {
  const url = SUPA_URL + '/rest/v1/' + path;
  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json',
    'Prefer': opts.prefer || 'return=representation',
    ...(opts.headers || {})
  };
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>'');
    throw new Error('supa ' + res.status + ': ' + txt);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ---------- CODICE PAIRING ---------- */
function generateCode() {
  // 6 caratteri, no caratteri ambigui (0/O/I/1)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i=0; i<6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

/* ---------- REGISTRAZIONE ---------- */
async function syncRegisterOwner(displayName) {
  const code = generateCode();
  const profile = await supaReq('profiles', {
    method: 'POST',
    body: { user_code: code, role: 'owner', display_name: displayName || 'Giada' }
  });
  const p = Array.isArray(profile) ? profile[0] : profile;
  SYNC.role = 'owner';
  SYNC.profile = p;
  SYNC.ownerProfile = p;
  SYNC.paused = false;
  saveSync();
  return p;
}

async function syncRegisterPartner(displayName, ownerCode) {
  // Trovo owner per code
  const owners = await supaReq('profiles?user_code=eq.' + encodeURIComponent(ownerCode.toUpperCase()) + '&role=eq.owner&select=*');
  if (!owners || owners.length === 0) {
    throw new Error('Codice non valido. Controlla con Giada.');
  }
  const owner = owners[0];
  // Creo profilo partner
  const code = generateCode();
  const profile = await supaReq('profiles', {
    method: 'POST',
    body: { user_code: code, role: 'partner', display_name: displayName || 'Partner' }
  });
  const p = Array.isArray(profile) ? profile[0] : profile;
  // Pairing
  await supaReq('pairings', {
    method: 'POST',
    body: { owner_id: owner.id, partner_id: p.id, paused: false }
  });
  SYNC.role = 'partner';
  SYNC.profile = p;
  SYNC.ownerProfile = owner;
  SYNC.paused = false;
  saveSync();
  return { profile: p, owner };
}

/* ---------- PAUSA / RIPRENDI (solo owner) ---------- */
async function syncSetPaused(paused) {
  if (SYNC.role !== 'owner' || !SYNC.profile) return;
  // Aggiorno tutti i pairings di questo owner
  await supaReq('pairings?owner_id=eq.' + SYNC.profile.id, {
    method: 'PATCH',
    body: { paused: !!paused }
  });
  SYNC.paused = !!paused;
  saveSync();
}

async function syncRefreshPausedState() {
  if (SYNC.role !== 'partner' || !SYNC.ownerProfile) return SYNC.paused;
  try {
    const r = await supaReq('pairings?owner_id=eq.' + SYNC.ownerProfile.id + '&partner_id=eq.' + SYNC.profile.id + '&select=paused');
    if (r && r.length) {
      SYNC.paused = !!r[0].paused;
      saveSync();
    }
  } catch(_) {}
  return SYNC.paused;
}

/* ---------- PUSH (solo owner) ---------- */
async function syncPushMeal(meal) {
  if (SYNC.role !== 'owner' || !SYNC.profile || SYNC.paused) return;
  const body = {
    owner_id: SYNC.profile.id,
    local_id: meal.id,
    meal_id: meal.mealId,
    ts: meal.ts,
    items: meal.items || null,
    choices: meal.choices || null,
    note: meal.note || null,
    updated_at: new Date().toISOString()
  };
  try {
    await supaReq('meals?on_conflict=owner_id,local_id', {
      method: 'POST',
      body,
      prefer: 'resolution=merge-duplicates,return=minimal'
    });
  } catch(e) { console.warn('push meal failed', e); }
}

async function syncDeleteMeal(localId) {
  if (SYNC.role !== 'owner' || !SYNC.profile || SYNC.paused) return;
  try {
    await supaReq('meals?owner_id=eq.' + SYNC.profile.id + '&local_id=eq.' + encodeURIComponent(localId), {
      method: 'DELETE',
      prefer: 'return=minimal'
    });
  } catch(e) { console.warn('delete meal failed', e); }
}

async function syncPushMeasurement(m) {
  if (SYNC.role !== 'owner' || !SYNC.profile || SYNC.paused) return;
  const body = {
    owner_id: SYNC.profile.id,
    local_id: m.id,
    kind: m.kind,
    subkind: m.subkind || null,
    ts: m.ts,
    value: m.value,
    value2: m.value2 != null ? m.value2 : null,
    timing: m.timing || null,
    note: m.note || null,
    updated_at: new Date().toISOString()
  };
  try {
    await supaReq('measurements?on_conflict=owner_id,local_id', {
      method: 'POST',
      body,
      prefer: 'resolution=merge-duplicates,return=minimal'
    });
  } catch(e) { console.warn('push meas failed', e); }
}

async function syncDeleteMeasurement(localId) {
  if (SYNC.role !== 'owner' || !SYNC.profile || SYNC.paused) return;
  try {
    await supaReq('measurements?owner_id=eq.' + SYNC.profile.id + '&local_id=eq.' + encodeURIComponent(localId), {
      method: 'DELETE',
      prefer: 'return=minimal'
    });
  } catch(e) { console.warn('delete meas failed', e); }
}

/* ---------- BACKFILL: spinge tutto quanto già esiste in locale (prima registrazione owner) ---------- */
async function syncBackfillAll() {
  if (SYNC.role !== 'owner' || !SYNC.profile) return;
  for (const m of (DATA.meals || [])) {
    await syncPushMeal(m);
  }
  for (const x of (DATA.measurements || [])) {
    await syncPushMeasurement(x);
  }
  for (const a of (DATA.appointments || [])) {
    await syncPushAppt(a);
  }
}

/* ---------- PULL (solo partner): tira giù tutti i dati dell'owner ---------- */
async function syncPullAll() {
  if (SYNC.role !== 'partner' || !SYNC.ownerProfile) return;
  if (syncIsPulling) return;
  syncIsPulling = true;
  try {
    await syncRefreshPausedState();
    if (SYNC.paused) {
      // se in pausa, non aggiorno dati clinici, ma le note sì (sono comunicazione, non dati medici)
      await syncPullNotes();
      syncIsPulling = false;
      try { if (typeof renderHome === 'function') renderHome(); } catch(_){}
      return;
    }
    const ownerId = SYNC.ownerProfile.id;
    const meals = await supaReq('meals?owner_id=eq.' + ownerId + '&select=*&order=ts.desc');
    const measurements = await supaReq('measurements?owner_id=eq.' + ownerId + '&select=*&order=ts.desc');
    const appointments = await supaReq('appointments?owner_id=eq.' + ownerId + '&select=*&order=date.desc');

    // Trasformo nel formato locale
    DATA.meals = (meals || []).map(r => ({
      id: r.local_id,
      ts: Number(r.ts),
      mealId: r.meal_id,
      items: r.items || undefined,
      choices: r.choices || undefined,
      note: r.note || undefined
    }));
    DATA.measurements = (measurements || []).map(r => ({
      id: r.local_id,
      ts: Number(r.ts),
      kind: r.kind,
      subkind: r.subkind || undefined,
      value: r.value != null ? Number(r.value) : null,
      value2: r.value2 != null ? Number(r.value2) : undefined,
      timing: r.timing || undefined,
      note: r.note || undefined
    }));
    DATA.appointments = (appointments || []).map(r => ({
      id: r.local_id,
      title: r.title,
      date: r.date,
      location: r.location || undefined,
      note: r.note || undefined
    }));
    saveData();
    SYNC.lastPull = Date.now();
    saveSync();

    // Refresh note + DPP
    await syncPullNotes();
    await syncPullDueDateForPartner();

    // Refresh UI
    try { if (typeof renderHome === 'function') renderHome(); } catch(_){}
    try { if (typeof renderCalendario === 'function') renderCalendario(); } catch(_){}
    try { if (typeof renderStats === 'function') renderStats(); } catch(_){}
  } catch(e) {
    console.warn('pull failed', e);
  } finally {
    syncIsPulling = false;
  }
}

function startPartnerSync() {
  if (SYNC.role !== 'partner') return;
  if (syncPullTimer) clearInterval(syncPullTimer);
  syncPullAll();
  syncPullTimer = setInterval(syncPullAll, 30 * 1000);

  // Refresh anche quando l'app torna in foreground
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncPullAll();
  });
}

/* ---------- DPP (data presunta parto) ---------- */
async function syncSetDueDate(date) {
  if (SYNC.role !== 'owner' || !SYNC.profile) return;
  try {
    await supaReq('profiles?id=eq.' + SYNC.profile.id, {
      method: 'PATCH',
      body: { due_date: date },
      prefer: 'return=minimal'
    });
    SYNC.profile.due_date = date;
    saveSync();
  } catch(e) { console.warn('set dpp failed', e); throw e; }
}

async function syncPullDueDateForPartner() {
  if (SYNC.role !== 'partner' || !SYNC.ownerProfile) return;
  try {
    const r = await supaReq('profiles?id=eq.' + SYNC.ownerProfile.id + '&select=due_date');
    if (r && r.length) {
      SYNC.ownerProfile.due_date = r[0].due_date;
      // espongo come SYNC.profile.due_date sì che pregnancyStatus legga dallo stesso posto
      if (!SYNC.profile) SYNC.profile = {};
      SYNC.profile.due_date = r[0].due_date;
      saveSync();
    }
  } catch(e) { console.warn('pull dpp failed', e); }
}

/* ---------- APPUNTAMENTI ---------- */
async function syncPushAppt(a) {
  if (SYNC.role !== 'owner' || !SYNC.profile || SYNC.paused) return;
  const body = {
    owner_id: SYNC.profile.id,
    local_id: a.id,
    title: a.title,
    date: a.date,
    location: a.location || null,
    note: a.note || null,
    updated_at: new Date().toISOString()
  };
  try {
    await supaReq('appointments?on_conflict=owner_id,local_id', {
      method: 'POST',
      body,
      prefer: 'resolution=merge-duplicates,return=minimal'
    });
  } catch(e) { console.warn('push appt failed', e); }
}

async function syncDeleteAppt(localId) {
  if (SYNC.role !== 'owner' || !SYNC.profile || SYNC.paused) return;
  try {
    await supaReq('appointments?owner_id=eq.' + SYNC.profile.id + '&local_id=eq.' + encodeURIComponent(localId), {
      method: 'DELETE',
      prefer: 'return=minimal'
    });
  } catch(e) { console.warn('delete appt failed', e); }
}

async function syncBackfillAppointments() {
  if (SYNC.role !== 'owner' || !SYNC.profile) return;
  for (const a of (DATA.appointments || [])) {
    await syncPushAppt(a);
  }
}

/* ---------- NOTE: lavagnetta condivisa ---------- */
/* Le note vivono dentro profiles.note + profiles.note_updated_at
   Owner vede la nota del partner, partner vede la nota dell'owner.
   Owner deve trovare il partner via tabella pairings. */

let notePushTimer = null;
let notePollTimer = null;

async function syncPushMyNote(text) {
  if (!SYNC.profile) return;
  const body = {
    note: text || null,
    note_updated_at: new Date().toISOString()
  };
  try {
    await supaReq('profiles?id=eq.' + SYNC.profile.id, {
      method: 'PATCH',
      body,
      prefer: 'return=minimal'
    });
    // aggiorno cache locale
    SYNC.profile.note = text || null;
    SYNC.profile.note_updated_at = body.note_updated_at;
    saveSync();
  } catch(e) { console.warn('push note failed', e); }
}

/* Owner: trova partner id la prima volta che ne ha bisogno */
async function syncResolveOwnerPartner() {
  if (SYNC.role !== 'owner' || !SYNC.profile) return null;
  if (SYNC.partnerProfile) return SYNC.partnerProfile;
  try {
    const pairs = await supaReq('pairings?owner_id=eq.' + SYNC.profile.id + '&select=partner_id');
    if (!pairs || pairs.length === 0) return null;
    const partnerId = pairs[0].partner_id;
    const profs = await supaReq('profiles?id=eq.' + partnerId + '&select=*');
    if (profs && profs.length) {
      SYNC.partnerProfile = profs[0];
      saveSync();
      return SYNC.partnerProfile;
    }
  } catch(e) { console.warn('resolve partner failed', e); }
  return null;
}

/* Scarica la nota del "remoto" (cioè dell'altro) */
async function syncPullNotes() {
  try {
    if (SYNC.role === 'partner' && SYNC.ownerProfile) {
      const r = await supaReq('profiles?id=eq.' + SYNC.ownerProfile.id + '&select=note,note_updated_at,display_name');
      if (r && r.length) {
        SYNC.ownerProfile.note = r[0].note;
        SYNC.ownerProfile.note_updated_at = r[0].note_updated_at;
        SYNC.ownerProfile.display_name = r[0].display_name || SYNC.ownerProfile.display_name;
        saveSync();
      }
    } else if (SYNC.role === 'owner') {
      const partner = await syncResolveOwnerPartner();
      if (partner) {
        const r = await supaReq('profiles?id=eq.' + partner.id + '&select=note,note_updated_at,display_name');
        if (r && r.length) {
          SYNC.partnerProfile.note = r[0].note;
          SYNC.partnerProfile.note_updated_at = r[0].note_updated_at;
          SYNC.partnerProfile.display_name = r[0].display_name || SYNC.partnerProfile.display_name;
          saveSync();
        }
      }
    }
  } catch(e) { console.warn('pull notes failed', e); }
}

/* Avvia polling note (anche per owner, che non ha syncPullAll) */
function startNotePolling() {
  if (!SYNC.role) return;
  if (notePollTimer) clearInterval(notePollTimer);
  syncPullNotes().then(() => {
    try { if (typeof renderHome === 'function') renderHome(); } catch(_){}
  });
  notePollTimer = setInterval(() => {
    syncPullNotes().then(() => {
      try { if (typeof renderHome === 'function') renderHome(); } catch(_){}
    });
  }, 30 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncPullNotes().then(() => {
        try { if (typeof renderHome === 'function') renderHome(); } catch(_){}
      });
    }
  });
}

/* Push con debounce - chiamato mentre digiti */
function scheduleNotePush(text) {
  if (notePushTimer) clearTimeout(notePushTimer);
  notePushTimer = setTimeout(() => syncPushMyNote(text), 800);
}

/* Ritorna {mine, theirs, theirsName, theirsUpdatedAt, role} */
function getNotesState() {
  const mine = SYNC.profile?.note || '';
  let theirs = null, theirsName = '', theirsUpdatedAt = null;
  if (SYNC.role === 'partner') {
    theirs = SYNC.ownerProfile?.note || '';
    theirsName = SYNC.ownerProfile?.display_name || 'Giada';
    theirsUpdatedAt = SYNC.ownerProfile?.note_updated_at || null;
  } else if (SYNC.role === 'owner' && SYNC.partnerProfile) {
    theirs = SYNC.partnerProfile?.note || '';
    theirsName = SYNC.partnerProfile?.display_name || 'lui';
    theirsUpdatedAt = SYNC.partnerProfile?.note_updated_at || null;
  }
  return { mine, theirs, theirsName, theirsUpdatedAt, role: SYNC.role };
}

/* ---------- RESET ---------- */
function syncReset() {
  SYNC = { role:null, profile:null, ownerProfile:null, partnerProfile:null, paused:false, lastPull:0 };
  saveSync();
  if (syncPullTimer) { clearInterval(syncPullTimer); syncPullTimer = null; }
  if (notePollTimer) { clearInterval(notePollTimer); notePollTimer = null; }
}

function isPartnerMode() { return SYNC.role === 'partner'; }
function isOwnerMode() { return SYNC.role === 'owner'; }
function isUnpaired() { return !SYNC.role; }
