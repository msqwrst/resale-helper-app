// src/electron/preload.cjs
// Exposes a stable API for renderer (React) without leaking full ipcRenderer.
// Works with UpdateOverlay.jsx + Layout.jsx.

const { contextBridge, ipcRenderer } = require("electron");

function on(channel, cb) {
  const handler = (_event, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  // return unsubscribe
  return () => {
    try { ipcRenderer.removeListener(channel, handler); } catch {}
  };
}

const updateAPI = {
  // events
  onChecking: (cb) => on("update:checking", () => cb()),
  onAvailable: (cb) => on("update:available", (info) => cb(info)),
  onNone: (cb) => on("update:notAvailable", (info) => cb(info)),
  onProgress: (cb) => on("update:progress", (p) => cb(p)),
  onDownloaded: (cb) => on("update:downloaded", (info) => cb(info)),
  onError: (cb) => on("update:error", (msg) => cb(msg)),

  // commands
  getPolicy: () => ipcRenderer.invoke("update:policy"),
  check: () => ipcRenderer.invoke("update:check"),
  download: () => ipcRenderer.invoke("update:download"),
  install: () => ipcRenderer.invoke("update:quitAndInstall"),

  // backward alias
  quitAndInstall: () => ipcRenderer.invoke("update:quitAndInstall")
};

// Keep BOTH names so old code doesn't break:
// - window.appAPI.update (new UI expects this)
// - window.updater (your older code might use this)
contextBridge.exposeInMainWorld("appAPI", { update: updateAPI });
contextBridge.exposeInMainWorld("updater", updateAPI);
