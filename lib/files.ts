import { randomUUID } from "node:crypto";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** extension -> allowed MIME types. Both must agree AND the file's magic bytes must match. */
const ALLOWED: Record<string, string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"], jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  zip: ["application/zip", "application/x-zip-compressed"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
};

function startsWith(bytes: Uint8Array, sig: number[], offset = 0) {
  return sig.every((b, i) => bytes[offset + i] === b);
}

/** Detects the real type from content, independent of what the client claims. */
export function sniffType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "zip"; // zip container (also docx/xlsx/pptx)
  return null;
}

export interface FileCheck { ok: boolean; error?: string; extension?: string; mime?: string }

export function validateUpload(name: string, claimedMime: string, bytes: Uint8Array): FileCheck {
  if (bytes.byteLength === 0) return { ok: false, error: "That file is empty." };
  if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, error: "Files can be up to 10 MB." };
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const allowedMimes = ALLOWED[extension];
  if (!allowedMimes) return { ok: false, error: "This file type is not allowed. Use images, PDF, Office files, TXT or ZIP." };
  if (!allowedMimes.includes(claimedMime)) return { ok: false, error: "The file type does not match its extension." };

  const sniffed = sniffType(bytes);
  const officeZip = ["docx", "xlsx", "pptx", "zip"].includes(extension);
  const expected = extension === "jpeg" ? "jpg" : officeZip ? "zip" : extension;
  if (extension === "txt") {
    // Plain text must not contain NUL bytes (binary disguised as text).
    if (bytes.subarray(0, 4096).includes(0)) return { ok: false, error: "The file content does not match its type." };
  } else if (sniffed !== expected) {
    return { ok: false, error: "The file content does not match its type." };
  }
  return { ok: true, extension, mime: allowedMimes[0] };
}

/** Storage path: <customerId>/<uuid>-<safe name>. Never trusts the client file name. */
export function buildStoragePath(customerId: string, originalName: string): string {
  const safe = originalName.normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/\.{2,}/g, ".").replace(/^\.+/, "").slice(-80) || "file";
  return `${customerId}/${randomUUID()}-${safe}`;
}
