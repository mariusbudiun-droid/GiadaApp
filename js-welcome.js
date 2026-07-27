/* KIN · Welcome / Onboarding */
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
  document.getElementById('welcomeOverlay').innerHTML = `
    <div class="welcome-card">
      <div class="welcome-eyebrow">benvenuto</div>
      <h1 class="welcome-title">Kin</h1>
      <p class="welcome-body">
        Un diario per i vostri figli.
        Cresce con loro e resta con voi.
      </p>
      <div class="welcome-actions">
        <button class="welcome-primary" onclick="welcomeChoose('new')">
          <div class="welcome-btn-title">Inizia da qui</div>
          <div class="welcome-btn-sub">creo una nuova famiglia</div>
        </button>
        <button class="welcome-secondary" onclick="welcomeChoose('join')">
          <div class="welcome-btn-title">Ho un codice</div>
          <div class="welcome-btn-sub">mi collego alla famiglia</div>
        </button>
      </div>
    </div>`;
}

function welcomeChoose(mode) {
  if (mode === 'new') renderWelcomeName('new');
  else renderWelcomeName('join');
}

function renderWelcomeName(mode) {
  document.getElementById('welcomeOverlay').innerHTML = `
    <div class="welcome-card">
      <button class="welcome-back" onclick="renderWelcomeStep1()">‹</button>
      <div class="welcome-eyebrow">tu</div>
      <h2 class="welcome-h2">Come ti chiami?</h2>
      <p class="welcome-body small">
        Serve solo per il saluto dell'app.
      </p>
      <input type="text" id="welcomeName" class="welcome-input" placeholder="Il tuo nome" maxlength="40">
      <button class="welcome-primary" onclick="welcomeNextFromName('${mode}')">
        <div class="welcome-btn-title">Avanti</div>
      </button>
    </div>`;
  setTimeout(() => document.getElementById('welcomeName')?.focus(), 100);
}

function welcomeNextFromName(mode) {
  const name = (document.getElementById('welcomeName')?.value || '').trim();
  if (!name) { toast('Scrivi il tuo nome'); return; }
  if (mode === 'new') completeCreateHousehold(name);
  else renderWelcomeJoinCode(name);
}

function renderWelcomeJoinCode(name) {
  document.getElementById('welcomeOverlay').innerHTML = `
    <div class="welcome-card">
      <button class="welcome-back" onclick="renderWelcomeName('join')">‹</button>
      <div class="welcome-eyebrow">codice famiglia</div>
      <h2 class="welcome-h2">Inserisci il codice</h2>
      <p class="welcome-body small">
        6 caratteri, te lo dà chi ha creato la famiglia.
        Lo trova in Impostazioni → Condivisione.
      </p>
      <input type="text" id="welcomeCode" class="welcome-input code-input"
             placeholder="ABC123" maxlength="6" autocapitalize="characters" autocorrect="off" spellcheck="false">
      <button class="welcome-primary" onclick="completeJoinHousehold('${escapeAttr(name)}')">
        <div class="welcome-btn-title">Collegami</div>
      </button>
    </div>`;
  setTimeout(() => {
    const c = document.getElementById('welcomeCode');
    c?.focus();
    c?.addEventListener('input', () => {
      c.value = c.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
    });
  }, 100);
}

async function completeCreateHousehold(name) {
  const el = document.getElementById('welcomeOverlay');
  el.innerHTML = `<div class="welcome-card"><div class="welcome-spinner"></div><p class="welcome-body center">Sto preparando tutto…</p></div>`;
  try {
    await syncCreateHousehold(name);
    renderAddFirstChild();
  } catch(e) {
    el.innerHTML = `
      <div class="welcome-card">
        <h2 class="welcome-h2">Qualcosa non è andato</h2>
        <p class="welcome-body small">${escapeHtml(e.message || 'Errore di connessione')}</p>
        <button class="welcome-primary" onclick="renderWelcomeName('new')"><div class="welcome-btn-title">Riprova</div></button>
      </div>`;
  }
}

async function completeJoinHousehold(name) {
  const code = (document.getElementById('welcomeCode')?.value || '').trim().toUpperCase();
  if (code.length !== 6) { toast('Il codice ha 6 caratteri'); return; }
  const el = document.getElementById('welcomeOverlay');
  el.innerHTML = `<div class="welcome-card"><div class="welcome-spinner"></div><p class="welcome-body center">Mi collego…</p></div>`;
  try {
    await syncJoinHousehold(name, code);
    // Pulisco il DATA locale e faccio pull dei figli/eventi esistenti
    DATA = { children: [], events: [], prefs: DATA.prefs || {} };
    saveData();
    await syncPullAll();
    hideWelcome();
    if (typeof onSyncReady === 'function') onSyncReady();
  } catch(e) {
    el.innerHTML = `
      <div class="welcome-card">
        <h2 class="welcome-h2">Codice non valido</h2>
        <p class="welcome-body small">${escapeHtml(e.message || 'Riprova con il codice giusto')}</p>
        <button class="welcome-primary" onclick="renderWelcomeJoinCode('${escapeAttr(name)}')"><div class="welcome-btn-title">Riprova</div></button>
      </div>`;
  }
}

