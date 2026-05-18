import { ipcMain, type IpcMainInvokeEvent } from "electron";

export type Handler<Args extends any[], R> = (
  event: IpcMainInvokeEvent,
  ...args: Args
) => Promise<R> | R;

/**
 * Register an IPC handler that wraps the return value in a uniform
 * `{ success, data? | error? }` envelope so the renderer never crashes
 * on thrown errors.
 */
export function registerHandler<Args extends any[], R>(
  channel: string,
  handler: Handler<Args, R>
) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const data = await handler(event, ...(args as Args));
      return { success: true, data };
    } catch (err: any) {
      console.error(`[ipc] ${channel} failed`, err);
      return { success: false, error: err?.message ?? String(err) };
    }
  });
}
