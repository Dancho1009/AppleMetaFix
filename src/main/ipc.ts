import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { exec } from "node:child_process";
import { FolderScanner } from "../scanner/FolderScanner";
import { getSongByPath } from "../database/songRepository";
import { MetadataMatchPipeline } from "../services/MetadataMatchPipeline";
import { cacheManagementService } from "../services/CacheManagementService";
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
  ipcMain.handle("config:get", () => getConfig());

  ipcMain.handle("config:update", (_event, patch: AppConfigPatch) => {
    const config = updateConfig(patch ?? {});
    broadcastConfigChanged(config);
    return config;
  });

  ipcMain.handle("cache:get-stats", () => {
    return cacheManagementService.getStats();
  });

  ipcMain.handle("cache:clear", () => {
    debugLog("CACHE", "手动清理缓存");
    const result = cacheManagementService.clearCache();
    broadcastConfigChanged(getConfig());
    return result;
  });

  ipcMain.handle("cache:cleanup-expired", () => {
    debugLog("CACHE", "清理过期缓存");
    const result = cacheManagementService.cleanupExpired();
    broadcastConfigChanged(getConfig());
    return result;
  });

  ipcMain.handle("cache:set-retention-days", (_event, days: number) => {
    const config = updateConfig({
      cache: {
        retentionDays: days,
      },
    });
    broadcastConfigChanged(config);
    return config;
  });

  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("scan-folder", async (event, folderPath: string) => {
    return folderScanner.scanFolder(folderPath, (progress) => {
      event.sender.send("scan-progress", progress);
    });
  });

  ipcMain.handle("get-song-detail", async (_event, filePath: string) => {
    return getSongByPath(filePath);
  });

  ipcMain.handle("match-song", async (_event, song: any) => {
    try {
      return await metadataMatchPipeline.process(song.path);
    } catch (error) {
      debugError("MATCH", "匹配失败", error);
      throw error;
    }
  });

  ipcMain.handle("open-file-location", async (_event, filePath: string) => {
    if (!filePath) return false;
    const opened = await openWindowsPath(path.dirname(filePath));
    if (opened) return true;
    shell.showItemInFolder(filePath);
    return true;
  });

  ipcMain.handle("open-lyrics-file", async (_event, lyricsPath?: string) => {
    if (!lyricsPath) return false;
    const opened = await openWindowsPath(lyricsPath);
    if (opened) return true;
    return (await shell.openPath(lyricsPath)) === "";
  });
}
