// core/trayManager.js
const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

function createTray(win, store, { onQuickAdd, onToggle } = {}) {
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'tray.png');
  let image;
  try {
    image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) throw new Error('empty icon');
  } catch (_) {
    image = nativeImage.createEmpty(); // app still runs without a real icon asset
  }

  const tray = new Tray(image);
  tray.setToolTip('LifeOS');

  const rebuildMenu = () => {
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show / Hide Widget', click: () => onToggle && onToggle() },
      { label: 'Quick Add Task', click: () => onQuickAdd && onQuickAdd() },
      { type: 'separator' },
      {
        label: 'Launch at login',
        type: 'checkbox',
        checked: !!store.get('settings.autoLaunch'),
        click: (item) => {
          store.set('settings.autoLaunch', item.checked);
          app.setLoginItemSettings({ openAtLogin: item.checked });
        }
      },
      { type: 'separator' },
      { label: 'Quit LifeOS', click: () => app.quit() }
    ]));
  };

  rebuildMenu();
  tray.on('click', () => onToggle && onToggle());
  return tray;
}

module.exports = { createTray };
