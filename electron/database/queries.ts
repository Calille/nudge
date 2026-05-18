import type Database from "better-sqlite3";
import type {
  Campaign,
  CampaignEmail,
  Client,
  ClientType,
  ClientTypeWithUsage,
  Contact,
  ContactFilters,
  ContactWithRelations,
  CreateClientType,
  EmailAccount,
  PaginatedResult,
  Staff,
  StaffFilters,
  Template,
} from "../../src/types";
import { getDb } from "./index";

function safeJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapContact(row: any): Contact {
  return {
    id: row.id,
    client_id: row.client_id,
    client_name: row.client_name ?? undefined,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    notes: row.notes,
    area: row.area ?? null,
    tags: safeJson<string[]>(row.tags, []),
    is_active: row.is_active,
    last_emailed_at: row.last_emailed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapStaff(row: any): Staff {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    specialisms: safeJson<string[]>(row.specialisms, []),
    availability: row.availability,
    bio: row.bio,
    is_available: row.is_available,
    created_at: row.created_at,
  };
}

function mapTemplate(row: any): Template {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    body_mjml: row.body_mjml,
    body_html: row.body_html,
    body_text: row.body_text,
    merge_fields: safeJson<string[]>(row.merge_fields, []),
    category: row.category,
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    template_id: row.template_id,
    template_name: row.template_name ?? undefined,
    status: row.status,
    scheduled_at: row.scheduled_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    total_recipients: row.total_recipients,
    sent_count: row.sent_count,
    failed_count: row.failed_count,
    created_at: row.created_at,
  };
}

function touchContact(db: Database.Database, id: number) {
  db.prepare(
    "UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(id);
}

// -------------------- CLIENTS --------------------

export function upsertClientByName(name: string): Client {
  const db = getDb();
  const clean = name.trim();
  const existing = db
    .prepare("SELECT * FROM clients WHERE name = ?")
    .get(clean) as Client | undefined;
  if (existing) return existing;
  const info = db
    .prepare("INSERT INTO clients (name) VALUES (?)")
    .run(clean);
  return db
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(info.lastInsertRowid) as Client;
}

export function listClients() {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM contacts WHERE client_id = c.id) AS contact_count,
        (
          SELECT COUNT(DISTINCT cs.staff_id)
          FROM contact_staff cs
          JOIN contacts ct ON ct.id = cs.contact_id
          WHERE ct.client_id = c.id
        ) AS staff_count
      FROM clients c
      ORDER BY c.name COLLATE NOCASE ASC
      `
    )
    .all() as Array<Client & { contact_count: number; staff_count: number }>;
}

export function getClientWithContacts(id: number) {
  const db = getDb();
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as
    | Client
    | undefined;
  if (!client) throw new Error("Client not found");
  const contacts = db
    .prepare(
      `SELECT co.*, cl.name AS client_name FROM contacts co LEFT JOIN clients cl ON cl.id = co.client_id WHERE co.client_id = ? ORDER BY co.name`
    )
    .all(id)
    .map(mapContact);
  const staffCountRow = db
    .prepare(
      `SELECT COUNT(DISTINCT cs.staff_id) AS c
       FROM contact_staff cs
       JOIN contacts ct ON ct.id = cs.contact_id
       WHERE ct.client_id = ?`
    )
    .get(id) as { c: number };
  return { ...client, contacts, staff_count: staffCountRow.c };
}

export function updateClient(id: number, data: Partial<Client>) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as
    | Client
    | undefined;
  if (!existing) throw new Error("Client not found");
  const merged = { ...existing, ...data };
  db.prepare(
    `UPDATE clients SET name = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(merged.name, merged.notes, id);
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as Client;
}

// -------------------- CLIENT TYPES --------------------

function mapClientType(row: any): ClientType {
  return {
    id: row.id,
    name: row.name,
    colour: row.colour,
    created_at: row.created_at,
  };
}

