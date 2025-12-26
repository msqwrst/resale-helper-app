// src/electron/main.cjs
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  Tray,
  nativeImage,
  shell,
  globalShortcut
} = require("electron");

const path = require("path");
const fs = require("fs");
const os = require("os");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const { fork } = require("child_process");


let mainWindow;
let tray = null;
let isQuiting = false;

// ====== Background services (backend + bot) ======
let backendProc = null;
let botProc = null;

function startChild(scriptAbs, name) {
  try {
    const child = fork(scriptAbs, [], {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
      env: {
        ...process.env,
        MHELPER_CHILD: "1",
        MHELPER_CHILD_NAME: name
      }
    });
    child.unref();
    return child;
  } catch (e) {
    try { log.warn(`Failed to start ${name}: ${e?.message || e}`); } catch { }
    return null;
  }
}

function startBackgroundServices() {
  if (backendProc || botProc) return;

  // __dirname = src/electron
  const backendPath = path.join(__dirname, "backend", "index.js");
  const botPath = path.join(__dirname, "backend", "bot.cjs");

  backendProc = startChild(backendPath, "backend");
  botProc = startChild(botPath, "bot");
}

function stopBackgroundServices() {
  const kill = (p) => {
    try {
      if (!p) return;
      p.kill();
    } catch { }
  };
  kill(backendProc);
  kill(botProc);
  backendProc = null;
  botProc = null;
}

// ====== App ID ======
const APP_ID = "com.mhelper.app";
if (process.platform === "win32") app.setAppUserModelId(APP_ID);

