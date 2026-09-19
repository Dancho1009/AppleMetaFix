import { dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { FolderScanner } from "../scanner/FolderScanner";

const folderScanner = new FolderScanner();

export function registerIPCHandlers() {
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle("scan-folder", async (_event, folderPath: string) => {
    return folderScanner.scanFolder(folderPath);
  });

  ipcMain.handle("open-file-location", async (_event, filePath: string) => {
    if (!filePath) return false;

    const result = await shell.openPath(path.dirname(filePath));
    return result === "";
  });

  ipcMain.handle("open-lyrics-file", async (_event, lyricsPath?: string) => {
    if (!lyricsPath) return false;

    const result = await shell.openPath(lyricsPath);
    return result === "";
  });
}