/* ---------- AGGIUNGI PRIMO FIGLIO (dopo create household) ---------- */
function renderAddFirstChild() {
  document.getElementById('welcomeOverlay').innerHTML = `
    <div class="welcome-card">
      <div class="welcome-eyebrow">primo figlio</div>
      <h2 class="welcome-h2">Parlami di lui o lei</h2>
      <p class="welcome-body small">
        Solo qualche dato per iniziare. Puoi aggiungere altri figli dopo.
      </p>

      <label class="welcome-label">Nome</label>
      <input type="text" id="cwName" class="welcome-input" placeholder="es. Alice" maxlength="40">

      <label class="welcome-label">Data di nascita</label>
      <input type="date" id="cwBirth" class="welcome-input">

      <label class="welcome-label">Data presunta del parto <span class="welcome-hint-inline">(opzionale)</span></label>
      <input type="date" id="cwDpp" class="welcome-input">
      <div class="welcome-hint">Serve per calcolare l'età corretta nei primi 2 anni se è nato/a prematuro/a.</div>

      <label class="welcome-label">Sesso</label>
      <div class="welcome-choice">
        <button class="welcome-choice-btn" data-g="F" onclick="setChildGender('F')">Femmina</button>
        <button class="welcome-choice-btn" data-g="M" onclick="setChildGender('M')">Maschio</button>
        <button class="welcome-choice-btn" data-g="X" onclick="setChildGender('X')">Altro</button>
      </div>
      <input type="hidden" id="cwGender" value="">

      <button class="welcome-primary" onclick="completeAddFirstChild()" style="margin-top:16px">
        <div class="welcome-btn-title">Aggiungi</div>
      </button>
    </div>`;
}
function setChildGender(g) {
  document.getElementById('cwGender').value = g;
  document.querySelectorAll('.welcome-choice-btn').forEach(b => b.classList.toggle('selected', b.dataset.g === g));
}

async function completeAddFirstChild() {
  const name = (document.getElementById('cwName')?.value || '').trim();
  const birth = document.getElementById('cwBirth')?.value;
  const dpp = document.getElementById('cwDpp')?.value;
  const gender = document.getElementById('cwGender')?.value;
  if (!name) { toast('Serve il nome'); return; }
  if (!birth) { toast('Serve la data di nascita'); return; }

  const child = {
    id: crypto.randomUUID(),
    name,
    birth_date: birth,
    due_date: dpp || undefined,
    gender: gender || undefined,
    ord: (DATA.children.length || 0)
  };
  DATA.children.push(child);
  saveData();
  await syncPushChild(child);
  setActiveChildId(child.id);
  renderAskAnotherChild();
}

function renderAskAnotherChild() {
  document.getElementById('welcomeOverlay').innerHTML = `
    <div class="welcome-card">
      <div class="welcome-eyebrow">bene</div>
      <h2 class="welcome-h2">Vuoi aggiungere un altro figlio?</h2>
      <p class="welcome-body small">Puoi farlo anche dopo dalle Impostazioni.</p>
      <div class="welcome-actions">
        <button class="welcome-primary" onclick="renderAddAnotherChild()">
          <div class="welcome-btn-title">Sì, aggiungi</div>
        </button>
        <button class="welcome-secondary" onclick="finishOnboarding()">
          <div class="welcome-btn-title">No, per ora basta</div>
        </button>
      </div>
    </div>`;
}

function renderAddAnotherChild() {
  document.getElementById('welcomeOverlay').innerHTML = `
    <div class="welcome-card">
      <div class="welcome-eyebrow">un altro figlio</div>
      <h2 class="welcome-h2">Ancora qualche dato</h2>

      <label class="welcome-label">Nome</label>
      <input type="text" id="cwName2" class="welcome-input" placeholder="es. Samuel" maxlength="40">

      <label class="welcome-label">Data di nascita</label>
      <input type="date" id="cwBirth2" class="welcome-input">

      <label class="welcome-label">Data presunta del parto <span class="welcome-hint-inline">(opzionale)</span></label>
      <input type="date" id="cwDpp2" class="welcome-input">

      <label class="welcome-label">Sesso</label>
      <div class="welcome-choice">
        <button class="welcome-choice-btn" data-g="F" onclick="setChildGender2('F')">Femmina</button>
        <button class="welcome-choice-btn" data-g="M" onclick="setChildGender2('M')">Maschio</button>
        <button class="welcome-choice-btn" data-g="X" onclick="setChildGender2('X')">Altro</button>
      </div>
      <input type="hidden" id="cwGender2" value="">

      <button class="welcome-primary" onclick="completeAddSecondChild()" style="margin-top:16px">
        <div class="welcome-btn-title">Aggiungi</div>
      </button>
    </div>`;
}
function setChildGender2(g) {
  document.getElementById('cwGender2').value = g;
  document.querySelectorAll('.welcome-choice-btn').forEach(b => b.classList.toggle('selected', b.dataset.g === g));
}
async function completeAddSecondChild() {
  const name = (document.getElementById('cwName2')?.value || '').trim();
  const birth = document.getElementById('cwBirth2')?.value;
  const dpp = document.getElementById('cwDpp2')?.value;
  const gender = document.getElementById('cwGender2')?.value;
  if (!name) { toast('Serve il nome'); return; }
  if (!birth) { toast('Serve la data di nascita'); return; }

  const child = {
    id: crypto.randomUUID(),
    name,
    birth_date: birth,
    due_date: dpp || undefined,
    gender: gender || undefined,
    ord: (DATA.children.length || 0)
  };
  DATA.children.push(child);
  saveData();
  await syncPushChild(child);
  renderAskAnotherChild();
}

function finishOnboarding() {
  hideWelcome();
  if (typeof onSyncReady === 'function') onSyncReady();
}
