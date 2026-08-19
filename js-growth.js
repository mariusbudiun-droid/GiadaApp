/* KIN · Grafico di crescita (curve OMS + punti del bambino)
   Disegnato in SVG puro, senza librerie esterne.
   ========================================================= */
'use strict';

let currentGrowthMeasure = 'weight'; // 'weight' | 'height' | 'head'

/* Confronta il percentile di peso e altezza più recenti: se sono entrambi
   alti o entrambi bassi va tutto bene (bambino/a proporzionato/a, solo
   "grande" o "piccolo/a" nel complesso). Se invece divergono parecchio
   (es. peso molto sopra e altezza molto sotto, o viceversa), segnala con
   una nota leggera — non allarmante, solo un promemoria per il pediatra. */
function computeGrowthProportionNote(child, gender) {
  const events = eventsForChild(child.id).filter(e => e.kind === 'growth');
  const weightEvents = events.filter(e => e.data && e.data.weight_kg != null).sort((a,b) => b.ts - a.ts);
  const heightEvents = events.filter(e => e.data && e.data.height_cm != null).sort((a,b) => b.ts - a.ts);

  if (weightEvents.length === 0 && heightEvents.length === 0) return null;

  const weightTable = getGrowthTable('weight', gender);
  const heightTable = getGrowthTable('height', gender);

  let weightPct = null, heightPct = null;
  if (weightEvents.length > 0) {
    const ev = weightEvents[0];
    const age = ageOf(child.birth_date, ev.ts);
    weightPct = percentileToNumber(estimatePercentile(weightTable, age.totalMonths, ev.data.weight_kg));
  }
  if (heightEvents.length > 0) {
    const ev = heightEvents[0];
    const age = ageOf(child.birth_date, ev.ts);
    heightPct = percentileToNumber(estimatePercentile(heightTable, age.totalMonths, ev.data.height_cm));
  }

  // Entrambe le misure disponibili: confronto la divergenza
  if (weightPct != null && heightPct != null) {
    if (weightPct >= 85 && heightPct <= 25) {
      return 'Il peso corre parecchio più avanti dell\'altezza in questo momento. Probabilmente è solo una fase — ma è un buon punto da toccare al prossimo controllo dal pediatra.';
    }
    if (heightPct >= 85 && weightPct <= 25) {
      return 'L\'altezza corre parecchio più avanti del peso in questo momento. Spesso capita durante gli scatti di crescita — vale comunque la pena parlarne al prossimo controllo.';
    }
    return null; // proporzionato, anche se alto/basso nel complesso: nessuna nota
  }

  // Solo una misura disponibile: nota solo se è ai margini estremi della curva
  const soloPct = weightPct != null ? weightPct : heightPct;
  const soloLabel = weightPct != null ? 'peso' : 'altezza';
  if (soloPct <= 3 || soloPct >= 97) {
    return `Il valore più recente di ${soloLabel} è ai margini della curva OMS (fuori dal range 3°-97°). Non è detto sia un problema, ma è un buon argomento per il prossimo controllo.`;
  }
  return null;
}

function renderGrowthSection(child) {
  if (!child) return '';
  const gender = child.gender === 'F' ? 'F' : 'M'; // default M se non specificato/altro, solo per la curva di riferimento

  let html = '';

  const proportionNote = computeGrowthProportionNote(child, gender);
  if (proportionNote) {
    html += `<div class="growth-note-card">${escapeHtml(proportionNote)}</div>`;
  }

  html += `<div class="growth-tabs">
    <button class="growth-tab ${currentGrowthMeasure==='weight'?'active':''}" onclick="setGrowthMeasure('weight')">Peso</button>
    <button class="growth-tab ${currentGrowthMeasure==='height'?'active':''}" onclick="setGrowthMeasure('height')">Altezza</button>
    <button class="growth-tab ${currentGrowthMeasure==='head'?'active':''}" onclick="setGrowthMeasure('head')">Circonferenza cranica</button>
  </div>`;

  html += `<div id="growthChartWrap">${renderGrowthChartSvg(child, currentGrowthMeasure, gender)}</div>`;

  html += `<button class="add-growth-btn" onclick="openGrowthMeasureForm()">+ aggiungi misurazione</button>`;

  // Lista misurazioni registrate, più recenti prima
  const events = eventsForChild(child.id).filter(e => e.kind === 'growth').sort((a,b) => b.ts - a.ts);
  const relevantKey = currentGrowthMeasure === 'weight' ? 'weight_kg' : (currentGrowthMeasure === 'height' ? 'height_cm' : 'head_cm');
  const withValue = events.filter(e => e.data && e.data[relevantKey] != null);
  if (withValue.length > 0) {
    html += `<div class="card-eyebrow eb-spaced">misurazioni registrate</div>`;
    withValue.slice(0, 10).forEach(e => {
      const d = parseDateStr(dateOf(e.ts));
      const val = e.data[relevantKey];
      const unit = currentGrowthMeasure === 'weight' ? 'kg' : 'cm';
      const age = ageOf(child.birth_date, e.ts);
      const pct = estimatePercentile(getGrowthTable(currentGrowthMeasure, gender), age.totalMonths, val);
      html += `<div class="growth-row" onclick="openEventForm('growth','${e.id}')">
        <div class="growth-row-date">${fmtDateShort(d)}</div>
        <div class="growth-row-val">${val} ${unit}</div>
        <div class="growth-row-pct">percentile ~${pct}</div>
      </div>`;
    });
  }

  return html;
}

function setGrowthMeasure(m) {
  currentGrowthMeasure = m;
  // Ridisegno tutta la sezione Salute (più semplice e sicuro di un patch parziale)
  if (typeof renderHealth === 'function') renderHealth();
}

