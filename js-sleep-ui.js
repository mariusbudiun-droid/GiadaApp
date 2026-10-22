/* KIN · Sonno — schermata (tab "Sonno"): scheda, anello, timeline 24 h, riquadri, sotto-tab.
   La logica (dati, pause, calcoli, azioni, form) è in sleep.js. */
'use strict';

/* ---------- STATO DELLA SCHERMATA ---------- */

window.__sleepTab = window.__sleepTab || 'oggi';    // oggi | posamenti | storico | consigli
window.__sleepHist = window.__sleepHist || 'all';   // all | nap | night
window.__sleepTypeSel = window.__sleepTypeSel || null;

function setSleepTab(t) {
  window.__sleepTab = t;
  renderSleepPage();
}
function setSleepHist(v) {
  window.__sleepHist = v;
  renderSleepPage();
}

/* ---------- ANELLO (SVG) ---------- */

const RING_R = 84, RING_C = 100;

function ringPoint(pct) {
  const a = pct / 100 * 2 * Math.PI - Math.PI / 2;
  return { x: RING_C + RING_R * Math.cos(a), y: RING_C + RING_R * Math.sin(a) };
}

/* pct = avanzamento (0-100); band = {from, to} in % (solo da sveglio); faint = nessun obiettivo */
function ringSvg(pct, band, faint) {
  const p = Math.max(0.4, pctClamp(pct));
  const pt = ringPoint(p);
  return `<svg class="sl-ring" viewBox="0 0 200 200" aria-hidden="true">
    <circle class="sl-ring-track" cx="100" cy="100" r="${RING_R}"/>
    ${band ? `<circle class="sl-ring-band" cx="100" cy="100" r="${RING_R}" pathLength="100" stroke-dasharray="${(band.to - band.from).toFixed(2)} 100" stroke-dashoffset="${(-band.from).toFixed(2)}" transform="rotate(-90 100 100)"/>` : ''}
    <circle class="sl-ring-prog js-ring-prog ${faint ? 'faint' : ''}" cx="100" cy="100" r="${RING_R}" pathLength="100" stroke-dasharray="${p.toFixed(2)} 100" transform="rotate(-90 100 100)"/>
    <circle class="sl-ring-dot js-ring-dot ${faint ? 'faint' : ''}" cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="7"/>
  </svg>`;
}

function setRing(root, pct) {
  const prog = root.querySelector('.js-ring-prog');
  const dot = root.querySelector('.js-ring-dot');
  const p = Math.max(0.4, pctClamp(pct));
  if (prog) prog.setAttribute('stroke-dasharray', p.toFixed(2) + ' 100');
  if (dot) {
    const pt = ringPoint(p);
    dot.setAttribute('cx', pt.x.toFixed(2));
    dot.setAttribute('cy', pt.y.toFixed(2));
  }
}

/* ---------- SCHEDA: SVEGLIO ---------- */

function chipsHtml(cur, now) {
  const place = SLEEP_PLACES[cur.data.place] || SLEEP_PLACES.other;
  const ps = sessionPauses(cur);
  const pMin = pauseMinIn(cur, cur.ts, now, now);
  const pTxt = ps.length
    ? `⏸️ ${ps.length} ${ps.length === 1 ? 'pausa' : 'pause'}${pMin >= 1 ? ' · ' + fmtDur(pMin) : ''} ✎`
    : '';
  return `<div class="sl-chips">
    <button class="sl-chip" onclick="openQuickPlace()">${place.ico} ${place.label} ✎</button>
    ${pTxt ? `<button class="sl-chip" onclick="openSleepForm('${cur.id}')">${pTxt}</button>` : ''}
  </div>`;
}

