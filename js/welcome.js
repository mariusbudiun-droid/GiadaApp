/* =========================================================
   GIADA · Welcome / Onboarding
   ========================================================= */
'use strict';

function showWelcome() {
  let el = document.getElementById('welcomeOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'welcomeOverlay';
    el.className = 'welcome-overlay';
    document.body.appendChild(el);
  }
  el.classList.add('show');
  renderWelcomeStep1();
}

function hideWelcome() {
  const el = document.getElementById('welcomeOverlay');
  if (el) el.classList.remove('show');
}

function renderWelcomeStep1() {
  const el = document.getElementById('welcomeOverlay');
  el.innerHTML = `
    <div class="welcome-card">
      <div class="welcome-eyebrow">benvenuta</div>
      <h1 class="welcome-title">Giada</h1>
      <p class="welcome-body">
        Un piccolo diario per accompagnarti in questi mesi.
        I tuoi dati restano nel tuo telefono, e se vuoi puoi
        condividerli con una persona di fiducia.
      </p>
      <div class="welcome-actions">
        <button class="welcome-primary" onclick="welcomeChoose('owner')">
          <div class="welcome-btn-title">Sono Giada</div>
          <div class="welcome-btn-sub">uso io questa app</div>
        </button>
        <button class="welcome-secondary" onclick="welcomeChoose('partner')">
          <div class="welcome-btn-title">Sono il partner</div>
          <div class="welcome-btn-sub">voglio seguirla da qui</div>
        </button>
      </div>
    </div>`;
}

function welcomeChoose(role) {
  if (role === 'owner') renderOwnerSetup();
  else renderPartnerSetup();
}

function renderOwnerSetup() {
  const el = document.getElementById('welcomeOverlay');
  el.innerHTML = `
    <div class="welcome-card">
      <button class="welcome-back" onclick="renderWelcomeStep1()">‹</button>
      <div class="welcome-eyebrow">configurazione</div>
      <h2 class="welcome-h2">Come ti chiamano in famiglia?</h2>
      <p class="welcome-body small">
        Solo per il saluto. Puoi mettere "Giada" o un soprannome.
      </p>
      <input type="text" id="ownerName" class="welcome-input" placeholder="Giada" maxlength="40" value="Giada">
      <button class="welcome-primary" onclick="completeOwnerSetup()">
        <div class="welcome-btn-title">Inizia</div>
      </button>
      <p class="welcome-foot">Potrai condividere i dati con qualcuno più tardi, dalle Impostazioni.</p>
    </div>`;
  setTimeout(() => document.getElementById('ownerName')?.focus(), 100);
}

async function completeOwnerSetup() {
  const nameEl = document.getElementById('ownerName');
  const name = (nameEl?.value || 'Giada').trim() || 'Giada';
  const el = document.getElementById('welcomeOverlay');
  el.innerHTML = `<div class="welcome-card"><div class="welcome-spinner"></div><p class="welcome-body center">Sto preparando tutto…</p></div>`;
  try {
    await syncRegisterOwner(name);
    // Spingo eventuali dati già presenti
    await syncBackfillAll();
    // Passo allo step DPP
    renderOwnerSetupDpp();
  } catch(e) {
    el.innerHTML = `
      <div class="welcome-card">
        <h2 class="welcome-h2">Qualcosa non è andato</h2>
        <p class="welcome-body small">${escapeHtml(e.message || 'Errore di connessione')}.<br>Controlla la connessione e riprova.</p>
        <button class="welcome-primary" onclick="renderOwnerSetup()"><div class="welcome-btn-title">Riprova</div></button>
      </div>`;
  }
}

