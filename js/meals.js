/* =========================================================
   GIADA · Pasti
   Selezione pasto, slot, sheet, salvataggio
   ========================================================= */
'use strict';

let currentMeal = null;
let currentChoices = {};
let sheetSlotId = null;

function renderPasti() {
  document.getElementById('mealList').classList.remove('hidden');
  document.getElementById('mealDetail').classList.add('hidden');
  const grid = document.getElementById('mealGrid');
  grid.innerHTML = '';
  const today = todayStr();
  const tm = DATA.meals.filter(m => dateOf(m.ts) === today);
  DB.meals.forEach(m => {
    const done = tm.some(x => x.mealId === m.id);
    const btn = document.createElement('button');
    btn.className = 'meal-tile' + (done ? ' done' : '');
    btn.onclick = () => openMeal(m.id);
    btn.innerHTML = `
      <div class="meal-tile-time">${m.time}</div>
      <div class="meal-tile-name">${m.name}</div>
      <div class="meal-tile-check">✓</div>`;
    grid.appendChild(btn);
  });
}

function openMeal(id) {
  currentMeal = id;
  currentChoices = {};
  const today = todayStr();
  const ex = DATA.meals.find(m => dateOf(m.ts) === today && m.mealId === id);
  if (ex && ex.choices) currentChoices = JSON.parse(JSON.stringify(ex.choices));
  const meal = DB.meals.find(m => m.id === id);
  meal.slots.forEach(sl => {
    const s = DB.slots[sl];
    if (s.fixed && !currentChoices[sl]) currentChoices[sl] = s.fixed;
  });
  document.getElementById('mealList').classList.add('hidden');
  document.getElementById('mealDetail').classList.remove('hidden');
  document.getElementById('mealDetailEyebrow').textContent = meal.time;
  document.getElementById('mealDetailTitle').textContent = meal.name;
  renderMealSlots();
}

function closeMealDetail() {
  currentMeal = null;
  currentChoices = {};
  renderPasti();
}

function renderMealSlots() {
  const meal = DB.meals.find(m => m.id === currentMeal);
  const c = document.getElementById('mealSlots');
  c.innerHTML = '';
  if (meal.single) {
    const sl = meal.slots[0];
    const s = DB.slots[sl];
    const ch = currentChoices[sl];
    const el = document.createElement('div');
    el.className = 'slot';
    el.innerHTML = `
      <div class="slot-header"><div class="slot-name">${s.label}</div></div>
      <button class="slot-choice" onclick="openSheet('${sl}')">${renderChoiceInline(ch)}<span class="slot-arrow">›</span></button>
      ${s.note ? `<div class="slot-tip">${s.note}</div>` : ''}
      ${renderChoiceWarning(ch)}`;
    c.appendChild(el);
  } else {
    let n = 1, hasNoSec = false;
    if (currentChoices.primo && currentChoices.primo.flag === 'no_secondo') hasNoSec = true;
    meal.slots.forEach(sl => {
      const s = DB.slots[sl];
      const ch = currentChoices[sl];
      if (sl === 'secondo_pranzo' && hasNoSec) return;
      const el = document.createElement('div');
      el.className = 'slot';
      el.innerHTML = `
        <div class="slot-header">
          <div class="slot-name"><span class="slot-num">${n}</span>${s.label}</div>
          ${s.optional ? '<span class="slot-optional">opzionale</span>' : ''}
        </div>
        ${s.fixed ? `
          <div class="slot-choice" style="background: var(--accent-soft);">
            <div>
              <div class="slot-choice-name">${s.fixed.name}</div>
              ${s.fixed.hint ? `<div style="font-size:11px;color:var(--text-medium);margin-top:2px;">${s.fixed.hint}</div>` : ''}
            </div>
            <div class="slot-choice-grams">${s.fixed.g}g</div>
          </div>` : `
          <button class="slot-choice" onclick="openSheet('${sl}')">${renderChoiceInline(ch)}<span class="slot-arrow">›</span></button>`}
        ${s.note ? `<div class="slot-tip">${s.note}</div>` : ''}
        ${renderChoiceWarning(ch, sl)}`;
      c.appendChild(el);
      n++;
    });
  }
  updateSaveButton();
}

function renderChoiceInline(ch) {
  if (!ch) return '<div class="slot-choice-empty">Tocca per scegliere</div>';
  let g = '';
  if (ch.count) g = ch.count + ' ' + (ch.unit || '');
  else if (ch.g != null) g = (ch.range || ch.g+'g');
  if (ch.extra) g += ' '+ch.extra;
  return `<div class="option-info"><div class="slot-choice-name">${ch.name}</div>${ch.addTo ? `<div style="font-size:11px;color:var(--text-medium);margin-top:2px;">aggiunto a ${ch.addTo}</div>` : ''}</div><div class="slot-choice-grams">${g}</div>`;
}