function renderHeroAwake(child, now) {
  const lastEnd = lastWakeTs(child.id);
  const pred = predictNextSleep(child, now);
  const sel = currentTypeSel();
  let h = '';

  if (pred.kind === 'ok') {
    const st = napStatus(pred.start, pred.end, now);
    const scaleMin = pred.hi * 1.3;
    const scale = scaleMin * MIN_MS;
    const pct = (now - pred.lastEnd) / scale * 100;
    const band = { from: pred.lo / scaleMin * 100, to: pred.hi / scaleMin * 100 };
    h += `<div class="sl-hero awake js-sl-live" data-mode="awake" data-state="${st.cls}" data-start="${pred.start}" data-end="${pred.end}" data-since="${pred.lastEnd}" data-scale="${scale}">
      <div class="sl-hero-top">
        <span class="sl-kicker js-k">${escapeHtml(st.kicker)}</span>
        <button class="sl-edit" onclick="openQuickTime('wake')">sveglio dalle ${fmtTime(pred.lastEnd)} ✎</button>
      </div>
      <div class="sl-ring-wrap">
        ${ringSvg(pct, band, false)}
        <div class="sl-ring-center">
          <div class="sl-big js-big">${escapeHtml(st.big)}</div>
          <div class="sl-small js-small">${escapeHtml(st.small)}</div>
        </div>
      </div>
      <div class="sl-meta">
        <span>sveglio da <b class="js-awake-for">${fmtDur((now - pred.lastEnd) / MIN_MS)}</b></span>
        <span>fascia <b>${pred.lo}-${pred.hi}</b> min</span>
      </div>
      <div class="sl-adv js-adv">${escapeHtml(st.advice)}</div>
      <div class="sl-note">${pred.personal
        ? `Fascia tarata sui suoi ultimi ${pred.n} pisolini.`
        : 'Fascia indicativa per questa età. Si affina da sola dopo qualche giorno di registrazioni.'}</div>`;
  } else {
    h += `<div class="sl-hero awake plain">
      <div class="sl-hero-top">
        <span class="sl-kicker">☀️ Sveglio${lastEnd ? ` da <span class="js-sleep-tick" data-fmt="dur" data-since="${lastEnd}">${fmtDur((now - lastEnd) / MIN_MS)}</span>` : ''}</span>
        ${lastEnd ? `<button class="sl-edit" onclick="openQuickTime('wake')">dalle ${fmtTime(lastEnd)} ✎</button>` : ''}
      </div>`;
    if (pred.kind === 'stale') h += `<div class="sl-note">Ultimo risveglio registrato alle ${fmtTime(pred.lastEnd)}. Se ha dormito dopo, aggiungilo con «+ sonno dimenticato».</div>`;
    else if (pred.kind === 'nodata') h += `<div class="sl-note">Segna il primo sonno: da lì calcolo la fascia del prossimo.</div>`;
  }

  h += `<div class="sl-start ${sel === 'night' ? 'is-night' : ''}">
      <div class="sl-seg" role="group" aria-label="Tipo di sonno">
        <button class="${sel === 'nap' ? 'on' : ''}" onclick="setSleepTypeSel('nap')">☀️ Pisolino</button>
        <button class="${sel === 'night' ? 'on night' : ''}" onclick="setSleepTypeSel('night')">🌙 Notte</button>
      </div>
      <div class="sl-start-lbl">Si è addormentato…</div>
      <div class="sleep-places">
        ${SLEEP_PLACE_ORDER.map(k => `<button onclick="sleepStart('${k}')"><span class="sp-ico">${SLEEP_PLACES[k].ico}</span><span>${SLEEP_PLACES[k].short}</span></button>`).join('')}
      </div>
    </div>
  </div>`;
  return h;
}

/* ---------- SCHEDA: STA DORMENDO (pisolino o notte, con o senza pausa) ---------- */

