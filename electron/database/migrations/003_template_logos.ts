import type Database from "better-sqlite3";

export const version = 3;
export const description = "Per-template logo filename";

export function up(db: Database.Database): void {
  db.exec(`ALTER TABLE templates ADD COLUMN logo_filename TEXT;`);
}
