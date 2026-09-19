import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

/**
 * Uploaded files: case documents and client voice notes.
 *
 * Two rules, both of which exist because the name comes from outside:
 *
 *  - The name a file is *stored* under is generated here, never taken from
 *    the upload. A client-supplied name can contain "../", a null byte, or
 *    simply collide with someone else's file. The original is kept as a
 *    label in the database, where it is data rather than a path.
 *  - Nothing is served by joining a name onto a directory and hoping. Every
 *    read goes through `resolveStoredPath`, which refuses a path that lands
 *    outside the upload directory.
 */

const VOICE_DIR = "voice";
const DOCUMENT_DIR = "documents";

export type UploadKind = "voice" | "document";

const SUBDIR: Record<UploadKind, string> = {
  voice: VOICE_DIR,
  document: DOCUMENT_DIR,
};

/** The upload root, as an absolute path. */
export function uploadRoot(): string {
  return path.resolve(env.uploadDir);
}

export function uploadDirFor(kind: UploadKind): string {
  return path.join(uploadRoot(), SUBDIR[kind]);
}

/** Creates the upload directories if they are not there yet. */
export function ensureUploadDirs(): void {
  for (const kind of Object.keys(SUBDIR) as UploadKind[]) {
    fs.mkdirSync(uploadDirFor(kind), { recursive: true });
  }
}

/**
 * Only these extensions are ever written to disk, and the extension comes
 * from this allow-list rather than from the uploaded name.
 */
const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/m4a": ".m4a",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
};

/** The extension to store a recording under, or null if it is not audio. */
export function audioExtension(mimeType: string): string | null {
  return AUDIO_EXTENSIONS[mimeType.toLowerCase().split(";")[0]?.trim() ?? ""] ?? null;
}

/** An unguessable stored name. The id is the secret, not the path. */
export function generateStoredName(extension: string): string {
  return `${randomBytes(16).toString("hex")}${extension}`;
}

/**
 * The absolute path of a stored file, or null if the name would escape the
 * upload directory. Belt and braces: names are generated, so this should
 * never fire — but a stored name is still a string from the database, and a
 * path traversal is not a bug worth discovering in production.
 */
export function resolveStoredPath(kind: UploadKind, storedName: string): string | null {
  if (!storedName || storedName.includes("\0")) return null;

  const dir = uploadDirFor(kind);
  const resolved = path.resolve(dir, storedName);

  if (resolved !== path.join(dir, path.basename(resolved))) return null;
  if (!resolved.startsWith(dir + path.sep)) return null;

  return resolved;
}

/** The MIME type to serve a stored file as, from its extension. */
const CONTENT_TYPES: Record<string, string> = {
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
  ".wav": "audio/wav",
};

export function contentTypeFor(storedName: string): string {
  return CONTENT_TYPES[path.extname(storedName).toLowerCase()] ?? "application/octet-stream";
}
