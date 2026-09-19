import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("appleMetaFix", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  scanFolder: (folderPath: string) => ipcRenderer.invoke("scan-folder", folderPath),
  openFileLocation: (filePath: string) => ipcRenderer.invoke("open-file-location", filePath),
  openLyricsFile: (lyricsPath?: string) => ipcRenderer.invoke("open-lyrics-file", lyricsPath),
});
