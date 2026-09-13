// components/storage/backup.js
const { dialog } = require('electron');

async function exportBackup(win, store) {
  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Export LifeOS backup',
    defaultPath: `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!filePath) return null;
  store.exportSnapshot(filePath);
  return filePath;
}

async function importBackup(win, store) {
  const { filePaths } = await dialog.showOpenDialog(win, {
    title: 'Restore LifeOS backup',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (!filePaths || !filePaths[0]) return null;
  return store.importSnapshot(filePaths[0]);
}

module.exports = { exportBackup, importBackup };
