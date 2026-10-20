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
    activities: [
      'Parlagli o cantagli piano: non capisce le parole, ma riconosce la tua voce fin da subito.',
      'Lascia che fissi il tuo viso da vicino, 20-30 cm circa: è la distanza a cui vede meglio in questo periodo.',
      'Tanto contatto pelle a pelle, durante le poppate e non solo.'
    ],
    flag: 'Se dopo 2 settimane non ha ripreso il peso della nascita, parlane con il pediatra.'
  },
  {
    id: 'inf_tummy_time',
    ageMinDays: 0, ageMaxDays: 180,
    title: 'Tempo a pancia in giù (tummy time)',
    whatToExpect: 'Fin dai primissimi giorni è utile farlo stare un po\' a pancia in giù, da sveglio e sotto supervisione. All\'inizio durerà pochi istanti prima che protesti: è normale, non serve forzare.',
    why: 'Rinforza i muscoli di collo, spalle e schiena che gli serviranno per sollevare la testa, poi il petto, e più avanti girarsi e gattonare. Aiuta anche a prevenire punti piatti sulla nuca dovuti a stare troppo a lungo sdraiato sulla schiena.',
    whatToDo: [
      'Inizia da subito con sessioni brevissime: anche solo 1-2 minuti, 2-3 volte al giorno.',
      'Fallo sempre da sveglio e con te vicino, mai per farlo addormentare in quella posizione.',
      'Aumenta gradualmente la durata nelle settimane successive, seguendo quanto la tollera.',
      'Se piange subito, va bene interrompere e riprovare più tardi: conta la costanza nel tempo, non la durata di ogni sessione.'
    ],
    duration: 'Va proposto fin dalla nascita e diventa via via più lungo, fino a quando lo farà spontaneamente giocando, di solito verso i 4-6 mesi.',
    activities: [
      'Mettiti a terra alla sua altezza e fatti vedere: lo motiva a sollevare la testa per cercarti.',
      'Un giocattolo colorato o uno specchietto sicuro davanti a lui durante il tummy time lo incuriosisce.',
      'Fallo sopra il tuo petto mentre sei sdraiato: è tummy time comunque, e più rassicurante per lui.'
    ]
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
    activities: [
      'Il "dondolio dei 5": fascia, di fianco o pancia in giù in braccio, shh rumoroso, dondolio, succhiare (ciuccio o seno).',
      'Una passeggiata in fascia o passeggino: il movimento spesso calma più delle parole.'
    ],
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
    duration: 'Da qui in poi i periodi di veglia attiva e interazione aumentano gradualmente.',
    activities: [
      'Gioco del cucù semplice: copri e scopri il tuo viso con le mani.',
      'Imita i suoi versetti e le sue espressioni: è l\'inizio di una vera "conversazione".',
      'Canzoncine con gesti ripetitivi, tipo battere le manine.'
    ]
  },
  {
    id: 'inf_growth_spurt',
    ageMinDays: 75, ageMaxDays: 100,
    title: 'Scatto di crescita',
    whatToExpect: 'Intorno ai 3 mesi molti bambini attraversano uno scatto di crescita: per qualche giorno mangiano di più, si svegliano più spesso, e possono sembrare più agitati o insaziabili.',
    why: 'Gli scatti di crescita sono brevi periodi di sviluppo accelerato, in cui il corpo richiede più energie per crescere più velocemente del solito.',
    whatToDo: [
      'Asseconda la fame extra: nei prossimi giorni può volere il seno o il biberon più spesso del solito.',
      'Non è un segnale che il latte non basti: è temporaneo e passa da solo in pochi giorni.',
      'Prova comunque a mantenere una routine di base per non perdere del tutto i punti fermi della giornata.'
    ],
    duration: 'Dura tipicamente pochi giorni; può ripresentarsi ad altre età, spesso intorno alle 3 settimane, alle 6 settimane, ai 3 mesi e ai 6 mesi.',
    activities: [
      'Non serve programmare attività extra in questi giorni: asseconda il suo bisogno di mangiare e dormire di più.',
      'Momenti di coccole tranquille, senza troppa stimolazione, se sembra più irritabile del solito.'
    ]
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
    duration: 'Il periodo di introduzione dura alcuni mesi, con gusti e quantità che cambiano spesso.',
    activities: [
      'Fallo sedere a tavola con voi durante i pasti, anche prima di iniziare i solidi: osserva e impara.',
      'Lascialo toccare ed esplorare cibi sicuri con le mani (banana matura, pera cotta a pezzi grandi).',
      'Un cucchiaino tutto suo da tenere in mano, anche se all\'inizio non lo usa "bene".'
    ]
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
    duration: 'L\'ansia da separazione è più intensa tra 8 e 14 mesi e in genere si attenua entro i 2 anni.',
    activities: [
      'Gioco del nascondino con un oggetto sotto un panno: costruisce fiducia che le cose (e tu) tornano.',
      'Metti un giocattolo appena fuori portata per incoraggiarlo a spostarsi verso di esso.',
      'Torre di cubi da costruire e buttare giù insieme: piace moltissimo a questa età.'
    ]
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
    duration: 'Il cammino autonomo arriva in genere tra i 10 e i 18 mesi; il linguaggio continua a espandersi rapidamente nel secondo anno.',
    activities: [
      'Cammina con lui tenendogli le mani, o offrigli le tue dita come sostegno.',
      'Nomina ad alta voce gli oggetti di casa mentre glieli mostri: costruisce vocabolario passivo.',
      'Un gioco a incastri semplici o impilabili, per la motricità fine.'
    ]
  },

  /* ---- Sonno (topic: 'sleep') — mostrate nella pagina Sonno, non nella Home ---- */

  {
    id: 'inf_sleep_basics', topic: 'sleep',
    ageMinDays: 0, ageMaxDays: 150,
    title: 'Come dorme a questa età',
    whatToExpect: 'Dorme tanto (le indicazioni più usate parlano di 14-17 ore su 24 nei primi mesi) ma a pezzi: cicli di circa 50 minuti, risvegli frequenti e pisolini di durata molto variabile, spesso corti. Verso i 2-3 mesi molti bambini iniziano ad allungare un po\' la notte, ma 1-3 risvegli restano normali. Se è nato prematuro, il suo sonno segue l\'età corretta, non quella anagrafica.',
    why: 'I cicli del sonno dei neonati sono brevi e il sonno comincia spesso con una fase leggera e agitata (sonno attivo, o REM), in cui è facile che si svegli. Il ritmo giorno/notte si costruisce gradualmente nei primi mesi.',
    whatToDo: [
      'Segui i suoi segnali di stanchezza più dell\'orologio: sguardo fisso, occhi rossi, sbadigli, agitazione, pugni sugli occhi.',
      'Usa le finestre di veglia dell\'app come guida di massima, non come regola: a questa età cambiano molto da un giorno all\'altro.',
      'Di giorno luce naturale e rumori normali; di notte luce bassa, voce bassa e niente giochi: lo aiuta a distinguere il giorno dalla notte.',
      'Una mini-routine breve e sempre uguale prima dei sonni (cambio, luce bassa, canzone, coccole) crea un\'associazione. Non serve rigidità, serve ripetizione.',
      'Non confrontarlo con i bambini che «dormono tutta la notte»: a questa età non è la norma.'
    ],
    duration: 'Il sonno si consolida gradualmente tra i 3 e i 6 mesi. Anche dopo il primo anno, svegliarsi almeno una volta per notte è comune.',
    activities: [
      'Un bagnetto tiepido e un piccolo massaggio con le mani come inizio della routine serale, se lo gradisce.',
      'La stessa ninna nanna (o la stessa frase sussurrata) prima di ogni sonno.',
      'Dopo il risveglio del mattino, qualche minuto di luce naturale vicino alla finestra, insieme.'
    ],
    flag: 'Se è molto difficile svegliarlo per mangiare, se dorme quasi sempre e mangia poco, o se ha un respiro affannoso nel sonno, chiama il pediatra.'
  },
  {
    id: 'inf_sleep_arms', topic: 'sleep',
    ageMinDays: 0, ageMaxDays: 300,
    title: 'Dorme solo in braccio o in fascia: la strada verso il lettino',
    whatToExpect: 'Molti bambini dormono benissimo in braccio o in fascia e si svegliano appena vengono posati, spesso dopo pochi minuti. È molto comune e non significa che tu abbia sbagliato qualcosa.',
    why: 'In braccio sente il tuo calore, il tuo battito, il contatto continuo e il movimento: tutto ciò che per lui è normale. Il lettino è l\'opposto: fermo, piatto, più freddo. In più, nei primi mesi il riflesso di Moro (la sensazione di «cadere») lo sveglia quando viene appoggiato, e se lo posi nel sonno leggero iniziale è più facile che si svegli.',
    whatToDo: [
      'Aspetta il sonno profondo prima di posarlo: di solito 15-20 minuti dopo l\'addormentamento, con braccia e mani molli e respiro lento e regolare. Non è garantito: per questo nell\'app segni ogni tentativo e vedi quando funziona di più per lui.',
      'Posalo lentamente, tenendolo contro il tuo corpo fino all\'ultimo, e lascia una mano sul petto per 30-60 secondi.',
      'Scegli un solo sonno al giorno per provare il lettino (di solito il primo del mattino o quello della sera, quando è più stanco) e lascia gli altri in braccio o in fascia, senza sensi di colpa.',
      'A questa età tenerlo in braccio non lo «vizia»: ha bisogno di contatto. Se ti stanchi, alternatevi.',
      'Sicurezza: se si addormenta in fascia o in braccio, tienilo d\'occhio con il viso libero e il mento staccato dal petto e, appena puoi, mettilo a pancia in su su una superficie piana e rigida. Se rischi di addormentarti tu, mai su divano o poltrona.'
    ],
    duration: 'Di solito migliora con la maturazione del sonno (verso i 4-6 mesi i cicli si legano meglio e il riflesso di Moro scompare), ma i tempi sono molto individuali: per alcuni ci vogliono più mesi.',
    activities: [
      'Gioco e tummy time sul lettino da sveglio e sotto supervisione, per farlo diventare un posto normale e non solo «quello dove ci si sveglia».',
      'Canta la stessa canzone in braccio e poi vicino al lettino con la mano sul petto: il suono diventa un ponte tra i due posti.'
    ],
    flag: 'Se oltre a dormire solo in braccio fa fatica a mangiare, ha un respiro rumoroso o affannoso nel sonno, o sembra molto sofferente quando è sdraiato, parlane con il pediatra.'
  },
  {
    id: 'inf_sleep_night_stir', topic: 'sleep',
    ageMinDays: 0, ageMaxDays: 300,
    title: 'Notte: risvegli e sonno agitato verso mattina',
    whatToExpect: 'È normale che faccia 1-3 risvegli per notte e che nella parte finale il sonno diventi più agitato: si muove, grugnisce, fa smorfie, a volte sembra sveglio ma ha gli occhi chiusi.',
    why: 'Nei neonati una parte molto grande del sonno è «attiva» (REM): movimenti, rumori e smorfie sono normali e non vogliono dire che sia sveglio o che stia male. Man mano che la notte avanza il sonno si fa più leggero, e fame o pannolino bagnato lo svegliano più facilmente.',
    whatToDo: [
      'Aspetta 1-2 minuti prima di intervenire sui rumori: spesso si riaddormenta da solo.',
      'Se si sveglia davvero, tieni tutto «noioso»: luce bassissima, voce bassa, niente giochi, poi riprova a farlo riaddormentare.',
      'Segna con un tocco i risvegli brevi: dopo qualche notte vedi a che ora capitano e se si concentrano dopo le 4.',
      'Controlla le cose semplici: fame (se è passato molto dall\'ultima poppata), pannolino, stanza né troppo calda né troppo fredda (circa 18-20 °C) e non troppo coperto.'
    ],
    duration: 'Cambia di continuo. Dopo i 4-6 mesi migliora per molti bambini, ma i periodi agitati tornano con scatti di crescita e nuove abilità.',
    activities: [
      'Prima di dormire: poppata o ciuccio, luce bassa e 5 minuti di coccole tranquille.',
      'Di giorno tanta luce naturale e movimento, che aiutano il ritmo giorno-notte.'
    ],
    flag: 'Chiama il pediatra se il sonno agitato è accompagnato da pianto inconsolabile e diverso dal solito, vomito ripetuto, febbre, respiro affannoso o rumoroso, pause lunghe nel respiro, o se mangia poco.'
  },
  {
    id: 'inf_sleep_4m', topic: 'sleep',
    ageMinDays: 100, ageMaxDays: 210,
    title: 'Verso i 4 mesi: il sonno cambia',
    whatToExpect: 'Tra i 3 e i 5 mesi circa (età corretta) il sonno cambia struttura e diventa più simile a quello degli adulti, con fasi più leggere e più profonde. Per qualche settimana può svegliarsi più spesso, fare pisolini più corti e addormentarsi con più fatica. Si parla spesso di «regressione dei 4 mesi».',
    why: 'Non è un passo indietro: è una maturazione che resta. Il cervello inizia a legare tra loro i cicli del sonno e ci passa un periodo di assestamento. Nello stesso periodo cresce la curiosità: sta imparando tante cose e può distrarsi dal dormire.',
    whatToDo: [
      'Tieni la routine semplice e costante.',
      'Evita di cambiare molte cose insieme (stanza, orari, modo di addormentarlo) mentre il sonno è instabile.',
      'Dagli di giorno occasioni per esercitare le nuove abilità (girarsi, afferrare), così non lo fa solo nel lettino di notte.',
      'Le finestre di veglia si allungano: guarda la fascia aggiornata nell\'app.'
    ],
    duration: 'Di solito alcune settimane; poi il sonno si assesta in un modo nuovo, spesso con notti un po\' più lunghe.',
    activities: [
      'Giochi in cui afferra e passa oggetti da una mano all\'altra, per scaricare energia nuova.',
      'Tempo a pancia in giù e rotolamenti sul tappeto nella veglia del pomeriggio.'
    ],
    flag: 'Se sta molto peggio di prima per più di qualche settimana, o compaiono febbre o altri sintomi, parlane con il pediatra.'
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
    duration: 'Tipicamente più intensa tra 3 e 5 anni, poi le domande diventano più mirate e complesse.',
    activities: [
      'Leggete insieme un libro che stimola domande: natura, animali, spazio.',
      'Un piccolo esperimento semplice insieme, tipo far galleggiare/affondare oggetti in acqua.',
      'Passeggiata "a caccia di domande": lei fa una domanda per ogni cosa che vede.'
    ]
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
    duration: 'Le paure di questo tipo sono comuni fino ai 6-7 anni circa, poi tendono a ridursi.',
    activities: [
      'Disegnate insieme il "mostro" della paura, poi trasformatelo in qualcosa di buffo o gentile.',
      'Giochi di ruolo e travestimenti guidati da lei: le dà il controllo della storia.',
      'Una torcia tutta sua da tenere accanto al letto, per sentirsi più padrona del buio.'
    ]
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
    duration: 'L\'autocontrollo migliora gradualmente per tutta l\'età prescolare e scolare.',
    activities: [
      'Create insieme un "termometro delle emozioni" disegnato, da usare quando è arrabbiata.',
      'Il gioco della candelina: "spegni" la rabbia con un respiro lungo e lento.',
      'Un angolo morbido in casa dove può andare a calmarsi da sola, se lo desidera.'
    ]
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
    duration: 'Il gioco cooperativo si consolida progressivamente fino all\'età scolare.',
    activities: [
      'Organizza un gioco con regole semplici da condividere con altri bambini: nascondino, palla.',
      'Un gioco di squadra in casa, tipo costruire insieme una torre più alta possibile.',
      'Un gioco da tavolo semplicissimo con i turni, per esercitare l\'attesa.'
    ]
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
    duration: 'Il bisogno di autonomia cresce costantemente da qui in avanti.',
    activities: [
      'Lasciale preparare un piatto semplice, tipo farcire un panino o guarnire una macedonia.',
      'Dalle un piccolo compito fisso in casa, tipo dare da bere a una pianta ogni mattina.',
      'Falla scegliere e indossare da sola i vestiti, anche se l\'abbinamento è... originale.'
    ]
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
    duration: 'Questa fase di preparazione si sviluppa tipicamente tra i 5 e i 6-7 anni.',
    activities: [
      'Il gioco delle lettere: cerca in casa oggetti che iniziano con una lettera scelta insieme.',
      'Un gioco da tavolo con regole e turni, per allenare attenzione e pazienza.',
      'Farle raccontare a voce alta una storia inventata da lei, anche solo per pochi minuti.'
    ]
  },

  /* ---- Sonno di Alice (topic: 'sleep') — sezione "sonno" in Home, senza registro ---- */

  {
    id: 'child_bedtime_routine', topic: 'sleep',
    ageMinDays: 1095, ageMaxDays: 2555,
    title: 'La routine della buonanotte',
    whatToExpect: 'La sera diventa spesso un momento difficile: chiede ancora acqua, un\'altra storia, un altro bacio, si rialza. Molto spesso non è un semplice capriccio: è un modo per restare ancora un po\' con voi prima della separazione notturna. Per i bambini di 3-5 anni le indicazioni parlano di 10-13 ore di sonno su 24, pisolino compreso.',
    why: 'A questa età l\'immaginazione è molto vivace (e con lei le paure del buio e dei sogni) e la voglia di fare da sola si scontra con il bisogno di sentirsi al sicuro. Una sequenza prevedibile le dice cosa succede dopo e le restituisce un po\' di controllo.',
    whatToDo: [
      'Scegli 3-4 passi sempre uguali e nello stesso ordine (per esempio pigiama, denti, due storie, luce spenta, bacio) e finisci sempre nella sua cameretta.',
      'Tieni un orario di inizio abbastanza costante, anche nel weekend (scarto di circa un\'ora al massimo).',
      'Spegni gli schermi almeno un\'ora prima di dormire: luce e contenuti eccitanti rendono più difficile addormentarsi.',
      'Concordate prima le richieste «ultime» (per esempio due storie e un bicchiere d\'acqua) e dalle piccole scelte, come quale pigiama o quale libro: sentirsi coinvolta riduce la resistenza.',
      'Prova un «gettone della buonanotte»: una richiesta in più a sera (acqua, un abbraccio) da usare quando vuole. Dopo averlo usato, niente più richieste.',
      'Se ha cambiato qualcosa da poco (un fratellino, la scuola, una malattia) è normale che la sera diventi più faticosa per un periodo: più contatto di giorno aiuta.'
    ],
    duration: 'Con qualche giorno di costanza la routine di solito si assesta in 1-2 settimane. Le difficoltà possono tornare a periodi, con malattie, cambiamenti o novità in famiglia.',
    activities: [
      'Lasciale scegliere il libro e farsi «leggere» una pagina a modo suo.',
      'Un momento di 2 minuti per raccontare o disegnare una cosa bella e una difficile della giornata.',
      'Il respiro del pancione: mano sulla pancia che sale e scende, inspira come per annusare un fiore, espira come per spegnere una candelina.'
    ],
    flag: 'Se russa forte o fa pause nel respiro nel sonno, ha spesso incubi o terrori notturni, è molto stanca di giorno nonostante le ore dormite, o addormentarsi richiede sempre più di un\'ora per settimane, parlane con il pediatra.'
  },
  {
    id: 'child_fall_asleep_alone', topic: 'sleep',
    ageMinDays: 1095, ageMaxDays: 2555,
    title: 'Dal «resta con me» al dormire da sola',
    whatToExpect: 'Molti bambini dormono nella loro stanza ma riescono ad addormentarsi solo con un genitore accanto, e si agitano se esci. È molto comune e non significa che abbiate sbagliato qualcosa.',
    why: 'Si è abituata ad addormentarsi con la tua presenza. Quando di notte si sveglia (è normale a ogni ciclo del sonno) e non ti trova, si agita e ti chiama. Con la fantasia e le paure di questa età, la tua vicinanza è ancora più rassicurante.',
    whatToDo: [
      'Spiegale il piano di giorno, in un momento sereno: «Da stasera io resto un po\' meno e ogni sera un pochino più lontano».',
      'Ritiro graduale, un passo ogni 3-4 sere se è tranquilla: 1) resti nel letto con lei ma smetti di parlare e di toccarla; 2) ti siedi sul bordo del letto; 3) sedia accanto al letto; 4) sedia vicino alla porta; 5) sulla soglia, con la porta socchiusa; 6) fuori, passando a controllare.',
      'Se si rialza, riportala a letto in silenzio, senza discutere, con poche parole sempre uguali («è ora di dormire, io sono qui vicino»). Sii noioso e costante.',
      'Dalle un aiuto per fare da sola: un peluche o una copertina «di compagnia», una luce notturna soffusa, una storia o una musica registrata a volume basso.',
      'Mettetevi d\'accordo in due: stessi passi, stesse parole, chiunque la metta a letto.',
      'Se a metà notte viene da voi, riportala nel suo letto con lo stesso copione, senza farne un momento di gioco.'
    ],
    duration: 'Di solito si vedono i primi miglioramenti dopo 1-2 settimane di costanza e servono alcune settimane per arrivare alla porta. Possono esserci passi indietro (malattie, vacanze): si riparte dal passo precedente.',
    activities: [
      'Di giorno giocate a mettere a letto il peluche: la mamma o il papà è lei, e il peluche la saluta e poi dorme.',
      'Un cartellone con adesivi per le sere in cui il passo è andato bene, con un piccolo premio a fine settimana.',
      'Giochi del «torno subito»: esci dalla stanza per pochi secondi e rientra, allungando piano il tempo.'
    ],
    flag: 'Se la paura è molto intensa (panico, pianto inconsolabile ogni sera), compare anche di giorno o dopo un evento difficile, o se i problemi di sonno durano molti mesi nonostante la costanza, parlane con il pediatra.'
  }

];


/* Restituisce le fasi attive per un figlio, in base alla sua età odierna in giorni.
   Più fasi possono essere attive insieme: è normale, lo sviluppo è continuo. */
function getCurrentPhases(child, topic) {
  const age = ageOf(child.birth_date);
  if (age.isNegative) return [];
  const days = age.totalDays;
  return PHASES
    .filter(p => topic ? p.topic === topic : p.topic !== 'sleep')
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
  if (phase.activities && phase.activities.length > 0) {
    html += `<div class="phase-section-label">attività da provare insieme</div><ul class="phase-list phase-activities">`;
    phase.activities.forEach(act => { html += `<li>${escapeHtml(act)}</li>`; });
    html += `</ul>`;
  }
  html += `<div class="phase-section-label">quanto dura</div><div class="phase-section-body">${escapeHtml(phase.duration)}</div>`;
  if (phase.flag) {
    html += `<div class="phase-flag"><strong>Quando parlare con il pediatra —</strong> ${escapeHtml(phase.flag)}</div>`;
  }
  html += `</div>`;

  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('sheet').classList.add('open');
}