function renderHeroSleeping(child, cur, now) {
  const isNight = sleepType(cur) === 'night';
  const open = openPauseOf(cur);
  const paused = !!open;
  const netMs = sleepNetMin(cur, null, null, now) * MIN_MS;
  const pd = latestPutdownForSleep(cur.id);

  // obiettivo: pisolino = durata tipica; notte = media delle sue notti
  let fullMin = 0, fullLbl = '';
  if (isNight) {
    const avg = averageNightMin(child.id, now);
    if (avg) { fullMin = Math.round(avg / 5) * 5; fullLbl = `media delle sue notti: ~${fmtDur(fullMin)}`; }
  } else {
    const typ = typicalNapMin(child, now, cur);
    if (typ) {
      fullMin = typ.min;
      fullLbl = (typ.kind === 'index' ? `media dei suoi ${typ.idx}° pisolini` : (typ.kind === 'all' ? 'media dei suoi pisolini' : 'pisolino tipico per l\'età')) + `: ~${fmtDur(typ.min)}`;
    }
  }
  const full = fullMin * MIN_MS;
  const pct = full ? netMs / full * 100 : 100;

  const live = `data-mode="${paused ? 'pause' : 'sleep'}" data-since="${cur.ts}" data-paused="${closedPauseMs(cur)}" data-popen="${open ? open.s : 0}" data-full="${full}"`;
  const kicker = paused
    ? (isNight ? '⏸️ Pausa nella notte' : '⏸️ Pausa nel pisolino')
    : (isNight ? '🌙 Notte in corso' : '😴 Pisolino in corso');

  let h = `<div class="sl-hero ${isNight ? 'night' : 'nap'} sleeping ${paused ? 'is-paused' : ''} js-sl-live" ${live}>
    ${isNight ? '<div class="sl-stars" aria-hidden="true"></div>' : ''}
    <div class="sl-hero-top">
      <span class="sl-kicker">${kicker}</span>
      <button class="sl-edit" onclick="openSleepForm('${cur.id}')">modifica</button>
    </div>`;

  if (isNight) {
    // notte: niente anello, grande orologio su fondo indaco
    if (paused) {
      h += `<div class="sl-night-body">
        <div class="sl-night-lbl">in pausa da</div>
        <div class="sl-night-time js-ptimer">${fmtElapsed(now - open.s)}</div>
        <div class="sl-night-sub">dalle ${fmtTime(open.s)} · ha dormito <b class="js-net-small">${fmtDur(netMs / MIN_MS)}</b></div>
      </div>`;
    } else {
      h += `<div class="sl-night-body">
        <div class="sl-night-lbl">ha dormito</div>
        <div class="sl-night-time js-net">${fmtElapsed(netMs)}</div>
        <button class="sl-link" onclick="openQuickTime('start')">dalle ${fmtTime(cur.ts)} ✎</button>
      </div>`;
      if (full) {
        h += `<div class="sl-bar"><i class="js-bar-fill ${netMs >= full ? 'over' : ''}" style="width:${Math.max(2, pctClamp(pct)).toFixed(1)}%"></i></div>
        <div class="sl-bar-lbl">${escapeHtml(fullLbl)}</div>`;
      }
    }
  } else {
    // pisolino: anello che si riempie fino alla durata tipica
    h += `<div class="sl-ring-wrap">
      ${ringSvg(pct, null, !full)}
      <div class="sl-ring-center">
        ${paused
          ? `<div class="sl-small">in pausa da</div>
             <div class="sl-time js-ptimer">${fmtElapsed(now - open.s)}</div>
             <div class="sl-small">ha dormito <b class="js-net-small">${fmtDur(netMs / MIN_MS)}</b></div>`
          : `<div class="sl-time js-net">${fmtElapsed(netMs)}</div>
             <button class="sl-link" onclick="openQuickTime('start')">dalle ${fmtTime(cur.ts)} ✎</button>`}
      </div>
    </div>`;
    if (fullLbl && !paused) h += `<div class="sl-meta one"><span>${escapeHtml(fullLbl)}</span></div>`;
  }

  h += chipsHtml(cur, now);

  if (pd) {
    h += `<div class="sl-note tappable" onclick="openPutdownEdit('${pd.id}')">Posato alle ${fmtTime(pd.ts)} (dopo ${pd.data.after_min} min) ✎. Se si sveglia, tocca «Si è svegliato».</div>`;
  }
  if (cur.data.place === 'bed') {
    h += `<div class="sl-note">Nel lettone: niente cuscini o coperte vicino a lui e, se puoi, rimettilo nel suo spazio appena possibile.</div>`;
  }

  if (paused) {
    h += `<div class="sl-note">Se non si riaddormenta, il sonno risulta finito alle ${fmtTime(open.s)} (quando è iniziata la pausa) e da lì conto la veglia.</div>`;
    h += `<button class="sl-main resume" onclick="endPause()">▶️ Riprende a dormire</button>
      <div class="sl-actions">
        <button onclick="sleepWakeAtPause()">☀️ Non si riaddormenta</button>
        <button onclick="openSleepForm('${cur.id}')">✎ Modifica</button>
      </div>`;
  } else {
    h += `<button class="sl-main wake" onclick="sleepWake()">☀️ Si è svegliato</button>
      <div class="sl-actions">
        <button onclick="openPauseSheet()">⏸️ Pausa</button>
        <button onclick="openPutdownSheet()">🛏️ L'ho posato</button>
      </div>`;
  }
  h += `</div>`;
  return h;
}

/* ---------- TIMELINE 24 ORE ---------- */

const TL_PAST_H = 24, TL_SPAN_H = 27;
const WD_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

