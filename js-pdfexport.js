/* KIN · Export PDF per il pediatra
   Riassunto stampabile: crescita registrata, vaccini fatti, traguardi raggiunti.
   ========================================================= */
'use strict';

const KIN_JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
let kinJsPDFLoadingPromise = null;

function loadKinJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (kinJsPDFLoadingPromise) return kinJsPDFLoadingPromise;
  kinJsPDFLoadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = KIN_JSPDF_CDN;
    s.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('jsPDF non caricato'));
    };
    s.onerror = () => reject(new Error('Impossibile scaricare jsPDF'));
    document.head.appendChild(s);
  });
  return kinJsPDFLoadingPromise;
}

async function exportKinPdf() {
  const child = getActiveChild();
  if (!child) { toast('Aggiungi prima un figlio'); return; }
  toast('Sto preparando il PDF…');

  let jsPDF;
  try {
    jsPDF = await loadKinJsPDF();
  } catch (e) {
    toast('Serve connessione internet la prima volta');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, marginX = 16;
  let y = 20;

  const age = ageOf(child.birth_date);
  const ageStr = formatAge(age, 'ymdw');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Kin · Riassunto per il pediatra', marginX, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(child.name + ' · ' + ageStr + ' · nato/a il ' + fmtDateLong(parseDateStr(child.birth_date)), marginX, y);
  y += 4;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Generato il ' + fmtDateLong(new Date()), marginX, y);
  doc.setTextColor(0);
  y += 10;

  /* ---------- CRESCITA ---------- */
  const growthEvents = eventsForChild(child.id).filter(e => e.kind === 'growth').sort((a,b) => a.ts - b.ts);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Crescita', marginX, y);
  y += 6;
  doc.setFontSize(9);
  if (growthEvents.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('Nessuna misurazione registrata.', marginX, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  } else {
    // Header tabella
    doc.setFont('helvetica', 'bold');
    doc.text('Data', marginX, y);
    doc.text('Peso', marginX + 35, y);
    doc.text('Altezza', marginX + 65, y);
    doc.text('Circonf. cranica', marginX + 100, y);
    y += 5;
    doc.setDrawColor(200);
    doc.line(marginX, y-3, W-marginX, y-3);
    doc.setFont('helvetica', 'normal');
    growthEvents.forEach(e => {
      if (y > 270) { doc.addPage(); y = 20; }
      const d = parseDateStr(dateOf(e.ts));
      doc.text(fmtDateShort(d), marginX, y);
      doc.text(e.data?.weight_kg ? e.data.weight_kg + ' kg' : '—', marginX + 35, y);
      doc.text(e.data?.height_cm ? e.data.height_cm + ' cm' : '—', marginX + 65, y);
      doc.text(e.data?.head_cm ? e.data.head_cm + ' cm' : '—', marginX + 100, y);
      y += 6;
    });
    y += 6;
  }

  /* ---------- VACCINI ---------- */
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Vaccini effettuati', marginX, y);
  y += 6;
  doc.setFontSize(9);
  const doneVaccines = sortedVaccineSchedule()
    .map(v => ({ v, st: vaccineStatusForChild(child.id, v.id) }))
    .filter(x => x.st.status === 'done');
  if (doneVaccines.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('Nessun vaccino ancora registrato come fatto.', marginX, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  } else {
    doneVaccines.forEach(({v, st}) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const d = st.event ? parseDateStr(dateOf(st.event.ts)) : null;
      doc.text('• ' + v.name + (d ? '  —  ' + fmtDateShort(d) : ''), marginX, y);
      y += 6;
    });
    y += 4;
  }

  /* ---------- TRAGUARDI / PRIME VOLTE ---------- */
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Traguardi raggiunti', marginX, y);
  y += 6;
  doc.setFontSize(9);
  const firstsEvents = eventsForChild(child.id).filter(e => e.kind === 'first').sort((a,b) => a.ts - b.ts);
  if (firstsEvents.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('Nessun traguardo ancora registrato.', marginX, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  } else {
    firstsEvents.forEach(e => {
      if (y > 270) { doc.addPage(); y = 20; }
      const d = parseDateStr(dateOf(e.ts));
      let name = e.data?.custom ? e.data.name : (FIRSTS_LIST.find(f => f.id === e.data?.firstId)?.name || 'Traguardo');
      doc.text('• ' + name + '  —  ' + fmtDateShort(d), marginX, y);
      y += 6;
    });
  }

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(130);
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text('Generato da Kin', marginX, 290);
  }

  const filename = 'kin-' + child.name.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + new Date().toISOString().slice(0,10) + '.pdf';
  doc.save(filename);
  toast('PDF pronto');
}
