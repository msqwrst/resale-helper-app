console.log("✅ PRELOAD LOADED (renderer)");
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appAPI", {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),

  update: {
    check: () => ipcRenderer.send("update:check"),
    install: () => ipcRenderer.send("update:install"),
    getPolicy: () => ipcRenderer.invoke("update:policy"),

    onChecking: (cb) => ipcRenderer.on("update:checking", () => cb()),
    onAvailable: (cb) => ipcRenderer.on("update:available", (_e, info) => cb(info)),
    onNone: (cb) => ipcRenderer.on("update:none", (_e, info) => cb(info)),
    onDownloaded: (cb) => ipcRenderer.on("update:downloaded", (_e, info) => cb(info)),
    onError: (cb) => ipcRenderer.on("update:error", (_e, msg) => cb(msg)),
    onPolicy: (cb) => ipcRenderer.on("update:policy", (_e, payload) => cb(payload)),
  }
});