function renderTimeline(child, now) {
  const t0 = now - TL_PAST_H * HOUR_MS, span = TL_SPAN_H * HOUR_MS;
  const pos = t => (t - t0) / span * 100;
  const sess = sleepSessions(child.id).filter(e => (sleepEndTs(e) != null ? sleepEndTs(e) : now) > t0 && e.ts < now);

  let shades = '', blocks = '', pauses = '', ticks = '';

  // fasce di notte (19-06) sullo sfondo
  const base = new Date(t0); base.setHours(0, 0, 0, 0);
  for (let d = -1; d <= 2; d++) {
    const a = new Date(base); a.setDate(a.getDate() + d); a.setHours(19, 0, 0, 0);
    const b = new Date(base); b.setDate(b.getDate() + d + 1); b.setHours(6, 0, 0, 0);
    const s = Math.max(a.getTime(), t0), e = Math.min(b.getTime(), t0 + span);
    if (e > s) shades += `<i class="sl-tl-dark" style="left:${pos(s).toFixed(2)}%;width:${(pos(e) - pos(s)).toFixed(2)}%"></i>`;
  }

  sess.forEach(e => {
    const en = sleepEndTs(e);
    const s = Math.max(e.ts, t0), t = Math.min(en != null ? en : now, now);
    const left = pos(s), w = Math.max(0.6, pos(t) - pos(s));
    const type = sleepType(e) === 'night' ? 'night' : 'nap';
    const place = SLEEP_PLACES[e.data.place] || SLEEP_PLACES.other;
    blocks += `<button class="sl-blk ${type} ${en == null ? 'js-tl-open' : ''}" data-s="${s}" style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%" onclick="openSleepForm('${e.id}')" aria-label="${type === 'night' ? 'Notte' : 'Pisolino'} ${fmtTime(e.ts)} ${place.short}"></button>`;
    sessionPauses(e).forEach(p => {
      const ps = Math.max(p.s, s), pe = Math.min(p.e != null ? p.e : now, t);
      if (pe <= ps) return;
      pauses += `<i class="sl-pz ${p.e == null ? 'js-tl-openpause' : ''}" data-s="${ps}" style="left:${pos(ps).toFixed(2)}%;width:${Math.max(0.5, pos(pe) - pos(ps)).toFixed(2)}%"></i>`;
    });
  });

  // fascia prevista del prossimo sonno
  let pred = '';
  if (!currentSleep(child.id)) {
    const p = predictNextSleep(child, now);
    if (p.kind === 'ok') {
      const s = Math.max(p.start, now), e = Math.min(p.end, t0 + span);
      if (e > s) pred = `<i class="sl-pred" style="left:${pos(s).toFixed(2)}%;width:${(pos(e) - pos(s)).toFixed(2)}%"></i>`;
    }
  }

  // tacche ogni 6 ore (00, 06, 12, 18); a mezzanotte il giorno
  const d = new Date(t0); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
  for (let i = 0; i < TL_SPAN_H + 1; i++) {
    const t = d.getTime();
    if (t > t0 + span) break;
    const hh = d.getHours();
    if (hh % 6 === 0) {
      const lbl = hh === 0 ? WD_SHORT[d.getDay()] : String(hh).padStart(2, '0');
      ticks += `<span class="sl-tick ${hh === 0 ? 'day' : ''}" style="left:${pos(t).toFixed(2)}%">${lbl}</span>`;
    }
    d.setHours(d.getHours() + 1);
  }

  return `<div class="sl-tl js-timeline" data-t0="${t0}" data-span="${span}">
    <div class="sl-tl-lane">${shades}${pred}${blocks}${pauses}<b class="sl-now js-tl-now" style="left:${pos(now).toFixed(2)}%"></b></div>
    <div class="sl-tl-axis">${ticks}</div>
    <div class="sl-legend">
      <span><i class="k nap"></i>pisolini</span>
      <span><i class="k night"></i>notte</span>
      <span><i class="k pz"></i>pause</span>
      ${pred ? '<span><i class="k pred"></i>prossimo</span>' : ''}
    </div>
  </div>`;
}

/* ---------- RIQUADRI (notte / pisolini) E TOTALE ---------- */

function statsInner(child, now) {
  const ref = sleepTotalRefFor(sleepAgeMonths(child));
  const tot = sleepTotals(child.id, now);
  const N = tot.night, P = tot.nap;

  const pauseTxt = c => c.pauseN
    ? `${c.pauseN} ${c.pauseN === 1 ? 'pausa' : 'pause'} · ${fmtDur(c.pauseMin)}`
    : 'senza pause';

  const nightSub = N.count ? pauseTxt(N) : 'nessuna notte registrata';
  const napSub = P.count
    ? `${P.count} ${P.count === 1 ? 'pisolino' : 'pisolini'} · media ${fmtDur(P.min / P.count)}${P.pauseN ? ' · ' + P.pauseN + (P.pauseN === 1 ? ' pausa' : ' pause') : ''}`
    : 'nessun pisolino registrato';

  const scale = ref.max + 2;
  let nW = pctClamp(N.min / 60 / scale * 100), pW = pctClamp(P.min / 60 / scale * 100);
  if (nW + pW > 100) pW = 100 - nW;
  const bandL = ref.min / scale * 100, bandW = (ref.max - ref.min) / scale * 100;
  const verdict = tot.complete ? sleepTotalVerdict(tot.total, ref) : null;

  return `<div class="sl-tiles">
      <div class="sl-tile night"><div class="sl-tile-h">🌙 Notte</div><div class="sl-tile-n">${N.count ? fmtDur(N.min) : '—'}</div><div class="sl-tile-s">${escapeHtml(nightSub)}</div></div>
      <div class="sl-tile nap"><div class="sl-tile-h">☀️ Pisolini</div><div class="sl-tile-n">${P.count ? fmtDur(P.min) : '—'}</div><div class="sl-tile-s">${escapeHtml(napSub)}</div></div>
    </div>
    <div class="sl-total">
      <div class="sl-total-head"><span>Totale ultime 24 h</span><span><strong>${fmtDur(tot.total)}</strong> su ${ref.min}-${ref.max} h</span></div>
      <div class="sl-stack"><i class="n" style="width:${nW.toFixed(1)}%"></i><i class="p" style="width:${pW.toFixed(1)}%"></i><b class="band" style="left:${bandL.toFixed(1)}%;width:${bandW.toFixed(1)}%"></b></div>
      <div class="sl-total-note ${verdict ? verdict.cls : ''}">${verdict ? verdict.text : 'Il confronto parte dopo un giorno intero di registrazioni'} · tempo effettivo, pause escluse</div>
    </div>`;
}

