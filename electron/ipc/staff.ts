import {
  assignStaffToContacts,
  createStaff,
  deleteStaff,
  getStaffById,
  listStaff,
  setContactStaff,
  unassignStaffFromContact,
  updateStaff,
} from "../database/queries";
import { registerHandler } from "./helpers";
import type { CreateStaff, Staff, StaffFilters } from "../../src/types";

export function registerStaffHandlers() {
  registerHandler("staff:list", async (_e, filters?: StaffFilters) =>
    listStaff(filters ?? {})
  );
  registerHandler("staff:get", async (_e, id: number) => getStaffById(id));
  registerHandler("staff:create", async (_e, data: CreateStaff) =>
    createStaff(data)
  );
  registerHandler(
    "staff:update",
    async (_e, id: number, data: Partial<Staff>) => updateStaff(id, data)
  );
  registerHandler("staff:delete", async (_e, id: number) => deleteStaff(id));
  registerHandler(
    "staff:assign",
    async (_e, staffId: number, contactIds: number[], notes?: string) =>
      assignStaffToContacts(staffId, contactIds, notes)
  );
  registerHandler(
    "staff:unassign",
    async (_e, staffId: number, contactId: number) =>
      unassignStaffFromContact(staffId, contactId)
  );
  registerHandler(
    "staff:set-for-contact",
    async (_e, contactId: number, staffIds: number[]) =>
      setContactStaff(contactId, staffIds)
  );
}
