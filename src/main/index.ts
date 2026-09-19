import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIPCHandlers } from './ipc';

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  window.loadFile('index.html');
}

app.whenReady().then(() => {
  registerIPCHandlers();
  createWindow();
});