function renderStats(child, now) {
  return `<div class="js-sl-stats" data-child="${child.id}">${statsInner(child, now)}</div>`;
}

/* ---------- SEZIONI ---------- */

function renderNapAveragesSection(child, now) {
  const rows = napAveragesByIndex(child.id, now).filter(r => r.n >= 2);
  if (!rows.length) return '';
  const max = Math.max(...rows.map(r => r.avg));
  let h = `<div class="card-eyebrow eb-spaced">durata dei pisolini · ultimi 7 giorni</div><div class="sleep-panel">
    <div class="sl-cols">`;
  rows.forEach(r => {
    h += `<div class="sl-col"><span class="sl-col-v">${fmtDur(r.avg)}</span><span class="sl-col-bar"><i style="height:${Math.max(8, Math.round(100 * r.avg / max))}%"></i></span><span class="sl-col-l">${r.idx}°</span><span class="sl-col-n">×${r.n}</span></div>`;
  });
  h += `</div><div class="ev-hint">Tempo effettivo (pause escluse). Il numero è la posizione nella giornata: se un pisolino non viene segnato, quelli dopo si spostano, recuperalo con «+ sonno dimenticato».</div></div>`;
  return h;
}

function renderPlaceSection(child, now) {
  const from = now - 7 * DAY_MS;
  const mins = { arms: 0, carrier: 0, crib: 0, bed: 0, other: 0 };
  let total = 0;
  sleepSessions(child.id).forEach(e => {
    const m = sleepNetMin(e, from, now, now);
    if (m <= 0) return;
    const k = mins[e.data.place] != null ? e.data.place : 'other';
    mins[k] += m; total += m;
  });
  if (total < 60) return '';
  let h = `<div class="card-eyebrow eb-spaced">dove ha dormito · ultimi 7 giorni</div><div class="sleep-panel"><div class="pd-table">`;
  SLEEP_PLACE_ORDER.forEach(k => {
    if (!mins[k]) return;
    const pct = Math.round(100 * mins[k] / total);
    h += `<div class="pd-row"><span class="pd-lbl">${SLEEP_PLACES[k].ico} ${SLEEP_PLACES[k].short}</span><span class="pd-bar"><i style="width:${pct}%"></i></span><span class="pd-val">${pct}%</span></div>`;
  });
  h += `</div><div class="ev-hint">Serve a vedere i progressi verso il lettino, settimana dopo settimana.</div></div>`;
  return h;
}