export function listClientTypes(): ClientTypeWithUsage[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ct.*, (
         SELECT COUNT(*) FROM contact_client_types cct WHERE cct.client_type_id = ct.id
       ) AS contact_count
       FROM client_types ct
       ORDER BY ct.name COLLATE NOCASE ASC`
    )
    .all() as any[];
  return rows.map((r) => ({ ...mapClientType(r), contact_count: r.contact_count }));
}

export function getClientType(id: number): ClientType {
  const db = getDb();
  const row = db.prepare("SELECT * FROM client_types WHERE id = ?").get(id);
  if (!row) throw new Error("Client type not found");
  return mapClientType(row);
}

export function getClientTypeContactCount(id: number): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) AS c FROM contact_client_types WHERE client_type_id = ?"
    )
    .get(id) as { c: number };
  return row.c;
}

export function createClientType(data: CreateClientType): ClientType {
  const db = getDb();
  const clean = data.name.trim();
  if (!clean) throw new Error("Client type name is required");
  const info = db
    .prepare("INSERT INTO client_types (name, colour) VALUES (?, ?)")
    .run(clean, data.colour ?? null);
  return getClientType(Number(info.lastInsertRowid));
}

export function updateClientType(
  id: number,
  data: Partial<CreateClientType>
): ClientType {
  const db = getDb();
  const existing = getClientType(id);
  const merged = { ...existing, ...data };
  const cleanName = merged.name.trim();
  if (!cleanName) throw new Error("Client type name is required");
  db.prepare("UPDATE client_types SET name = ?, colour = ? WHERE id = ?").run(
    cleanName,
    merged.colour ?? null,
    id
  );
  return getClientType(id);
}

export function deleteClientType(id: number): { affected_contacts: number } {
  const db = getDb();
  const affected = getClientTypeContactCount(id);
  db.prepare("DELETE FROM client_types WHERE id = ?").run(id);
  return { affected_contacts: affected };
}

export function getClientTypesForContact(contactId: number): ClientType[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ct.* FROM client_types ct
       JOIN contact_client_types cct ON cct.client_type_id = ct.id
       WHERE cct.contact_id = ?
       ORDER BY ct.name COLLATE NOCASE ASC`
    )
    .all(contactId) as any[];
  return rows.map(mapClientType);
}

export function findClientTypeByName(name: string): ClientType | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM client_types WHERE name = ? COLLATE NOCASE")
    .get(name.trim());
  return row ? mapClientType(row) : null;
}

export function setContactClientTypes(
  contactId: number,
  clientTypeIds: number[]
) {
  const db = getDb();
  const txn = db.transaction(() => {
    db.prepare(
      "DELETE FROM contact_client_types WHERE contact_id = ?"
    ).run(contactId);
    const ins = db.prepare(
      "INSERT OR IGNORE INTO contact_client_types (contact_id, client_type_id) VALUES (?, ?)"
    );
    for (const tid of clientTypeIds) ins.run(contactId, tid);
    touchContact(db, contactId);
  });
  txn();
}

// -------------------- CONTACTS --------------------

export function listContacts(
  filters: ContactFilters = {}
): PaginatedResult<Contact> {
  const db = getDb();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(500, filters.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];

  if (filters.search) {
    where.push(
      "(co.name LIKE ? OR co.email LIKE ? OR cl.name LIKE ? OR IFNULL(co.role,'') LIKE ?)"
    );
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }
  if (filters.client_ids && filters.client_ids.length) {
    where.push(
      `co.client_id IN (${filters.client_ids.map(() => "?").join(",")})`
    );
    params.push(...filters.client_ids);
  }
  if (filters.tags && filters.tags.length) {
    const tagWhere = filters.tags
      .map(() => "co.tags LIKE ?")
      .join(" OR ");
    where.push(`(${tagWhere})`);
    for (const t of filters.tags) params.push(`%"${t}"%`);
  }
  if (typeof filters.is_active === "boolean") {
    where.push("co.is_active = ?");
    params.push(filters.is_active ? 1 : 0);
  }
  if (filters.emailed === "never") {
    where.push("co.last_emailed_at IS NULL");
  } else if (filters.emailed === "recent") {
    where.push("co.last_emailed_at >= datetime('now', '-30 days')");
  } else if (filters.emailed === "stale") {
    where.push(
      "(co.last_emailed_at IS NULL OR co.last_emailed_at <= datetime('now', '-90 days'))"
    );
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sortColMap: Record<string, string> = {
    name: "co.name",
    email: "co.email",
    client: "cl.name",
    role: "co.role",
    last_emailed: "co.last_emailed_at",
  };
  const sortCol = sortColMap[filters.sortBy ?? "name"] ?? "co.name";
  const sortDir = filters.sortDir === "desc" ? "DESC" : "ASC";

  const rows = db
    .prepare(
      `
      SELECT co.*, cl.name AS client_name
      FROM contacts co
      LEFT JOIN clients cl ON cl.id = co.client_id
      ${whereClause}
      ORDER BY ${sortCol} COLLATE NOCASE ${sortDir}
      LIMIT ? OFFSET ?
      `
    )
    .all(...params, pageSize, offset) as any[];

  const total = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM contacts co LEFT JOIN clients cl ON cl.id = co.client_id ${whereClause}`
      )
      .get(...params) as { c: number }
  ).c;

  return {
    rows: rows.map(mapContact),
    total,
    page,
    pageSize,
  };
}

export function getContactById(id: number): ContactWithRelations {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT co.*, cl.name AS client_name FROM contacts co LEFT JOIN clients cl ON cl.id = co.client_id WHERE co.id = ?`
    )
    .get(id) as any;
  if (!row) throw new Error("Contact not found");
  const contact = mapContact(row);
  const client = row.client_id
    ? (db.prepare("SELECT * FROM clients WHERE id = ?").get(row.client_id) as Client)
    : null;
  const staffRows = db
    .prepare(
      `SELECT s.*, cs.notes AS assignment_notes FROM contact_staff cs
       JOIN staff s ON s.id = cs.staff_id
       WHERE cs.contact_id = ?
       ORDER BY s.name`
    )
    .all(id) as any[];
  const staff = staffRows.map((r) => ({
    ...mapStaff(r),
    assignment_notes: r.assignment_notes ?? null,
  }));
  const client_types = getClientTypesForContact(id);
  return { ...contact, client, staff, client_types };
}

