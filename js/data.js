/* =========================================================
   GIADA · Database della dieta
   Estratto dalla dieta AUSL Pescara - Dr.ssa Gambacorta
   ========================================================= */
const DB = {
  meals: [
    { id: 'colazione', name: 'Colazione', time: '07:00 — 08:00', slots: ['liquido','yogurt_colaz','cereali_colaz','pane_colaz'] },
    { id: 'spuntino_matt', name: 'Spuntino mattutino', time: 'metà mattina', slots: ['spuntino'], single: true },
    { id: 'pranzo', name: 'Pranzo', time: '12:30 — 14:00', slots: ['primo','secondo_pranzo','verdura','olio_p','frutta_p'] },
    { id: 'merenda', name: 'Merenda', time: 'metà pomeriggio', slots: ['pane_mer','condimento_mer','salume_mer','pomodori_mer'] },
    { id: 'cena', name: 'Cena', time: '19:30 — 20:30', slots: ['secondo_cena','verdura_c','olio_c','carbo_cena','frutta_c'] },
    { id: 'spuntino_notturno', name: 'Spuntino notturno', time: 'prima di dormire', slots: ['spunt_nott'], single: true }
  ],
  slots: {
    liquido: { label: 'Bevanda', optional: false },
    yogurt_colaz: { label: 'Yogurt', optional: true },
    cereali_colaz: { label: 'Frutta secca o granola', optional: true },
    pane_colaz: { label: 'Cereali o pane', optional: false },
    spuntino: { label: 'Spuntino', optional: false },
    primo: { label: 'Primo piatto', optional: false },
    secondo_pranzo: { label: 'Secondo piatto', optional: true, note: 'Con pasta di legumi non serve.' },
    verdura: { label: 'Verdura', optional: false },
    olio_p: { label: "Olio EVO", optional: false, fixed: { name: "Olio extra vergine d'oliva", g: 20, hint: '2 cucchiai da tavola' } },
    frutta_p: { label: 'Frutta', optional: true, note: 'Toglierla se le glicemie sono alte.' },
    pane_mer: { label: 'Pane', optional: false },
    condimento_mer: { label: 'Olio EVO', optional: false, fixed: { name: "Olio extra vergine d'oliva", g: 10, hint: '1 cucchiaio' } },
    salume_mer: { label: 'Affettato/proteina', optional: false },
    pomodori_mer: { label: 'Pomodori', optional: false, fixed: { name: 'Pomodori maturi', g: 100 } },
    secondo_cena: { label: 'Secondo piatto', optional: false },
    verdura_c: { label: 'Verdura', optional: false },
    olio_c: { label: 'Olio EVO', optional: false, fixed: { name: "Olio extra vergine d'oliva", g: 20, hint: '2 cucchiai per tutta la cena' } },
    carbo_cena: { label: 'Pane o sostituto', optional: false },
    frutta_c: { label: 'Frutta', optional: true, note: 'Toglierla se le glicemie sono alte.' },
    spunt_nott: { label: 'Spuntino', optional: false, note: 'Fondamentale per evitare i chetoni la mattina dopo.' }
  },
  options: {
    liquido: [
      { name: "Caffè (no zucchero/miele)", g: 50 },
      { name: "Caffè d'orzo", g: 50 },
      { name: 'Tisana', g: 200 },
      { name: 'Tè', g: 200 }
    ],
    yogurt_colaz: [{ name: 'Yogurt greco naturale 2%', g: 150 }],
    cereali_colaz: [{ name: 'Noci o granola senza zuccheri', g: 20 }],
    pane_colaz: [
      { name: 'Oro Saiwa integrali fibrattiva', count: 6, unit: 'biscotti' },
      { name: 'Fette biscottate integrali', count: 4, unit: 'fette' },
      { name: 'Pane integrale (colazione salata)', g: 60, tags: ['Con 50g affettato magro o 1 uovo + verdura'] },
      { name: 'Pan bauletto integrale (colazione salata)', g: 50, count: 2, unit: 'fette', tags: ['Con 50g affettato magro o 1 uovo + verdura'] }
    ],
    spuntino: [
      { name: 'Cracker integrali + grana', g: 25, extra: '+ grana 30g' },
      { name: 'Pesca / Fragole / Arance / Pere', g: 150 },
      { name: 'Mele / Ciliege', g: 100 },
      { name: 'Crostini integrali con philadelphia', g: 30, extra: '+ philadelphia 40g' },
      { name: 'Frutta secca', g: 25, range: '20-30g' },
      { name: 'Lupini / Olive', g: 100 },
      { name: 'Yogurt Fage Trublend senza zucchero', g: 150 }
    ],
    primo: [
      { section: 'Pasta e cereali', items: [
        { name: 'Pasta di semola', g: 80, preferred: true },
        { name: 'Pasta di semola integrale', g: 100 },
        { name: "Pasta all'uovo fresca", g: 100 },
        { name: "Pasta all'uovo secca", g: 80 },
        { name: 'Farro', g: 90, preferred: true },
        { name: 'Riso integrale', g: 80 },
        { name: 'Riso basmati', g: 80 },
        { name: 'Riso venere', g: 80 },
        { name: 'Riso parboiled', g: 80 },
        { name: 'Orzo perlato', g: 90 },
        { name: 'Pane integrale (al posto del primo)', g: 130 }
      ]},
      { section: 'A base di legumi (non serve il secondo)', items: [
        { name: 'Pasta di ceci / lenticchie / piselli', g: 100, flag: 'no_secondo' },
        { name: 'Pasta fiberpasta', g: 100, flag: 'no_secondo' },
        { name: 'Legumotti (per minestre)', g: 100, flag: 'no_secondo' }
      ]},
      { section: 'Legumi da aggiungere a 50g pasta/riso o 60g pane integrale', items: [
        { name: 'Ceci in scatola scolati', g: 160, flag: 'aggiunta', addTo: '50g pasta o 60g pane int' },
        { name: 'Ceci secchi', g: 50, flag: 'aggiunta', addTo: '50g pasta o 60g pane int' },
        { name: 'Fagioli borlotti freschi', g: 100, flag: 'aggiunta', addTo: '50g pasta o 60g pane int' },
        { name: 'Fagioli borlotti secchi', g: 50, flag: 'aggiunta', addTo: '50g pasta o 60g pane int' },
        { name: 'Fagioli borlotti in scatola scolati', g: 150, flag: 'aggiunta', addTo: '50g pasta o 60g pane int' },
        { name: 'Lenticchie in scatola scolate', g: 150, flag: 'aggiunta', addTo: '50g pasta o 60g pane int' },
        { name: 'Lenticchie secche', g: 50, flag: 'aggiunta', addTo: '50g pasta o 60g pane int' },
        { name: 'Piselli surgelati', g: 180, flag: 'aggiunta', addTo: '50g pasta o 60g pane int' },
        { name: 'Patate', g: 150, flag: 'aggiunta', addTo: '50g pasta o 60g pane int', warn: 'Max 1 volta al mese' }
      ]}
    ],
    secondo_pranzo: [
      { section: 'Carni bianche', items: [
        { name: 'Pollo - petto', g: 80 },
        { name: 'Tacchino - fesa', g: 80 },
        { name: 'Coniglio magro', g: 80 },
        { name: 'Vitello - filetto', g: 80 },
        { name: 'Vitellone tagli magri', g: 80 }
      ]},
      { section: 'Carni rosse e maiale (max 1-2/sett)', items: [
        { name: 'Maiale - lonza/arista', g: 80, freq: 2 }
      ]},
      { section: 'Pesce', items: [
        { name: 'Merluzzo / nasello', g: 120 },
        { name: 'Orata fresca', g: 70 },
        { name: 'Pesce spada', g: 80 },
        { name: 'Polpo', g: 150 },
        { name: 'Rana pescatrice', g: 140 },
        { name: 'Razza', g: 130 },
        { name: 'Scorfano', g: 100 },
        { name: 'Seppia', g: 120 },
        { name: 'Sogliola', g: 100 },
        { name: 'Spigola', g: 100 },
        { name: 'Trota', g: 100 },
        { name: 'Calamaro', g: 130 },
        { name: 'Dentice', g: 80 },
        { name: 'Acciuga / alice', g: 90 },
        { name: 'Tonno in salamoia sgocciolato', g: 80 }
      ]},
      { section: 'Pesci più grassi (togliere 1 cucchiaio di olio)', items: [
        { name: 'Sgombro / maccarello', g: 50, fat: true },
        { name: 'Tonno fresco', g: 50, fat: true },
        { name: "Tonno sott'olio sgocciolato", g: 80, fat: true },
        { name: 'Salmone fresco', g: 80, fat: true }
      ]},
      { section: 'Uova, affettati, formaggi (max 1-2/sett)', items: [
        { name: 'Uova di gallina intere', g: 60, freq: 2 },
        { name: 'Prosciutto cotto / Tacchino arrosto', g: 60, freq: 2 },
        { name: 'Ricotta di vacca', g: 100, fat: true, freq: 2 },
        { name: 'Mozzarella di vacca', g: 60, fat: true, freq: 2 }
      ]}
    ],
    verdura: [
      { name: 'Pomodori da insalata', g: 200, preferred: true },
      { name: 'Asparagi di serra', g: 180 },
      { name: 'Bieta', g: 200 },
      { name: 'Broccoletti di rapa', g: 250 },
      { name: 'Broccolo a testa', g: 180 },
      { name: 'Carciofi', g: 200 },
      { name: 'Carote', g: 70, careful: 'IG alto, soprattutto cotte' },
      { name: 'Cavolfiore', g: 200 },
      { name: 'Cavoli di bruxelles', g: 120 },
      { name: 'Cetrioli', g: 300 },
      { name: 'Cicoria da taglio', g: 300 },
      { name: 'Fagiolini freschi', g: 220 },
      { name: 'Finocchi', g: 500 },
      { name: 'Lattuga', g: 230 },
      { name: 'Melanzane', g: 200 },
      { name: 'Peperoni', g: 130 },
      { name: 'Radicchio rosso', g: 300 },
      { name: 'Rape', g: 140 },
      { name: 'Rughetta / rucola', g: 150 },
      { name: 'Scarola', g: 300 },
      { name: 'Spinaci', g: 200 },
      { name: 'Zucca gialla', g: 130, careful: 'IG alto' },
      { name: 'Zucchine', g: 350 }
    ],
    frutta_p: [
      { name: 'Mela', g: 100, preferred: true },
      { name: 'Pera', g: 150 },
      { name: 'Pesca', g: 150 },
      { name: 'Albicocche', g: 120 },
      { name: 'Arance', g: 150 },
      { name: 'Ciliege', g: 120 },
      { name: 'Clementine', g: 150 },
      { name: 'Fragole', g: 150 },
      { name: 'Mandaranci', g: 100 },
      { name: 'Melagrane', g: 80 },
      { name: 'Prugne', g: 130 },
      { name: "Fichi-d'india", g: 100 },
      { section: 'Solo a fine pasto (mai lontano dai pasti)', items: [
        { name: 'Ananas', g: 130 },
        { name: 'Banane', g: 80 },
        { name: 'Cocomero', g: 250 },
        { name: 'Fichi', g: 80 },
        { name: 'Kiwi', g: 120 },
        { name: 'Melone', g: 150 },
        { name: "Melone d'inverno", g: 250 },
        { name: 'Nespole', g: 150 },
        { name: 'Uva', g: 80 }
      ]},
      { section: 'Sostituti della frutta', items: [
        { name: 'Pane integrale (al posto della frutta)', g: 30 },
        { name: 'Pasta di semola (in più)', g: 20 }
      ]}
    ],
    pane_mer: [
      { name: 'Pane integrale', g: 60 },
      { name: 'Pan bauletto integrale', g: 50, count: 2, unit: 'fette' }
    ],
    salume_mer: [
      { name: 'Prosciutto cotto', g: 40 },
      { name: 'Affettato di tacchino', g: 40 },
      { name: 'Tonno', g: 40 },
      { name: 'Philadelphia Protein', g: 40 }
    ],
    secondo_cena: [
      { section: 'Carni bianche', items: [
        { name: 'Pollo - petto', g: 120 },
        { name: 'Pollo coscia senza pelle', g: 120 },
        { name: 'Tacchino - fesa', g: 120 },
        { name: 'Tacchino coscia senza pelle', g: 120 },
        { name: 'Coniglio magro', g: 120 },
        { name: 'Vitello - filetto', g: 120 },
        { name: 'Vitellone tagli magri', g: 120 }
      ]},
      { section: 'Carni rosse e maiale (max 1-2/sett)', items: [
        { name: 'Maiale - lonza/arista', g: 120, freq: 2 }
      ]},
      { section: 'Pesce', items: [
        { name: 'Merluzzo / nasello', g: 200 },
        { name: 'Orata fresca', g: 150 },
        { name: 'Pesce spada', g: 150 },
        { name: 'Polpo', g: 250 },
        { name: 'Rana pescatrice', g: 200 },
        { name: 'Razza', g: 200 },
        { name: 'Scorfano', g: 150 },
        { name: 'Seppia', g: 200 },
        { name: 'Sogliola', g: 200 },
        { name: 'Spigola', g: 200 },
        { name: 'Trota', g: 200 },
        { name: 'Calamaro', g: 200 },
        { name: 'Dentice', g: 150 },
        { name: 'Acciuga / alice', g: 130 },
        { name: 'Tonno in salamoia sgocciolato', g: 120 }
      ]},
      { section: 'Pesci più grassi (togliere 1 cucchiaio di olio)', items: [
        { name: 'Sgombro / maccarello', g: 150, fat: true },
        { name: 'Tonno fresco', g: 150, fat: true },
        { name: "Tonno sott'olio sgocciolato", g: 120, fat: true },
        { name: 'Salmone fresco', g: 150, fat: true },
        { name: 'Triglia', g: 200, fat: true }
      ]},
      { section: 'Uova, affettati, formaggi (max 1-2/sett)', items: [
        { name: 'Uova di gallina intere', g: 120, freq: 2 },
        { name: 'Prosciutto cotto magro', g: 100, freq: 2 },
        { name: 'Petto di pollo a fette al forno', g: 100 },
        { name: 'Ricotta di vacca', g: 160, fat: true, freq: 2 },
        { name: 'Mozzarella di vacca', g: 100, fat: true, freq: 2 }
      ]}
    ],
    carbo_cena: [
      { name: 'Pane integrale', g: 100, preferred: true },
      { section: 'Paste di legumi', items: [
        { name: 'Pasta di ceci', g: 65 },
        { name: 'Pasta di lenticchie', g: 65 },
        { name: 'Pasta di piselli', g: 65 },
        { name: 'Legumotti', g: 65 }
      ]},
      { section: 'Legumi in scatola/secchi', items: [
        { name: 'Ceci in scatola scolati', g: 200 },
        { name: 'Fagioli in scatola scolati', g: 200 },
        { name: 'Lenticchie in scatola scolate', g: 200 },
        { name: 'Ceci secchi', g: 65 },
        { name: 'Lenticchie secche', g: 65 }
      ]},
      { section: 'Combinazioni', items: [
        { name: 'Patate + pane integrale', g: 150, extra: '+ 50g pane integrale', warn: 'Max 1 volta al mese' },
        { name: 'Pasta/riso in brodo o passato di verdure', g: 60 },
        { name: 'Castagne + pane', g: 50, extra: '+ 50g pane' },
        { name: 'Piselli + pane integrale', g: 170, extra: '+ 50g pane integrale' }
      ]}
    ],
    spunt_nott: [
      { name: 'Gelato confezionato biscotto', g: 50, tags: ["L'unico momento per un dolce"] },
      { name: 'Pane integrale', g: 50 },
      { name: 'Ciambellone + latte', g: 50, extra: '+ 1 bicchiere di latte' },
      { name: 'Crackers integrali', g: 40 },
      { name: 'Fette biscottate integrali', g: 40 },
      { name: 'Grissini', g: 40 }
    ]
  }
};
// Cena verdure/frutta = stesse opzioni del pranzo
DB.options.verdura_c = DB.options.verdura;
DB.options.frutta_c = DB.options.frutta_p;
