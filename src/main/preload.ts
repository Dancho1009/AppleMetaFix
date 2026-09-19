import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("appleMetaFix", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  scanFolder: (folderPath: string) => ipcRenderer.invoke("scan-folder", folderPath),
});
