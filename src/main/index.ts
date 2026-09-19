import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  window.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});
