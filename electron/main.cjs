const { app, BrowserWindow, globalShortcut } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: "#0f172a",
    autoHideMenuBar: true, // скрывает меню
    webPreferences: {
      devTools: isDev, // в проде DevTools выключены
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // DEV: грузим Vite localhost
  // PROD: грузим dist/index.html
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  if (!isDev) {
    mainWindow.removeMenu();

    // Блокируем открытие DevTools хоткеями
    mainWindow.webContents.on("before-input-event", (event, input) => {
      const key = (input.key || "").toLowerCase();

      // F12
      if (key === "f12") {
        event.preventDefault();
      }

      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if (input.control && input.shift && ["i", "j", "c"].includes(key)) {
        event.preventDefault();
      }

      // Ctrl+R / F5 (перезагрузка)
      if ((input.control && key === "r") || key === "f5") {
        event.preventDefault();
      }
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  // На всякий случай глобально блокнем F12 в проде
  if (app.isPackaged) {
    globalShortcut.register("F12", () => {});
    globalShortcut.register("CommandOrControl+Shift+I", () => {});
    globalShortcut.register("CommandOrControl+Shift+J", () => {});
    globalShortcut.register("CommandOrControl+Shift+C", () => {});
    globalShortcut.register("CommandOrControl+R", () => {});
    globalShortcut.register("F5", () => {});
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
