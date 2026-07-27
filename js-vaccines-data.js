/* KIN · Calendario vaccinale italiano (PNPV 2023-2025)
   Fonte: Piano Nazionale di Prevenzione Vaccinale 2023-2025, Ministero della Salute.
   Ogni voce: età raccomandata (in giorni dalla nascita), cosa previene,
   perché in quel periodo, cosa aspettarsi dopo, cosa fare.
   ========================================================= */
'use strict';

const VACCINE_SCHEDULE = [
  {
    id: 'esa_1',
    name: 'Esavalente — 1ª dose',
    ageDays: 61,
    ageLabel: '2 mesi compiuti',
    protects: 'Difterite, tetano, pertosse, poliomielite, epatite B, Haemophilus influenzae tipo b',
    why: 'Queste malattie possono essere gravi proprio nei primi mesi di vita, quando il sistema immunitario del bambino è ancora immaturo. Si inizia il prima possibile per costruire protezione in fretta.',
    afterEffects: 'Nelle 24-48 ore successive è comune un po\' di febbre, irritabilità, gonfiore o arrossamento nel punto dell\'iniezione.',
    whatToDo: [
      'Paracetamolo alle dosi indicate dal pediatra se ha febbre o è irritabile.',
      'Un panno fresco sul punto dell\'iniezione se è gonfio.',
      'Tienilo idratato e non preoccuparti se dorme un po\' di più del solito.'
    ]
  },
  {
    id: 'pcv_1',
    name: 'Pneumococco coniugato — 1ª dose',
    ageDays: 61,
    ageLabel: '2 mesi compiuti',
    protects: 'Infezioni da pneumococco (polmonite, meningite, otite, sepsi)',
    why: 'Si co-somministra con l\'esavalente nella stessa seduta, per ridurre il numero di accessi separati.',
    afterEffects: 'Simile all\'esavalente: febbricola, irritabilità, gonfiore locale.',
    whatToDo: ['Le stesse accortezze dell\'esavalente, dato che si fanno insieme.']
  },
  {
    id: 'rv_1',
    name: 'Rotavirus — 1ª dose',
    ageDays: 42,
    ageLabel: 'dalla 6ª settimana di vita',
    protects: 'Gastroenterite da rotavirus (diarrea e vomito severi nei lattanti)',
    why: 'Il rotavirus è la causa più comune di gastroenterite grave nei primi anni di vita; il vaccino orale va iniziato presto e completato entro le prime settimane.',
    afterEffects: 'Può causare feci più molli o leggera irritabilità nei giorni successivi.',
    whatToDo: ['Nessuna accortezza particolare oltre all\'idratazione normale.']
  },
  {
    id: 'menb_1',
    name: 'Meningococco B — 1ª dose',
    ageDays: 91,
    ageLabel: '3 mesi compiuti',
    protects: 'Meningite e sepsi da meningococco di tipo B',
    why: 'Il meningococco B colpisce soprattutto i bambini piccoli; si inizia dai 3 mesi con dosi distanziate per costruire una risposta immunitaria efficace.',
    afterEffects: 'Rispetto ad altri vaccini, il MenB dà più spesso febbre nelle 6-24 ore successive, anche abbastanza alta.',
    whatToDo: [
      'Il pediatra spesso consiglia paracetamolo preventivo dopo questa dose, anche prima che compaia la febbre: chiediglielo.',
      'Tienilo sotto controllo nelle prime 24 ore.'
    ],
    flag: 'Se la febbre supera i 39-40°C o il bambino è insolitamente letargico, contatta il pediatra.'
  },
  {
    id: 'esa_2',
    name: 'Esavalente — 2ª dose',
    ageDays: 121,
    ageLabel: '4 mesi compiuti',
    protects: 'Stesse malattie della 1ª dose',
    why: 'Il ciclo a più dosi serve a costruire una protezione più solida e duratura nel tempo.',
    afterEffects: 'Simile alla prima dose, di solito leggermente meno intenso.',
    whatToDo: ['Le stesse accortezze della prima dose.']
  },
  {
    id: 'pcv_2',
    name: 'Pneumococco coniugato — 2ª dose',
    ageDays: 121,
    ageLabel: '4 mesi compiuti',
    protects: 'Stesse infezioni della 1ª dose',
    why: 'Co-somministrata con l\'esavalente.',
    afterEffects: 'Simile alla prima dose.',
    whatToDo: ['Le stesse accortezze della prima dose.']
  },
  {
    id: 'rv_2',
    name: 'Rotavirus — 2ª dose',
    ageDays: 91,
    ageLabel: 'circa 3 mesi',
    protects: 'Stessa protezione della 1ª dose',
    why: 'Ciclo a 2 o 3 dosi in base al vaccino usato, da completare entro le 24-32 settimane di vita.',
    afterEffects: 'Simile alla prima dose.',
    whatToDo: ['Nessuna accortezza particolare.']
  },
  {
    id: 'menb_2',
    name: 'Meningococco B — 2ª dose',
    ageDays: 151,
    ageLabel: '5 mesi compiuti',
    protects: 'Stessa protezione della 1ª dose',
    why: 'Seconda dose del ciclo, ad almeno 2 mesi dalla prima.',
    afterEffects: 'Come la prima dose, febbre comune nelle ore successive.',
    whatToDo: ['Le stesse accortezze della prima dose, incluso il paracetamolo preventivo se consigliato dal pediatra.']
  },
  {
    id: 'esa_3',
    name: 'Esavalente — 3ª dose (richiamo)',
    ageDays: 301,
    ageLabel: '10 mesi compiuti',
    protects: 'Stesse malattie delle dosi precedenti',
    why: 'Dose di richiamo che completa il ciclo primario e consolida la protezione a lungo termine.',
    afterEffects: 'Simile alle dosi precedenti.',
    whatToDo: ['Le stesse accortezze delle dosi precedenti.']
  },
  {
    id: 'pcv_3',
    name: 'Pneumococco coniugato — 3ª dose',
    ageDays: 301,
    ageLabel: '10 mesi compiuti',
    protects: 'Stessa protezione delle dosi precedenti',
    why: 'Co-somministrata con l\'esavalente per completare il ciclo.',
    afterEffects: 'Simile alle dosi precedenti.',
    whatToDo: ['Le stesse accortezze delle dosi precedenti.']
  },
  {
    id: 'menb_3',
    name: 'Meningococco B — richiamo',
    ageDays: 456,
    ageLabel: '15 mesi',
    protects: 'Stessa protezione delle dosi precedenti',
    why: 'Richiamo ad almeno 6 mesi dal ciclo primario, per consolidare la protezione.',
    afterEffects: 'Di solito meno intenso delle prime due dosi.',
    whatToDo: ['Osservazione nelle 24 ore, come per le dosi precedenti.']
  },
  {
    id: 'mprv_1',
    name: 'MPRV — 1ª dose (morbillo, parotite, rosolia, varicella)',
    ageDays: 365,
    ageLabel: '12 mesi',
    protects: 'Morbillo, parotite, rosolia, varicella',
    why: 'A 12 mesi il sistema immunitario risponde bene a questo tipo di vaccino vivo attenuato, e gli anticorpi materni che potrebbero interferire si sono ormai esauriti.',
    afterEffects: 'Può comparire febbre o una lieve eruzione cutanea 5-12 giorni dopo (reazione ritardata, normale per questo tipo di vaccino).',
    whatToDo: [
      'Non allarmarti se la febbre o l\'eruzione arrivano una settimana dopo invece che nei giorni immediati: è tipico di questo vaccino.',
      'Paracetamolo se necessario.'
    ]
  },
  {
    id: 'menacwy_1',
    name: 'Meningococco ACWY — 1ª dose',
    ageDays: 365,
    ageLabel: '12 mesi',
    protects: 'Meningite e sepsi da meningococco A, C, W, Y',
    why: 'Co-somministrata con MPRV a 12 mesi per ampliare la protezione contro il meningococco oltre al tipo B.',
    afterEffects: 'Generalmente ben tollerato, con possibile gonfiore locale.',
    whatToDo: ['Osservazione standard nelle 24-48 ore.']
  },
  {
    id: 'dtap_4',
    name: 'Difterite-tetano-pertosse-polio — 4ª dose',
    ageDays: 1826,
    ageLabel: '5-6 anni',
    protects: 'Stesse malattie del ciclo di base',
    why: 'Richiamo prima dell\'ingresso a scuola, quando l\'esposizione ad altri bambini aumenta.',
    afterEffects: 'Generalmente ben tollerato, con possibile dolore locale.',
    whatToDo: ['Osservazione standard nelle 24-48 ore.']
  },
  {
    id: 'mprv_2',
    name: 'MPRV — 2ª dose',
    ageDays: 1826,
    ageLabel: '5-6 anni',
    protects: 'Stessa protezione della 1ª dose',
    why: 'Seconda dose per consolidare la protezione, spesso co-somministrata con il richiamo DTaP-IPV.',
    afterEffects: 'Meno frequente della prima dose, ma può ripresentarsi febbre lieve.',
    whatToDo: ['Osservazione standard.']
  },
  {
    id: 'hpv_1',
    name: 'HPV (Papillomavirus) — 1ª dose',
    ageDays: 4015,
    ageLabel: 'dagli 11 anni',
    protects: 'Infezioni da HPV, collegate a tumori del collo dell\'utero e altri tumori',
    why: 'La vaccinazione funziona meglio se fatta prima di un possibile contatto con il virus, per questo si offre in età preadolescenziale.',
    afterEffects: 'Dolore nel punto dell\'iniezione, raramente capogiro (si consiglia di restare seduti qualche minuto dopo).',
    whatToDo: ['Far restare il ragazzo/a seduto qualche minuto dopo la vaccinazione.']
  },
  {
    id: 'hpv_2',
    name: 'HPV — 2ª dose',
    ageDays: 4198,
    ageLabel: '6 mesi dopo la 1ª dose',
    protects: 'Stessa protezione della 1ª dose',
    why: 'Completa il ciclo a 2 dosi previsto fino ai 14 anni.',
    afterEffects: 'Come la prima dose.',
    whatToDo: ['Le stesse accortezze della prima dose.']
  },
  {
    id: 'dtap_5',
    name: 'Difterite-tetano-pertosse-polio — richiamo adolescenziale',
    ageDays: 4380,
    ageLabel: '12 anni',
    protects: 'Stesse malattie del ciclo di base',
    why: 'Richiamo periodico: l\'immunità contro queste malattie si riduce nel tempo.',
    afterEffects: 'Generalmente ben tollerato.',
    whatToDo: ['Osservazione standard.']
  },
  {
    id: 'menacwy_2',
    name: 'Meningococco ACWY — richiamo',
    ageDays: 4380,
    ageLabel: '12 anni',
    protects: 'Stessa protezione della dose infantile',
    why: 'Richiamo in adolescenza, età in cui il rischio di meningococco torna a salire.',
    afterEffects: 'Generalmente ben tollerato.',
    whatToDo: ['Osservazione standard.']
  }
];

/* Ordina il calendario per età raccomandata */
function sortedVaccineSchedule() {
  return VACCINE_SCHEDULE.slice().sort((a,b) => a.ageDays - b.ageDays);
}

/* Data suggerita per una dose, dalla nascita del figlio */
function suggestedVaccineDate(child, vaccine) {
  const b = parseDateStr(child.birth_date);
  const d = new Date(b);
  d.setDate(d.getDate() + vaccine.ageDays);
  return d;
}

/* Stato di una dose per un figlio: cerca eventi kind='vaccine' con data.vaccineId = X */
function vaccineStatusForChild(childId, vaccineId) {
  const ev = eventsForChild(childId).find(e => e.kind === 'vaccine' && e.data && e.data.vaccineId === vaccineId);
  if (!ev) return { status: 'todo', event: null };
  return { status: ev.data.status || 'done', event: ev };
}
