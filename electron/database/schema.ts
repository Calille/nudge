export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
  );`,

  `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT,
      phone TEXT,
      notes TEXT,
      tags TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      last_emailed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);`,

  `CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      specialisms TEXT DEFAULT '[]',
      availability TEXT,
      bio TEXT,
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS contact_staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      notes TEXT,
      UNIQUE(contact_id, staff_id)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_contact_staff_contact ON contact_staff(contact_id);`,
  `CREATE INDEX IF NOT EXISTS idx_contact_staff_staff ON contact_staff(staff_id);`,

  `CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_mjml TEXT NOT NULL,
      body_html TEXT,
      body_text TEXT,
      merge_fields TEXT DEFAULT '[]',
      category TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'draft',
      scheduled_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      total_recipients INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS campaign_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      to_email TEXT NOT NULL,
      to_name TEXT,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME,
      error_message TEXT,
      message_id TEXT
  );`,

  `CREATE INDEX IF NOT EXISTS idx_campaign_emails_campaign ON campaign_emails(campaign_id);`,

  `CREATE TABLE IF NOT EXISTS email_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      is_default INTEGER DEFAULT 0,
      auth_tokens BLOB,
      smtp_config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      total_rows INTEGER,
      imported_count INTEGER,
      skipped_count INTEGER,
      updated_count INTEGER,
      column_mapping TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
  );`,

  `CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts5(
      name,
      email,
      role,
      client_name,
      notes,
      content='',
      tokenize='porter'
  );`,
];

export const CURRENT_SCHEMA_VERSION = 1;
