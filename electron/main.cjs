// src/electron/main.cjs
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

let mainWindow;

// ====== Logs ======
log.transports.file.level = "info";
autoUpdater.logger = log;

// ====== GitHub policy url ======
const GITHUB_OWNER = "msqwrst";
const GITHUB_REPO = "resale-helper-app";
const POLICY_BRANCH = "main";
const POLICY_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${POLICY_BRANCH}/src/electron/updatePolicy.json`;

// ====== Utils ======
function cmpVersion(a, b) {
  const pa = String(a).split(".").map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

function fetchJson(url, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const https = require("https");

    const req = https.get(
      url,
      { headers: { "User-Agent": "electron-app" } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
            }
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error("Policy fetch timeout")));
  });
}

// ====== Policy check ======
async function enforcePolicyIfNeeded() {
  const localPolicyPath = path.join(__dirname, "updatePolicy.json");

  let localPolicy = { minVersion: "0.0.0", force: false, message: "Нужно обновить приложение." };

  try {
    localPolicy = require(localPolicyPath);
  } catch (e) {
    log.warn("Local policy not found, using defaults:", String(e));
  }

  let policy = localPolicy;

  try {
    const remote = await fetchJson(POLICY_URL);
    if (remote && typeof remote === "object" && remote.minVersion) policy = remote;
  } catch (e) {
    log.warn("Policy fetch failed, using local policy:", String(e));
  }

  const current = app.getVersion();
  const needBlock = policy.force === true && cmpVersion(current, policy.minVersion) < 0;

  log.info("POLICY CHECK:", { current, policy, needBlock });

  return { policy, current, needBlock };
}

// ====== Send helper ======
function send(channel, payload) {
  try {
    mainWindow?.webContents?.send(channel, payload);
  } catch (e) {
    log.warn("send failed:", channel, String(e));
  }
}

// ====== Updater ======
function setupAutoUpdater() {
  // скачивает сам, но НЕ ставит сам (установку делаем по кнопке в UI)
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => send("update:checking"));
  autoUpdater.on("update-available", (info) => send("update:available", info));
  autoUpdater.on("update-not-available", (info) => send("update:none", info));
  autoUpdater.on("update-downloaded", (info) => send("update:downloaded", info));

  autoUpdater.on("download-progress", (p) => {
    send("update:progress", {
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond
    });
  });

  autoUpdater.on("error", (err) => {
    send("update:error", err?.message || String(err));
  });

  // check once on start + every 30 min
  safeCheckForUpdates();
  setInterval(safeCheckForUpdates, 30 * 60 * 1000);
}

function safeCheckForUpdates() {
  try {
    autoUpdater.checkForUpdates();
  } catch (e) {
    log.warn("checkForUpdates failed:", String(e));
  }
}

// ====== Window ======
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: "#0f172a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");
    log.info("Loading PROD index:", indexPath);
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.once("ready-to-show", async () => {
    mainWindow.show();

    // policy -> renderer (там будет твой красивый Update Overlay)
    const { policy, current, needBlock } = await enforcePolicyIfNeeded();
    send("update:policy", { policy, current, needBlock });

    // если force — сразу начинаем проверку/скачивание (оверлей появится сам в UI)
    if (needBlock) safeCheckForUpdates();
  });

  setupAutoUpdater();
}

// ====== IPC ======
ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("update:policy", async () => await enforcePolicyIfNeeded());

ipcMain.on("update:check", () => safeCheckForUpdates());

ipcMain.on("update:install", () => {
  try {
    // Установка по кнопке
    autoUpdater.quitAndInstall(true, true);
  } catch (e) {
    log.error("quitAndInstall failed:", String(e));
    send("update:error", String(e));
  }
});

// ====== App ======
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
