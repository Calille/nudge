import { app } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Logos are stored at userData/logos/. Filenames are content-hashed so
// repeated uploads dedupe automatically and there's no collision risk
// between templates. The DB only stores the bare filename so backups
// stay portable across machines.

const ALLOWED_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
]);
const MAX_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function logosDir(): string {
  const dir = path.join(app.getPath("userData"), "logos");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function uploadLogo(sourcePath: string): Promise<string> {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`File not found: ${sourcePath}`);
  }
  const ext = path.extname(sourcePath).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error(
      `Unsupported image format: ${ext || "(no extension)"}. Use PNG, JPG, GIF, WEBP or SVG.`
    );
  }
  const buf = await fs.promises.readFile(sourcePath);
  if (buf.length > MAX_BYTES) {
    throw new Error("Logo files are limited to 5 MB.");
  }
  const hash = crypto
    .createHash("sha1")
    .update(buf)
    .digest("hex")
    .slice(0, 16);
  const filename = `${hash}${ext}`;
  const dest = path.join(logosDir(), filename);
  if (!fs.existsSync(dest)) {
    await fs.promises.writeFile(dest, buf);
  }
  return filename;
}

// path.basename strips any directory components from the input so a
// malicious filename can't escape userData/logos/.
export function resolveLogoPath(filename: string | null): string | null {
  if (!filename) return null;
  const safe = path.basename(filename);
  const full = path.join(logosDir(), safe);
  return fs.existsSync(full) ? full : null;
}

export interface LogoAsset {
  buffer: Buffer;
  mime: string;
  filename: string;
}

export function readLogo(filename: string | null): LogoAsset | null {
  const full = resolveLogoPath(filename);
  if (!full) return null;
  const ext = path.extname(full).toLowerCase();
  return {
    buffer: fs.readFileSync(full),
    mime: MIME_BY_EXT[ext] ?? "application/octet-stream",
    filename: path.basename(full),
  };
}

export function logoDataUri(filename: string | null): string | null {
  const asset = readLogo(filename);
  if (!asset) return null;
  return `data:${asset.mime};base64,${asset.buffer.toString("base64")}`;
}
