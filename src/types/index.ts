export interface Client {
  id: number;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  client_id: number | null;
  client_name?: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  is_active: number;
  last_emailed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactWithRelations extends Contact {
  client: Client | null;
  staff: StaffAssignment[];
}

export interface StaffAssignment extends Staff {
  assignment_notes?: string | null;
}

export interface Staff {
  id: number;
  name: string;
  role: string | null;
  specialisms: string[];
  availability: string | null;
  bio: string | null;
  is_available: number;
  created_at: string;
}

export interface CreateStaff {
  name: string;
  role?: string;
  specialisms?: string[];
  availability?: string;
  bio?: string;
  is_available?: number;
}

export interface ClientWithContacts extends Client {
  contacts: Contact[];
  staff_count: number;
}

export interface Template {
  id: number;
  name: string;
  subject: string;
  body_mjml: string;
  body_html: string | null;
  body_text: string | null;
  merge_fields: string[];
  category: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplate {
  name: string;
  subject: string;
  body_mjml: string;
  body_html?: string;
  body_text?: string;
  merge_fields?: string[];
  category?: string;
}

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "completed"
  | "failed"
  | "paused"
  | "cancelled";

export interface Campaign {
  id: number;
  name: string;
  template_id: number | null;
  template_name?: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export interface CampaignEmail {
  id: number;
  campaign_id: number;
  contact_id: number | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  body_html: string;
  status: "pending" | "sent" | "failed" | "bounced" | "skipped";
  sent_at: string | null;
  error_message: string | null;
  message_id: string | null;
}

export interface CampaignWithEmails extends Campaign {
  emails: CampaignEmail[];
}

export interface CreateCampaign {
  name: string;
  template_id: number;
  contact_ids: number[];
  scheduled_at?: string | null;
}

export interface EmailAccount {
  id: number;
  provider: "gmail" | "outlook" | "smtp";
  email: string;
  display_name: string | null;
  is_default: number;
  created_at: string;
}

export interface SenderDefaults {
  from_name: string;
  reply_to: string;
  signature_html: string;
  company_name: string;
  phone: string;
  website: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
}

export interface ColumnMapping {
  client_name?: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  notes?: string;
  tags?: string;
}

export interface ContactFilters {
  search?: string;
  client_ids?: number[];
  tags?: string[];
  is_active?: boolean;
  emailed?: "never" | "recent" | "stale";
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "email" | "client" | "role" | "last_emailed";
  sortDir?: "asc" | "desc";
}

export interface StaffFilters {
  search?: string;
  specialisms?: string[];
  availability?: string;
  is_available?: boolean;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SendProgressEvent {
  campaign_id: number;
  total: number;
  sent: number;
  failed: number;
  current?: {
    contact_id: number | null;
    to_email: string;
    status: "sent" | "failed";
    error?: string;
  };
  done: boolean;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface MergeContext {
  client_name: string;
  contact_name: string;
  contact_first_name: string;
  contact_role: string;
  staff_list: string;
  staff_count: number;
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  company_name: string;
  current_date: string;
  unsubscribe_link: string;
  [key: string]: unknown;
}

export const MERGE_FIELDS: Array<{
  key: keyof MergeContext;
  label: string;
  description: string;
}> = [
  { key: "client_name", label: "Client Name", description: "Company or school name" },
  { key: "contact_name", label: "Contact Name", description: "Recipient's full name" },
  { key: "contact_first_name", label: "First Name", description: "Recipient's first name only" },
  { key: "contact_role", label: "Contact Role", description: "Job title of the recipient" },
  { key: "staff_list", label: "Staff List", description: "Formatted list of assigned staff" },
  { key: "staff_count", label: "Staff Count", description: "Number of assigned staff" },
  { key: "sender_name", label: "Sender Name", description: "Your full name" },
  { key: "sender_email", label: "Sender Email", description: "Your email address" },
  { key: "sender_phone", label: "Sender Phone", description: "Your phone number" },
  { key: "company_name", label: "Company Name", description: "Your company name" },
  { key: "current_date", label: "Today's Date", description: "Formatted current date" },
  { key: "unsubscribe_link", label: "Unsubscribe Link", description: "Unsubscribe placeholder" },
];
