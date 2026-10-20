/* KIN · Sync layer
   - Household condiviso: entrambi i genitori sono co-owner
   - Chi crea household ottiene un invite_code
   - Chi entra con invite_code diventa co-owner della stessa household
   ========================================================= */
'use strict';

const SUPA_URL = SUPABASE_CONFIG.url;
const SUPA_KEY = SUPABASE_CONFIG.anonKey;

const SYNC_KEY = 'kin_sync_v1';

let SYNC = loadSync();
let syncPullTimer = null;
let syncIsPulling = false;

function loadSync() {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (!raw) return { profile: null, householdId: null, inviteCode: null };
    return JSON.parse(raw);
  } catch(_) {
    return { profile: null, householdId: null, inviteCode: null };
  }
}
function saveSync() {
  localStorage.setItem(SYNC_KEY, JSON.stringify(SYNC));
}

/* ---------- SUPABASE HTTP ---------- */
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

function generateInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i=0; i<6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

/* ---------- CREAZIONE HOUSEHOLD ---------- */
async function syncCreateHousehold(displayName) {
  // Genero un household_id nuovo
  const householdIdRes = await supaReq('kin_pairings', {
    method: 'POST',
    body: {
      household_id: crypto.randomUUID(),
      invite_code: generateInviteCode()
    }
  });
  const pairing = Array.isArray(householdIdRes) ? householdIdRes[0] : householdIdRes;
  const householdId = pairing.household_id;
  const inviteCode = pairing.invite_code;

  // Creo il mio profilo
  const profileRes = await supaReq('kin_profiles', {
    method: 'POST',
    body: {
      user_code: crypto.randomUUID().slice(0,8),
      role: 'owner',
      display_name: displayName || 'Genitore',
      household_id: householdId
    }
  });
  const profile = Array.isArray(profileRes) ? profileRes[0] : profileRes;

  SYNC.profile = profile;
  SYNC.householdId = householdId;
  SYNC.inviteCode = inviteCode;
  saveSync();
  return { profile, householdId, inviteCode };
}

/* ---------- ENTRA IN HOUSEHOLD ESISTENTE ---------- */
async function syncJoinHousehold(displayName, code) {
  const upperCode = String(code || '').trim().toUpperCase();
  // Trovo la household con questo invite_code
  const pairings = await supaReq('kin_pairings?invite_code=eq.' + encodeURIComponent(upperCode) + '&select=*');
  if (!pairings || pairings.length === 0) {
    throw new Error('Codice non valido. Controlla con chi ti ha invitato.');
  }
  const householdId = pairings[0].household_id;

  // Creo il mio profilo dentro la stessa household
  const profileRes = await supaReq('kin_profiles', {
    method: 'POST',
    body: {
      user_code: crypto.randomUUID().slice(0,8),
      role: 'owner',
      display_name: displayName || 'Genitore',
      household_id: householdId
    }
  });
  const profile = Array.isArray(profileRes) ? profileRes[0] : profileRes;

  SYNC.profile = profile;
  SYNC.householdId = householdId;
  SYNC.inviteCode = upperCode;
  saveSync();
  return { profile, householdId };
}

/* ---------- PUSH CHILD ---------- */
async function syncPushChild(child) {
  if (!SYNC.householdId) return;
  const body = {
    id: child.id,
    household_id: SYNC.householdId,
    name: child.name,
    birth_date: child.birth_date,
    due_date: child.due_date || null,
    gender: child.gender || null,
    color: child.color || null,
    ord: child.ord || 0
  };
  try {
    await supaReq('kin_children?on_conflict=id', {
      method: 'POST',
      body,
      prefer: 'resolution=merge-duplicates,return=minimal'
    });
  } catch(e) { console.warn('push child', e); }
}

async function syncDeleteChild(childId) {
  if (!SYNC.householdId) return;
  try {
    await supaReq('kin_children?id=eq.' + childId, {
      method: 'DELETE', prefer: 'return=minimal'
    });
  } catch(e) { console.warn('delete child', e); }
}

/* ---------- PUSH EVENT ---------- */
/* Un pull partito prima di una modifica locale può arrivare dopo e riportare
   indietro lo stato (es. un sonno appena avviato che "sparisce" per qualche
   secondo). Per questo gli eventi toccati da poco restano "fissati" in locale
   per una breve finestra di grazia. */
const SYNC_GRACE_MS = 20000;
const SYNC_RECENT = {};    // id -> { ev, at }
const SYNC_DELETED = {};   // id -> at

