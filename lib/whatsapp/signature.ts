import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies Meta's X-Hub-Signature-256 header ("sha256=<hex>") against the RAW request body.
 * Must be called with the exact bytes received — never a re-serialised JSON body.
 */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !appSecret) return false;
  const [scheme, provided] = header.split("=");
  if (scheme !== "sha256" || !provided || !/^[0-9a-f]{64}$/i.test(provided)) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  const actual = Buffer.from(provided, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signBody(rawBody: string, appSecret: string): string {
  return "sha256=" + createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
}
