/* =========================================================
   GIADA · Export PDF diario per la dottoressa
   - A4 orizzontale, 20 righe per pagina
   - Tabella centrata, niente colori
   - Colonne: DATA | sett gest | PESO | CHETONI
              | GLICEMIE (digiuno + col60/120 + pran60/120 + cena60/120)
              | PRESSIONE
   - Se mancano righe per arrivare a 20, riempio con date a seguire
   - Se ci sono >20 giorni di dati, creo più pagine
   ========================================================= */
'use strict';

const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
let jsPDFLoadingPromise = null;

function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jsPDFLoadingPromise) return jsPDFLoadingPromise;
  jsPDFLoadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = JSPDF_CDN;
    s.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('jsPDF non caricato'));
    };
    s.onerror = () => reject(new Error('Impossibile scaricare jsPDF'));
    document.head.appendChild(s);
  });
  return jsPDFLoadingPromise;
}

function buildPdfRows() {
  const allMeas = DATA.measurements || [];
  if (allMeas.length === 0) return [];
  const byDay = {};
  allMeas.forEach(m => {
    const k = dateOf(m.ts);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(m);
  });
  const dpp = (typeof dueDateObj === 'function') ? dueDateObj() : null;
  const keys = Object.keys(byDay).sort();
  return keys.map(k => buildDayRow(k, byDay[k], dpp));
}

function buildDayRow(dayKey, meas, dpp) {
  const parts = dayKey.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  let settGest = '';
  if (dpp) {
    const msDay = 86400000;
    const dpp0 = new Date(dpp); dpp0.setHours(0,0,0,0);
    const d0 = new Date(d); d0.setHours(0,0,0,0);
    const dToGo = Math.round((dpp0 - d0) / msDay);
    const totalDays = 280 - dToGo;
    if (totalDays >= 0 && totalDays <= 320) {
      const w = Math.floor(totalDays / 7);
      const dd = totalDays % 7;
      settGest = w + '+' + dd;
    }
  }
  const pesoMeas = meas.find(m => m.kind === 'peso');
  const peso = pesoMeas ? String(pesoMeas.value) : '';
  const ketoMeas = meas.find(m => m.kind === 'chetoni');
  let chetoni = '';
  if (ketoMeas) {
    const v = ketoMeas.value;
    chetoni = v === 0 ? 'NEG' : (v === 5 ? 'TR' : (v === 15 ? '+' : (v === 40 ? '++' : (v === 80 ? '+++' : '++++'))));
  }
  let dig = '', col60 = '', col120 = '', pran60 = '', pran120 = '', cen60 = '', cen120 = '';
  meas.filter(m => m.kind === 'glicemia').forEach(m => {
    if (m.subkind === 'digiuno') dig = String(m.value);
    else {
      const t = m.timing || 1;
      const v = String(m.value);
      if (m.subkind === 'colazione' && t === 1) col60 = v;
      else if (m.subkind === 'colazione' && t === 2) col120 = v;
      else if (m.subkind === 'pranzo' && t === 1) pran60 = v;
      else if (m.subkind === 'pranzo' && t === 2) pran120 = v;
      else if (m.subkind === 'cena' && t === 1) cen60 = v;
      else if (m.subkind === 'cena' && t === 2) cen120 = v;
    }
  });
  const bps = meas.filter(m => m.kind === 'pressione').sort((a,b) => b.ts - a.ts);
  let press = '';
  if (bps.length > 0) press = bps[0].value + '/' + bps[0].value2;
  return { dateKey: dayKey, date: d, settGest, peso, chetoni, dig, col60, col120, pran60, pran120, cen60, cen120, press };
}

const ROWS_PER_PAGE = 20;

function paginateRows(rows) {
  const pages = [];
  if (rows.length === 0) {
    const start = new Date(); start.setHours(0,0,0,0);
    const empty = [];
    for (let i = 0; i < ROWS_PER_PAGE; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      empty.push(emptyRow(d));
    }
    pages.push(empty);
    return pages;
  }
  let i = 0;
  let lastDate = null;
  while (i < rows.length) {
    const page = rows.slice(i, i + ROWS_PER_PAGE);
    i += page.length;
    lastDate = page[page.length - 1].date;
    pages.push(page);
  }
  const last = pages[pages.length - 1];
  if (last.length < ROWS_PER_PAGE) {
    let curDate = new Date(lastDate);
    while (last.length < ROWS_PER_PAGE) {
      curDate = new Date(curDate);
      curDate.setDate(curDate.getDate() + 1);
      last.push(emptyRow(curDate));
    }
  }
  return pages;
}

function emptyRow(d) {
  return { date: d, settGest:'', peso:'', chetoni:'', dig:'', col60:'', col120:'', pran60:'', pran120:'', cen60:'', cen120:'', press:'' };
}

