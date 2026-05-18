import { create } from "zustand";
import type { Campaign } from "@/types";

interface CampaignState {
  campaigns: Campaign[];
  loading: boolean;
  load: () => Promise<void>;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  campaigns: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const campaigns = await window.api.campaigns.getAll();
      set({ campaigns, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },
}));