/* ---------- SVG CHART ---------- */
function renderGrowthChartSvg(child, measureType, gender) {
  const table = getGrowthTable(measureType, gender);
  const W = 320, H = 220;
  const padL = 34, padR = 10, padT = 12, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxMonths = 60;
  // Trovo range valori per l'asse Y basandomi sulle curve 3°-97°
  let minV = Infinity, maxV = -Infinity;
  table.forEach(row => {
    minV = Math.min(minV, row[1]);
    maxV = Math.max(maxV, row[5]);
  });
  // Un po' di margine
  const rangeV = maxV - minV;
  minV -= rangeV * 0.05;
  maxV += rangeV * 0.05;

  function xFor(months) { return padL + (months / maxMonths) * plotW; }
  function yFor(value) { return padT + plotH - ((value - minV) / (maxV - minV)) * plotH; }

  function pathFor(idx) {
    return table.map((row, i) => {
      const x = xFor(row[0]);
      const y = yFor(row[idx]);
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
  }

  const p3Path = pathFor(1);
  const p15Path = pathFor(2);
  const p50Path = pathFor(3);
  const p85Path = pathFor(4);
  const p97Path = pathFor(5);

  // Banda 3-97 come area
  const bandTop = table.map((row,i) => (i===0?'M':'L') + xFor(row[0]).toFixed(1) + ',' + yFor(row[5]).toFixed(1)).join(' ');
  const bandBottomRev = table.slice().reverse().map(row => 'L' + xFor(row[0]).toFixed(1) + ',' + yFor(row[1]).toFixed(1)).join(' ');
  const bandPath = bandTop + ' ' + bandBottomRev + ' Z';

  // Punti del bambino
  const child_ = child;
  const events = eventsForChild(child_.id).filter(e => e.kind === 'growth').sort((a,b) => a.ts - b.ts);
  const key = measureType === 'weight' ? 'weight_kg' : (measureType === 'height' ? 'height_cm' : 'head_cm');
  const points = events
    .filter(e => e.data && e.data[key] != null)
    .map(e => {
      const age = ageOf(child_.birth_date, e.ts);
      return { months: age.totalMonths, value: e.data[key] };
    })
    .filter(p => p.months >= 0 && p.months <= 60);

  let childPath = '';
  let childDots = '';
  if (points.length > 0) {
    childPath = points.map((p,i) => (i===0?'M':'L') + xFor(p.months).toFixed(1) + ',' + yFor(p.value).toFixed(1)).join(' ');
    childDots = points.map(p =>
      `<circle cx="${xFor(p.months).toFixed(1)}" cy="${yFor(p.value).toFixed(1)}" r="3.5" fill="var(--accent-dark, #A87A2E)" stroke="white" stroke-width="1"/>`
    ).join('');
  }

  // Griglia assi X (anni)
  let xLabels = '';
  for (let y = 0; y <= 5; y++) {
    const mo = y * 12;
    if (mo > maxMonths) continue;
    const x = xFor(mo);
    xLabels += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT+plotH}" stroke="#00000010" stroke-width="1"/>`;
    xLabels += `<text x="${x}" y="${H-6}" font-size="9" fill="currentColor" text-anchor="middle" opacity="0.6">${y}a</text>`;
  }

  const unit = measureType === 'weight' ? 'kg' : 'cm';
  // Etichette Y (min/mid/max)
  const midV = (minV + maxV) / 2;
  const yLabels = `
    <text x="${padL-4}" y="${yFor(maxV)+3}" font-size="9" text-anchor="end" fill="currentColor" opacity="0.6">${maxV.toFixed(0)}</text>
    <text x="${padL-4}" y="${yFor(midV)+3}" font-size="9" text-anchor="end" fill="currentColor" opacity="0.6">${midV.toFixed(0)}</text>
    <text x="${padL-4}" y="${yFor(minV)+3}" font-size="9" text-anchor="end" fill="currentColor" opacity="0.6">${minV.toFixed(0)}</text>
  `;

  return `
  <div class="growth-chart-card">
    <svg viewBox="0 0 ${W} ${H}" class="growth-svg">
      <path d="${bandPath}" fill="var(--accent-soft, #F5EAD2)" opacity="0.6"/>
      <path d="${p3Path}" stroke="#00000022" stroke-width="1" fill="none"/>
      <path d="${p97Path}" stroke="#00000022" stroke-width="1" fill="none"/>
      <path d="${p15Path}" stroke="#00000030" stroke-width="1" stroke-dasharray="2,2" fill="none"/>
      <path d="${p85Path}" stroke="#00000030" stroke-width="1" stroke-dasharray="2,2" fill="none"/>
      <path d="${p50Path}" stroke="var(--text-medium, #5A6B7C)" stroke-width="1.5" fill="none"/>
      ${xLabels}
      ${yLabels}
      <path d="${childPath}" stroke="var(--accent-dark, #A87A2E)" stroke-width="2" fill="none"/>
      ${childDots}
    </svg>
    <div class="growth-chart-legend">
      <span><span class="lg-swatch lg-band"></span>range 3°-97° OMS</span>
      <span><span class="lg-swatch lg-median"></span>mediana</span>
      <span><span class="lg-swatch lg-child"></span>${escapeHtml(child.name)}</span>
    </div>
    <div class="growth-chart-unit">${unit}</div>
  </div>`;
}

/* ---------- FORM AGGIUNGI MISURAZIONE (da sezione Salute) ---------- */
function openGrowthMeasureForm() {
  openEventForm('growth');
}
