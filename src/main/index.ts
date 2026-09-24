import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { registerIPCHandlers } from './ipc';
import { CacheBootstrapService } from '../services/CacheBootstrapService';

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

function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

async function loadWindowState() {
  const defaultState = {
    width: 1200,
    height: 800,
  };

  try {
    const content = await readFile(getWindowStatePath(), 'utf-8');
    return {
      ...defaultState,
      ...JSON.parse(content),
    };
  } catch {
    return defaultState;
  }
}

function saveWindowState(window: BrowserWindow) {
  const save = async () => {
    if (window.isDestroyed()) return;

    const bounds = window.getBounds();
    await writeFile(
      getWindowStatePath(),
      JSON.stringify({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
      }),
      'utf-8',
    );
  };

  window.on('resize', save);
  window.on('move', save);
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

async function createWindow() {
  const state = await loadWindowState();

  const window = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  saveWindowState(window);

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;

  if (rendererUrl) {
    window.loadURL(rendererUrl);
  } else {
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  setupElectronCache();
  registerAppCleanup();

  await new CacheBootstrapService().initialize();

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
