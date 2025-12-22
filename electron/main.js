const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // DEV
  win.loadURL("http://localhost:5173");
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // ❌ File Edit View Help
  createWindow();
});
