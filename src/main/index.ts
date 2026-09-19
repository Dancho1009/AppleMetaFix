import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { registerIPCHandlers } from './ipc';

function getPreloadPath() {
  const candidates = [
    path.join(__dirname, '../preload/index.js'),
    path.join(__dirname, '../preload/index.mjs'),
    path.join(__dirname, '../preload.js'),
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, 'preload.mjs'),
  ];

  const preloadPath = candidates.find((file) => existsSync(file));

  if (!preloadPath) {
    console.error('未找到 preload 文件:', candidates);
    console.error('当前 __dirname:', __dirname);
    return candidates[0];
  }

  console.log('加载 preload:', preloadPath);
  return preloadPath;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;

  if (rendererUrl) {
    window.loadURL(rendererUrl);
  } else {
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerIPCHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
