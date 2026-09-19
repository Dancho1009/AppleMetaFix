import { dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { FolderScanner } from "../scanner/FolderScanner";

const folderScanner = new FolderScanner();

function logIPC(name: string, payload?: unknown) {
  console.log(`[IPC] ${name}`, payload ?? "");
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

  ipcMain.handle("open-file-location", async (_event, filePath: string) => {
    logIPC("open-file-location request", filePath);

    try {
      if (!filePath) {
        console.error("[IPC] open-file-location: empty path");
        return false;
      }

      // UNC/NAS 路径下 showItemInFolder 可能无响应
      // 优先尝试定位文件，失败后打开所在目录
      try {
        shell.showItemInFolder(filePath);
        logIPC("open-file-location showItemInFolder success");
        return true;
      } catch (error) {
        console.warn("[IPC] showItemInFolder failed, fallback:", error);
      }

      const folderPath = path.dirname(filePath);
      const result = await shell.openPath(folderPath);

      if (result !== "") {
        console.error("[IPC] 打开文件夹失败:", result);
        return false;
      }

      logIPC("open-file-location fallback success", folderPath);
      return true;
    } catch (error) {
      console.error("[IPC] 打开文件位置失败:", error);
      return false;
    }
  });

  ipcMain.handle("open-lyrics-file", async (_event, lyricsPath?: string) => {
    logIPC("open-lyrics-file request", lyricsPath);

    try {
      if (!lyricsPath) {
        console.error("[IPC] open-lyrics-file: empty path");
        return false;
      }

      const result = await shell.openPath(lyricsPath);

      if (result !== "") {
        console.error("[IPC] 打开歌词失败:", result);
        return false;
      }

      logIPC("open-lyrics-file success");
      return true;
    } catch (error) {
      console.error("[IPC] 打开歌词失败:", error);
      return false;
    }
  });
}
