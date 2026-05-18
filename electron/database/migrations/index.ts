import type Database from "better-sqlite3";
import * as m002 from "./002_client_types_and_scheduling";

export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

// Static import map — keeps migrations asar-safe in packaged builds
// (no fs.readdirSync). Each new migration is added here explicitly.
export const MIGRATIONS: Migration[] = [
  { version: m002.version, description: m002.description, up: m002.up },
];

export function getCurrentSchemaVersion(db: Database.Database): number {
  const row = db
    .prepare("SELECT version FROM schema_version LIMIT 1")
    .get() as { version: number } | undefined;
  return row?.version ?? 0;
}

export function runPendingMigrations(db: Database.Database): void {
  const current = getCurrentSchemaVersion(db);
  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pending) {
    const apply = db.transaction(() => {
      migration.up(db);
      db.prepare("UPDATE schema_version SET version = ?").run(migration.version);
    });
    try {
      apply();
      console.log(
        `[db] migrated to v${migration.version}: ${migration.description}`
      );
    } catch (err) {
      console.error(`[db] migration v${migration.version} failed`, err);
      throw err;
    }
  }
}
