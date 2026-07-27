/* KIN · Fasi di sviluppo
   Contenuto principale dell'app: non "a che ora ha mangiato",
   ma "cosa aspettarti in questo periodo, perché, come comportarti,
   quanto dura". Il tracking è di supporto, non il centro.

   Ogni fase copre una finestra di età in giorni (ageMinDays/ageMaxDays)
   e può sovrapporsi ad altre: è normale, lo sviluppo è continuo.
   ========================================================= */
'use strict';

const PHASES = [

  /* ================= SAMUEL · 0-12 mesi ================= */

  {
    id: 'inf_0_2w',
    ageMinDays: 0, ageMaxDays: 15,
    title: 'Le prime due settimane',
    whatToExpect: 'Il sonno e la veglia sono ancora scollegati dal giorno e dalla notte: si sveglia spesso, anche più volte per notte, per mangiare. È normale che perda un po\' di peso nei primi giorni e lo recuperi entro 2 settimane. I movimenti sono ancora guidati da riflessi arcaici (Moro, suzione, prensione).',
    why: 'Il suo orologio biologico non si è ancora sincronizzato con la luce e il buio: ci vogliono circa 6-8 settimane perché inizi a farlo.',
    whatToDo: [
      'Allattalo a richiesta, senza orari fissi: nei primi giorni può volere il seno molto spesso.',
      'Esponilo alla luce naturale di giorno e tieni le luci basse la notte: aiuta a sincronizzare il ritmo.',
      'Fai contatto pelle a pelle quando puoi: lo calma e aiuta anche te.'
    ],
    duration: 'Dura tipicamente le prime 2 settimane, poi inizia gradualmente a distinguere giorno e notte.',
    flag: 'Se dopo 2 settimane non ha ripreso il peso della nascita, parlane con il pediatra.'
  },
  {
    id: 'inf_colic',
    ageMinDays: 14, ageMaxDays: 120,
    title: 'Il periodo del pianto serale',
    whatToExpect: 'Tra le 2 e le 6 settimane molti neonati attraversano una fase di pianto inconsolabile, spesso nel tardo pomeriggio o sera. Non sempre c\'è una causa evidente: non è colpa tua e non significa che stia male.',
    why: 'Il sistema nervoso è ancora immaturo e il pianto serale è un modo, frustrante ma normale, per scaricare la stimolazione accumulata durante il giorno.',
    whatToDo: [
      'Prova il contenimento: fascia, dondolio, rumore bianco o il suono di un phon/aspirapolvere in lontananza.',
      'Se ti senti sopraffatto, appoggialo al sicuro nella culla e allontanati qualche minuto: va bene.',
      'Alternatevi tra genitori se possibile: non serve reggere tutto da soli.'
    ],
    duration: 'Il picco è di solito intorno alle 6 settimane, e migliora sensibilmente entro i 3-4 mesi.',
    flag: 'Se il pianto è accompagnato da febbre, vomito importante, o sembra dolorante anche fuori da questi episodi, sentite il pediatra.'
  },
  {
    id: 'inf_smile',
    ageMinDays: 45, ageMaxDays: 150,
    title: 'Primi sorrisi e una routine più prevedibile',
    whatToExpect: 'Intorno alle 6-8 settimane arrivano i primi sorrisi sociali, in risposta al tuo viso o alla tua voce, non solo riflessi. Il sonno inizia a organizzarsi in blocchi un po\' più lunghi.',
    why: 'La corteccia visiva e le connessioni sociali del cervello stanno maturando abbastanza da permettergli di riconoscerti e rispondere.',
    whatToDo: [
      'Rispondi ai suoi sorrisi: è l\'inizio di una vera conversazione fatta di sguardi ed espressioni.',
      'Inizia a introdurre una routine semplice (bagnetto, ninna nanna, luci basse) prima del sonno serale.'
    ],
    duration: 'Da qui in poi i periodi di veglia attiva e interazione aumentano gradualmente.'
  },
  {
    id: 'inf_growth_tummy',
    ageMinDays: 80, ageMaxDays: 180,
    title: 'Scatto di crescita e tummy time',
    whatToExpect: 'Intorno ai 3 mesi molti bambini attraversano uno scatto di crescita: per qualche giorno mangiano di più e dormono peggio. È anche il momento in cui il tempo a pancia in giù (tummy time) diventa importante per rinforzare collo e spalle.',
    why: 'Gli scatti di crescita sono brevi periodi di sviluppo accelerato. Il tummy time costruisce la forza necessaria per sollevare la testa, poi il petto, e più avanti girarsi e gattonare.',
    whatToDo: [
      'Fai tummy time da sveglio e sotto supervisione, qualche minuto più volte al giorno, aumentando gradualmente fino a 15-20 minuti totali.',
      'Se piange subito, riduci il tempo e riprova più tardi: conta la costanza, non la durata di ogni sessione.',
      'Durante gli scatti di crescita, asseconda la fame extra: è temporaneo.'
    ],
    duration: 'Lo scatto di crescita dura di solito pochi giorni; il tummy time va costruito gradualmente nei mesi successivi.'
  },
  {
    id: 'inf_weaning',
    ageMinDays: 120, ageMaxDays: 240,
    title: 'Verso lo svezzamento',
    whatToExpect: 'Tra i 4 e i 6 mesi molti bambini iniziano a mostrare segnali di essere pronti per i primi assaggi di cibo solido: riescono a stare seduti con supporto, perdono il riflesso di estrusione (che spinge fuori il cibo con la lingua) e mostrano interesse per quello che mangi tu.',
    why: 'Il sistema digestivo e le capacità motorie orali raggiungono la maturità necessaria per gestire alimenti diversi dal latte.',
    whatToDo: [
      'Aspetta che siano presenti insieme più segnali di pronto, non solo l\'età.',
      'Parlane con il pediatra prima di iniziare, per tempistiche e modalità.',
      'Procedi con calma: all\'inizio sono solo assaggi, il latte resta l\'alimento principale.'
    ],
    duration: 'Il periodo di introduzione dura alcuni mesi, con gusti e quantità che cambiano spesso.'
  },
  {
    id: 'inf_crawl_separation',
    ageMinDays: 180, ageMaxDays: 300,
    title: 'Seduto, gattonamento e ansia da separazione',
    whatToExpect: 'Tra i 6 e i 10 mesi molti bambini imparano a stare seduti da soli e iniziano a gattonare o spostarsi in altri modi. Compare spesso anche l\'ansia da separazione: piange quando non ti vede, anche solo per un attimo.',
    why: 'Ora capisce che le persone e gli oggetti continuano a esistere anche quando non li vede, la cosiddetta permanenza dell\'oggetto: per questo la tua assenza diventa più difficile da accettare.',
    whatToDo: [
      'Gioca a nascondere e ritrovare oggetti o il tuo viso: aiuta a costruire fiducia che tu torni sempre.',
      'Saluta sempre prima di andartene, anche se piange: sparire di nascosto peggiora l\'ansia nel tempo.',
      'Dai spazio sicuro per esplorare e gattonare, anche se significa qualche caduta controllata.'
    ],
    duration: 'L\'ansia da separazione è più intensa tra 8 e 14 mesi e in genere si attenua entro i 2 anni.'
  },
  {
    id: 'inf_first_steps_words',
    ageMinDays: 270, ageMaxDays: 400,
    title: 'Primi passi e prime parole',
    whatToExpect: 'Tra i 9 e i 12 mesi, con ampia variabilità individuale, molti bambini si tirano su in piedi, camminano tenendosi ai mobili e dicono le prime parole con significato, spesso "mamma" o "papà". Capiscono più di quanto riescano a dire, incluso un primo "no".',
    why: 'La maturazione dei nervi motori e delle aree cerebrali del linguaggio procede rapidamente in questo periodo.',
    whatToDo: [
      'Parlagli molto e descrivi quello che fate insieme: ascoltare parole costruisce il vocabolario prima ancora che le usi.',
      'Non forzare i tempi del cammino: l\'età dei primi passi varia moltissimo tra bambini sani.',
      'Festeggia ogni tentativo, non solo il risultato.'
    ],
    duration: 'Il cammino autonomo arriva in genere tra i 10 e i 18 mesi; il linguaggio continua a espandersi rapidamente nel secondo anno.'
  },

  /* ================= ALICE · 3-6 anni ================= */

  {
    id: 'child_why',
    ageMinDays: 1095, ageMaxDays: 1826,
    title: 'La fase dei perché',
    whatToExpect: 'Fa domande continue, spesso la stessa più volte: "perché il sole tramonta?", "perché devo dormire?". Non è per farti innervosire: sta davvero cercando di capire come funziona il mondo.',
    why: 'Il pensiero causale, cioè capire che le cose hanno una causa, si sviluppa rapidamente in questa età, e le domande sono il suo strumento principale per esplorarlo.',
    whatToDo: [
      'Rispondi con onestà semplice: anche "non lo so, scopriamolo insieme" va benissimo.',
      'Se la stessa domanda torna spesso, prova a chiederle cosa ne pensa lei prima di rispondere.',
      'Non liquidare le domande: è un segnale di curiosità sana, non di capriccio.'
    ],
    duration: 'Tipicamente più intensa tra 3 e 5 anni, poi le domande diventano più mirate e complesse.'
  },
  {
    id: 'child_imagination_fears',
    ageMinDays: 1095, ageMaxDays: 2191,
    title: 'Immaginazione fervida e paure nuove',
    whatToExpect: 'Il gioco di finzione diventa elaborato (giochi di ruolo, amici immaginari), ma possono comparire anche nuove paure: il buio, i mostri sotto il letto, rumori improvvisi.',
    why: 'La stessa immaginazione che alimenta il gioco creativo rende più vivide anche le paure: a questa età fatica ancora a distinguere del tutto realtà e finzione.',
    whatToDo: [
      'Prendi sul serio la paura anche se a te sembra irrazionale: per lei è reale.',
      'Una lucina notturna o un piccolo "rituale anti-mostri" può aiutare senza bisogno di convincerla razionalmente.',
      'Evita contenuti (film, storie) troppo intensi prima di dormire in questo periodo.'
    ],
    duration: 'Le paure di questo tipo sono comuni fino ai 6-7 anni circa, poi tendono a ridursi.'
  },
  {
    id: 'child_emotions_tantrums',
    ageMinDays: 1095, ageMaxDays: 1826,
    title: 'Emozioni grandi, autocontrollo ancora in costruzione',
    whatToExpect: 'I capricci non sono spariti ma cambiano forma rispetto ai 2 anni: durano meno, ma possono essere più "ragionati" e negoziati verbalmente. La frustrazione resta difficile da gestire da sola.',
    why: 'La corteccia prefrontale, che gestisce l\'autocontrollo, è tra le ultime aree del cervello a maturare: a questa età sta ancora facendo pratica.',
    whatToDo: [
      'Mantieni i limiti con calma, senza bisogno di alzare la voce per farli rispettare.',
      'Nomina l\'emozione che vedi ("sei arrabbiata perché..."): aiuta a costruire vocabolario emotivo.',
      'Scegli le battaglie: non tutto merita di diventare uno scontro.'
    ],
    duration: 'L\'autocontrollo migliora gradualmente per tutta l\'età prescolare e scolare.'
  },
  {
    id: 'child_social_play',
    ageMinDays: 1460, ageMaxDays: 2191,
    title: 'Amicizie vere e gioco cooperativo',
    whatToExpect: 'Il gioco diventa sempre più condiviso: regole concordate, ruoli, prime vere amicizie con preferenze specifiche ("il mio migliore amico è..."). Compaiono anche i primi conflitti sociali, come esclusioni o litigi per i turni.',
    why: 'Sta sviluppando la cosiddetta teoria della mente: la capacità di capire che gli altri hanno pensieri ed emozioni diverse dalle proprie.',
    whatToDo: [
      'Favorisci occasioni di gioco con altri bambini, anche piccole e frequenti.',
      'Quando ci sono conflitti, aiutala a trovare le parole invece di risolvere tu il problema al posto suo.',
      'Parla di empatia con esempi concreti: "come pensi si sia sentito quando..."'
    ],
    duration: 'Il gioco cooperativo si consolida progressivamente fino all\'età scolare.'
  },
  {
    id: 'child_autonomy',
    ageMinDays: 1460, ageMaxDays: 2191,
    title: 'Voglia di fare da sola',
    whatToExpect: 'Vuole vestirsi, versare da bere, scegliere i vestiti, aiutare in cucina, spesso proprio quando avete meno tempo per lasciarla fare con calma.',
    why: 'L\'autonomia in questa fascia d\'età è centrale per costruire autostima: "ce l\'ho fatta da sola" è un messaggio potente per il suo senso di competenza.',
    whatToDo: [
      'Quando puoi, lascia il tempo per farlo da sola, anche se è più lento o meno preciso.',
      'Dai piccole responsabilità reali, come apparecchiare o dar da mangiare a un animale, invece di compiti finti.',
      'Elogia lo sforzo, non solo il risultato perfetto.'
    ],
    duration: 'Il bisogno di autonomia cresce costantemente da qui in avanti.'
  },
  {
    id: 'child_school_prep',
    ageMinDays: 1826, ageMaxDays: 2556,
    title: 'Verso la scuola',
    whatToExpect: 'Interesse crescente per lettere, numeri, storie più lunghe. Aumenta la capacità di stare attenta per periodi più lunghi e di seguire regole in un gruppo strutturato.',
    why: 'Le funzioni esecutive, come attenzione, memoria di lavoro e autocontrollo, fanno un salto importante in preparazione agli apprendimenti scolastici.',
    whatToDo: [
      'Leggete insieme ogni giorno, anche solo per 10 minuti: è uno dei predittori più forti del futuro successo scolastico.',
      'Gioca con lei a giochi che richiedono attenzione e regole, come carte o giochi da tavolo semplici.',
      'Non anticipare troppo la scuola con esercizi formali se non è lei a chiederlo: il gioco resta il modo principale in cui impara a questa età.'
    ],
    duration: 'Questa fase di preparazione si sviluppa tipicamente tra i 5 e i 6-7 anni.'
  }

];

