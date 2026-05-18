import type {
  Campaign,
  CampaignFilters,
  CampaignPreview,
  CampaignSchedule,
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
  RecipientSummary,
  SendProgressEvent,
  SenderDefaults,
  Staff,
  StaffFilters,
  StrictImportResult,
  Template,
} from "./index";

export interface NudgeMailAPI {
  contacts: {
    importSpreadsheet(
      filePath: string,
      mapping: ColumnMapping,
      options?: { skipRows?: number[] }
    ): Promise<ImportResult>;
    previewSpreadsheet(
      filePath: string
    ): Promise<{ headers: string[]; rows: Record<string, string>[]; totalRows: number }>;
    getAll(filters?: ContactFilters): Promise<PaginatedResult<Contact>>;
    getById(id: number): Promise<ContactWithRelations>;
    create(
      data: Omit<Contact, "id" | "created_at" | "updated_at" | "tags"> & { tags: string[] }
    ): Promise<Contact>;
    update(id: number, data: Partial<Contact>): Promise<Contact>;
    delete(ids: number[]): Promise<void>;
    bulkTag(ids: number[], tags: string[], action: "add" | "remove"): Promise<void>;
    allTags(): Promise<string[]>;
    setClientTypes(contactId: number, clientTypeIds: number[]): Promise<void>;
    importStrict(filePath: string): Promise<StrictImportResult>;
  };

  clientTypes: {
    list(): Promise<ClientTypeWithUsage[]>;
    create(data: CreateClientType): Promise<ClientType>;
    update(id: number, data: Partial<CreateClientType>): Promise<ClientType>;
    affectedCount(id: number): Promise<number>;
    delete(id: number): Promise<{ affected_contacts: number }>;
  };

  clients: {
    getAll(): Promise<Array<Client & { contact_count: number; staff_count: number }>>;
    getWithContacts(id: number): Promise<ClientWithContacts>;
    update(id: number, data: Partial<Client>): Promise<Client>;
  };

  staff: {
    getAll(filters?: StaffFilters): Promise<Staff[]>;
    getById(id: number): Promise<Staff>;
    create(data: CreateStaff): Promise<Staff>;
    update(id: number, data: Partial<Staff>): Promise<Staff>;
    delete(id: number): Promise<void>;
    assignToContacts(
      staffId: number,
      contactIds: number[],
      notes?: string
    ): Promise<void>;
    unassignFromContact(staffId: number, contactId: number): Promise<void>;
    assignMultipleToContact(contactId: number, staffIds: number[]): Promise<void>;
  };

  templates: {
    getAll(): Promise<Template[]>;
    getById(id: number): Promise<Template>;
    create(data: CreateTemplate): Promise<Template>;
    update(id: number, data: Partial<Template>): Promise<Template>;
    delete(id: number): Promise<void>;
    duplicate(id: number): Promise<Template>;
    preview(
      templateId: number,
      contactId: number | null
    ): Promise<{ subject: string; html: string; text: string; missingFields: string[] }>;
    sendTest(templateId: number, toEmail: string, contactId: number | null): Promise<void>;
    uploadLogo(templateId: number, sourcePath: string): Promise<Template>;
    removeLogo(templateId: number): Promise<Template>;
    logoDataUri(templateId: number): Promise<string | null>;
  };

  campaigns: {
    getAll(): Promise<Campaign[]>;
    getById(id: number): Promise<CampaignWithEmails>;
    create(data: CreateCampaign): Promise<Campaign>;
    send(campaignId: number): Promise<void>;
    schedule(
      campaignId: number,
      schedule: CampaignSchedule | null
    ): Promise<{ next_run_at: string | null }>;
    pause(campaignId: number): Promise<void>;
    resume(campaignId: number): Promise<void>;
    cancel(campaignId: number): Promise<void>;
    retryFailed(campaignId: number): Promise<void>;
    clone(campaignId: number): Promise<Campaign>;
    delete(campaignId: number): Promise<void>;
    onProgress(callback: (progress: SendProgressEvent) => void): () => void;
    onScheduledRunStarted(
      callback: (e: { campaign_id: number; at: string }) => void
    ): () => void;
    onScheduledRunCompleted(
      callback: (e: { campaign_id: number; completed_at: string }) => void
    ): () => void;
    setFilters(campaignId: number, filters: CampaignFilters): Promise<void>;
    getFilters(campaignId: number): Promise<CampaignFilters>;
    resolveRecipients(filters: CampaignFilters): Promise<RecipientSummary[]>;
    preview(
      campaignId: number,
      sampleContactId?: number | null
    ): Promise<CampaignPreview>;
  };

  settings: {
    connectGmail(): Promise<EmailAccount>;
    connectOutlook(): Promise<EmailAccount>;
    connectSmtp(config: {
      email: string;
      host: string;
      port: number;
      username: string;
      password: string;
      secure: boolean;
      display_name?: string;
    }): Promise<EmailAccount>;
    testSmtp(config: {
      host: string;
      port: number;
      username: string;
      password: string;
      secure: boolean;
    }): Promise<{ ok: boolean; message: string }>;
    disconnectAccount(id: number): Promise<void>;
    setDefaultAccount(id: number): Promise<void>;
    getAccounts(): Promise<EmailAccount[]>;
    getSenderDefaults(): Promise<SenderDefaults>;
    updateSenderDefaults(data: SenderDefaults): Promise<void>;
    isFirstRun(): Promise<boolean>;
    completeFirstRun(): Promise<void>;
  };

  utils: {
    openFileDialog(filters: FileFilter[]): Promise<string | null>;
    saveFileDialog(defaultName: string, filters: FileFilter[]): Promise<string | null>;
    writeFile(path: string, contents: string): Promise<void>;
    showNotification(title: string, body: string): void;
    appInfo(): Promise<{ version: string; platform: string; userDataPath: string }>;
  };
}
