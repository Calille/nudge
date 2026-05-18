import { BrowserWindow, Notification, app, dialog } from "electron";
import fs from "node:fs/promises";
import { registerHandler } from "./helpers";
import type { FileFilter } from "../../src/types";

export function registerUtilHandlers() {
  registerHandler(
    "utils:open-file-dialog",
    async (_e, filters: FileFilter[]) => {
      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const result = win
        ? await dialog.showOpenDialog(win, {
            properties: ["openFile"],
            filters,
          })
        : await dialog.showOpenDialog({
            properties: ["openFile"],
            filters,
          });
      if (result.canceled || !result.filePaths.length) return null;
      return result.filePaths[0];
    }
  );

  registerHandler(
    "utils:save-file-dialog",
    async (_e, defaultName: string, filters: FileFilter[]) => {
      const win = BrowserWindow.getFocusedWindow() ?? undefined;
      const result = win
        ? await dialog.showSaveDialog(win, {
            defaultPath: defaultName,
            filters,
          })
        : await dialog.showSaveDialog({
            defaultPath: defaultName,
            filters,
          });
      return result.canceled || !result.filePath ? null : result.filePath;
    }
  );

  registerHandler(
    "utils:write-file",
    async (_e, filePath: string, contents: string) => {
      await fs.writeFile(filePath, contents, "utf8");
    }
  );

  registerHandler(
    "utils:notify",
    async (_e, title: string, body: string) => {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
      }
    }
  );

  registerHandler("utils:app-info", async () => ({
    version: app.getVersion(),
    platform: process.platform,
    userDataPath: app.getPath("userData"),
  }));
}
