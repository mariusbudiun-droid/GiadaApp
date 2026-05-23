/* =========================================================
   GIADA · Catalogo alimenti (dieta AUSL Pescara)
   Ogni alimento è scegliibile liberamente nei pasti compatibili.
   slots: dove può comparire
     'colaz' = colazione
     'spunt' = spuntino mattutino, merenda, spuntino notturno
     'pasto' = pranzo o cena
   cat: categoria semantica (per raggruppare e suggerire)
   qty: quantità di default in g/ml/pz
   step: incremento dei tasti +/-
   ========================================================= */

const SLOTS = [
  { id:'colazione',         name:'Colazione',          time:'07-09',   kind:'colaz', icon:'☕' },
  { id:'spuntino_matt',     name:'Spuntino mattina',   time:'10-11',   kind:'spunt', icon:'🍎' },
  { id:'pranzo',            name:'Pranzo',             time:'12:30-14',kind:'pasto', icon:'🍝' },
  { id:'merenda',           name:'Merenda',            time:'16-17',   kind:'spunt', icon:'🥪' },
  { id:'cena',              name:'Cena',               time:'19:30-20:30', kind:'pasto', icon:'🥗' },
  { id:'spuntino_notturno', name:'Spuntino notturno',  time:'prima di dormire', kind:'spunt', icon:'🌙', note:'Entro 8h dalla colazione' }
];

const CATEGORIES = {
  bev:           'Bevande',
  latticino:     'Latticini',
  cereale:       'Pane, cracker, fette',
  fruttasecca:   'Frutta secca',
  primo:         'Primi (pasta, riso, cereali)',
  piattounico:   'Piatti unici (pasta+legumi)',
  legume:        'Legumi (con primo)',
  carnebianca:   'Carni bianche',
  carnerossa:    'Carni rosse e maiale',
  pesce:         'Pesce',
  pescegrasso:   'Pesce grasso (-10g olio)',
  uovoformaggio: 'Uova, formaggi, affettati',
  verdura:       'Verdure',
  frutta:        'Frutta',
  fruttafinep:   'Frutta solo a fine pasto',
  salume:        'Affettati magri (merenda)',
  condimento:    'Condimenti',
  dolce:         'Dolci (solo sera)'
};