export function createContact(data: {
  client_id: number | null;
  name: string;
  email: string;
  role?: string | null;
  phone?: string | null;
  notes?: string | null;
  area?: string | null;
  tags?: string[];
  is_active?: number;
}): Contact {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM contacts WHERE email = ?")
    .get(data.email.toLowerCase()) as { id: number } | undefined;
  if (existing) throw new Error("A contact with that email already exists");
  const info = db
    .prepare(
      `INSERT INTO contacts (client_id, name, email, role, phone, notes, area, tags, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.client_id,
      data.name,
      data.email.toLowerCase(),
      data.role ?? null,
      data.phone ?? null,
      data.notes ?? null,
      data.area ?? null,
      JSON.stringify(data.tags ?? []),
      data.is_active ?? 1
    );
  return getContactById(Number(info.lastInsertRowid));
}

export function updateContact(id: number, data: Partial<Contact>): Contact {
  const db = getDb();
  const existing = getContactById(id);
  const merged: Contact = { ...existing, ...data };
  db.prepare(
    `UPDATE contacts
     SET client_id = ?, name = ?, email = ?, role = ?, phone = ?, notes = ?, area = ?, tags = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    merged.client_id,
    merged.name,
    merged.email.toLowerCase(),
    merged.role,
    merged.phone,
    merged.notes,
    merged.area ?? null,
    JSON.stringify(merged.tags ?? []),
    merged.is_active,
    id
  );
  return getContactById(id);
}

export function deleteContacts(ids: number[]) {
  if (!ids.length) return;
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM contacts WHERE id IN (${placeholders})`).run(...ids);
}

export function bulkTagContacts(
  ids: number[],
  tags: string[],
  action: "add" | "remove"
) {
  if (!ids.length || !tags.length) return;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, tags FROM contacts WHERE id IN (${ids.map(() => "?").join(",")})`
    )
    .all(...ids) as Array<{ id: number; tags: string }>;
  const update = db.prepare("UPDATE contacts SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const txn = db.transaction(() => {
    for (const row of rows) {
      const current = new Set(safeJson<string[]>(row.tags, []));
      for (const t of tags) {
        if (action === "add") current.add(t);
        else current.delete(t);
      }
      update.run(JSON.stringify(Array.from(current)), row.id);
    }
  });
  txn();
}

