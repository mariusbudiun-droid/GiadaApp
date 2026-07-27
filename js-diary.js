/* KIN · Diario / Note libere */
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

  html += `<button class="diary-add-btn" onclick="openQuickNote()">+ nuova nota</button>`;

  const notes = eventsForChild(child.id).filter(e => e.kind === 'note').sort((a,b) => b.ts - a.ts);

  if (notes.length === 0) {
    html += `<div class="empty-card"><div class="empty-text">Ancora nessuna nota.<br>Segna qui pensieri, momenti, piccole cose.</div></div>`;
  } else {
    // Raggruppo per data
    const byDay = {};
    notes.forEach(n => {
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
        const text = (n.data?.text || '').trim();
        html += `<div class="diary-card" onclick="openEventForm('note', '${n.id}')">
          <div class="diary-card-time">${time}</div>
          <div class="diary-card-text">${escapeHtml(text)}</div>
        </div>`;
      });
    });
  }

  c.innerHTML = html;
}
