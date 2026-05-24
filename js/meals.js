/* =========================================================
   GIADA · Pasti (composizione libera)
   - 6 slot temporali fissi
   - Per ogni slot: aggiungi alimenti liberamente dal catalogo
   - Quantità modificabili con +/-
   - Suggerimenti contestuali in base a quello già mangiato oggi
   - Autosave continuo (no bottone "salva")
   ========================================================= */
'use strict';

let currentMeal = null;        // slotId attivo
let currentItems = [];          // [{foodId, qty}]
let currentNote = '';           // nota libera del pasto

/* ---------- LISTA DEI 6 PASTI ---------- */
function renderPasti() {
  document.getElementById('mealList').classList.remove('hidden');
  document.getElementById('mealDetail').classList.add('hidden');
  const grid = document.getElementById('mealGrid');
  grid.innerHTML = '';
  const today = todayStr();
  const todayMeals = DATA.meals.filter(m => dateOf(m.ts) === today);

  SLOTS.forEach(slot => {
    const entry = todayMeals.find(m => m.mealId === slot.id);
    const items = entry ? (entry.items || []) : [];
    const hasItems = items.length > 0;
    const hasNote = !!(entry && entry.note);
    const isFilled = hasItems || hasNote;

    const btn = document.createElement('button');
    btn.className = 'meal-tile' + (isFilled ? ' done' : '');
    btn.onclick = () => openMeal(slot.id);

    let preview = '';
    if (hasItems) {
      const names = items.slice(0,3).map(it => {
        const f = FOOD_BY_ID[it.foodId];
        return f ? f.name.split(' ')[0] : '';
      }).filter(Boolean).join(' · ');
      const extra = items.length > 3 ? ` +${items.length-3}` : '';
      preview = `<div class="meal-tile-preview">${escapeHtml(names)}${extra}</div>`;
    } else if (hasNote) {
      preview = `<div class="meal-tile-preview">solo una nota</div>`;
    } else {
      preview = `<div class="meal-tile-preview empty">tocca per aggiungere</div>`;
    }

    const noteBadge = hasNote ? `<span class="meal-tile-note">📝</span>` : '';

    btn.innerHTML = `
      <div class="meal-tile-head">
        <span class="meal-tile-icon">${slot.icon}</span>
        <span class="meal-tile-meta">${noteBadge}<span class="meal-tile-time">${slot.time}</span></span>
      </div>
      <div class="meal-tile-name">${slot.name}</div>
      ${preview}`;
    grid.appendChild(btn);
  });
}

/* ---------- DETTAGLIO PASTO ---------- */
function openMeal(slotId) {
  if (typeof isPartnerMode === 'function' && isPartnerMode()) {
    return openMealReadOnly(slotId);
  }
  currentMeal = slotId;
  const today = todayStr();
  const ex = DATA.meals.find(m => dateOf(m.ts) === today && m.mealId === slotId);
  currentItems = ex && ex.items ? JSON.parse(JSON.stringify(ex.items)) : [];
  currentNote = ex && ex.note ? String(ex.note) : '';

  document.getElementById('mealList').classList.add('hidden');
  document.getElementById('mealDetail').classList.remove('hidden');

  const slot = SLOT_BY_ID[slotId];
  document.getElementById('mealDetailEyebrow').textContent = slot.time + (slot.note ? ' · ' + slot.note : '');
  document.getElementById('mealDetailTitle').textContent = slot.name;

  renderMealDetail();
}

function openMealReadOnly(slotId) {
  const today = todayStr();
  const ex = DATA.meals.find(m => dateOf(m.ts) === today && m.mealId === slotId);
  const items = ex && ex.items ? ex.items : [];
  const note = ex && ex.note ? String(ex.note) : '';

  document.getElementById('mealList').classList.add('hidden');
  document.getElementById('mealDetail').classList.remove('hidden');

  const slot = SLOT_BY_ID[slotId];
  document.getElementById('mealDetailEyebrow').textContent = slot.time + ' · vista partner';
  document.getElementById('mealDetailTitle').textContent = slot.name;

  const c = document.getElementById('mealSlots');
  let html = '';
  if (items.length === 0 && !note) {
    html = `<div class="empty-meal"><div class="empty-meal-emoji">🍽️</div><div>Nessun alimento ancora registrato.</div></div>`;
  } else {
    if (items.length > 0) {
      html += `<div class="meal-items">`;
      items.forEach(it => {
        const f = FOOD_BY_ID[it.foodId];
        if (!f) return;
        html += `<div class="meal-item readonly">
          <div class="meal-item-main">
            <div class="meal-item-name">${escapeHtml(f.name)}</div>
          </div>
          <div class="meal-item-qty-readonly">${it.qty}<span class="qty-unit">${f.unit}</span></div>
        </div>`;
      });
      html += `</div>`;
    }
    if (note) {
      html += `<div class="meal-note-readonly">
        <div class="meal-note-readonly-label">Nota di Giada</div>
        <div class="meal-note-readonly-text">${escapeHtml(note)}</div>
      </div>`;
    }
  }
  c.innerHTML = html;
  // Nascondo eventuale hint autosave
  const hint = document.querySelector('.autosave-hint');
  if (hint) hint.style.display = 'none';
}

