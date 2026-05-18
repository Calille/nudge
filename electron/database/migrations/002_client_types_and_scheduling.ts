import type Database from "better-sqlite3";

export const version = 2;
export const description =
  "Client types, contact areas, campaign filters and scheduling";

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        colour TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_client_types (
        contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        client_type_id INTEGER NOT NULL REFERENCES client_types(id) ON DELETE CASCADE,
        PRIMARY KEY (contact_id, client_type_id)
    );

    CREATE INDEX IF NOT EXISTS idx_contact_client_types_contact
        ON contact_client_types(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_client_types_type
        ON contact_client_types(client_type_id);

    ALTER TABLE contacts ADD COLUMN area TEXT;
    CREATE INDEX IF NOT EXISTS idx_contacts_area ON contacts(area);

    ALTER TABLE campaigns ADD COLUMN schedule_type TEXT;
    ALTER TABLE campaigns ADD COLUMN recurrence_pattern TEXT;
    ALTER TABLE campaigns ADD COLUMN next_run_at TEXT;
    ALTER TABLE campaigns ADD COLUMN last_run_at TEXT;
    ALTER TABLE campaigns ADD COLUMN is_active INTEGER DEFAULT 1;

    CREATE INDEX IF NOT EXISTS idx_campaigns_next_run
        ON campaigns(next_run_at) WHERE is_active = 1;

    CREATE TABLE IF NOT EXISTS campaign_filters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        filter_type TEXT NOT NULL CHECK (filter_type IN ('client_type','area')),
        filter_value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_filters_campaign
        ON campaign_filters(campaign_id);
  `);
}
