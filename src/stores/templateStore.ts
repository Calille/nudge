import { create } from "zustand";
import type { Template } from "@/types";

interface TemplateState {
  templates: Template[];
  loading: boolean;
  load: () => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const templates = await window.api.templates.getAll();
      set({ templates, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },
}));
