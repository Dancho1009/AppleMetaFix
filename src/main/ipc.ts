import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { exec } from "node:child_process";
import { FolderScanner } from "../scanner/FolderScanner";
import { getSongByPath } from "../database/songRepository";
import { MetadataMatchPipeline } from "../services/MetadataMatchPipeline";
import { getConfig, updateConfig } from "../config/ConfigService";
import { AppConfigPatch } from "../config/AppConfig";
import { debugLog, debugError } from "./logger";

const folderScanner = new FolderScanner();
const metadataMatchPipeline = new MetadataMatchPipeline();

function openWindowsPath(targetPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const command = 'start "" "' + targetPath + '"';
    exec(command, (error) => {
      if (error) {
        debugError("FILE", "打开路径失败", error);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

function broadcastConfigChanged(config: ReturnType<typeof getConfig>) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send("config:changed", config);
    }
  }
}

export function registerIPCHandlers() {
  ipcMain.handle("config:get", () => {
    return getConfig();
  });

  ipcMain.handle("config:update", (_event, patch: AppConfigPatch) => {
    const config = updateConfig(patch ?? {});

    debugLog("CONFIG", "配置已更新", {
      storefront: config.appleMusic.storefront,
      candidateLimit: config.appleMusic.candidateLimit,
      hasMediaUserToken: Boolean(config.appleMusic.mediaUserToken),
    });

    broadcastConfigChanged(config);
    return config;
  });

  ipcMain.handle("select-folder", async () => {
    debugLog("IPC", "select-folder 开始");
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    debugLog("IPC", "select-folder 结果", result.filePaths[0]);

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("scan-folder", async (event, folderPath: string) => {
    debugLog("SCAN", "开始扫描", folderPath);

    const result = await folderScanner.scanFolder(folderPath, (progress) => {
      debugLog("SCAN", "扫描进度", progress);
      event.sender.send("scan-progress", progress);
    });

    debugLog("SCAN", "扫描完成", { count: result.length });
    return result;
  });

  ipcMain.handle("get-song-detail", async (_event, filePath: string) => {
    debugLog("IPC", "读取歌曲详情", filePath);
    return getSongByPath(filePath);
  });

  ipcMain.handle("match-song", async (_event, song: any) => {
    debugLog("MATCH", "开始匹配", {
      path: song?.path,
      title: song?.title,
      artist: song?.artist,
    });

    try {
      const result = await metadataMatchPipeline.process(song.path);
      debugLog("MATCH", "匹配完成", result);
      return result;
    } catch (error) {
      debugError("MATCH", "匹配失败", error);
      throw error;
    }
  });

  ipcMain.handle("open-file-location", async (_event, filePath: string) => {
    debugLog("FILE", "打开文件位置", filePath);
    try {
      if (!filePath) return false;
      const opened = await openWindowsPath(path.dirname(filePath));
      if (opened) return true;
      shell.showItemInFolder(filePath);
      return true;
    } catch (error) {
      debugError("FILE", "打开文件位置失败", error);
      return false;
    }
  });

  ipcMain.handle("open-lyrics-file", async (_event, lyricsPath?: string) => {
    debugLog("FILE", "打开歌词文件", lyricsPath);
    if (!lyricsPath) return false;
    const opened = await openWindowsPath(lyricsPath);
    if (opened) return true;
    return (await shell.openPath(lyricsPath)) === "";
  });
}
