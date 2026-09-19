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
    try {
      if (!filePath) return false;

      // Windows 下使用 showItemInFolder 更稳定，尤其适合网络路径和 NAS 路径
      shell.showItemInFolder(filePath);
      return true;
    } catch (error) {
      console.error("打开文件位置失败:", error);
      return false;
    }
  });

  ipcMain.handle("open-lyrics-file", async (_event, lyricsPath?: string) => {
    try {
      if (!lyricsPath) return false;

      const result = await shell.openPath(lyricsPath);
      return result === "";
    } catch (error) {
      console.error("打开歌词失败:", error);
      return false;
    }
  });
}
