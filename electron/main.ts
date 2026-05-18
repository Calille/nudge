import { BrowserWindow, Menu, app, shell } from "electron";
import path from "node:path";
import { initDatabase, closeDatabase } from "./database";
import { registerContactHandlers } from "./ipc/contacts";
import { registerClientHandlers } from "./ipc/clients";
import { registerStaffHandlers } from "./ipc/staff";
import { registerTemplateHandlers } from "./ipc/templates";
import { registerCampaignHandlers } from "./ipc/campaigns";
import { registerClientTypeHandlers } from "./ipc/clientTypes";
import { registerSettingsHandlers } from "./ipc/settings";
import { registerUtilHandlers } from "./ipc/utils";

const isDev = !app.isPackaged;

function registerAllIpc() {
  registerContactHandlers();
  registerClientHandlers();
  registerStaffHandlers();
  registerTemplateHandlers();
  registerCampaignHandlers();
  registerClientTypeHandlers();
  registerSettingsHandlers();
  registerUtilHandlers();
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0A0A0B",
    title: "NudgeMail",
    autoHideMenuBar: true,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });

  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  return win;
}

app.setName("NudgeMail");

app.whenReady().then(() => {
  initDatabase();
  registerAllIpc();

  if (process.platform === "darwin") {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: "appMenu" },
        { role: "editMenu" },
        { role: "viewMenu" },
        { role: "windowMenu" },
      ])
    );
  } else {
    Menu.setApplicationMenu(null);
  }

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  closeDatabase();
});
