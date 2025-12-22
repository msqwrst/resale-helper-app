const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

let mainWindow;

// ====== Логи ======
log.transports.file.level = "info";
autoUpdater.logger = log;

// ====== ТВОИ ДАННЫЕ GITHUB (ЗАМЕНИ!) ======
const GITHUB_OWNER = "YOUR_GITHUB_NAME";
const GITHUB_REPO = "YOUR_REPO_NAME";

// updatePolicy.json мы будем читать не локально, а с GitHub (чтобы “админ” менял без пересборки)
const POLICY_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/src/electron/updatePolicy.json`;

// ====== Utils: сравнение версий 1.2.10 > 1.2.3 ======
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

// ====== Utils: fetch json (без доп.пакетов) ======
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const https = require("https");
    https
      .get(url, { headers: { "User-Agent": "electron-app" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// ====== UI блокировка при force update ======
async function enforcePolicyIfNeeded() {
  // локальная подстраховка (если GitHub недоступен)
  const localPolicyPath = path.join(__dirname, "updatePolicy.json");
  let localPolicy = { minVersion: "1.0.0", force: false, message: "Нужно обновить приложение." };
  try {
    localPolicy = require(localPolicyPath);
  } catch {}

  let policy = localPolicy;
  try {
    const remote = await fetchJson(POLICY_URL);
    if (remote?.minVersion) policy = remote;
  } catch (e) {
    log.warn("Policy fetch failed, using local policy:", String(e));
  }

  const current = app.getVersion();
  const needBlock = policy.force === true && cmpVersion(current, policy.minVersion) < 0;

  return { policy, current, needBlock };
}

// ====== Updater ======
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    mainWindow?.webContents.send("update:checking");
  });

  autoUpdater.on("update-available", (info) => {
    mainWindow?.webContents.send("update:available", info);
  });

  autoUpdater.on("update-not-available", (info) => {
    mainWindow?.webContents.send("update:none", info);
  });

  autoUpdater.on("update-downloaded", (info) => {
    mainWindow?.webContents.send("update:downloaded", info);
  });

  autoUpdater.on("error", (err) => {
    mainWindow?.webContents.send("update:error", err?.message || String(err));
  });

  // первая проверка + каждые 30 минут
  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000);
}

// ====== Окно ======
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: "#0f172a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  // грузим фронт (build)
  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));

  mainWindow.once("ready-to-show", async () => {
    mainWindow.show();

    // 1) Проверяем policy (force update)
    const { policy, current, needBlock } = await enforcePolicyIfNeeded();

    // Отдадим policy в renderer (если хочешь красиво отрисовать UI)
    mainWindow.webContents.send("update:policy", { policy, current, needBlock });

    // 2) Если нужно блокировать — показываем окно и сразу запускаем update check
    if (needBlock) {
      await dialog.showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["ОК"],
        defaultId: 0,
        title: "Требуется обновление",
        message: policy.message || "Нужно обновить приложение.",
        detail: `Текущая версия: ${current}\nМинимальная версия: ${policy.minVersion}`
      });

      // запускаем проверку и ждём, пока пользователь нажмёт "Обновить" (в UI)
      autoUpdater.checkForUpdates();
    }
  });

  setupAutoUpdater();
}

// ====== IPC ======
ipcMain.handle("app:getVersion", () => app.getVersion());

ipcMain.handle("update:policy", async () => {
  return await enforcePolicyIfNeeded();
});

ipcMain.on("update:install", () => {
  autoUpdater.quitAndInstall(true, true);
});

ipcMain.on("update:check", () => {
  autoUpdater.checkForUpdates();
});

// ====== App ======
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
