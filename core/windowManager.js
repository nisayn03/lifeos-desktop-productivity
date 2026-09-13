// core/windowManager.js
const { BrowserWindow, screen } = require('electron');
const path = require('path');

const COLLAPSED_SIZE = { width: 300, height: 96 };
const EXPANDED_SIZE = { width: 440, height: 660 };

function defaultPosition() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return { x: width - COLLAPSED_SIZE.width - 24, y: height - COLLAPSED_SIZE.height - 16 };
}

function createWidgetWindow(store) {
  const saved = store.get('windowState') || {};
  const pos = (saved.x != null && saved.y != null) ? { x: saved.x, y: saved.y } : defaultPosition();
  const size = saved.mode === 'expanded' ? EXPANDED_SIZE : COLLAPSED_SIZE;

  const win = new BrowserWindow({
    ...pos,
    width: size.width,
    height: size.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,        // spec asks for resizable; bounds still clamp on mode switch
    hasShadow: false,
    roundedCorners: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    minWidth: COLLAPSED_SIZE.width,
    minHeight: COLLAPSED_SIZE.height,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  let moveDebounce = null;
  win.on('move', () => {
    clearTimeout(moveDebounce);
    moveDebounce = setTimeout(() => {
      const [x, y] = win.getPosition();
      store.set('windowState.x', x);
      store.set('windowState.y', y);
    }, 250);
  });

  // Auto-hide near the screen edge: peek a sliver when the pointer leaves.
  let hideTimer = null;
  win.on('blur', () => {
    if (store.get('settings.autoHide') === false) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      const [x] = win.getPosition();
      const { width } = screen.getPrimaryDisplay().workAreaSize;
      if (x > width - 40) win.setOpacity(0.35);
    }, 4000);
  });
  win.on('focus', () => { clearTimeout(hideTimer); win.setOpacity(1); });

  return win;
}

function setMode(win, store, mode) {
  const currentMode = store.get('windowState.mode') || 'collapsed';
  const size = mode === 'expanded' ? EXPANDED_SIZE : COLLAPSED_SIZE;
  const [x, y] = win.getPosition();

  // Only apply the anchor offset when the mode is actually changing —
  // calling setMode with the mode it's already in (e.g. a double-fired
  // toggle) must be a no-op on position, or repeated calls would drift the
  // window down the screen a little further each time.
  let newY = y;
  if (mode !== currentMode) {
    newY = mode === 'expanded'
      ? y - (EXPANDED_SIZE.height - COLLAPSED_SIZE.height)
      : y + (EXPANDED_SIZE.height - COLLAPSED_SIZE.height);
  }

  // Clamp to the work area of whichever display the window is currently on,
  // so neither direction can ever push it off-screen.
  const display = screen.getDisplayNearestPoint({ x, y });
  const area = display.workArea;
  const clampedX = Math.min(Math.max(x, area.x), area.x + area.width - size.width);
  const clampedY = Math.min(Math.max(newY, area.y), area.y + area.height - size.height);

  win.setBounds({ x: clampedX, y: clampedY, width: size.width, height: size.height }, true);
  store.set('windowState.mode', mode);
}

module.exports = { createWidgetWindow, setMode, COLLAPSED_SIZE, EXPANDED_SIZE };