// ====== FIX: Chromium cache access denied (0x5) ======
try {
  const cacheDir = path.join(app.getPath("userData"), "Cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  app.setPath("cache", cacheDir);
  app.setPath("userCache", cacheDir);
  app.commandLine.appendSwitch("disk-cache-dir", cacheDir);
} catch {
  try {
    const tmpCache = path.join(os.tmpdir(), "mhelper-cache");
    fs.mkdirSync(tmpCache, { recursive: true });
    app.setPath("cache", tmpCache);
    app.setPath("userCache", tmpCache);
    app.commandLine.appendSwitch("disk-cache-dir", tmpCache);
  } catch { }
}

// ====== Logs ======
log.transports.file.level = "info";
autoUpdater.logger = log;

// ✅ BETA channel (only if env MHELPER_BETA=1)
autoUpdater.allowPrerelease = process.env.MHELPER_BETA === "1";
autoUpdater.allowDowngrade = false;
log.info("BETA MODE:", process.env.MHELPER_BETA === "1");



// ====== GitHub repo (policy only) ======
const GITHUB_OWNER = "msqwrst";
const GITHUB_REPO = "resale-helper-app";
const POLICY_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/src/electron/updatePolicy.json`;

// ====== Utils ======
function cmpVersion(a, b) {
  const pa = String(a || "0").split(".").map((x) => parseInt(x, 10) || 0);
  const pb = String(b || "0").split(".").map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

function getCurrentVersion() {
  try { return app.getVersion(); } catch { return "0.0.0"; }
}

// ====== Fetch policy json (safe) ======
async function fetchPolicy() {
  if (!POLICY_URL || typeof fetch !== "function") return null;

  const res = await fetch(POLICY_URL, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });

  if (!res.ok) throw new Error(`Policy fetch failed: ${res.status}`);
  const json = await res.json();
  return json ?? null;
}

// ====== Enforce update policy ======
async function enforcePolicyIfNeeded() {
  const current = getCurrentVersion();
  try {
    const policy = await fetchPolicy();
    const min = policy?.minVersion || "0.0.0";
    const needBlock = cmpVersion(current, min) < 0;
    return { policy, current, needBlock };
  } catch {
    return {
      policy: { message: "Не удалось загрузить политику обновлений." },
      current,
      needBlock: false
    };
  }
}

// ====== AutoUpdater (anti-loop + real download) ======
let updaterInited = false;

// Guards to prevent infinite "checking/downloading" loops
let isChecking = false;
let isDownloading = false;
let lastAvailableVersion = null;

let updateTimer = null;

async function safeCheckForUpdates() {
  if (!app.isPackaged) return null;
  if (isChecking) return null;
  isChecking = true;
  try {
    const r = await autoUpdater.checkForUpdates();
    return r?.updateInfo || null;
  } finally {
    isChecking = false;
  }
}

function startAutoUpdateLoop() {
  if (!app.isPackaged) return;
  if (updateTimer) return;

  // first check a bit after startup
  setTimeout(() => { safeCheckForUpdates().catch(() => { }); }, 2500);

  // then every 30 minutes
  updateTimer = setInterval(() => {
    safeCheckForUpdates().catch(() => { });
  }, 30 * 60 * 1000);
}

async function safeDownloadUpdate() {
  if (!app.isPackaged) return false;
  if (isDownloading) return false;
  isDownloading = true;
  try {
    await autoUpdater.downloadUpdate();
    return true;
  } finally {
    isDownloading = false;
  }
}

function setupAutoUpdater() {
  if (updaterInited) return;
  updaterInited = true;

  // Like old behavior: download automatically
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    try { log.info("Checking for update"); } catch { }
    try { mainWindow?.webContents?.send("update:checking"); } catch { }
  });

  autoUpdater.on("update-available", async (info) => {
    try { log.info("Update available", info); } catch { }
    try { mainWindow?.webContents?.send("update:available", info); } catch { }

    const v = String(info?.version || "");
    // prevent re-triggering download for the same version
    if (v && lastAvailableVersion === v && isDownloading) return;
    if (v) lastAvailableVersion = v;

    // IMPORTANT: actually start download (and only once)
    try {
      await safeDownloadUpdate();
    } catch (e) {
      try { mainWindow?.webContents?.send("update:error", String(e?.message || e)); } catch { }
    }
  });

  autoUpdater.on("update-not-available", (info) => {
    try { log.info("Update not available", info); } catch { }
    try { mainWindow?.webContents?.send("update:notAvailable", info); } catch { }
  });

  autoUpdater.on("download-progress", (p) => {
    try { mainWindow?.webContents?.send("update:progress", p); } catch { }
  });

  autoUpdater.on("update-downloaded", (info) => {
    isDownloading = false;
    try { mainWindow?.webContents?.send("update:downloaded", info); } catch { }
  });

  autoUpdater.on("error", (err) => {
    isDownloading = false;
    const msg = String(err?.message || err);
    try { log.error("Updater error:", msg); } catch { }
    try { mainWindow?.webContents?.send("update:error", msg); } catch { }
  });

  // IPC (keep for UI)
  ipcMain.handle("update:check", async () => {
    return await safeCheckForUpdates();
  });

  ipcMain.handle("update:download", async () => {
    // manual retry from UI
    return await safeDownloadUpdate();
  });

  ipcMain.handle("update:quitAndInstall", async () => {
    isQuiting = true;
    autoUpdater.quitAndInstall();
    return true;
  });

  // Start background auto-check loop
  startAutoUpdateLoop();
}

// ====== IPC: policy handler ======
let policyHandlerInited = false;
function setupPolicyHandler() {
  if (policyHandlerInited) return;
  policyHandlerInited = true;

  ipcMain.handle("update:policy", async () => {
    try {
      const { policy, current, needBlock } = await enforcePolicyIfNeeded();
      return { policy, current, needBlock };
    } catch {
      return { policy: null, current: getCurrentVersion(), needBlock: false };
    }
  });
}

// ====== Tray ======
// ====== Tray (FINAL FIX FOR WIN11) ======
function createTray() {
  if (tray) return;

  const trayPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "tray.png")
    : path.join(__dirname, "../../assets/tray.png");

  const img = nativeImage
    .createFromPath(trayPath)
    .resize({ width: 16, height: 16 });

  tray = new Tray(img);

  const showWindow = () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  };

  tray.setToolTip("MHELPER");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Открыть MHELPER", click: showWindow },
      { type: "separator" },
      {
        label: "Выход",
        click: () => {
          isQuiting = true;
          app.quit();
        }
      }
    ])
  );

  tray.on("click", showWindow);
}



// ====== Window ======
function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 800,
    backgroundColor: "#0f172a",
    show: false,
    autoHideMenuBar: true,
    title: "MHELPER",
    icon: path.join(__dirname, "../../build/icons/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      zoomFactor: 1.0
    }
  });

  mainWindow.on("page-title-updated", (e) => {
    e.preventDefault();
    mainWindow.setTitle("MHELPER");
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("close", (e) => {
    if (!isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // 🔁 Вот это строка ЗАМЕНИЛА условие isDev
  mainWindow.loadURL("https://resale-helper-app-1.onrender.com/");

  setupAutoUpdater();
  setupPolicyHandler();
  createTray();

  mainWindow.once("ready-to-show", async () => {
    mainWindow.center();
    mainWindow.show();

    const payload = await enforcePolicyIfNeeded();
    try { mainWindow.webContents.send("update:policy", payload); } catch { }

    if (payload.needBlock) {
      await dialog.showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["ОК"],
        title: "Требуется обновление",
        message: payload.policy?.message || "Нужно обновить приложение"
      });
    }
  });
}


// ====== lifecycle ======
app.whenReady().then(() => {
  startBackgroundServices();
  createWindow();

  if (!app.isPackaged) {
    try {
      globalShortcut.register("F12", () => {
        if (!mainWindow) return;
        if (mainWindow.webContents.isDevToolsOpened()) mainWindow.webContents.closeDevTools();
        else mainWindow.webContents.openDevTools({ mode: "detach" });
      });
    } catch { }
  }
});

app.on("before-quit", () => {
  isQuiting = true;
  stopBackgroundServices();
});

app.on("will-quit", () => {
  try { globalShortcut.unregisterAll(); } catch { }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});
