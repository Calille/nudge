import * as XLSX from "xlsx";
import fs from "node:fs";
import type { ColumnMapping, ImportResult } from "../../src/types";
import {
  createContact,
  recordImport,
  updateContact,
  upsertClientByName,
} from "../database/queries";
import { getDb } from "../database";

const EMAIL_RE =
  /^[^\s@<>"']+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function readSpreadsheet(filePath: string): {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
} {
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
  if (!raw.length) return { headers: [], rows: [], totalRows: 0 };
  const headers = (raw[0] as string[]).map((h) => String(h ?? "").trim());
  const bodyRows = raw.slice(1) as string[][];
  const rows: Record<string, string>[] = bodyRows.map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = String(r[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows, totalRows: rows.length };
}

export function autoMapColumns(headers: string[]): ColumnMapping {
  const lower = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const h = headers.map((x) => ({ original: x, key: lower(x) }));
  const pick = (candidates: string[]): string | undefined => {
    for (const c of candidates) {
      const match = h.find((x) => x.key === c || x.key.includes(c));
      if (match) return match.original;
    }
    return undefined;
  };

  return {
    client_name:
      pick(["clientname", "company", "companyname", "organisation", "organization", "school", "client"]) ??
      undefined,
    name: pick(["contactname", "fullname", "name"]) ?? headers[0] ?? "",
    email:
      pick(["email", "emailaddress", "contactemail", "mail"]) ??
      headers[1] ??
      "",
    role: pick(["role", "title", "jobtitle", "position"]),
    phone: pick(["phone", "mobile", "tel", "telephone", "contactnumber"]),
    notes: pick(["notes", "comments", "description"]),
    tags: pick(["tags", "labels"]),
  };
}

export function importRows(
  filename: string,
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  skipRows: Set<number> = new Set()
): ImportResult {
  const db = getDb();
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];

  const txn = db.transaction((allRows: Record<string, string>[]) => {
    allRows.forEach((row, idx) => {
      const humanRow = idx + 2; // account for header row
      if (skipRows.has(idx)) {
        skipped++;
        return;
      }
      const name = mapping.name ? row[mapping.name]?.trim() : "";
      const email = mapping.email
        ? row[mapping.email]?.trim().toLowerCase()
        : "";
      if (!name) {
        errors.push({ row: humanRow, message: "Missing name" });
        skipped++;
        return;
      }
      if (!email || !EMAIL_RE.test(email)) {
        errors.push({ row: humanRow, message: `Invalid email: "${email}"` });
        skipped++;
        return;
      }

      const clientName = mapping.client_name
        ? row[mapping.client_name]?.trim()
        : "";
      const client = clientName ? upsertClientByName(clientName) : null;

      const role = mapping.role ? row[mapping.role]?.trim() : null;
      const phone = mapping.phone ? row[mapping.phone]?.trim() : null;
      const notes = mapping.notes ? row[mapping.notes]?.trim() : null;
      const tagsRaw = mapping.tags ? row[mapping.tags]?.trim() : "";
      const tags = tagsRaw
        ? tagsRaw
            .split(/[,;|]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const existing = db
        .prepare("SELECT * FROM contacts WHERE email = ?")
        .get(email) as { id: number; tags: string } | undefined;

      if (existing) {
        const existingTags: string[] = (() => {
          try {
            return JSON.parse(existing.tags);
          } catch {
            return [];
          }
        })();
        const mergedTags = Array.from(new Set([...existingTags, ...tags]));
        updateContact(existing.id, {
          name,
          email,
          role: role || null,
          phone: phone || null,
          notes: notes || null,
          client_id: client?.id ?? null,
          tags: mergedTags,
        });
        updated++;
      } else {
        try {
          createContact({
            client_id: client?.id ?? null,
            name,
            email,
            role: role || null,
            phone: phone || null,
            notes: notes || null,
            tags,
          });
          imported++;
        } catch (err: any) {
          errors.push({ row: humanRow, message: err.message });
          skipped++;
        }
      }
    });
  });

  txn(rows);

  recordImport({
    filename,
    total_rows: rows.length,
    imported_count: imported,
    skipped_count: skipped,
    updated_count: updated,
    column_mapping: JSON.stringify(mapping),
  });

  return {
    total: rows.length,
    imported,
    updated,
    skipped,
    errors,
  };
}
