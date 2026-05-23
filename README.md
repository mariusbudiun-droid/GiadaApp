# Giada Companion

PWA per il monitoraggio del diabete gestazionale. Basata sulla dieta della Dr.ssa Gambacorta (AUSL Pescara). Dati medici salvati solo sul telefono.

## Cosa fa

- 6 pasti al giorno con opzioni dalla dieta della nutrizionista
- Misurazioni glicemia (digiuno + 1h o 2h dopo i pasti)
- Misurazioni chetoni urinari con scala mg/dL
- Diario completo, statistiche, export per la dottoressa
- 4 temi visivi × chiaro/scuro/auto
- Backup JSON e ripristino
- Funziona offline, installabile su iPhone

## Setup

### 1. Crea il repo su GitHub

Nuovo repo (es. `giada-companion`) sotto `mariusbudiun-droid`. Carica tutti i file mantenendo la struttura:

```
giada-companion/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   ├── base.css
│   └── themes.css
├── js/
│   ├── data.js
│   ├── app.js
│   ├── meals.js
│   └── ui.js
└── icons/
    ├── icon.svg
    ├── icon-180.png
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-192-maskable.png
    ├── icon-512-maskable.png
    └── favicon-32.png
```

### 2. Deploy su Vercel

- Importa il repo da GitHub su [vercel.com](https://vercel.com)
- Framework preset: **Other** (è statico puro)
- Build command: lasciare vuoto
- Output directory: lasciare vuoto (root)
- Deploy

Vercel ti dà un URL tipo `giada-companion.vercel.app`.

### 3. Installazione su iPhone di Giada

1. Apri l'URL Vercel in **Safari** (non Chrome, non in-app browser)
2. Tocca il pulsante **Condividi** in basso
3. Scorri e tocca **Aggiungi a Schermata Home**
4. L'icona "ramo di olivo" appare nella home come un'app normale

## Aggiornamenti

Quando modifichi il codice:

1. Incrementa `CACHE_VERSION` in `sw.js` (es. da `giada-v1.0.0` a `giada-v1.0.1`)
2. Push su GitHub
3. Vercel deploya da solo
4. La prossima volta che Giada apre l'app, vede il banner **"Aggiornamento disponibile"** in alto: tocca **Aggiorna**

Se l'icona deve cambiare visivamente sulla home dell'iPhone, va rimossa e reinstallata (limite di iOS).

## Privacy dei dati

- Tutti i dati medici (glicemia, chetoni, pasti) restano nel **localStorage del browser di Giada**
- Vercel ospita solo il codice statico, non vede mai i dati
- Backup JSON salvabile dalle Impostazioni dell'app
- Esportazione TXT diario per stampare e portare alla dottoressa

## Stack

- Vanilla HTML/CSS/JS (zero dipendenze)
- PWA standard (manifest + service worker)
- Hosting statico
- Compatibilità: iPhone Safari 14+, tutti i browser moderni

## Soglie cliniche (modificabili in `data.js`)

- Digiuno: target < 95 mg/dL
- 1h post-pasto: target < 140 mg/dL
- 2h post-pasto: target < 120 mg/dL
- Chetoni: da `+` (15 mg/dL) avviso lieve, da `++` (40) contattare la dottoressa

Le soglie e i feedback sono calibrati per essere informativi ma mai colpevolizzanti.
