import Database from "better-sqlite3";
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { CURRENT_SCHEMA_VERSION, SCHEMA_STATEMENTS } from "./schema";

let dbInstance: Database.Database | null = null;

export function getDbPath(): string {
  const userData = app.getPath("userData");
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  return path.join(userData, "nudgemail.sqlite");
}

export function getBackupDir(): string {
  const userData = app.getPath("userData");
  const dir = path.join(userData, "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function backupDatabase(): void {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return;
  const dir = getBackupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(dir, `nudgemail-${stamp}.sqlite`);
  try {
    fs.copyFileSync(dbPath, dest);
  } catch (err) {
    console.error("[db] backup failed", err);
    return;
  }
  const backups = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("nudgemail-") && f.endsWith(".sqlite"))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const old of backups.slice(5)) {
    try {
      fs.unlinkSync(path.join(dir, old.f));
    } catch {
      // ignore cleanup failures
    }
  }
}

export function initDatabase(): Database.Database {
  if (dbInstance) return dbInstance;

  backupDatabase();
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec("BEGIN");
  try {
    for (const stmt of SCHEMA_STATEMENTS) db.exec(stmt);

    const versionRow = db
      .prepare("SELECT version FROM schema_version LIMIT 1")
      .get() as { version: number } | undefined;

    if (!versionRow) {
      db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(
        CURRENT_SCHEMA_VERSION
      );
    } else if (versionRow.version < CURRENT_SCHEMA_VERSION) {
      // Placeholder for future migrations — each migration should be idempotent.
      db.prepare("UPDATE schema_version SET version = ?").run(
        CURRENT_SCHEMA_VERSION
      );
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  dbInstance = db;
  return db;
}

export function getDb(): Database.Database {
  if (!dbInstance) return initDatabase();
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
