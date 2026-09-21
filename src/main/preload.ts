import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("appleMetaFix", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  updateConfig: (config: any) => ipcRenderer.invoke("config:update", config),
  onConfigChanged: (callback: (config: any) => void) => {
    ipcRenderer.on("config:changed", (_event, config) => callback(config));
  },
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  scanFolder: (folderPath: string) => ipcRenderer.invoke("scan-folder", folderPath),
  getSongDetail: (filePath: string) => ipcRenderer.invoke("get-song-detail", filePath),
  matchSong: (song: any) => ipcRenderer.invoke("match-song", song),
  onScanProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on("scan-progress", (_event, progress) => callback(progress));
  },
  offScanProgress: (callback: (progress: any) => void) => {
    ipcRenderer.removeListener("scan-progress", callback as any);
  },
  openFileLocation: (filePath: string) => ipcRenderer.invoke("open-file-location", filePath),
  openLyricsFile: (lyricsPath?: string) => ipcRenderer.invoke("open-lyrics-file", lyricsPath),
});