function renderChoiceWarning(ch) {
  if (!ch) return '';
  const w = [];
  if (ch.fat) w.push('Più grasso: togli 1 cucchiaio (10g) di olio dal pasto.');
  if (ch.warn) w.push(ch.warn);
  if (ch.flag === 'no_secondo') w.push('Con questa pasta non serve aggiungere il secondo.');
  if (ch.freq) {
    const wc = countThisWeek(ch.name);
    if (wc >= ch.freq) w.push(`Hai già mangiato "${ch.name}" ${wc}× questa settimana (max ${ch.freq}).`);
  }
  return w.length ? '<div class="slot-warning">'+w.join('<br>')+'</div>' : '';
}

function countThisWeek(name) {
  const now = new Date();
  const st = new Date(now);
  const d = (now.getDay()+6) % 7;
  st.setDate(now.getDate()-d);
  st.setHours(0,0,0,0);
  return DATA.meals.filter(m => m.ts >= st.getTime() && Object.values(m.choices || {}).some(c => c.name === name)).length;
}

function updateSaveButton() {
  const meal = DB.meals.find(m => m.id === currentMeal);
  const btn = document.getElementById('saveMealBtn');
  let ok = false;
  meal.slots.forEach(sl => { if (!DB.slots[sl].optional && currentChoices[sl]) ok = true; });
  if (meal.single && currentChoices[meal.slots[0]]) ok = true;
  btn.disabled = !ok;
}

function resetMeal() {
  const meal = DB.meals.find(m => m.id === currentMeal);
  currentChoices = {};
  meal.slots.forEach(sl => {
    const s = DB.slots[sl];
    if (s.fixed) currentChoices[sl] = s.fixed;
  });
  renderMealSlots();
}

function saveMeal() {
  const today = todayStr();
  const ix = DATA.meals.findIndex(m => dateOf(m.ts) === today && m.mealId === currentMeal);
  const e = {
    id: ix >= 0 ? DATA.meals[ix].id : uid(),
    ts: ix >= 0 ? DATA.meals[ix].ts : Date.now(),
    mealId: currentMeal,
    choices: currentChoices
  };
  if (ix >= 0) DATA.meals[ix] = e;
  else DATA.meals.push(e);
  saveData();
  toast(DB.meals.find(m => m.id === currentMeal).name + ' salvato');
  closeMealDetail();
  goTo('home');
}

/* ---------- SHEET (selettore opzioni) ---------- */
function openSheet(sl) {
  sheetSlotId = sl;
  const s = DB.slots[sl];
  const opts = DB.options[sl];
  document.getElementById('sheetTitle').textContent = s.label;
  document.getElementById('sheetSub').textContent = 'Scegli una delle opzioni equivalenti';
  const body = document.getElementById('sheetBody');
  body.innerHTML = '';
  const cur = currentChoices[sl];

  const renderItems = (items, container) => {
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'option-item' + (cur && cur.name === item.name ? ' selected' : '');
      let g = '';
      if (item.count) g = item.count + ' ' + (item.unit || '');
      else if (item.g != null) g = (item.range || item.g + 'g');
      if (item.extra) g += ' '+item.extra;
      let tags = '';
      if (item.preferred) tags += '<span class="tag tag-info">consigliato</span>';
      if (item.fat) tags += '<span class="tag tag-warn">grasso · −10g olio</span>';
      if (item.flag === 'no_secondo') tags += '<span class="tag tag-info">no secondo</span>';
      if (item.flag === 'aggiunta') tags += '<span class="tag tag-info">aggiungere a primo</span>';
      if (item.careful) tags += `<span class="tag tag-careful">${item.careful}</span>`;
      if (item.freq) {
        const wc = countThisWeek(item.name);
        if (wc >= item.freq) tags += `<span class="tag tag-careful">già ${wc}× questa sett.</span>`;
        else tags += `<span class="tag tag-warn">max ${item.freq}/sett.</span>`;
      }
      if (item.tags) item.tags.forEach(t => tags += `<span class="tag tag-info">${t}</span>`);
      if (item.warn) tags += `<span class="tag tag-careful">${item.warn}</span>`;
      btn.innerHTML = `<div class="option-info"><div class="option-name">${item.name}</div>${tags ? '<div class="option-tags">'+tags+'</div>' : ''}</div><div class="option-grams">${g}</div>`;
      btn.onclick = () => selectOption(item);
      container.appendChild(btn);
    });
  };

  if (opts.length && opts[0].section) {
    opts.forEach(sec => {
      const h = document.createElement('div');
      h.className = 'option-section';
      h.textContent = sec.section;
      body.appendChild(h);
      renderItems(sec.items, body);
    });
  } else {
    renderItems(opts, body);
  }
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}

function selectOption(item) {
  currentChoices[sheetSlotId] = Object.assign({}, item);
  if (sheetSlotId === 'primo' && item.flag === 'no_secondo') delete currentChoices.secondo_pranzo;
  closeSheet();
  renderMealSlots();
}

function closeSheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('sheet').classList.remove('open');
  sheetSlotId = null;
}
