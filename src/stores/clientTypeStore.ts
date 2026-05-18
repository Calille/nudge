import { create } from "zustand";
import type {
  ClientType,
  ClientTypeWithUsage,
  CreateClientType,
} from "@/types";

interface ClientTypeState {
  items: ClientTypeWithUsage[];
  loading: boolean;
  load: () => Promise<void>;
  create: (data: CreateClientType) => Promise<ClientType>;
  update: (id: number, data: Partial<CreateClientType>) => Promise<ClientType>;
  remove: (id: number) => Promise<{ affected_contacts: number }>;
  affectedCount: (id: number) => Promise<number>;
  byId: (id: number) => ClientTypeWithUsage | undefined;
}

export const useClientTypeStore = create<ClientTypeState>((set, get) => ({
  items: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const items = await window.api.clientTypes.list();
      set({ items });
    } finally {
      set({ loading: false });
    }
  },

  create: async (data) => {
    const created = await window.api.clientTypes.create(data);
    await get().load();
    return created;
  },

  update: async (id, data) => {
    const updated = await window.api.clientTypes.update(id, data);
    await get().load();
    return updated;
  },

  remove: async (id) => {
    const result = await window.api.clientTypes.delete(id);
    await get().load();
    return result;
  },

  affectedCount: async (id) => window.api.clientTypes.affectedCount(id),

  byId: (id) => get().items.find((t) => t.id === id),
}));
