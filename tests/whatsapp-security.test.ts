import { describe, expect, it } from "vitest";
import { signBody, verifyMetaSignature } from "@/lib/whatsapp/signature";
import { replyWindow } from "@/lib/whatsapp/window";
import { webhookPayloadSchema, extractEvents } from "@/lib/whatsapp/parse";

const SECRET = "test-app-secret";
const body = JSON.stringify({ hello: "world" });

describe("webhook signature", () => {
  it("accepts a correct signature", () => expect(verifyMetaSignature(body, signBody(body, SECRET), SECRET)).toBe(true));
  it("rejects a wrong secret, tampered body, missing or malformed header", () => {
    expect(verifyMetaSignature(body, signBody(body, "other"), SECRET)).toBe(false);
    expect(verifyMetaSignature(body + " ", signBody(body, SECRET), SECRET)).toBe(false);
    expect(verifyMetaSignature(body, null, SECRET)).toBe(false);
    expect(verifyMetaSignature(body, "sha256=zz", SECRET)).toBe(false);
    expect(verifyMetaSignature(body, "md5=" + "a".repeat(64), SECRET)).toBe(false);
    expect(verifyMetaSignature(body, signBody(body, SECRET), "")).toBe(false);
  });
});

describe("24h reply window", () => {
  const now = new Date("2026-01-02T12:00:00Z");
  it("is open within 24h", () => expect(replyWindow("2026-01-01T13:00:00Z", now).mode).toBe("FREE_FORM"));
  it("requires a template after 24h or with no inbound", () => {
    expect(replyWindow("2026-01-01T11:00:00Z", now).mode).toBe("TEMPLATE_REQUIRED");
    expect(replyWindow(null, now).mode).toBe("TEMPLATE_REQUIRED");
  });
});

describe("payload parsing", () => {
  const payload = (v: unknown) => webhookPayloadSchema.safeParse(v);
  it("rejects payloads from other objects", () => expect(payload({ object: "page", entry: [] }).success).toBe(false));
  it("extracts messages and statuses with idempotency keys", () => {
    const parsed = payload({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: {
        contacts: [{ wa_id: "911", profile: { name: "Ann" } }],
        messages: [{ id: "wamid.1", from: "911", timestamp: "1700000000", type: "text", text: { body: "hi" } },
                   { id: "wamid.2", from: "911", type: "image", image: { caption: "logo" } }],
        statuses: [{ id: "wamid.9", status: "read", timestamp: "1700000001" }, { id: "wamid.9", status: "failed", errors: [{ code: 131047, title: "Re-engagement" }] }],
      } }] }],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const events = extractEvents(parsed.data);
    expect(events.map((e) => e.key)).toEqual(["msg:wamid.1", "msg:wamid.2", "status:wamid.9:read", "status:wamid.9:failed"]);
    expect(events[0]).toMatchObject({ kind: "message", text: "hi", profileName: "Ann" });
    expect(events[1]).toMatchObject({ text: "[image] logo" });
    expect(events[3]).toMatchObject({ kind: "status", status: "FAILED", error: "131047 Re-engagement" });
  });
});
