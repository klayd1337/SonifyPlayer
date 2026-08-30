const { app, BrowserWindow, ipcMain, Tray, Menu } = require("electron");
const path = require("path");

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,  
      contextIsolation: true,
      preload: path.join(__dirname, "js", "preload.js")
    }
  });

  mainWindow.loadFile("index.html");
  createTray();
  setupIpcHandlers();
}

function createTray() {
  
}

function setupIpcHandlers() {
  ipcMain.on("window-close", () => {
    app.quit();
  });
  
  ipcMain.on("window-minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });
  
  ipcMain.on("window-maximize", () => {
    if (mainWindow) {
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});