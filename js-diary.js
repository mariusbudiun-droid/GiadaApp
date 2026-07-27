/* KIN · Diario / Note libere / Foto
   Timeline unica raggruppata per giorno.
   ========================================================= */
'use strict';

function renderDiary() {
  const c = document.getElementById('diaryContent');
  if (!c) return;
  const child = getActiveChild();
  if (!child) {
    c.innerHTML = renderEmptyHome();
    return;
  }

  let html = '';
  html += renderChildSwitcher();
  html += `<div class="hdr-block">
    <div class="hdr-eyebrow">diario</div>
    <h1 class="hdr-title">${escapeHtml(child.name)}</h1>
  </div>`;

  html += `<div class="diary-add-row">
    <button class="diary-add-btn" onclick="openQuickNote()">+ nota</button>
    <button class="diary-add-btn" onclick="openPhotoCapture()">+ foto</button>
  </div>`;

  const entries = eventsForChild(child.id)
    .filter(e => e.kind === 'note' || e.kind === 'photo')
    .sort((a,b) => b.ts - a.ts);

  if (entries.length === 0) {
    html += '<div class="empty-card"><div class="empty-text">Ancora niente qui.<br>Segna pensieri, momenti, foto.</div></div>';
  } else {
    const byDay = {};
    entries.forEach(n => {
      const k = dateOf(n.ts);
      (byDay[k] = byDay[k] || []).push(n);
    });
    Object.keys(byDay).sort((a,b) => b.localeCompare(a)).forEach(dayKey => {
      const d = parseDateStr(dayKey);
      const today = todayStr();
      const yesterday = dateOf(Date.now() - 86400000);
      let label;
      if (dayKey === today) label = 'oggi';
      else if (dayKey === yesterday) label = 'ieri';
      else label = fmtDateLong(d);
      html += `<div class="diary-day-eyebrow">${label}</div>`;
      byDay[dayKey].forEach(n => {
        const time = fmtTime(n.ts);
        if (n.kind === 'note') {
          const text = (n.data && n.data.text || '').trim();
          html += `<div class="diary-card" onclick="openEventForm('note', '${n.id}')">
            <div class="diary-card-time">${time}</div>
            <div class="diary-card-text">${escapeHtml(text)}</div>
          </div>`;
        } else if (n.kind === 'photo') {
          const caption = n.data && n.data.caption;
          html += `<div class="diary-photo-card" onclick="openPhotoFullscreen('${n.id}')">
            <img src="${n.data.image}" class="diary-photo-thumb" alt="foto">
            <div class="diary-photo-meta">
              <div class="diary-card-time">${time}</div>
              ${caption ? `<div class="diary-photo-caption">${escapeHtml(caption)}</div>` : ''}
            </div>
          </div>`;
        }
      });
    });
  }

  c.innerHTML = html;
}