/* Tutti gli alimenti come array piatto */
const FOODS = [
  /* ===== BEVANDE (colazione + spuntini) ===== */
  { id:'caffe',       name:'Caffè (no zucchero)',           qty:50,  unit:'ml', step:10, slots:['colaz','spunt'], cat:'bev' },
  { id:'caffeorzo',   name:"Caffè d'orzo",                  qty:50,  unit:'ml', step:10, slots:['colaz','spunt'], cat:'bev' },
  { id:'te',          name:'Tè',                            qty:200, unit:'ml', step:50, slots:['colaz','spunt'], cat:'bev' },
  { id:'tisana',      name:'Tisana',                        qty:200, unit:'ml', step:50, slots:['colaz','spunt'], cat:'bev' },
  { id:'latte',       name:'Latte (con ciambellone)',       qty:200, unit:'ml', step:50, slots:['spunt'],         cat:'bev' },

  /* ===== LATTICINI (colazione + spuntini) ===== */
  { id:'yogurt_greco',name:'Yogurt greco naturale 2%',      qty:150, unit:'g', step:10, slots:['colaz','spunt'], cat:'latticino', preferred:true },
  { id:'yogurt_fage', name:'Yogurt Fage Trueblend',         qty:150, unit:'g', step:10, slots:['colaz','spunt'], cat:'latticino' },
  { id:'philadelphia',name:'Philadelphia Protein',          qty:40,  unit:'g', step:5,  slots:['colaz','spunt'], cat:'latticino' },

  /* ===== PANE / CEREALI (colazione + spuntini + cena come carbo) ===== */
  { id:'pane_int',    name:'Pane integrale',                qty:50,  unit:'g', step:10, slots:['colaz','spunt','pasto'], cat:'cereale' },
  { id:'panbauletto', name:'Pan bauletto integrale (1 fetta)', qty:25,unit:'g', step:25, slots:['colaz','spunt','pasto'], cat:'cereale' },
  { id:'orosaiwa',    name:'Oro Saiwa Fibrattiva (1 biscotto)', qty:1, unit:'pz', step:1, slots:['colaz'],       cat:'cereale' },
  { id:'fette_int',   name:'Fette biscottate integrali (1 fetta)', qty:1, unit:'pz', step:1, slots:['colaz','spunt'], cat:'cereale' },
  { id:'cracker_int', name:'Cracker integrali',             qty:25,  unit:'g', step:5,  slots:['spunt'],         cat:'cereale' },
  { id:'grissini',    name:'Grissini',                      qty:40,  unit:'g', step:5,  slots:['spunt'],         cat:'cereale' },
  { id:'crostini',    name:'Crostini integrali',            qty:30,  unit:'g', step:5,  slots:['spunt'],         cat:'cereale' },

  /* ===== FRUTTA SECCA ===== */
  { id:'noci',        name:'Noci o granola senza zuccheri', qty:20,  unit:'g', step:5,  slots:['colaz','spunt'], cat:'fruttasecca' },
  { id:'frutta_secca',name:'Frutta secca (mix)',            qty:25,  unit:'g', step:5,  slots:['spunt'],         cat:'fruttasecca' },

  /* ===== PRIMI (pranzo + cena) ===== */
  { id:'pasta',       name:'Pasta di semola',               qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'primo', preferred:true },
  { id:'pasta_int',   name:'Pasta integrale',               qty:100, unit:'g', step:10, slots:['pasto'],         cat:'primo' },
  { id:'pasta_uovo_f',name:"Pasta all'uovo fresca",         qty:100, unit:'g', step:10, slots:['pasto'],         cat:'primo' },
  { id:'pasta_uovo_s',name:"Pasta all'uovo secca",          qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'primo' },
  { id:'farro',       name:'Farro',                         qty:90,  unit:'g', step:10, slots:['pasto'],         cat:'primo', preferred:true },
  { id:'riso_int',    name:'Riso integrale',                qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'primo' },
  { id:'riso_basm',   name:'Riso basmati',                  qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'primo' },
  { id:'riso_ven',    name:'Riso venere',                   qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'primo' },
  { id:'riso_par',    name:'Riso parboiled',                qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'primo' },
  { id:'orzo',        name:'Orzo perlato',                  qty:90,  unit:'g', step:10, slots:['pasto'],         cat:'primo' },
  { id:'pane_alposto',name:'Pane integrale (al posto del primo)', qty:130, unit:'g', step:10, slots:['pasto'],   cat:'primo' },

  /* ===== PIATTI UNICI (legume-based, niente secondo) ===== */
  { id:'pasta_ceci',  name:'Pasta di ceci',                 qty:100, unit:'g', step:10, slots:['pasto'],         cat:'piattounico', solo:true },
  { id:'pasta_lent',  name:'Pasta di lenticchie',           qty:100, unit:'g', step:10, slots:['pasto'],         cat:'piattounico', solo:true },
  { id:'pasta_pis',   name:'Pasta di piselli',              qty:100, unit:'g', step:10, slots:['pasto'],         cat:'piattounico', solo:true },
  { id:'fiberpasta',  name:'Fiberpasta',                    qty:100, unit:'g', step:10, slots:['pasto'],         cat:'piattounico', solo:true },
  { id:'legumotti',   name:'Legumotti (per minestre)',      qty:100, unit:'g', step:10, slots:['pasto'],         cat:'piattounico', solo:true },

  /* ===== LEGUMI da aggiungere (con 50g pasta o 60g pane int) ===== */
  { id:'ceci_sc',     name:'Ceci in scatola scolati',       qty:160, unit:'g', step:20, slots:['pasto'],         cat:'legume', tip:'da abbinare a 50g pasta o 60g pane integrale' },
  { id:'ceci_se',     name:'Ceci secchi',                   qty:50,  unit:'g', step:10, slots:['pasto'],         cat:'legume', tip:'da abbinare a 50g pasta o 60g pane integrale' },
  { id:'fag_fr',      name:'Fagioli borlotti freschi',      qty:100, unit:'g', step:20, slots:['pasto'],         cat:'legume', tip:'da abbinare a 50g pasta o 60g pane integrale' },
  { id:'fag_se',      name:'Fagioli borlotti secchi',       qty:50,  unit:'g', step:10, slots:['pasto'],         cat:'legume', tip:'da abbinare a 50g pasta o 60g pane integrale' },
  { id:'fag_sc',      name:'Fagioli in scatola scolati',    qty:150, unit:'g', step:20, slots:['pasto'],         cat:'legume', tip:'da abbinare a 50g pasta o 60g pane integrale' },
  { id:'lent_sc',     name:'Lenticchie in scatola scolate', qty:150, unit:'g', step:20, slots:['pasto'],         cat:'legume', tip:'da abbinare a 50g pasta o 60g pane integrale' },
  { id:'lent_se',     name:'Lenticchie secche',             qty:50,  unit:'g', step:10, slots:['pasto'],         cat:'legume', tip:'da abbinare a 50g pasta o 60g pane integrale' },
  { id:'piselli',     name:'Piselli surgelati',             qty:180, unit:'g', step:20, slots:['pasto'],         cat:'legume', tip:'da abbinare a 50g pasta o 60g pane integrale' },
  { id:'patate',      name:'Patate',                        qty:150, unit:'g', step:20, slots:['pasto'],         cat:'legume', warn:'Max 1 volta al mese' },

  /* ===== SECONDI - CARNI BIANCHE ===== */
  { id:'pollo',       name:'Pollo - petto',                 qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'carnebianca' },
  { id:'pollo_co',    name:'Pollo - coscia senza pelle',    qty:120, unit:'g', step:10, slots:['pasto'],         cat:'carnebianca' },
  { id:'tacchino',    name:'Tacchino - fesa',               qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'carnebianca' },
  { id:'tacchino_co', name:'Tacchino - coscia senza pelle', qty:120, unit:'g', step:10, slots:['pasto'],         cat:'carnebianca' },
  { id:'coniglio',    name:'Coniglio magro',                qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'carnebianca' },
  { id:'vitello',     name:'Vitello - filetto',             qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'carnebianca' },
  { id:'vitellone',   name:'Vitellone tagli magri',         qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'carnebianca' },

  /* ===== SECONDI - CARNI ROSSE (max 1-2/sett) ===== */
  { id:'maiale',      name:'Maiale - lonza/arista',         qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'carnerossa', weekly:2 },

  /* ===== SECONDI - PESCE ===== */
  { id:'merluzzo',    name:'Merluzzo / nasello',            qty:120, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'orata',       name:'Orata fresca',                  qty:70,  unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'spada',       name:'Pesce spada',                   qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'polpo',       name:'Polpo',                         qty:150, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'rana',        name:'Rana pescatrice',               qty:140, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'razza',       name:'Razza',                         qty:130, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'scorfano',    name:'Scorfano',                      qty:100, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'seppia',      name:'Seppia',                        qty:120, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'sogliola',    name:'Sogliola',                      qty:100, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'spigola',     name:'Spigola',                       qty:100, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'trota',       name:'Trota',                         qty:100, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'calamaro',    name:'Calamaro',                      qty:130, unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'dentice',     name:'Dentice',                       qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'alice',       name:'Acciuga / alice',               qty:90,  unit:'g', step:10, slots:['pasto'],         cat:'pesce' },
  { id:'tonno_sal',   name:'Tonno in salamoia sgocciolato', qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'pesce' },

  /* ===== PESCE GRASSO (-10g olio) ===== */
  { id:'sgombro',     name:'Sgombro / maccarello',          qty:50,  unit:'g', step:10, slots:['pasto'],         cat:'pescegrasso', oilCut:10 },
  { id:'tonno_fr',    name:'Tonno fresco',                  qty:50,  unit:'g', step:10, slots:['pasto'],         cat:'pescegrasso', oilCut:10 },
  { id:'tonno_ol',    name:"Tonno sott'olio sgocciolato",   qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'pescegrasso', oilCut:10 },
  { id:'salmone',     name:'Salmone fresco',                qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'pescegrasso', oilCut:10 },
  { id:'triglia',     name:'Triglia',                       qty:200, unit:'g', step:10, slots:['pasto'],         cat:'pescegrasso', oilCut:10 },

  /* ===== UOVA / FORMAGGI / AFFETTATI (max 1-2/sett) ===== */
  { id:'uovo',        name:'Uovo intero',                   qty:1,   unit:'pz', step:1,  slots:['colaz','pasto'], cat:'uovoformaggio', weekly:2 },
  { id:'prosc_cotto', name:'Prosciutto cotto magro',        qty:60,  unit:'g', step:10, slots:['colaz','pasto'], cat:'uovoformaggio', weekly:2 },
  { id:'tacchino_arr',name:'Tacchino arrosto',              qty:60,  unit:'g', step:10, slots:['colaz','pasto'], cat:'uovoformaggio', weekly:2 },
  { id:'ricotta',     name:'Ricotta di vacca',              qty:100, unit:'g', step:10, slots:['pasto'],         cat:'uovoformaggio', weekly:2, oilCut:10 },
  { id:'mozzarella',  name:'Mozzarella di vacca',           qty:60,  unit:'g', step:10, slots:['pasto'],         cat:'uovoformaggio', weekly:2, oilCut:10 },
  { id:'grana',       name:'Grana padano',                  qty:30,  unit:'g', step:5,  slots:['spunt'],         cat:'uovoformaggio' },

  /* ===== AFFETTATI MAGRI (merenda) ===== */
  { id:'prosc_mer',   name:'Prosciutto cotto (merenda)',    qty:40,  unit:'g', step:10, slots:['spunt'],         cat:'salume' },
  { id:'tacch_mer',   name:'Affettato di tacchino',         qty:40,  unit:'g', step:10, slots:['spunt'],         cat:'salume' },
  { id:'tonno_mer',   name:'Tonno (merenda)',               qty:40,  unit:'g', step:10, slots:['spunt'],         cat:'salume' },

  /* ===== VERDURE ===== */
  { id:'pomodori',    name:'Pomodori da insalata',          qty:200, unit:'g', step:20, slots:['pasto','spunt'], cat:'verdura', preferred:true },
  { id:'pom_mer',     name:'Pomodori maturi (merenda)',     qty:100, unit:'g', step:20, slots:['spunt'],         cat:'verdura' },
  { id:'asparagi',    name:'Asparagi',                      qty:180, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'bieta',       name:'Bieta',                         qty:200, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'broccoletti', name:'Broccoletti di rapa',           qty:250, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'broccolo',    name:'Broccolo a testa',              qty:180, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'carciofi',    name:'Carciofi',                      qty:200, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'carote',      name:'Carote',                        qty:70,  unit:'g', step:10, slots:['pasto'],         cat:'verdura', tip:'IG alto, soprattutto cotte' },
  { id:'cavolfiore',  name:'Cavolfiore',                    qty:200, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'cavoli_b',    name:'Cavoli di bruxelles',           qty:120, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'cetrioli',    name:'Cetrioli',                      qty:300, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'cicoria',     name:'Cicoria da taglio',             qty:300, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'fagiolini',   name:'Fagiolini freschi',             qty:220, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'finocchi',    name:'Finocchi',                      qty:500, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'lattuga',     name:'Lattuga',                       qty:230, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'melanzane',   name:'Melanzane',                     qty:200, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'peperoni',    name:'Peperoni',                      qty:130, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'radicchio',   name:'Radicchio rosso',               qty:300, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'rape',        name:'Rape',                          qty:140, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'rucola',      name:'Rucola',                        qty:150, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'scarola',     name:'Scarola',                       qty:300, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'spinaci',     name:'Spinaci',                       qty:200, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },
  { id:'zucca',       name:'Zucca gialla',                  qty:130, unit:'g', step:20, slots:['pasto'],         cat:'verdura', tip:'IG alto' },
  { id:'zucchine',    name:'Zucchine',                      qty:350, unit:'g', step:20, slots:['pasto'],         cat:'verdura' },

  /* ===== FRUTTA (libera) ===== */
  { id:'mela',        name:'Mela',                          qty:100, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta', preferred:true },
  { id:'pera',        name:'Pera',                          qty:150, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'pesca',       name:'Pesca',                         qty:150, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'albicocche',  name:'Albicocche',                    qty:120, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'arance',      name:'Arance',                        qty:150, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'ciliege',     name:'Ciliege',                       qty:120, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'clementine',  name:'Clementine',                    qty:150, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'fragole',     name:'Fragole',                       qty:150, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'mandaranci',  name:'Mandaranci',                    qty:100, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'melagrane',   name:'Melagrane',                     qty:80,  unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'prugne',      name:'Prugne',                        qty:130, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'fichidindia', name:"Fichi d'india",                 qty:100, unit:'g', step:10, slots:['pasto','spunt'], cat:'frutta' },
  { id:'lupini',      name:'Lupini',                        qty:100, unit:'g', step:10, slots:['spunt'],         cat:'frutta' },
  { id:'olive',       name:'Olive',                         qty:100, unit:'g', step:10, slots:['spunt'],         cat:'frutta' },

  /* ===== FRUTTA SOLO A FINE PASTO ===== */
  { id:'ananas',      name:'Ananas',                        qty:130, unit:'g', step:10, slots:['pasto'],         cat:'fruttafinep' },
  { id:'banana',      name:'Banana',                        qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'fruttafinep' },
  { id:'cocomero',    name:'Cocomero',                      qty:250, unit:'g', step:20, slots:['pasto'],         cat:'fruttafinep' },
  { id:'fichi',       name:'Fichi',                         qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'fruttafinep' },
  { id:'kiwi',        name:'Kiwi',                          qty:120, unit:'g', step:10, slots:['pasto'],         cat:'fruttafinep' },
  { id:'melone',      name:'Melone',                        qty:150, unit:'g', step:10, slots:['pasto'],         cat:'fruttafinep' },
  { id:'melone_inv',  name:"Melone d'inverno",              qty:250, unit:'g', step:20, slots:['pasto'],         cat:'fruttafinep' },
  { id:'nespole',     name:'Nespole',                       qty:150, unit:'g', step:10, slots:['pasto'],         cat:'fruttafinep' },
  { id:'uva',         name:'Uva',                           qty:80,  unit:'g', step:10, slots:['pasto'],         cat:'fruttafinep' },

  /* ===== CONDIMENTI ===== */
  { id:'olio',        name:'Olio extravergine d\'oliva',    qty:20,  unit:'g', step:5,  slots:['pasto'],         cat:'condimento', tip:'≈ 2 cucchiai da tavola' },
  { id:'olio_mer',    name:"Olio EVO (merenda)",            qty:10,  unit:'g', step:5,  slots:['spunt'],         cat:'condimento', tip:'≈ 1 cucchiaio' },

  /* ===== SOLO SPUNTINO NOTTURNO - dolce ===== */
  { id:'gelato',      name:'Gelato confezionato biscotto',  qty:50,  unit:'g', step:10, slots:['notte'],         cat:'dolce', tip:"L'unico momento per un piccolo dolce" },
  { id:'ciambellone', name:'Ciambellone',                   qty:50,  unit:'g', step:10, slots:['notte'],         cat:'dolce', tip:'Da abbinare a un bicchiere di latte' }
];

/* Quick lookup */
const FOOD_BY_ID = {};
FOODS.forEach(f => { FOOD_BY_ID[f.id] = f; });

const SLOT_BY_ID = {};
SLOTS.forEach(s => { SLOT_BY_ID[s.id] = s; });

/* Per uno specifico SLOT (es. spuntino_notturno), aggiungi 'notte' come kind extra
   per includere dolci nello sheet */
function foodsForSlot(slotId) {
  const slot = SLOT_BY_ID[slotId];
  if (!slot) return [];
  // accetto kind + (se notturno) anche 'notte'
  const accept = new Set([slot.kind]);
  if (slotId === 'spuntino_notturno') accept.add('notte');
  return FOODS.filter(f => f.slots.some(s => accept.has(s)));
}