function renderPutdownSection(child, now) {
  const pds = putdownsFor(child.id).map(p => ({ p, res: putdownResult(p, now) }));
  const bedN = pds.filter(x => x.p.data.place === 'bed').length;
  const resolved = pds.filter(x => (x.res === 'stayed' || x.res === 'woke') && x.p.data.place !== 'bed');
  const stayed = resolved.filter(x => x.res === 'stayed').length;

  let h = `<div class="card-eyebrow">posarlo senza svegliarlo</div><div class="sleep-panel">`;

  if (resolved.length === 0) {
    h += `<div class="sp-text">Quando si addormenta in braccio, tocca «L'ho posato» al momento giusto: segno dopo quanti minuti l'hai fatto e come è andata. Dopo una decina di tentativi vedi quando ha più probabilità di restare giù.</div>`;
  } else {
    h += `<div class="sp-text"><strong>${stayed} su ${resolved.length}</strong> posamenti riusciti (restava giù almeno ${PUTDOWN_STAY_MIN} min).</div>`;

    const buckets = [
      { label: 'meno di 10 min', a: 0, b: 10 },
      { label: '10-14 min', a: 10, b: 15 },
      { label: '15-19 min', a: 15, b: 20 },
      { label: '20-29 min', a: 20, b: 30 },
      { label: '30 min o più', a: 30, b: 1e9 }
    ].map(bk => {
      const list = resolved.filter(x => x.p.data.after_min >= bk.a && x.p.data.after_min < bk.b);
      return Object.assign(bk, { n: list.length, ok: list.filter(x => x.res === 'stayed').length });
    });
    h += `<div class="pd-table">`;
    buckets.forEach(bk => {
      if (!bk.n) return;
      const pct = Math.round(100 * bk.ok / bk.n);
      h += `<div class="pd-row"><span class="pd-lbl">dopo ${bk.label}</span><span class="pd-bar"><i style="width:${pct}%"></i></span><span class="pd-val">${bk.ok}/${bk.n}</span></div>`;
    });
    h += `</div>`;

    if (resolved.length >= 8) {
      const cands = buckets.filter(bk => bk.n >= 3).sort((x, y) => (y.ok / y.n) - (x.ok / x.n) || y.n - x.n);
      if (cands.length) {
        const best = cands[0];
        h += `<div class="sp-insight">Finora funziona meglio posarlo <strong>dopo ${best.label}</strong> (${best.ok} su ${best.n}). Sono pochi dati: prendilo come indicazione, non come regola.</div>`;
      }
    } else {
      h += `<div class="ev-hint">Ancora pochi tentativi (${resolved.length}): ne servono almeno 8 per un'indicazione.</div>`;
    }
  }

  if (bedN > 0) {
    h += `<div class="ev-hint">I posamenti nel lettone (${bedN}) restano nell'elenco ma non entrano nelle percentuali, che servono a capire il lettino.</div>`;
  }

  const recent = pds.slice(0, 8);
  if (recent.length) {
    h += `<div class="pd-list">`;
    recent.forEach(({ p, res }) => {
      const resTxt = { stayed: '✓ resta giù', woke: '✗ si è svegliato', pending: '… in corso', unknown: '?' }[res];
      const where = (SLEEP_PLACES[p.data.place] || SLEEP_PLACES.other).ico;
      h += `<button class="pd-item ${res}" onclick="openPutdownEdit('${p.id}')">
        <span>${fmtDateShort(new Date(p.ts))} ${fmtTime(p.ts)} · dopo ${p.data.after_min} min ${where}</span><span>${resTxt}</span></button>`;
    });
    h += `</div>`;
  }

  h += `<details class="sleep-tips"><summary>Come posarlo: consigli</summary><ul class="phase-list">`;
  PUTDOWN_TIPS.forEach(t => { h += `<li>${escapeHtml(t)}</li>`; });
  h += `</ul>
    <div class="ev-hint">Sono consigli comuni, non garanzie: per questo li misuriamo sui vostri tentativi.</div>
    </details></div>`;
  return h;
}

function renderSleepHistory(child, now) {
  const filt = window.__sleepHist;
  const from = now - 14 * DAY_MS;
  let list = sleepSessions(child.id).filter(e => e.ts >= from);
  if (filt !== 'all') list = list.filter(e => sleepType(e) === filt);
  list.sort((a, b) => b.ts - a.ts);

  const seg = (v, label) => `<button class="${filt === v ? 'on' : ''}" onclick="setSleepHist('${v}')">${label}</button>`;
  let h = `<div class="card-eyebrow eb-spaced">ultimi 14 giorni</div>
    <div class="sl-seg wide" role="group" aria-label="Filtro">${seg('all', 'Tutto')}${seg('nap', '☀️ Pisolini')}${seg('night', '🌙 Notti')}</div>`;

  if (!list.length) {
    return h + `<div class="empty-card" style="margin-top:10px"><div class="empty-text">Niente da mostrare. Usa i tasti nella scheda «Oggi», oppure aggiungi un sonno a mano.</div></div>`;
  }
  const byDay = {};
  list.forEach(e => { (byDay[dateOf(e.ts)] = byDay[dateOf(e.ts)] || []).push(e); });
  Object.keys(byDay).sort((a, b) => b.localeCompare(a)).forEach(dayKey => {
    const items = byDay[dayKey];
    const sum = t => items.filter(e => sleepType(e) === t).reduce((s, e) => s + sleepNetMin(e, null, null, now), 0);
    const n = sum('night'), p = sum('nap');
    let label = fmtDateLong(parseDateStr(dayKey));
    if (dayKey === todayStr()) label = 'oggi';
    else if (dayKey === dateOf(now - DAY_MS)) label = 'ieri';
    h += `<div class="tk-day-eyebrow">${label}${filt !== 'night' && p ? ` · ☀️ ${fmtDur(p)}` : ''}${filt !== 'nap' && n ? ` · 🌙 ${fmtDur(n)}` : ''}</div>`;
    items.forEach(e => {
      const en = sleepEndTs(e);
      const place = SLEEP_PLACES[e.data.place] || SLEEP_PLACES.other;
      const ps = sessionPauses(e);
      const pMin = pauseMinIn(e, e.ts, en != null ? en : now, now);
      const isNight = sleepType(e) === 'night';
      h += `<div class="tk-row sl-hrow ${isNight ? 'night' : 'nap'}" onclick="openSleepForm('${e.id}')">
        <div class="tk-row-icon">${isNight ? '🌙' : '😴'}</div>
        <div class="tk-row-body">
          <div class="tk-row-head">
            <span class="tk-row-label">${fmtTime(e.ts)} → ${en != null ? fmtTime(en) : 'in corso'}</span>
            <span class="tk-row-time">${fmtDur(sleepNetMin(e, null, null, now))}</span>
          </div>
          <div class="tk-row-desc">${place.ico} ${place.short}${ps.length ? ` · ⏸️ ${ps.length} ${ps.length === 1 ? 'pausa' : 'pause'}${pMin >= 1 ? ' (' + fmtDur(pMin) + ')' : ''}` : ''}</div>
          ${e.note ? `<div class="tk-row-note">"${escapeHtml(e.note)}"</div>` : ''}
        </div>
      </div>`;
    });
  });
  return h;
}

