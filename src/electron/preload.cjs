// src/electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("updater", {
  onChecking: (cb) => ipcRenderer.on("update:checking", () => cb()),
  onAvailable: (cb) => ipcRenderer.on("update:available", (_, info) => cb(info)),
  onNotAvailable: (cb) => ipcRenderer.on("update:notAvailable", (_, info) => cb(info)),
  onProgress: (cb) => ipcRenderer.on("update:progress", (_, p) => cb(p)),
  onDownloaded: (cb) => ipcRenderer.on("update:downloaded", (_, info) => cb(info)),
  onError: (cb) => ipcRenderer.on("update:error", (_, msg) => cb(msg)),

  check: () => ipcRenderer.invoke("update:check"),
  download: () => ipcRenderer.invoke("update:download"),
  quitAndInstall: () => ipcRenderer.invoke("update:quitAndInstall")
});
