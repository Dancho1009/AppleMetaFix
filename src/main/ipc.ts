import { dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { exec } from "node:child_process";
import { FolderScanner } from "../scanner/FolderScanner";
import { getSongByPath } from "../database/songRepository";
import { MetadataMatchPipeline } from "../services/MetadataMatchPipeline";

const folderScanner = new FolderScanner();
const metadataMatchPipeline = new MetadataMatchPipeline();

function logIPC(name: string, payload?: unknown) {
  console.log(`[IPC] ${name}`, payload ?? "");
}

function openWindowsPath(targetPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const command = `start \"\" \"${targetPath}\"`;
    exec(command, (error) => {
      if (error) {
        console.error("[IPC] Windows start failed:", error);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

export function registerIPCHandlers() {
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("scan-folder", async (event, folderPath: string) => {
    logIPC("scan-folder", folderPath);
    return folderScanner.scanFolder(folderPath, (progress) => {
      event.sender.send("scan-progress", progress);
    });
  });

  ipcMain.handle("get-song-detail", async (_event, filePath: string) => {
    return getSongByPath(filePath);
  });

  ipcMain.handle("match-song", async (_event, song: any) => {
    if (!song?.path) return null;
    return metadataMatchPipeline.process(song.path);
  });

  ipcMain.handle("open-file-location", async (_event, filePath: string) => {
    try {
      if (!filePath) return false;
      const opened = await openWindowsPath(path.dirname(filePath));
      if (opened) return true;
      shell.showItemInFolder(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("open-lyrics-file", async (_event, lyricsPath?: string) => {
    if (!lyricsPath) return false;
    const opened = await openWindowsPath(lyricsPath);
    if (opened) return true;
    return (await shell.openPath(lyricsPath)) === "";
  });
}
