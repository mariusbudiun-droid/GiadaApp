/* KIN · Foto
   Cattura da fotocamera/libreria, compressione lato client prima
   di salvare (per stare dentro localStorage e sync ragionevoli).
   ========================================================= */
'use strict';

const PHOTO_MAX_DIM = 1000;      // lato massimo in px dopo il resize
const PHOTO_JPEG_QUALITY = 0.65; // qualità di compressione

function openPhotoCapture() {
  const child = getActiveChild();
  if (!child) { toast('Aggiungi prima un figlio'); return; }
  // Creo un input file temporaneo e lo clicco via JS
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    document.body.removeChild(input);
    if (!file) return;
    processAndOpenPhotoForm(file);
  });
  input.click();
}

function processAndOpenPhotoForm(file) {
  toast('Preparo la foto…');
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height && width > PHOTO_MAX_DIM) {
        height = Math.round(height * (PHOTO_MAX_DIM / width));
        width = PHOTO_MAX_DIM;
      } else if (height >= width && height > PHOTO_MAX_DIM) {
        width = Math.round(width * (PHOTO_MAX_DIM / height));
        height = PHOTO_MAX_DIM;
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY);
      openPhotoForm(null, dataUrl);
    };
    img.onerror = () => toast('Non riesco a leggere questa immagine');
    img.src = reader.result;
  };
  reader.onerror = () => toast('Errore nella lettura del file');
  reader.readAsDataURL(file);
}

/* ---------- FORM FOTO (nuova o modifica didascalia) ---------- */
function openPhotoForm(evId, dataUrl) {
  const child = getActiveChild();
  if (!child) return;
  let existing = null;
  if (evId) existing = DATA.events.find(e => e.id === evId);
  const image = dataUrl || existing?.data?.image;
  if (!image) { toast('Foto non disponibile'); return; }

  document.getElementById('sheetTitle').textContent = existing ? 'Modifica foto' : 'Nuova foto';
  document.getElementById('sheetSub').textContent = child.name;

  const now = existing ? new Date(existing.ts) : new Date();
  const dateStr = dateOf(now.getTime());
  const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  const html = `<div class="ev-form">
    <img src="${image}" class="photo-preview" alt="anteprima foto">
    <div class="ev-form-row two">
      <div><label class="ev-label">Data</label><input type="date" id="phDate" class="ev-input" value="${dateStr}"></div>
      <div><label class="ev-label">Ora</label><input type="time" id="phTime" class="ev-input" value="${timeStr}"></div>
    </div>
    <label class="ev-label">Didascalia (opzionale)</label>
    <textarea id="phCaption" class="ev-input" rows="2" maxlength="300">${escapeHtml(existing?.data?.caption || existing?.note || '')}</textarea>
    <div class="ev-actions">
      ${existing ? `<button class="ev-delete" onclick="deletePhoto('${existing.id}')">Elimina</button>` : ''}
      <button class="ev-save" onclick="savePhoto('${existing ? existing.id : ''}')">${existing ? 'Salva' : 'Aggiungi'}</button>
    </div>
  </div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');

  // L'immagine nuova (se presente) resta in questa variabile globale finché non si salva:
  // è troppo grande per essere passata dentro un attributo onclick in sicurezza.
  window.__pendingPhotoData = dataUrl || null;
}

function savePhoto(evId) {
  const child = getActiveChild();
  if (!child) return;
  const dateStr = document.getElementById('phDate')?.value;
  const timeStr = document.getElementById('phTime')?.value || '12:00';
  const caption = (document.getElementById('phCaption')?.value || '').trim();
  if (!dateStr) { toast('Manca la data'); return; }
  const [h,m] = timeStr.split(':');
  const d = parseDateStr(dateStr);
  d.setHours(parseInt(h)||12, parseInt(m)||0, 0, 0);
  const ts = d.getTime();

  let ev;
  if (evId) {
    const ix = DATA.events.findIndex(e => e.id === evId);
    if (ix >= 0) {
      ev = { ...DATA.events[ix], ts, data: { ...DATA.events[ix].data, caption: caption || undefined } };
      DATA.events[ix] = ev;
    }
  } else {
    const image = window.__pendingPhotoData;
    if (!image) { toast('Foto mancante, riprova'); return; }
    ev = { id: uid(), child_id: child.id, kind: 'photo', ts, data: { image, caption: caption || undefined } };
    DATA.events.push(ev);
  }
  window.__pendingPhotoData = null;
  saveData();
  if (ev) syncPushEvent(ev);
  closeSheet();
  toast('Salvata');
  if (typeof renderDiary === 'function') renderDiary();
}

function deletePhoto(evId) {
  showConfirm('Cancellare questa foto?', 'L\'azione non si può annullare.', () => {
    const child = getActiveChild();
    DATA.events = DATA.events.filter(e => e.id !== evId);
    saveData();
    if (child) syncDeleteEvent(child.id, evId);
    closeSheet();
    toast('Cancellata');
    if (typeof renderDiary === 'function') renderDiary();
  });
}

/* ---------- VISUALIZZAZIONE A SCHERMO INTERO ---------- */
function openPhotoFullscreen(evId) {
  const ev = DATA.events.find(e => e.id === evId);
  if (!ev || !ev.data?.image) return;
  let ov = document.getElementById('photoFullOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'photoFullOverlay';
    ov.className = 'photo-full-overlay';
    document.body.appendChild(ov);
  }
  ov.innerHTML = `
    <button class="photo-full-close" onclick="closePhotoFullscreen()">×</button>
    <img src="${ev.data.image}" class="photo-full-img" alt="foto">
    ${ev.data.caption ? `<div class="photo-full-caption">${escapeHtml(ev.data.caption)}</div>` : ''}
    <button class="photo-full-edit" onclick="closePhotoFullscreen(); setTimeout(()=>openPhotoForm('${evId}'), 150);">modifica</button>
  `;
  ov.classList.add('show');
}
function closePhotoFullscreen() {
  document.getElementById('photoFullOverlay')?.classList.remove('show');
}
