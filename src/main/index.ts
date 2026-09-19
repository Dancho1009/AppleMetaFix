import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { registerIPCHandlers } from './ipc';

// 保存需要退出时清理的后台任务
const cleanupTasks: Array<() => void | Promise<void>> = [];

export function registerCleanupTask(task: () => void | Promise<void>) {
  cleanupTasks.push(task);
}

async function cleanupBeforeExit() {
  console.log('[App] cleanup before exit');

  for (const task of cleanupTasks.reverse()) {
    try {
      await task();
    } catch (error) {
      console.error('[App] cleanup failed:', error);
    }
  }
}

function setupElectronCache() {
  const cachePath = path.join(process.cwd(), 'cache');

  if (!existsSync(cachePath)) {
    mkdirSync(cachePath, { recursive: true });
  }

  app.setPath('cache', cachePath);
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

  console.log('Electron cache:', cachePath);
}

function registerAppCleanup() {
  registerCleanupTask(async () => {
    const coverCache = path.join(app.getPath('userData'), 'cache', 'covers');

    try {
      await rm(coverCache, { recursive: true, force: true });
      console.log('[App] cover cache removed:', coverCache);
    } catch (error) {
      console.error('[App] remove cover cache failed:', error);
    }
  });
}

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
  setupElectronCache();
  registerAppCleanup();
  registerIPCHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async (event) => {
  if (cleanupTasks.length > 0) {
    event.preventDefault();
    await cleanupBeforeExit();
    app.exit(0);
  }
});
