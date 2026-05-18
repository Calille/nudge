import { create } from "zustand";

export type ViewId =
  | "dashboard"
  | "contacts"
  | "clients"
  | "templates"
  | "campaigns"
  | "staff"
  | "settings";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone?: "success" | "error" | "info" | "warning";
}

interface UIState {
  activeView: ViewId;
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  toasts: Toast[];
  setActiveView: (view: ViewId) => void;
  toggleSidebar: () => void;
  openCommand: () => void;
  closeCommand: () => void;
  pushToast: (t: Omit<Toast, "id"> & { id?: string }) => void;
  dismissToast: (id: string) => void;
  // Detail panel state
  contactDetailId: number | null;
  openContactDetail: (id: number) => void;
  closeContactDetail: () => void;

  editingTemplateId: number | "new" | null;
  openTemplateEditor: (id: number | "new") => void;
  closeTemplateEditor: () => void;

  campaignDetailId: number | null;
  openCampaignDetail: (id: number) => void;
  closeCampaignDetail: () => void;

  importWizardOpen: boolean;
  setImportWizardOpen: (open: boolean) => void;

  campaignBuilderOpen: boolean;
  setCampaignBuilderOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: "dashboard",
  sidebarCollapsed: false,
  commandOpen: false,
  toasts: [],

  setActiveView: (view) => set({ activeView: view }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openCommand: () => set({ commandOpen: true }),
  closeCommand: () => set({ commandOpen: false }),

  pushToast: (t) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        {
          id: t.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: t.title,
          description: t.description,
          tone: t.tone ?? "info",
        },
      ],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  contactDetailId: null,
  openContactDetail: (id) => set({ contactDetailId: id }),
  closeContactDetail: () => set({ contactDetailId: null }),

  editingTemplateId: null,
  openTemplateEditor: (id) => set({ editingTemplateId: id }),
  closeTemplateEditor: () => set({ editingTemplateId: null }),

  campaignDetailId: null,
  openCampaignDetail: (id) => set({ campaignDetailId: id }),
  closeCampaignDetail: () => set({ campaignDetailId: null }),

  importWizardOpen: false,
  setImportWizardOpen: (open) => set({ importWizardOpen: open }),

  campaignBuilderOpen: false,
  setCampaignBuilderOpen: (open) => set({ campaignBuilderOpen: open }),
}));

export function toast(input: Omit<Toast, "id">) {
  useUIStore.getState().pushToast(input);
}
