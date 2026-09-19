import { dialog, ipcMain } from "electron";
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
}
