import { contextBridge, ipcRenderer } from "electron";
import type {
  Campaign,
  CampaignWithEmails,
  Client,
  ClientType,
  ClientTypeWithUsage,
  ClientWithContacts,
  ColumnMapping,
  Contact,
  ContactFilters,
  ContactWithRelations,
  CreateCampaign,
  CreateClientType,
  CreateStaff,
  CreateTemplate,
  EmailAccount,
  FileFilter,
  ImportResult,
  PaginatedResult,
  SenderDefaults,
  SendProgressEvent,
  Staff,
  StaffFilters,
  StrictImportResult,
  Template,
} from "../src/types";

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function invoke<T>(channel: string, ...args: any[]): Promise<T> {
  const res = (await ipcRenderer.invoke(channel, ...args)) as Envelope<T>;
  if (!res || res.success === false) {
    throw new Error(res?.error ?? `IPC call ${channel} failed`);
  }
  return res.data as T;
}

const api = {
  contacts: {
    previewSpreadsheet: (filePath: string) =>
      invoke<{ headers: string[]; rows: Record<string, string>[]; totalRows: number }>(
        "contacts:preview-spreadsheet",
        filePath
      ),
    importSpreadsheet: (
      filePath: string,
      mapping: ColumnMapping,
      options?: { skipRows?: number[] }
    ) =>
      invoke<ImportResult>(
        "contacts:import-spreadsheet",
        filePath,
        mapping,
        options
      ),
    getAll: (filters?: ContactFilters) =>
      invoke<PaginatedResult<Contact>>("contacts:list", filters),
    getById: (id: number) =>
      invoke<ContactWithRelations>("contacts:get", id),
    create: (data: any) => invoke<Contact>("contacts:create", data),
    update: (id: number, data: Partial<Contact>) =>
      invoke<Contact>("contacts:update", id, data),
    delete: (ids: number[]) => invoke<void>("contacts:delete", ids),
    bulkTag: (ids: number[], tags: string[], action: "add" | "remove") =>
      invoke<void>("contacts:bulk-tag", ids, tags, action),
    allTags: () => invoke<string[]>("contacts:all-tags"),
    setClientTypes: (contactId: number, clientTypeIds: number[]) =>
      invoke<void>("contacts:setClientTypes", contactId, clientTypeIds),
    importStrict: (filePath: string) =>
      invoke<StrictImportResult>("contacts:import", filePath),
  },
  clientTypes: {
    list: () => invoke<ClientTypeWithUsage[]>("clientTypes:list"),
    create: (data: CreateClientType) =>
      invoke<ClientType>("clientTypes:create", data),
    update: (id: number, data: Partial<CreateClientType>) =>
      invoke<ClientType>("clientTypes:update", id, data),
    affectedCount: (id: number) =>
      invoke<number>("clientTypes:affectedCount", id),
    delete: (id: number) =>
      invoke<{ affected_contacts: number }>("clientTypes:delete", id),
  },
  clients: {
    getAll: () =>
      invoke<Array<Client & { contact_count: number; staff_count: number }>>(
        "clients:all"
      ),
    getWithContacts: (id: number) =>
      invoke<ClientWithContacts>("clients:get", id),
    update: (id: number, data: Partial<Client>) =>
      invoke<Client>("clients:update", id, data),
  },
  staff: {
    getAll: (filters?: StaffFilters) =>
      invoke<Staff[]>("staff:list", filters),
    getById: (id: number) => invoke<Staff>("staff:get", id),
    create: (data: CreateStaff) => invoke<Staff>("staff:create", data),
    update: (id: number, data: Partial<Staff>) =>
      invoke<Staff>("staff:update", id, data),
    delete: (id: number) => invoke<void>("staff:delete", id),
    assignToContacts: (
      staffId: number,
      contactIds: number[],
      notes?: string
    ) => invoke<void>("staff:assign", staffId, contactIds, notes),
    unassignFromContact: (staffId: number, contactId: number) =>
      invoke<void>("staff:unassign", staffId, contactId),
    assignMultipleToContact: (contactId: number, staffIds: number[]) =>
      invoke<void>("staff:set-for-contact", contactId, staffIds),
  },
  templates: {
    getAll: () => invoke<Template[]>("templates:list"),
    getById: (id: number) => invoke<Template>("templates:get", id),
    create: (data: CreateTemplate) =>
      invoke<Template>("templates:create", data),
    update: (id: number, data: Partial<Template>) =>
      invoke<Template>("templates:update", id, data),
    delete: (id: number) => invoke<void>("templates:delete", id),
    duplicate: (id: number) => invoke<Template>("templates:duplicate", id),
    preview: (templateId: number, contactId: number | null) =>
      invoke<{ subject: string; html: string; text: string; missingFields: string[] }>(
        "templates:preview",
        templateId,
        contactId
      ),
    sendTest: (templateId: number, toEmail: string, contactId: number | null) =>
      invoke<void>("templates:send-test", templateId, toEmail, contactId),
  },
  campaigns: {
    getAll: () => invoke<Campaign[]>("campaigns:list"),
    getById: (id: number) =>
      invoke<CampaignWithEmails>("campaigns:get", id),
    create: (data: CreateCampaign) =>
      invoke<Campaign>("campaigns:create", data),
    send: (id: number) => invoke<void>("campaigns:send", id),
    schedule: (id: number, sendAt: string) =>
      invoke<void>("campaigns:schedule", id, sendAt),
    pause: (id: number) => invoke<void>("campaigns:pause", id),
    resume: (id: number) => invoke<void>("campaigns:resume", id),
    cancel: (id: number) => invoke<void>("campaigns:cancel", id),
    retryFailed: (id: number) => invoke<void>("campaigns:retry-failed", id),
    clone: (id: number) => invoke<Campaign>("campaigns:clone", id),
    delete: (id: number) => invoke<void>("campaigns:delete", id),
    onProgress: (callback: (p: SendProgressEvent) => void) => {
      const listener = (_e: unknown, progress: SendProgressEvent) =>
        callback(progress);
      ipcRenderer.on("campaigns:progress", listener);
      return () => ipcRenderer.removeListener("campaigns:progress", listener);
    },
  },
  settings: {
    connectGmail: () => invoke<EmailAccount>("settings:connect-gmail"),
    connectOutlook: () => invoke<EmailAccount>("settings:connect-outlook"),
    connectSmtp: (config: any) =>
      invoke<EmailAccount>("settings:connect-smtp", config),
    testSmtp: (config: any) =>
      invoke<{ ok: boolean; message: string }>("settings:test-smtp", config),
    disconnectAccount: (id: number) =>
      invoke<void>("settings:disconnect", id),
    setDefaultAccount: (id: number) =>
      invoke<void>("settings:set-default", id),
    getAccounts: () => invoke<EmailAccount[]>("settings:accounts"),
    getSenderDefaults: () =>
      invoke<SenderDefaults>("settings:get-sender-defaults"),
    updateSenderDefaults: (data: SenderDefaults) =>
      invoke<SenderDefaults>("settings:update-sender-defaults", data),
    isFirstRun: () => invoke<boolean>("settings:is-first-run"),
    completeFirstRun: () => invoke<void>("settings:complete-first-run"),
  },
  utils: {
    openFileDialog: (filters: FileFilter[]) =>
      invoke<string | null>("utils:open-file-dialog", filters),
    saveFileDialog: (defaultName: string, filters: FileFilter[]) =>
      invoke<string | null>("utils:save-file-dialog", defaultName, filters),
    writeFile: (path: string, contents: string) =>
      invoke<void>("utils:write-file", path, contents),
    showNotification: (title: string, body: string) => {
      ipcRenderer.invoke("utils:notify", title, body);
    },
    appInfo: () =>
      invoke<{ version: string; platform: string; userDataPath: string }>(
        "utils:app-info"
      ),
  },
};

contextBridge.exposeInMainWorld("api", api);

export type ExposedAPI = typeof api;
