import {
  allContactTags,
  bulkTagContacts,
  createContact,
  deleteContacts,
  getContactById,
  listClients,
  listContacts,
  updateContact,
} from "../database/queries";
import { importRows, readSpreadsheet } from "../utils/spreadsheet-parser";
import { importContactsStrict } from "../utils/strict-import";
import { registerHandler } from "./helpers";
import type { ColumnMapping, Contact, ContactFilters } from "../../src/types";

export function registerContactHandlers() {
  registerHandler(
    "contacts:preview-spreadsheet",
    async (_e, filePath: string) => readSpreadsheet(filePath)
  );

  registerHandler(
    "contacts:import-spreadsheet",
    async (
      _e,
      filePath: string,
      mapping: ColumnMapping,
      options?: { skipRows?: number[] }
    ) => {
      const { rows } = readSpreadsheet(filePath);
      const filename = filePath.split(/[\\/]/).pop() ?? "import.xlsx";
      const skipRows = new Set<number>(options?.skipRows ?? []);
      return importRows(filename, rows, mapping, skipRows);
    }
  );

  registerHandler("contacts:list", async (_e, filters?: ContactFilters) =>
    listContacts(filters ?? {})
  );

  registerHandler("contacts:get", async (_e, id: number) => getContactById(id));

  registerHandler(
    "contacts:create",
    async (
      _e,
      data: Omit<Contact, "id" | "created_at" | "updated_at"> & {
        tags: string[];
      }
    ) =>
      createContact({
        client_id: data.client_id ?? null,
        name: data.name,
        email: data.email,
        role: data.role ?? null,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
        area: data.area ?? null,
        tags: data.tags ?? [],
        is_active: data.is_active ?? 1,
      })
  );

  registerHandler(
    "contacts:update",
    async (_e, id: number, data: Partial<Contact>) => updateContact(id, data)
  );

  registerHandler("contacts:delete", async (_e, ids: number[]) =>
    deleteContacts(ids)
  );

  registerHandler(
    "contacts:bulk-tag",
    async (
      _e,
      ids: number[],
      tags: string[],
      action: "add" | "remove"
    ) => bulkTagContacts(ids, tags, action)
  );

  registerHandler("contacts:all-tags", async () => allContactTags());

  registerHandler("contacts:import", async (_e, filePath: string) =>
    importContactsStrict(filePath)
  );

  registerHandler("clients:list", async () => listClients());
}
