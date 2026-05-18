import { safeStorage } from "electron";

export function encryptJson(value: unknown): Buffer {
  const str = JSON.stringify(value);
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(str);
  }
  // Fallback: store as UTF-8 buffer prefixed with a sentinel so we know
  // it's not encrypted. Not ideal, but the environment did not provide
  // a keyring.
  return Buffer.concat([Buffer.from("PLAIN:"), Buffer.from(str, "utf8")]);
}

export function decryptJson<T = unknown>(buf: Buffer | null): T | null {
  if (!buf) return null;
  try {
    if (buf.slice(0, 6).toString() === "PLAIN:") {
      return JSON.parse(buf.slice(6).toString("utf8")) as T;
    }
    if (safeStorage.isEncryptionAvailable()) {
      return JSON.parse(safeStorage.decryptString(buf)) as T;
    }
  } catch (err) {
    console.error("[token-storage] failed to decrypt", err);
  }
  return null;
}
