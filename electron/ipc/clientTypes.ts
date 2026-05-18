import {
  createClientType,
  deleteClientType,
  getClientTypeContactCount,
  listClientTypes,
  setContactClientTypes,
  updateClientType,
} from "../database/queries";
import { registerHandler } from "./helpers";
import type { CreateClientType } from "../../src/types";

export function registerClientTypeHandlers() {
  registerHandler("clientTypes:list", async () => listClientTypes());

  registerHandler(
    "clientTypes:create",
    async (_e, data: CreateClientType) => createClientType(data)
  );

  registerHandler(
    "clientTypes:update",
    async (_e, id: number, data: Partial<CreateClientType>) =>
      updateClientType(id, data)
  );

  registerHandler(
    "clientTypes:affectedCount",
    async (_e, id: number) => getClientTypeContactCount(id)
  );

  registerHandler(
    "clientTypes:delete",
    async (_e, id: number) => deleteClientType(id)
  );

  registerHandler(
    "contacts:setClientTypes",
    async (_e, contactId: number, clientTypeIds: number[]) => {
      setContactClientTypes(contactId, clientTypeIds);
    }
  );
}
