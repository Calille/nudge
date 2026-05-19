import {
  deleteEmailAccount,
  getSetting,
  listEmailAccounts,
  setDefaultEmailAccount,
  setSetting,
} from "../database/queries";
import { registerHandler } from "./helpers";
import { connectOutlookAccount } from "../services/outlook";
import { connectSmtpAccount, testSmtp } from "../services/smtp";
import {
  getSenderDefaults,
  updateSenderDefaults,
} from "../services/sender-defaults";
import type { SenderDefaults } from "../../src/types";

const FIRST_RUN_KEY = "first_run_complete";

export function registerSettingsHandlers() {
  registerHandler("settings:connect-outlook", async () =>
    connectOutlookAccount()
  );
  registerHandler(
    "settings:connect-smtp",
    async (
      _e,
      config: {
        email: string;
        host: string;
        port: number;
        username: string;
        password: string;
        secure: boolean;
        display_name?: string;
      }
    ) =>
      connectSmtpAccount({
        email: config.email,
        display_name: config.display_name,
        config: {
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          secure: config.secure,
        },
      })
  );
  registerHandler(
    "settings:test-smtp",
    async (
      _e,
      config: {
        host: string;
        port: number;
        username: string;
        password: string;
        secure: boolean;
      }
    ) => testSmtp(config)
  );
  registerHandler("settings:accounts", async () => listEmailAccounts());
  registerHandler("settings:disconnect", async (_e, id: number) =>
    deleteEmailAccount(id)
  );
  registerHandler("settings:set-default", async (_e, id: number) =>
    setDefaultEmailAccount(id)
  );
  registerHandler("settings:get-sender-defaults", async () =>
    getSenderDefaults()
  );
  registerHandler(
    "settings:update-sender-defaults",
    async (_e, data: SenderDefaults) => updateSenderDefaults(data)
  );
  registerHandler("settings:is-first-run", async () => {
    return getSetting(FIRST_RUN_KEY) !== "1";
  });
  registerHandler("settings:complete-first-run", async () => {
    setSetting(FIRST_RUN_KEY, "1");
  });
}
