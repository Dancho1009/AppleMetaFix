import { dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { exec } from "node:child_process";
import { FolderScanner } from "../scanner/FolderScanner";
import { getSongByPath } from "../database/songRepository";

const folderScanner = new FolderScanner();

function logIPC(name: string, payload?: unknown) {
  console.log(`[IPC] ${name}`, payload ?? "");
}

function openWindowsPath(targetPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const command = `start "" "${targetPath}"`;

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
    logIPC("select-folder");

    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle("scan-folder", async (_event, folderPath: string) => {
    logIPC("scan-folder", folderPath);
    return folderScanner.scanFolder(folderPath);
  });

  ipcMain.handle("get-song-detail", async (_event, filePath: string) => {
    logIPC("get-song-detail", filePath);
    return getSongByPath(filePath);
  });

  ipcMain.handle("open-file-location", async (_event, filePath: string) => {
    logIPC("open-file-location request", filePath);

    try {
      if (!filePath) {
        return false;
      }

      const opened = await openWindowsPath(path.dirname(filePath));

      if (opened) {
        return true;
      }

      shell.showItemInFolder(filePath);
      return true;
    } catch (error) {
      console.error("[IPC] 打开文件位置失败:", error);
      return false;
    }
  });

  ipcMain.handle("open-lyrics-file", async (_event, lyricsPath?: string) => {
    logIPC("open-lyrics-file request", lyricsPath);

    if (!lyricsPath) {
      return false;
    }

    const opened = await openWindowsPath(lyricsPath);
    if (opened) {
      return true;
    }

    return (await shell.openPath(lyricsPath)) === "";
  });
}