function renderOwnerSetupDpp() {
  const el = document.getElementById('welcomeOverlay');
  // Default suggerito: oggi + 200 giorni
  const def = new Date(); def.setDate(def.getDate() + 200);
  const defStr = def.toISOString().slice(0,10);
  el.innerHTML = `
    <div class="welcome-card">
      <div class="welcome-eyebrow">quasi fatto</div>
      <h2 class="welcome-h2">Quando è la data presunta del parto?</h2>
      <p class="welcome-body small">
        Ci serve solo per calcolare le settimane di gravidanza.
        Puoi sempre cambiarla più tardi dalle Impostazioni.
      </p>
      <input type="date" id="setupDpp" class="welcome-input" value="${defStr}">
      <button class="welcome-primary" onclick="completeDppSetup()">
        <div class="welcome-btn-title">Inizia</div>
      </button>
      <button class="welcome-secondary" onclick="skipDppSetup()" style="margin-top:8px;">
        <div class="welcome-btn-title">La metto dopo</div>
        <div class="welcome-btn-sub">posso aggiungerla quando voglio</div>
      </button>
    </div>`;
}

async function completeDppSetup() {
  const d = document.getElementById('setupDpp')?.value;
  if (!d) { skipDppSetup(); return; }
  const el = document.getElementById('welcomeOverlay');
  el.innerHTML = `<div class="welcome-card"><div class="welcome-spinner"></div><p class="welcome-body center">Salvataggio…</p></div>`;
  try {
    await syncSetDueDate(d);
  } catch(e) { /* ignoro errore, va avanti */ }
  hideWelcome();
  if (typeof onSyncReady === 'function') onSyncReady();
}

function skipDppSetup() {
  hideWelcome();
  if (typeof onSyncReady === 'function') onSyncReady();
}

function renderPartnerSetup() {
  const el = document.getElementById('welcomeOverlay');
  el.innerHTML = `
    <div class="welcome-card">
      <button class="welcome-back" onclick="renderWelcomeStep1()">‹</button>
      <div class="welcome-eyebrow">collegamento</div>
      <h2 class="welcome-h2">Inserisci il codice di Giada</h2>
      <p class="welcome-body small">
        Lei trova il suo codice in Impostazioni → Condivisione.
        Te lo legge e lo digiti qui (6 caratteri).
      </p>
      <input type="text" id="partnerCode" class="welcome-input code-input"
             placeholder="ABC123" maxlength="6" autocapitalize="characters" autocorrect="off" spellcheck="false">
      <input type="text" id="partnerName" class="welcome-input" placeholder="Il tuo nome (es. Marius)" maxlength="40">
      <button class="welcome-primary" onclick="completePartnerSetup()">
        <div class="welcome-btn-title">Collegami</div>
      </button>
    </div>`;
  setTimeout(() => {
    const c = document.getElementById('partnerCode');
    c?.focus();
    c?.addEventListener('input', () => {
      c.value = c.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,6);
    });
  }, 100);
}

async function completePartnerSetup() {
  const code = (document.getElementById('partnerCode')?.value || '').trim().toUpperCase();
  const name = (document.getElementById('partnerName')?.value || 'Partner').trim() || 'Partner';
  if (code.length !== 6) {
    toast('Il codice ha 6 caratteri');
    return;
  }
  const el = document.getElementById('welcomeOverlay');
  el.innerHTML = `<div class="welcome-card"><div class="welcome-spinner"></div><p class="welcome-body center">Mi sto collegando…</p></div>`;
  try {
    await syncRegisterPartner(name, code);
    // svuoto i dati locali (la modalità partner riceve solo dall'owner)
    DATA = { meals:[], measurements:[], settings: DATA.settings || {} };
    saveData();
    hideWelcome();
    startPartnerSync();
    if (typeof onSyncReady === 'function') onSyncReady();
  } catch(e) {
    el.innerHTML = `
      <div class="welcome-card">
        <h2 class="welcome-h2">Codice non valido</h2>
        <p class="welcome-body small">${escapeHtml(e.message || 'Riprova con il codice di Giada')}.</p>
        <button class="welcome-primary" onclick="renderPartnerSetup()"><div class="welcome-btn-title">Riprova</div></button>
      </div>`;
  }
}