function renderSleepAdvice(child, now) {
  const months = sleepAgeMonths(child);
  const ref = sleepTotalRefFor(months);
  const ww = wakeWindowFor(months);
  const real = ageOf(child.birth_date);
  const usesCorrected = child.due_date && real.totalDays < 730 && correctedAge(child.birth_date, child.due_date);
  let h = `<div class="card-eyebrow">per la sua età${usesCorrected ? ' (corretta)' : ''}</div>
    <div class="sleep-ref">
      <div><span class="sr-num">${ref.min}-${ref.max} h</span><span class="sr-lbl">sonno totale nelle 24 h</span></div>
      ${ww ? `<div><span class="sr-num">${ww.min}-${ww.max} min</span><span class="sr-lbl">veglia tra un sonno e l'altro</span></div>
      <div><span class="sr-num">${ww.naps}</span><span class="sr-lbl">pisolini al giorno</span></div>` : ''}
    </div>
    <div class="ev-hint" style="margin:6px 4px 0">Sono medie, non regole: l'età è quella corretta se è nato prematuro. Le finestre di veglia sono una guida di uso comune, non hanno una base scientifica forte.</div>`;
  h += renderSleepPhases(child, 'cosa aspettarti sul sonno');
  h += `<div class="phase-flag" style="margin-top:22px"><strong>Quando chiamare il pediatra —</strong> respiro affannoso o con pause lunghe, colorito pallido o bluastro, pianto inconsolabile e diverso dal solito, vomito ripetuto, difficoltà a svegliarlo per mangiare, febbre (sotto i 3 mesi anche 38 °C va valutata subito). Se non risponde o è bluastro, chiama il 112.</div>`;
  h += `<div class="ev-hint" style="margin:10px 4px 0">Sicurezza del sonno (AAP): sempre a pancia in su, su superficie piana e rigida, senza cuscini o peluche. Se si addormenta in fascia o in braccio, spostalo appena puoi. Mai addormentarsi con lui su divano o poltrona. Nel lettone l'AAP sconsiglia di dormire insieme nei primi mesi e nei nati prematuri: il rischio è più alto sotto i 4 mesi ed è molto più alto se un adulto ha bevuto alcol, preso farmaci che appesantiscono il sonno o fuma. La soluzione che l'AAP indica è tenere il suo spazio vicino al vostro letto (stanza condivisa, letto separato) per almeno 6 mesi.</div>`;
  return h;
}

function renderSleepPhases(child, title) {
  const phases = (typeof getCurrentPhases === 'function') ? getCurrentPhases(child, 'sleep') : [];
  if (!phases.length) return '';
  let h = `<div class="card-eyebrow eb-spaced">${title}</div><div class="phase-list-wrap">`;
  phases.forEach(p => { h += renderPhaseTeaser(p); });
  return h + `</div>`;
}

/* ---------- PAGINA ---------- */

function renderSleepPage() {
  const c = document.getElementById('sleepContent');
  if (!c) return;
  const child = getActiveChild();
  if (!child) { c.innerHTML = renderEmptyHome(); return; }

  if (window.__sleepTypeChild !== child.id) { window.__sleepTypeChild = child.id; window.__sleepTypeSel = null; }

  let html = renderChildSwitcher();
  html += `<div class="hdr-block">
    <div class="hdr-eyebrow">sonno</div>
    <h1 class="hdr-title">${escapeHtml(child.name)}</h1>
  </div>`;

  // bambini più grandi: niente registro, solo le schede di consigli
  if (!sleepEligible(child)) {
    const ph = renderSleepPhases(child, 'cosa aspettarti sul sonno');
    html += ph ? ph.replace('eb-spaced', '') : `<div class="empty-card"><div class="empty-text">I contenuti sul sonno per questa età arriveranno presto.</div></div>`;
    html += `<div class="ev-hint" style="margin:14px 4px 0">Il registro del sonno è pensato per i bambini fino a 3 anni.</div>`;
    c.innerHTML = html;
    return;
  }

  const now = Date.now();
  const tab = window.__sleepTab;
  const tabBtn = (id, label) => `<button class="health-tab ${tab === id ? 'active' : ''}" onclick="setSleepTab('${id}')">${label}</button>`;
  html += `<div class="health-tabs">${tabBtn('oggi', 'Oggi')}${tabBtn('posamenti', 'Posamenti')}${tabBtn('storico', 'Storico')}${tabBtn('consigli', 'Consigli')}</div>`;

  if (tab === 'oggi') {
    const cur = currentSleep(child.id);
    html += cur ? renderHeroSleeping(child, cur, now) : renderHeroAwake(child, now);
    html += `<div class="card-eyebrow eb-spaced">le ultime 24 ore</div>`;
    html += renderTimeline(child, now);
    html += renderStats(child, now);
    html += `<button class="diary-add-btn sleep-add" onclick="openSleepForm()">+ sonno dimenticato</button>`;
  } else if (tab === 'posamenti') {
    html += renderPutdownSection(child, now);
  } else if (tab === 'storico') {
    html += renderNapAveragesSection(child, now).replace('card-eyebrow eb-spaced', 'card-eyebrow');
    html += renderPlaceSection(child, now);
    html += `<button class="diary-add-btn sleep-add" onclick="openSleepForm()">+ sonno (a mano)</button>`;
    html += renderSleepHistory(child, now);
  } else {
    html += renderSleepAdvice(child, now);
  }

  c.innerHTML = html;
}