function closeMealDetail() {
  currentMeal = null;
  currentItems = [];
  currentNote = '';
  renderPasti();
}

function renderMealDetail() {
  const c = document.getElementById('mealSlots');
  if (!c) return;

  // Se l'utente sta scrivendo la nota, non ricostruisco la sezione nota
  const activeNote = document.getElementById('mealNoteText');
  const isEditingNote = activeNote && document.activeElement === activeNote;
  if (isEditingNote) {
    // sincronizzo currentNote dall'input prima di tutto
    currentNote = activeNote.value;
  }

  // Calcolo warning frequenze attivi
  const freqWarns = computeFrequencyWarnings();
  const oilTip = computeOilTip();

  let html = '';

  // LISTA ITEMS
  if (currentItems.length === 0) {
    html += `<div class="empty-meal">
      <div class="empty-meal-emoji">🍽️</div>
      <div>Nessun alimento ancora.<br>Tocca "+ aggiungi" per scegliere.</div>
    </div>`;
  } else {
    html += `<div class="meal-items">`;
    currentItems.forEach((it, idx) => {
      const f = FOOD_BY_ID[it.foodId];
      if (!f) return;
      html += renderMealItem(f, it, idx);
    });
    html += `</div>`;
  }

  // OLIO TIP (se ha selezionato pesce grasso / formaggio in questo pasto)
  if (oilTip) {
    html += `<div class="meal-tip warn">💡 ${oilTip}</div>`;
  }

  // WARNING FREQUENZE
  freqWarns.forEach(w => {
    html += `<div class="meal-tip ${w.level}">⚠️ ${w.text}</div>`;
  });

  // PULSANTE AGGIUNGI
  html += `<button class="add-item-btn" onclick="openFoodSheet()">+ aggiungi alimento</button>`;

  // NOTA DEL PASTO
  const noteLen = (currentNote || '').length;
  html += `
    <div class="meal-note-block">
      <label class="meal-note-label" for="mealNoteText">Nota</label>
      <textarea
        id="mealNoteText"
        class="meal-note-textarea"
        maxlength="500"
        rows="2"
        placeholder="Come ti sei sentita? Voglie, sintomi, qualunque cosa…"
      >${escapeHtml(currentNote || '')}</textarea>
      <div class="meal-note-foot">
        <span class="meal-note-status" id="mealNoteStatus"></span>
        <span class="meal-note-count"><span id="mealNoteCount">${noteLen}</span>/500</span>
      </div>
    </div>`;

  c.innerHTML = html;

  // Listener per nota del pasto
  const noteEl = document.getElementById('mealNoteText');
  if (noteEl) {
    const cntEl = document.getElementById('mealNoteCount');
    const statusEl = document.getElementById('mealNoteStatus');
    const autoGrow = () => {
      noteEl.style.height = 'auto';
      noteEl.style.height = Math.min(noteEl.scrollHeight, 200) + 'px';
    };
    autoGrow();
    let noteDebounce = null;
    noteEl.addEventListener('input', () => {
      currentNote = noteEl.value;
      if (cntEl) cntEl.textContent = currentNote.length;
      autoGrow();
      if (statusEl) statusEl.textContent = 'in salvataggio…';
      if (noteDebounce) clearTimeout(noteDebounce);
      noteDebounce = setTimeout(() => {
        autoSave();
        if (statusEl) {
          statusEl.textContent = 'salvato';
          setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 1200);
        }
      }, 600);
    });
  }
}

function renderMealItem(f, it, idx) {
  const tip = f.tip ? `<div class="meal-item-tip">${f.tip}</div>` : '';
  const warn = f.warn ? `<div class="meal-item-tip warn">${f.warn}</div>` : '';
  return `
    <div class="meal-item">
      <div class="meal-item-main">
        <div class="meal-item-name">${escapeHtml(f.name)}</div>
        ${tip}${warn}
      </div>
      <div class="meal-item-qty">
        <button class="qty-btn" onclick="adjustQty(${idx}, -1)">−</button>
        <span class="qty-val">${it.qty}<span class="qty-unit">${f.unit}</span></span>
        <button class="qty-btn" onclick="adjustQty(${idx}, 1)">+</button>
      </div>
      <button class="meal-item-del" onclick="removeItem(${idx})" aria-label="rimuovi">✕</button>
    </div>`;
}