async function syncPushEvent(ev) {
  SYNC_RECENT[ev.id] = { ev, at: Date.now() };
  delete SYNC_DELETED[ev.id];
  if (!SYNC.householdId) return;
  const body = {
    child_id: ev.child_id,
    local_id: ev.id,
    kind: ev.kind,
    ts: ev.ts,
    data: ev.data || {},
    note: ev.note || null,
    updated_at: new Date().toISOString()
  };
  try {
    await supaReq('kin_events?on_conflict=child_id,local_id', {
      method: 'POST',
      body,
      prefer: 'resolution=merge-duplicates,return=minimal'
    });
  } catch(e) { console.warn('push event', e); }
  if (SYNC_RECENT[ev.id]) SYNC_RECENT[ev.id].at = Date.now();
}

async function syncDeleteEvent(childId, localId) {
  SYNC_DELETED[localId] = Date.now();
  delete SYNC_RECENT[localId];
  if (!SYNC.householdId) return;
  try {
    await supaReq('kin_events?child_id=eq.' + childId + '&local_id=eq.' + encodeURIComponent(localId), {
      method: 'DELETE', prefer: 'return=minimal'
    });
  } catch(e) { console.warn('delete event', e); }
  SYNC_DELETED[localId] = Date.now();
}

/* ---------- PULL ---------- */
async function syncPullAll() {
  if (!SYNC.householdId) return;
  if (syncIsPulling) return;
  syncIsPulling = true;
  try {
    const children = await supaReq('kin_children?household_id=eq.' + SYNC.householdId + '&select=*&order=ord.asc');
    const childIds = (children || []).map(c => c.id);
    let events = [];
    if (childIds.length > 0) {
      const inList = '(' + childIds.map(id => '"' + id + '"').join(',') + ')';
      events = await supaReq('kin_events?child_id=in.' + inList + '&select=*&order=ts.desc');
    }

    // Merge nel DATA locale
    DATA.children = (children || []).map(c => ({
      id: c.id,
      name: c.name,
      birth_date: c.birth_date,
      due_date: c.due_date || undefined,
      gender: c.gender || undefined,
      color: c.color || undefined,
      ord: c.ord || 0
    }));
    let merged = (events || []).map(e => ({
      id: e.local_id,
      child_id: e.child_id,
      kind: e.kind,
      ts: Number(e.ts),
      data: e.data || {},
      note: e.note || undefined
    }));
    const nowMs = Date.now();
    merged = merged.filter(e => !(SYNC_DELETED[e.id] && nowMs - SYNC_DELETED[e.id] < SYNC_GRACE_MS));
    Object.keys(SYNC_RECENT).forEach(id => {
      const r = SYNC_RECENT[id];
      if (nowMs - r.at > SYNC_GRACE_MS) { delete SYNC_RECENT[id]; return; }
      const i = merged.findIndex(e => e.id === id);
      if (i >= 0) merged[i] = r.ev; else merged.push(r.ev);
    });
    Object.keys(SYNC_DELETED).forEach(id => { if (nowMs - SYNC_DELETED[id] > SYNC_GRACE_MS) delete SYNC_DELETED[id]; });
    DATA.events = merged;
    saveData();

    // Refresh UI
    try { if (typeof renderHome === 'function') renderHome(); } catch(_){}
    try { if (typeof renderTracking === 'function') renderTracking(); } catch(_){}
    try { if (typeof renderDiary === 'function') renderDiary(); } catch(_){}
    try { if (typeof renderSleepPageIfActive === 'function') renderSleepPageIfActive(); } catch(_){}
  } catch(e) {
    console.warn('pull', e);
  } finally {
    syncIsPulling = false;
  }
}

async function syncBackfillAll() {
  if (!SYNC.householdId) return;
  for (const c of (DATA.children || [])) await syncPushChild(c);
  for (const ev of (DATA.events || [])) await syncPushEvent(ev);
}

function startSync() {
  if (!SYNC.householdId) return;
  if (syncPullTimer) clearInterval(syncPullTimer);
  syncPullAll();
  syncPullTimer = setInterval(syncPullAll, 30 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncPullAll();
  });
}

function syncReset() {
  SYNC = { profile: null, householdId: null, inviteCode: null };
  saveSync();
  if (syncPullTimer) { clearInterval(syncPullTimer); syncPullTimer = null; }
}

function isPaired() { return !!SYNC.householdId; }

/* ---------- INVITE CODE RETRIEVE ---------- */
async function refreshInviteCode() {
  if (!SYNC.householdId) return null;
  try {
    const pairings = await supaReq('kin_pairings?household_id=eq.' + SYNC.householdId + '&select=invite_code');
    if (pairings && pairings.length) {
      SYNC.inviteCode = pairings[0].invite_code;
      saveSync();
      return SYNC.inviteCode;
    }
  } catch(_) {}
  return SYNC.inviteCode;
}