function getPdfColumns() {
  return [
    { label: 'DATA',       w: 20, group: null },
    { label: 'sett gest',  w: 16, group: null },
    { label: 'PESO',       w: 16, group: null },
    { label: 'CHETONI',    w: 18, group: null },
    { label: 'DIGIUNO',    w: 15, group: 'GLICEMIE' },
    { label: "col 60'",    w: 15, group: 'GLICEMIE' },
    { label: "col 120'",   w: 15, group: 'GLICEMIE' },
    { label: "pran 60'",   w: 15, group: 'GLICEMIE' },
    { label: "pran 120'",  w: 15, group: 'GLICEMIE' },
    { label: "cena 60'",   w: 15, group: 'GLICEMIE' },
    { label: "cena 120'",  w: 15, group: 'GLICEMIE' },
    { label: 'PRESSIONE',  w: 24, group: null }
  ];
}

function formatDateDDMMYY(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return dd + '-' + mm + '-' + yy;
}

function rowValues(r) {
  return [
    formatDateDDMMYY(r.date),
    r.settGest || '',
    r.peso || '',
    r.chetoni || '',
    r.dig || '',
    r.col60 || '',
    r.col120 || '',
    r.pran60 || '',
    r.pran120 || '',
    r.cen60 || '',
    r.cen120 || '',
    r.press || ''
  ];
}

function drawPdfPage(doc, pageRows, ownerName, periodLabel) {
  const W = 297, H = 210;
  const cols = getPdfColumns();
  const totalW = cols.reduce((s,c) => s + c.w, 0);
  const groupH = 6;
  const subH = 8;
  const rowH = 6;
  const tableH = groupH + subH + pageRows.length * rowH;

  const tableX = (W - totalW) / 2;
  const titleY = 14;
  const subtitleY = 20;
  const footerY = H - 8;
  const availTop = subtitleY + 6;
  const availBottom = footerY - 4;
  const availH = availBottom - availTop;
  const tableTopY = availTop + (availH - tableH) / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Diario gravidanza', tableX, titleY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(ownerName + ' · ' + periodLabel, tableX, subtitleY);

  let x = tableX;
  let y = tableTopY;
  let i = 0;
  while (i < cols.length) {
    const col = cols[i];
    if (col.group) {
      let j = i;
      let gW = 0;
      while (j < cols.length && cols[j].group === col.group) {
        gW += cols[j].w;
        j++;
      }
      doc.setFillColor(237, 237, 237);
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.rect(x, y, gW, groupH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(col.group, x + gW/2, y + groupH/2 + 1.2, { align: 'center' });
      let xi = x;
      for (let k = i; k < j; k++) {
        const c = cols[k];
        doc.setFillColor(247, 247, 247);
        doc.rect(xi, y + groupH, c.w, subH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(c.label, xi + c.w/2, y + groupH + subH/2 + 1, { align: 'center' });
        xi += c.w;
      }
      x += gW;
      i = j;
    } else {
      const fullH = groupH + subH;
      doc.setFillColor(237, 237, 237);
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.rect(x, y, col.w, fullH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(col.label, x + col.w/2, y + fullH/2 + 1, { align: 'center' });
      x += col.w;
      i++;
    }
  }

  const dataY = tableTopY + groupH + subH;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  pageRows.forEach((r, idx) => {
    const ry = dataY + idx * rowH;
    let cx = tableX;
    const vals = rowValues(r);
    cols.forEach((c, ci) => {
      doc.setDrawColor(180);
      doc.setLineWidth(0.2);
      doc.rect(cx, ry, c.w, rowH);
      const v = vals[ci];
      if (v) {
        doc.setTextColor(0);
        doc.text(String(v), cx + c.w/2, ry + rowH/2 + 1.2, { align: 'center' });
      }
      cx += c.w;
    });
  });

  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.rect(tableX, tableTopY, totalW, tableH);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Generato da Giada', W/2, H - 6, { align: 'center' });
  doc.setTextColor(0);
}

async function exportDiarioPdf() {
  toast('Sto preparando il PDF…');
  let jsPDF;
  try {
    jsPDF = await loadJsPDF();
  } catch(e) {
    toast('Serve connessione internet la prima volta');
    return;
  }
  const allRows = buildPdfRows();
  const pages = paginateRows(allRows);
  const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const ownerName = (typeof SYNC !== 'undefined' && SYNC.profile && SYNC.profile.display_name) || 'Giada';
  let periodLabel = '';
  if (allRows.length > 0) {
    const first = allRows[0].date;
    const last = allRows[allRows.length - 1].date;
    if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
      periodLabel = monthNames[first.getMonth()] + ' ' + first.getFullYear();
    } else if (first.getFullYear() === last.getFullYear()) {
      periodLabel = monthNames[first.getMonth()] + ' – ' + monthNames[last.getMonth()] + ' ' + first.getFullYear();
    } else {
      periodLabel = monthNames[first.getMonth()] + ' ' + first.getFullYear() + ' – ' + monthNames[last.getMonth()] + ' ' + last.getFullYear();
    }
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pages.forEach((pageRows, idx) => {
    if (idx > 0) doc.addPage();
    drawPdfPage(doc, pageRows, ownerName, periodLabel);
  });
  const today = new Date().toISOString().slice(0,10);
  doc.save('diario-giada-' + today + '.pdf');
  toast('PDF pronto');
}
