/* KIN · Backup dati */
'use strict';

function exportKinBackup() {
  try {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Kin',
      version: APP_VERSION,
      data: DATA
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kin-backup-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup salvato');
  } catch (e) {
    toast('Errore nel backup');
    console.warn('backup error', e);
  }
}
