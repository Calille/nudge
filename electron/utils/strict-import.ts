import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";
import type {
  StrictImportResult,
  StrictImportRowError,
} from "../../src/types";
import { UK_COUNTIES } from "../../src/lib/uk-counties";
import { getDb } from "../database";
import {
  createContact,
  listClientTypes,
  recordImport,
  setContactClientTypes,
  upsertClientByName,
} from "../database/queries";

const EMAIL_RE = /^[^\s@<>"']+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const COUNTY_SET = new Set<string>(UK_COUNTIES);

const REQUIRED_COLUMNS = ["email", "first_name", "last_name"] as const;
const KNOWN_OPTIONAL = [
  "company",
  "phone",
  "area",
  "client_types",
  "tags",
] as const;

type Header = (typeof REQUIRED_COLUMNS)[number] | (typeof KNOWN_OPTIONAL)[number];

interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

function readWorkbook(filePath: string): ParsedSheet {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("Spreadsheet contains no sheets");
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });
  if (!raw.length) return { headers: [], rows: [] };
  // Lower-case and trim headers per spec — header lookup is case-insensitive
  // but stored values are lowercased.
  const headers = (raw[0] as string[]).map((h) =>
    String(h ?? "").trim().toLowerCase()
  );
  const bodyRows = raw.slice(1) as string[][];
  const rows: Record<string, string>[] = bodyRows.map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = String(r[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}

function splitSemicolons(value: string): string[] {
  return value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function importContactsStrict(filePath: string): StrictImportResult {
  const db = getDb();
  const { headers, rows } = readWorkbook(filePath);

  // Whole-file reject: missing any required column.
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length) {
    throw new Error(
      `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`
    );
  }

  // Snapshot of valid client types for membership tests. Lookup is
  // case-insensitive but we resolve back to the canonical row.
  const knownTypes = listClientTypes();
  const typeByLower = new Map<string, number>(
    knownTypes.map((t) => [t.name.toLowerCase(), t.id])
  );

  const errors: StrictImportRowError[] = [];
  let imported = 0;
  let skipped = 0;

  // Single transaction. Validation failures are recorded as row-level
  // errors and the row is skipped; unexpected errors propagate and roll
  // the whole import back.
  const apply = db.transaction(() => {
    rows.forEach((row, idx) => {
      const humanRow = idx + 2; // +1 for header, +1 for 1-indexed

      const email = (row["email"] ?? "").toLowerCase();
      const firstName = row["first_name"] ?? "";
      const lastName = row["last_name"] ?? "";

      if (!email || !EMAIL_RE.test(email)) {
        errors.push({
          row: humanRow,
          reason: email ? `invalid email "${email}"` : "missing email",
        });
        skipped++;
        return;
      }

      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
      if (!fullName) {
        errors.push({
          row: humanRow,
          reason: "missing first_name and last_name",
        });
        skipped++;
        return;
      }

      const areaRaw = row["area"] ?? "";
      let area: string | null = null;
      if (areaRaw) {
        if (!COUNTY_SET.has(areaRaw)) {
          errors.push({
            row: humanRow,
            reason: `area "${areaRaw}" is not a recognised UK county`,
          });
          skipped++;
          return;
        }
        area = areaRaw;
      }

      const typesRaw = row["client_types"] ?? "";
      const typeNames = typesRaw ? splitSemicolons(typesRaw) : [];
      const resolvedTypeIds: number[] = [];
      let unknownType: string | null = null;
      for (const name of typeNames) {
        const id = typeByLower.get(name.toLowerCase());
        if (id === undefined) {
          unknownType = name;
          break;
        }
        if (!resolvedTypeIds.includes(id)) resolvedTypeIds.push(id);
      }
      if (unknownType !== null) {
        errors.push({
          row: humanRow,
          reason: `unknown client type "${unknownType}"`,
        });
        skipped++;
        return;
      }

      const dupRow = db
        .prepare("SELECT id FROM contacts WHERE email = ?")
        .get(email) as { id: number } | undefined;
      if (dupRow) {
        errors.push({
          row: humanRow,
          reason: `duplicate — ${email} already exists`,
        });
        skipped++;
        return;
      }

      const company = (row["company"] ?? "").trim();
      const client = company ? upsertClientByName(company) : null;

      const phone = (row["phone"] ?? "").trim() || null;
      const tagsRaw = row["tags"] ?? "";
      const tags = tagsRaw ? splitSemicolons(tagsRaw) : [];

      const created = createContact({
        client_id: client?.id ?? null,
        name: fullName,
        email,
        role: null,
        phone,
        notes: null,
        area,
        tags,
        is_active: 1,
      });

      if (resolvedTypeIds.length) {
        setContactClientTypes(created.id, resolvedTypeIds);
      }

      imported++;
    });
  });

  apply();

  recordImport({
    filename: path.basename(filePath),
    total_rows: rows.length,
    imported_count: imported,
    skipped_count: skipped,
    updated_count: 0,
    column_mapping: JSON.stringify({
      strict: true,
      headers,
      errors_count: errors.length,
    }),
  });

  return { imported, skipped, errors };
}

// Exposed so tests / callers know which headers the importer recognises
// without parsing the body of strict-import.
export const STRICT_HEADERS: Readonly<{
  required: readonly Header[];
  optional: readonly Header[];
}> = {
  required: REQUIRED_COLUMNS,
  optional: KNOWN_OPTIONAL,
};