export function allContactTags(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT tags FROM contacts").all() as Array<{
    tags: string;
  }>;
  const set = new Set<string>();
  for (const r of rows) {
    for (const t of safeJson<string[]>(r.tags, [])) set.add(t);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function markContactEmailed(contactId: number) {
  const db = getDb();
  db.prepare(
    "UPDATE contacts SET last_emailed_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(contactId);
}

// -------------------- STAFF --------------------

export function listStaff(filters: StaffFilters = {}): Staff[] {
  const db = getDb();
  const where: string[] = [];
  const params: any[] = [];
  if (filters.search) {
    where.push("(name LIKE ? OR IFNULL(role,'') LIKE ? OR IFNULL(bio,'') LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }
  if (filters.specialisms && filters.specialisms.length) {
    const sw = filters.specialisms.map(() => "specialisms LIKE ?").join(" OR ");
    where.push(`(${sw})`);
    for (const s of filters.specialisms) params.push(`%"${s}"%`);
  }
  if (filters.availability) {
    where.push("availability = ?");
    params.push(filters.availability);
  }
  if (typeof filters.is_available === "boolean") {
    where.push("is_available = ?");
    params.push(filters.is_available ? 1 : 0);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM staff ${whereClause} ORDER BY name COLLATE NOCASE`)
    .all(...params) as any[];
  return rows.map(mapStaff);
}

export function getStaffById(id: number): Staff {
  const db = getDb();
  const row = db.prepare("SELECT * FROM staff WHERE id = ?").get(id);
  if (!row) throw new Error("Staff not found");
  return mapStaff(row);
}

export function createStaff(data: {
  name: string;
  role?: string;
  specialisms?: string[];
  availability?: string;
  bio?: string;
  is_available?: number;
}): Staff {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO staff (name, role, specialisms, availability, bio, is_available)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.role ?? null,
      JSON.stringify(data.specialisms ?? []),
      data.availability ?? null,
      data.bio ?? null,
      data.is_available ?? 1
    );
  return getStaffById(Number(info.lastInsertRowid));
}

export function updateStaff(id: number, data: Partial<Staff>): Staff {
  const db = getDb();
  const existing = getStaffById(id);
  const merged = { ...existing, ...data };
  db.prepare(
    `UPDATE staff SET name = ?, role = ?, specialisms = ?, availability = ?, bio = ?, is_available = ? WHERE id = ?`
  ).run(
    merged.name,
    merged.role,
    JSON.stringify(merged.specialisms ?? []),
    merged.availability,
    merged.bio,
    merged.is_available,
    id
  );
  return getStaffById(id);
}

export function deleteStaff(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM staff WHERE id = ?").run(id);
}

export function assignStaffToContacts(
  staffId: number,
  contactIds: number[],
  notes?: string
) {
  if (!contactIds.length) return;
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO contact_staff (contact_id, staff_id, notes) VALUES (?, ?, ?)`
  );
  const txn = db.transaction(() => {
    for (const cid of contactIds) {
      stmt.run(cid, staffId, notes ?? null);
      touchContact(db, cid);
    }
  });
  txn();
}

export function unassignStaffFromContact(staffId: number, contactId: number) {
  const db = getDb();
  db.prepare(
    "DELETE FROM contact_staff WHERE staff_id = ? AND contact_id = ?"
  ).run(staffId, contactId);
  touchContact(db, contactId);
}

export function setContactStaff(contactId: number, staffIds: number[]) {
  const db = getDb();
  const txn = db.transaction(() => {
    db.prepare("DELETE FROM contact_staff WHERE contact_id = ?").run(contactId);
    const ins = db.prepare(
      `INSERT OR IGNORE INTO contact_staff (contact_id, staff_id) VALUES (?, ?)`
    );
    for (const sid of staffIds) ins.run(contactId, sid);
    touchContact(db, contactId);
  });
  txn();
}

// -------------------- TEMPLATES --------------------

export function listTemplates(): Template[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM templates ORDER BY updated_at DESC`)
    .all() as any[];
  return rows.map(mapTemplate);
}

export function getTemplateById(id: number): Template {
  const db = getDb();
  const row = db.prepare("SELECT * FROM templates WHERE id = ?").get(id);
  if (!row) throw new Error("Template not found");
  return mapTemplate(row);
}

export function createTemplate(data: {
  name: string;
  subject: string;
  body_mjml: string;
  body_html?: string;
  body_text?: string;
  merge_fields?: string[];
  category?: string;
}): Template {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO templates (name, subject, body_mjml, body_html, body_text, merge_fields, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.subject,
      data.body_mjml,
      data.body_html ?? null,
      data.body_text ?? null,
      JSON.stringify(data.merge_fields ?? []),
      data.category ?? null
    );
  return getTemplateById(Number(info.lastInsertRowid));
}

export function updateTemplate(id: number, data: Partial<Template>): Template {
  const db = getDb();
  const existing = getTemplateById(id);
  const merged = { ...existing, ...data };
  db.prepare(
    `UPDATE templates
     SET name = ?, subject = ?, body_mjml = ?, body_html = ?, body_text = ?, merge_fields = ?, category = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    merged.name,
    merged.subject,
    merged.body_mjml,
    merged.body_html,
    merged.body_text,
    JSON.stringify(merged.merge_fields ?? []),
    merged.category,
    id
  );
  return getTemplateById(id);
}

export function deleteTemplate(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM templates WHERE id = ?").run(id);
}

export function duplicateTemplate(id: number): Template {
  const original = getTemplateById(id);
  return createTemplate({
    name: `${original.name} (copy)`,
    subject: original.subject,
    body_mjml: original.body_mjml,
    body_html: original.body_html ?? undefined,
    body_text: original.body_text ?? undefined,
    merge_fields: original.merge_fields,
    category: original.category ?? undefined,
  });
}

// -------------------- CAMPAIGNS --------------------

export function listCampaigns(): Campaign[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*, t.name AS template_name
       FROM campaigns c
       LEFT JOIN templates t ON t.id = c.template_id
       ORDER BY c.created_at DESC`
    )
    .all() as any[];
  return rows.map(mapCampaign);
}

export function getCampaign(id: number): Campaign {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT c.*, t.name AS template_name FROM campaigns c LEFT JOIN templates t ON t.id = c.template_id WHERE c.id = ?`
    )
    .get(id) as any;
  if (!row) throw new Error("Campaign not found");
  return mapCampaign(row);
}

export function getCampaignEmails(id: number): CampaignEmail[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM campaign_emails WHERE campaign_id = ? ORDER BY id ASC`
    )
    .all(id) as CampaignEmail[];
}

export function createCampaign(data: {
  name: string;
  template_id: number;
  contact_ids: number[];
  scheduled_at?: string | null;
}) {
  const db = getDb();
  const status = data.scheduled_at ? "scheduled" : "draft";
  const info = db
    .prepare(
      `INSERT INTO campaigns (name, template_id, status, scheduled_at, total_recipients) VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.template_id,
      status,
      data.scheduled_at ?? null,
      data.contact_ids.length
    );
  const campaignId = Number(info.lastInsertRowid);

  const contactStmt = db.prepare(
    `SELECT co.*, cl.name AS client_name FROM contacts co LEFT JOIN clients cl ON cl.id = co.client_id WHERE co.id = ?`
  );
  const insertEmail = db.prepare(
    `INSERT INTO campaign_emails (campaign_id, contact_id, to_email, to_name, subject, body_html, body_text, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
  );
  const txn = db.transaction(() => {
    for (const cid of data.contact_ids) {
      const c = contactStmt.get(cid) as any;
      if (!c) continue;
      insertEmail.run(
        campaignId,
        cid,
        c.email,
        c.name,
        "", // subject populated at send time
        "",
        "",
      );
    }
  });
  txn();
  return getCampaign(campaignId);
}

export function updateCampaignStatus(id: number, status: string) {
  const db = getDb();
  db.prepare("UPDATE campaigns SET status = ? WHERE id = ?").run(status, id);
}

export function setCampaignTimestamps(
  id: number,
  fields: Partial<Pick<Campaign, "started_at" | "completed_at">>
) {
  const db = getDb();
  const sets: string[] = [];
  const params: any[] = [];
  if (fields.started_at !== undefined) {
    sets.push("started_at = ?");
    params.push(fields.started_at);
  }
  if (fields.completed_at !== undefined) {
    sets.push("completed_at = ?");
    params.push(fields.completed_at);
  }
  if (!sets.length) return;
  params.push(id);
  db.prepare(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = ?`).run(
    ...params
  );
}

export function incrementCampaignCounts(
  id: number,
  sent: number,
  failed: number
) {
  const db = getDb();
  db.prepare(
    `UPDATE campaigns SET sent_count = sent_count + ?, failed_count = failed_count + ? WHERE id = ?`
  ).run(sent, failed, id);
}

export function listPendingCampaignEmails(campaignId: number): CampaignEmail[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM campaign_emails WHERE campaign_id = ? AND status IN ('pending','failed') ORDER BY id ASC`
    )
    .all(campaignId) as CampaignEmail[];
}

export function updateCampaignEmail(
  id: number,
  data: Partial<CampaignEmail>
) {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM campaign_emails WHERE id = ?")
    .get(id) as CampaignEmail | undefined;
  if (!existing) return;
  const merged = { ...existing, ...data };
  db.prepare(
    `UPDATE campaign_emails SET subject = ?, body_html = ?, body_text = ?, status = ?, sent_at = ?, error_message = ?, message_id = ? WHERE id = ?`
  ).run(
    merged.subject,
    merged.body_html,
    (merged as any).body_text ?? null,
    merged.status,
    merged.sent_at,
    merged.error_message,
    merged.message_id,
    id
  );
}

export function deleteCampaign(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM campaigns WHERE id = ?").run(id);
}

// -------------------- EMAIL ACCOUNTS --------------------

function mapEmailAccount(row: any): EmailAccount {
  return {
    id: row.id,
    provider: row.provider,
    email: row.email,
    display_name: row.display_name,
    is_default: row.is_default,
    created_at: row.created_at,
  };
}

export function listEmailAccounts(): EmailAccount[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, provider, email, display_name, is_default, created_at FROM email_accounts ORDER BY is_default DESC, created_at DESC"
    )
    .all()
    .map(mapEmailAccount);
}

export function upsertEmailAccount(data: {
  provider: string;
  email: string;
  display_name?: string | null;
  auth_tokens?: Buffer | null;
  smtp_config?: string | null;
}): EmailAccount {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM email_accounts WHERE email = ?")
    .get(data.email) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE email_accounts
       SET provider = ?, display_name = ?, auth_tokens = COALESCE(?, auth_tokens), smtp_config = COALESCE(?, smtp_config)
       WHERE id = ?`
    ).run(
      data.provider,
      data.display_name ?? null,
      data.auth_tokens ?? null,
      data.smtp_config ?? null,
      existing.id
    );
    return getEmailAccount(existing.id)!;
  }

  const count = (
    db.prepare("SELECT COUNT(*) AS c FROM email_accounts").get() as {
      c: number;
    }
  ).c;
  const info = db
    .prepare(
      `INSERT INTO email_accounts (provider, email, display_name, auth_tokens, smtp_config, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.provider,
      data.email,
      data.display_name ?? null,
      data.auth_tokens ?? null,
      data.smtp_config ?? null,
      count === 0 ? 1 : 0
    );
  return getEmailAccount(Number(info.lastInsertRowid))!;
}

export function getEmailAccount(id: number): EmailAccount | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, provider, email, display_name, is_default, created_at FROM email_accounts WHERE id = ?"
    )
    .get(id);
  return row ? mapEmailAccount(row) : null;
}

export function getEmailAccountFull(id: number) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM email_accounts WHERE id = ?")
    .get(id) as
    | {
        id: number;
        provider: string;
        email: string;
        display_name: string | null;
        is_default: number;
        auth_tokens: Buffer | null;
        smtp_config: string | null;
        created_at: string;
      }
    | undefined;
}

export function getDefaultEmailAccountFull() {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM email_accounts WHERE is_default = 1 ORDER BY id LIMIT 1"
    )
    .get() as
    | {
        id: number;
        provider: string;
        email: string;
        display_name: string | null;
        auth_tokens: Buffer | null;
        smtp_config: string | null;
      }
    | undefined;
}

export function deleteEmailAccount(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM email_accounts WHERE id = ?").run(id);
  const anyDefault = db
    .prepare("SELECT id FROM email_accounts WHERE is_default = 1 LIMIT 1")
    .get();
  if (!anyDefault) {
    const first = db
      .prepare("SELECT id FROM email_accounts ORDER BY id LIMIT 1")
      .get() as { id: number } | undefined;
    if (first) {
      db.prepare("UPDATE email_accounts SET is_default = 1 WHERE id = ?").run(
        first.id
      );
    }
  }
}

export function setDefaultEmailAccount(id: number) {
  const db = getDb();
  const txn = db.transaction(() => {
    db.prepare("UPDATE email_accounts SET is_default = 0").run();
    db.prepare("UPDATE email_accounts SET is_default = 1 WHERE id = ?").run(id);
  });
  txn();
}

// -------------------- SETTINGS --------------------

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

export function recordImport(data: {
  filename: string;
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  updated_count: number;
  column_mapping: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO imports (filename, total_rows, imported_count, skipped_count, updated_count, column_mapping)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    data.filename,
    data.total_rows,
    data.imported_count,
    data.skipped_count,
    data.updated_count,
    data.column_mapping
  );
}