/* Restituisce le fasi attive per un figlio, in base alla sua età odierna in giorni.
   Più fasi possono essere attive insieme: è normale, lo sviluppo è continuo. */
function getCurrentPhases(child) {
  const age = ageOf(child.birth_date);
  if (age.isNegative) return [];
  const days = age.totalDays;
  return PHASES
    .filter(p => days >= p.ageMinDays && days <= p.ageMaxDays)
    .sort((a, b) => a.ageMinDays - b.ageMinDays);
}

/* ---------- UI: teaser card + dettaglio in sheet ---------- */
function renderPhaseTeaser(phase) {
  const teaser = phase.whatToExpect.length > 100 ? phase.whatToExpect.slice(0, 100) + '…' : phase.whatToExpect;
  return `<button class="phase-card" onclick="openPhaseDetail('${phase.id}')">
    <div class="phase-card-title">${escapeHtml(phase.title)}</div>
    <div class="phase-card-teaser">${escapeHtml(teaser)}</div>
    <div class="phase-card-more">leggi di più ›</div>
  </button>`;
}

function openPhaseDetail(phaseId) {
  const phase = PHASES.find(p => p.id === phaseId);
  if (!phase) return;
  document.getElementById('sheetTitle').textContent = phase.title;
  document.getElementById('sheetSub').textContent = 'in questo periodo';

  let html = `<div class="phase-detail">`;
  html += `<div class="phase-section-label">cosa aspettarti</div><div class="phase-section-body">${escapeHtml(phase.whatToExpect)}</div>`;
  html += `<div class="phase-section-label">perché succede</div><div class="phase-section-body">${escapeHtml(phase.why)}</div>`;
  html += `<div class="phase-section-label">cosa puoi fare</div><ul class="phase-list">`;
  phase.whatToDo.forEach(tip => { html += `<li>${escapeHtml(tip)}</li>`; });
  html += `</ul>`;
  html += `<div class="phase-section-label">quanto dura</div><div class="phase-section-body">${escapeHtml(phase.duration)}</div>`;
  if (phase.flag) {
    html += `<div class="phase-flag"><strong>Quando parlare con il pediatra —</strong> ${escapeHtml(phase.flag)}</div>`;
  }
  html += `</div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}