function adjustQty(idx, sign) {
  const it = currentItems[idx];
  if (!it) return;
  const f = FOOD_BY_ID[it.foodId];
  const step = f.step || 10;
  const next = it.qty + (sign * step);
  // minimo: 1 step. massimo: 5x default per sicurezza
  if (next < step) return;
  if (next > f.qty * 5 + step) return;
  it.qty = next;
  autoSave();
  renderMealDetail();
}

function removeItem(idx) {
  currentItems.splice(idx, 1);
  autoSave();
  renderMealDetail();
}

function autoSave() {
  const today = todayStr();
  const ix = DATA.meals.findIndex(m => dateOf(m.ts) === today && m.mealId === currentMeal);
  const hasItems = currentItems.length > 0;
  const hasNote = (currentNote || '').trim().length > 0;
  let deletedId = null;
  let pushedMeal = null;
  if (!hasItems && !hasNote) {
    if (ix >= 0) {
      deletedId = DATA.meals[ix].id;
      DATA.meals.splice(ix, 1);
    }
  } else {
    const e = {
      id: ix >= 0 ? DATA.meals[ix].id : uid(),
      ts: ix >= 0 ? DATA.meals[ix].ts : Date.now(),
      mealId: currentMeal,
      items: hasItems ? JSON.parse(JSON.stringify(currentItems)) : [],
      note: hasNote ? currentNote.trim() : null
    };
    if (ix >= 0) DATA.meals[ix] = e; else DATA.meals.push(e);
    pushedMeal = e;
  }
  saveData();
  // sync
  if (typeof syncPushMeal === 'function') {
    if (deletedId) syncDeleteMeal(deletedId);
    if (pushedMeal) syncPushMeal(pushedMeal);
  }
  // ricarico home se è visibile (per le pills)
  if (typeof renderHome === 'function') {
    try { renderHome(); } catch(_) {}
  }
}

/* ---------- SHEET PER AGGIUNGERE ALIMENTI ---------- */
function openFoodSheet() {
  const slot = SLOT_BY_ID[currentMeal];
  const foods = foodsForSlot(currentMeal);
  const suggestions = computeSuggestions(currentMeal);

  document.getElementById('sheetTitle').textContent = 'Aggiungi alimento';
  document.getElementById('sheetSub').textContent = slot.name;

  // Raggruppo per categoria
  const byCat = {};
  foods.forEach(f => {
    if (!byCat[f.cat]) byCat[f.cat] = [];
    byCat[f.cat].push(f);
  });

  // Ordine categorie in base allo slot
  const order = slot.kind === 'pasto'
    ? ['primo','piattounico','legume','carnebianca','pesce','pescegrasso','carnerossa','uovoformaggio','verdura','condimento','cereale','frutta','fruttafinep']
    : slot.kind === 'colaz'
      ? ['bev','latticino','cereale','fruttasecca','frutta','uovoformaggio']
      : ['cereale','latticino','frutta','fruttasecca','salume','verdura','uovoformaggio','dolce','condimento','bev'];

  let html = '';

  // SUGGERIMENTI in cima
  if (suggestions.length > 0) {
    html += `<div class="sugg-box">`;
    suggestions.forEach(s => {
      html += `<div class="sugg-row"><span class="sugg-ico">💡</span><span>${escapeHtml(s)}</span></div>`;
    });
    html += `</div>`;
  }

  // CATEGORIE
  order.forEach(cat => {
    const list = byCat[cat];
    if (!list || list.length === 0) return;
    html += `<div class="food-cat">${CATEGORIES[cat] || cat}</div>`;
    html += `<div class="food-list">`;
    list.forEach(f => {
      const alreadyIn = currentItems.some(it => it.foodId === f.id);
      html += `<button class="food-opt${alreadyIn ? ' in' : ''}" onclick="addFood('${f.id}')">
        <div class="food-opt-name">${escapeHtml(f.name)}</div>
        <div class="food-opt-qty">${f.qty}${f.unit}${alreadyIn ? ' · già aggiunto' : ''}</div>
      </button>`;
    });
    html += `</div>`;
  });

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function addFood(foodId) {
  const f = FOOD_BY_ID[foodId];
  if (!f) return;
  // Se non già presente, aggiungo. Se presente, niente (può modificare qty con i +/-)
  if (!currentItems.some(it => it.foodId === foodId)) {
    currentItems.push({ foodId: f.id, qty: f.qty });
    autoSave();
  }
  closeSheet();
  renderMealDetail();
}

function closeSheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('sheet').classList.remove('open');
}

