const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("updater", {
  check: () => ipcRenderer.send("update:check"),
  install: () => ipcRenderer.send("update:install"),

  onChecking: (cb) => ipcRenderer.on("update:checking", (_, data) => cb(data)),
  onAvailable: (cb) => ipcRenderer.on("update:available", (_, data) => cb(data)),
  onNone: (cb) => ipcRenderer.on("update:none", (_, data) => cb(data)),
  onDownloaded: (cb) => ipcRenderer.on("update:downloaded", (_, data) => cb(data)),
  onError: (cb) => ipcRenderer.on("update:error", (_, data) => cb(data)),

  getPolicy: () => ipcRenderer.invoke("update:policy"),
  getVersion: () => ipcRenderer.invoke("app:getVersion")
});
