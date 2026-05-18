import {
  getClientWithContacts,
  listClients,
  updateClient,
} from "../database/queries";
import { registerHandler } from "./helpers";
import type { Client } from "../../src/types";

export function registerClientHandlers() {
  registerHandler("clients:all", async () => listClients());
  registerHandler("clients:get", async (_e, id: number) =>
    getClientWithContacts(id)
  );
  registerHandler(
    "clients:update",
    async (_e, id: number, data: Partial<Client>) => updateClient(id, data)
  );
}
