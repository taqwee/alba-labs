import { describe, expect, it } from "vitest";
import { validateUpload, buildStoragePath } from "@/lib/files";
import { sanitizeMetadata } from "@/lib/audit";
import { safeNextPath, slugify } from "@/lib/utils";
import { rateLimit } from "@/lib/utils/rate-limit";
import { contactSchema } from "@/lib/validation/schemas";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
const exe = Uint8Array.from([0x4d, 0x5a, 0x90, 0]);

describe("file validation", () => {
  it("accepts a real PNG", () => expect(validateUpload("logo.png", "image/png", png).ok).toBe(true));
  it("rejects disguised executables and mismatched MIME/extension", () => {
    expect(validateUpload("logo.png", "image/png", exe).ok).toBe(false);
    expect(validateUpload("logo.png", "application/pdf", png).ok).toBe(false);
    expect(validateUpload("run.exe", "application/octet-stream", exe).ok).toBe(false);
    expect(validateUpload("x.svg", "image/svg+xml", png).ok).toBe(false);
  });
  it("rejects empty and oversized files", () => {
    expect(validateUpload("a.png", "image/png", new Uint8Array()).ok).toBe(false);
    expect(validateUpload("a.png", "image/png", new Uint8Array(10 * 1024 * 1024 + 1)).ok).toBe(false);
  });
  it("builds safe storage paths scoped by customer", () => {
    const p = buildStoragePath("cust-1", "../../etc/pass wd.png");
    expect(p.startsWith("cust-1/")).toBe(true);
    expect(p).not.toContain("..");
    expect(p.split("/")).toHaveLength(2);
  });
});

describe("audit sanitising", () => {
  it("drops secret-like keys and truncates long values", () => {
    const out = sanitizeMetadata({ password: "x", accessToken: "y", nested: { api_key: "z", ok: 1 }, note: "a".repeat(400) });
    expect(out).not.toHaveProperty("password");
    expect(out).not.toHaveProperty("accessToken");
    expect(out.nested).toEqual({ ok: 1 });
    expect((out.note as string).length).toBeLessThan(310);
  });
});

describe("utils", () => {
  it("blocks open redirects", () => {
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
    expect(safeNextPath("/admin/leads")).toBe("/admin/leads");
  });
  it("slugifies", () => expect(slugify("Logo Design & Branding!")).toBe("logo-design-branding"));
  it("rate limits", () => {
    const k = "t" + Math.random();
    expect([1, 2, 3].map(() => rateLimit(k, 2, 1000).ok)).toEqual([true, true, false]);
  });
});

describe("contact validation", () => {
  const base = { name: "Ann", email: "ann@example.com", message: "I need a brand identity." };
  it("accepts minimal input", () => expect(contactSchema.safeParse(base).success).toBe(true));
  it("rejects bad email, short message, filled honeypot", () => {
    expect(contactSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, message: "hi" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, website: "http://spam" }).success).toBe(false);
  });
});
