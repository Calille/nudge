import { create } from "zustand";
import type {
  Campaign,
  CampaignFilters,
  CampaignSchedule,
  RecipientSummary,
} from "@/types";

interface CampaignState {
  campaigns: Campaign[];
  loading: boolean;
  load: () => Promise<void>;
  setFilters: (campaignId: number, filters: CampaignFilters) => Promise<void>;
  getFilters: (campaignId: number) => Promise<CampaignFilters>;
  resolveRecipients: (filters: CampaignFilters) => Promise<RecipientSummary[]>;
  schedule: (
    campaignId: number,
    schedule: CampaignSchedule | null
  ) => Promise<{ next_run_at: string | null }>;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
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

  setFilters: async (campaignId, filters) => {
    await window.api.campaigns.setFilters(campaignId, filters);
  },

  getFilters: (campaignId) => window.api.campaigns.getFilters(campaignId),

  resolveRecipients: (filters) =>
    window.api.campaigns.resolveRecipients(filters),

  schedule: async (campaignId, schedule) => {
    const result = await window.api.campaigns.schedule(campaignId, schedule);
    await get().load();
    return result;
  },
}));
