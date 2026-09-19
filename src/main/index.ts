import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
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
  // 将 Electron Chromium 缓存放到启动目录同级 cache 文件夹
  // 避免 Windows 用户目录权限问题导致启动时刷缓存错误
  const cachePath = path.join(process.cwd(), 'cache');

  app.setPath('cache', cachePath);

  console.log('Electron cache:', cachePath);
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
  registerIPCHandlers();
  createWindow();
});

// Windows/Linux 关闭窗口时完全退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 确保退出前释放后台任务、扫描任务等资源
app.on('before-quit', async (event) => {
  if (cleanupTasks.length > 0) {
    event.preventDefault();
    await cleanupBeforeExit();
    app.exit(0);
  }
});