/* ---------- SUGGERIMENTI CONTESTUALI ---------- */
function computeSuggestions(slotId) {
  const slot = SLOT_BY_ID[slotId];
  const today = todayStr();
  const todayMeals = DATA.meals.filter(m => dateOf(m.ts) === today && m.mealId !== slotId);
  const allTodayItems = todayMeals.flatMap(m => (m.items || []).map(it => ({...it, mealId: m.mealId})));

  const suggestions = [];

  // PASTO (pranzo/cena)
  if (slot.kind === 'pasto') {
    const otherPasto = todayMeals.find(m => SLOT_BY_ID[m.mealId]?.kind === 'pasto');
    if (otherPasto) {
      const otherItems = (otherPasto.items || []).map(it => FOOD_BY_ID[it.foodId]).filter(Boolean);
      const hadPrimo = otherItems.some(f => f.cat === 'primo');
      const hadPiatto = otherItems.some(f => f.cat === 'piattounico');
      const otherName = SLOT_BY_ID[otherPasto.mealId].name.toLowerCase();
      if (hadPrimo) {
        suggestions.push(`A ${otherName} hai mangiato un primo. Per questo pasto bilancia con pane + secondo + verdura.`);
      } else if (hadPiatto) {
        suggestions.push(`A ${otherName} hai fatto un piatto unico di legumi. Qui basta un secondo leggero + verdura.`);
      } else {
        suggestions.push(`A ${otherName} non hai fatto primo. Qui puoi scegliere primo o pane + secondo, come preferisci.`);
      }
    }
  }

  // SPUNTINI
  if (slot.kind === 'spunt') {
    const hadFruit = allTodayItems.some(it => {
      const f = FOOD_BY_ID[it.foodId];
      return f && (f.cat === 'frutta' || f.cat === 'fruttafinep');
    });
    if (!hadFruit && slotId !== 'spuntino_notturno') {
      suggestions.push("Oggi non hai ancora preso frutta. Potrebbe andare bene ora.");
    }
    if (slotId === 'spuntino_notturno') {
      suggestions.push("Importante per non avere chetoni la mattina dopo. Anche poco va bene.");
    }
  }

  return suggestions;
}

/* ---------- FREQUENZE SETTIMANALI ---------- */
function computeFrequencyWarnings() {
  if (!currentMeal) return [];
  const warns = [];
  const items = currentItems.map(it => FOOD_BY_ID[it.foodId]).filter(Boolean);
  // controllo le categorie con weekly limit
  const cats = ['carnerossa','uovoformaggio'];
  const weekStart = new Date(); weekStart.setHours(0,0,0,0);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  const weekTs = weekStart.getTime();

  cats.forEach(cat => {
    const inThisMeal = items.some(f => f.cat === cat);
    if (!inThisMeal) return;
    // Conta in settimana
    const count = DATA.meals
      .filter(m => m.ts >= weekTs)
      .reduce((acc, m) => {
        const has = (m.items || []).some(it => FOOD_BY_ID[it.foodId]?.cat === cat);
        return acc + (has ? 1 : 0);
      }, 0);
    if (count > 2) {
      const label = cat === 'carnerossa' ? 'carni rosse' : 'uova/formaggi/affettati';
      warns.push({ level:'warn', text:`Hai già ${count} pasti con ${label} questa settimana (consigliato max 2).` });
    } else if (count === 2) {
      const label = cat === 'carnerossa' ? 'carni rosse' : 'uova/formaggi/affettati';
      warns.push({ level:'info', text:`Sono 2 pasti con ${label} questa settimana, sei al limite consigliato.` });
    }
  });
  return warns;
}

function computeOilTip() {
  if (!currentMeal) return null;
  const slot = SLOT_BY_ID[currentMeal];
  if (slot.kind !== 'pasto') return null;
  const hasFat = currentItems.some(it => FOOD_BY_ID[it.foodId]?.oilCut);
  const hasOil = currentItems.some(it => FOOD_BY_ID[it.foodId]?.id === 'olio');
  if (hasFat && hasOil) {
    return "C'è un alimento grasso: togli circa 1 cucchiaio d'olio (-10g).";
  }
  if (hasFat) {
    return "C'è un alimento grasso. Se metti l'olio, riducilo di circa 1 cucchiaio.";
  }
  return null;
}
