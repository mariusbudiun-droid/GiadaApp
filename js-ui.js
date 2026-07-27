/* KIN · UI init + tabbar + service worker */
'use strict';

/* ---------- TAB BAR ---------- */
function goTo(tab) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const sec = document.getElementById('sec-' + tab);
  if (sec) sec.classList.add('active');
  const tabBtn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (tabBtn) tabBtn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (tab === 'home') renderHome();
  if (tab === 'tracking') renderTracking();
  if (tab === 'salute') renderHealth();
  if (tab === 'diario') renderDiary();
  if (tab === 'altro') renderSettings();
}

/* ---------- THEME ---------- */
let CURRENT_THEME = localStorage.getItem(THEME_KEY) || 'auto';

function selectTheme(mode) {
  CURRENT_THEME = mode;
  localStorage.setItem(THEME_KEY, mode);
  applyTheme();
  renderSettings();
}

function applyTheme() {
  const doc = document.documentElement;
  doc.classList.remove('theme-light', 'theme-dark');
  let effective = CURRENT_THEME;
  if (effective === 'auto') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  doc.classList.add('theme-' + effective);
  // Meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = effective === 'dark' ? '#1A2530' : '#FBF7F2';
}

/* Watch OS theme changes when in auto */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (CURRENT_THEME === 'auto') applyTheme();
});

/* ---------- SHEET CLOSE (usata da tracking e altri) ---------- */
function closeSheet() {
  document.getElementById('sheetOverlay')?.classList.remove('open');
  document.getElementById('sheet')?.classList.remove('open');
}

/* ---------- INIT ---------- */
function init() {
  applyTheme();
  loadData();

  // Se non c'è un household, mostra welcome
  if (!SYNC.householdId) {
    showWelcome();
  } else {
    onSyncReady();
  }

  registerSW();
}

function onSyncReady() {
  goTo('home');
  startSync();
}

/* ---------- SERVICE WORKER auto-update silenzioso ---------- */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            try { nw.postMessage({ type: 'SKIP_WAITING' }); } catch(_) {}
          }
        });
      });
      setInterval(() => { reg.update().catch(()=>{}); }, 10 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(()=>{});
      });
    }).catch(err => console.warn('SW error', err));
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

document.addEventListener('DOMContentLoaded', init);