/* ---------- AGGIORNAMENTO VISTE + TIMER ---------- */

function renderSleepPageIfActive() {
  if (document.getElementById('sec-sonno')?.classList.contains('active')) renderSleepPage();
}
function refreshSleepViews() {
  renderSleepPageIfActive();
}

/* Aggiorna solo testi e larghezze (mai i bottoni: ridisegnarli mentre li tocchi fa perdere i tap) */
let _sleepTickN = 0;

function _setText(root, sel, txt) {
  const el = root.querySelector(sel);
  if (el && el.textContent !== txt) el.textContent = txt;
}

function updateHero(el, now) {
  const d = el.dataset;
  if (d.mode === 'awake') {
    const start = Number(d.start), end = Number(d.end), since = Number(d.since), scale = Number(d.scale);
    const st = napStatus(start, end, now);
    if (d.state !== st.cls) d.state = st.cls;
    _setText(el, '.js-k', st.kicker);
    _setText(el, '.js-big', st.big);
    _setText(el, '.js-small', st.small);
    _setText(el, '.js-adv', st.advice);
    _setText(el, '.js-awake-for', fmtDur((now - since) / MIN_MS));
    setRing(el, (now - since) / scale * 100);
    return;
  }
  const since = Number(d.since), paused = Number(d.paused), popen = Number(d.popen) || 0, full = Number(d.full) || 0;
  const net = Math.max(0, now - since - paused - (popen ? now - popen : 0));
  if (d.mode === 'sleep') {
    _setText(el, '.js-net', fmtElapsed(net));
    if (full) {
      setRing(el, net / full * 100);
      const prog = el.querySelector('.js-ring-prog');
      if (prog) prog.classList.toggle('over', net >= full);
      const bar = el.querySelector('.js-bar-fill');
      if (bar) {
        bar.style.width = Math.max(2, pctClamp(net / full * 100)).toFixed(1) + '%';
        bar.classList.toggle('over', net >= full);
      }
    }
  } else {
    _setText(el, '.js-ptimer', fmtElapsed(now - popen));
    _setText(el, '.js-net-small', fmtDur(net / MIN_MS));
  }
}

function updateTimeline(el, now) {
  const t0 = Number(el.dataset.t0), span = Number(el.dataset.span);
  const pos = t => (t - t0) / span * 100;
  const mark = el.querySelector('.js-tl-now');
  if (mark) mark.style.left = pos(now).toFixed(2) + '%';
  el.querySelectorAll('.js-tl-open, .js-tl-openpause').forEach(b => {
    const s = Number(b.dataset.s);
    b.style.width = Math.max(0.5, pos(now) - pos(s)).toFixed(2) + '%';
  });
  // la finestra si è spostata troppo: ridisegna tutto
  if (now > t0 + (TL_PAST_H + 1.5) * HOUR_MS) renderSleepPageIfActive();
}

function sleepTick() {
  if (document.hidden) return;
  if (!document.getElementById('sec-sonno')?.classList.contains('active')) return;
  const now = Date.now();
  _sleepTickN++;
  document.querySelectorAll('.js-sleep-tick').forEach(el => {
    const since = Number(el.dataset.since);
    el.textContent = el.dataset.fmt === 'timer' ? fmtElapsed(now - since) : fmtDur((now - since) / MIN_MS);
  });
  document.querySelectorAll('.js-sl-live').forEach(el => updateHero(el, now));
  document.querySelectorAll('.js-timeline').forEach(el => updateTimeline(el, now));
  if (_sleepTickN % 15 === 0) {
    document.querySelectorAll('.js-sl-stats').forEach(el => {
      const child = getChild(el.dataset.child);
      if (child) el.innerHTML = statsInner(child, now);
    });
  }
}
setInterval(sleepTick, 1000);
