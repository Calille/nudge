import { getSetting, setSetting } from "../database/queries";
import type { SenderDefaults } from "../../src/types";

const KEY = "sender_defaults";

const DEFAULTS: SenderDefaults = {
  from_name: "",
  reply_to: "",
  signature_html: "",
  company_name: "",
  phone: "",
  website: "",
};

export async function getSenderDefaults(): Promise<SenderDefaults> {
  const raw = getSetting(KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SenderDefaults>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function updateSenderDefaults(
  data: Partial<SenderDefaults>
): Promise<SenderDefaults> {
  const merged = { ...(await getSenderDefaults()), ...data };
  setSetting(KEY, JSON.stringify(merged));
  return merged;
}
