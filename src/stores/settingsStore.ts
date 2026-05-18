import { create } from "zustand";
import type { EmailAccount, SenderDefaults } from "@/types";

interface SettingsState {
  accounts: EmailAccount[];
  defaults: SenderDefaults;
  isFirstRun: boolean;
  loading: boolean;
  load: () => Promise<void>;
}

const EMPTY_DEFAULTS: SenderDefaults = {
  from_name: "",
  reply_to: "",
  signature_html: "",
  company_name: "",
  phone: "",
  website: "",
};

export const useSettingsStore = create<SettingsState>((set) => ({
  accounts: [],
  defaults: EMPTY_DEFAULTS,
  isFirstRun: false,
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const [accounts, defaults, isFirstRun] = await Promise.all([
        window.api.settings.getAccounts(),
        window.api.settings.getSenderDefaults(),
        window.api.settings.isFirstRun(),
      ]);
      set({ accounts, defaults, isFirstRun, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },
}));
