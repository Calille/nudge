import { create } from "zustand";
import type { Client, Contact, ContactFilters } from "@/types";

interface ContactState {
  rows: Contact[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  filters: ContactFilters;
  selection: Set<number>;
  clients: Array<Client & { contact_count: number; staff_count: number }>;
  allTags: string[];

  setFilters: (f: Partial<ContactFilters>) => void;
  clearFilters: () => void;
  toggleSelect: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  load: () => Promise<void>;
  loadClients: () => Promise<void>;
  loadTags: () => Promise<void>;
}

export const useContactStore = create<ContactState>((set, get) => ({
  rows: [],
  total: 0,
  page: 1,
  pageSize: 50,
  loading: false,
  filters: { page: 1, pageSize: 50, sortBy: "name", sortDir: "asc" },
  selection: new Set<number>(),
  clients: [],
  allTags: [],

  setFilters: (f) =>
    set((s) => ({
      filters: { ...s.filters, ...f, page: f.page ?? 1 },
    })),
  clearFilters: () =>
    set({
      filters: { page: 1, pageSize: 50, sortBy: "name", sortDir: "asc" },
    }),

  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selection: next };
    }),
  selectAll: () =>
    set((s) => {
      const next = new Set<number>(s.selection);
      for (const r of s.rows) next.add(r.id);
      return { selection: next };
    }),
  clearSelection: () => set({ selection: new Set<number>() }),

  load: async () => {
    set({ loading: true });
    try {
      const res = await window.api.contacts.getAll(get().filters);
      set({
        rows: res.rows,
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
        loading: false,
      });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },

  loadClients: async () => {
    const clients = await window.api.clients.getAll();
    set({ clients });
  },

  loadTags: async () => {
    const allTags = await window.api.contacts.allTags();
    set({ allTags });
  },
}));
