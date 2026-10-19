import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS, permissionsForRole } from "@/lib/permissions";
import { canAssignConversation, canReplyToConversation, canSeeInternalNotes, canViewConversation, type Actor } from "@/lib/permissions/access";

const actor = (role: Actor["role"], id: string, customerId: string | null = null, extra: string[] = []): Actor => ({
  id, role, customerId, permissions: permissionsForRole(role, extra as never),
});
const admin = actor("ADMIN", "admin");
const staff1 = actor("STAFF", "s1");
const staff2 = actor("STAFF", "s2");
const custA = actor("CUSTOMER", "ua", "ca");
const custB = actor("CUSTOMER", "ub", "cb");
const convA = { customerId: "ca", assignedTo: "s1", channel: "WEBSITE" as const };
const convUnassigned = { customerId: "cb", assignedTo: null, channel: "WHATSAPP" as const };

describe("role matrix", () => {
  it("admin has every permission", () => expect(new Set(ROLE_PERMISSIONS.ADMIN)).toEqual(new Set(PERMISSIONS)));
  it("staff cannot manage staff, settings, services or assign", () => {
    for (const p of ["staff.manage", "settings.manage", "service.manage", "conversation.assign", "conversation.manage", "audit.read", "lead.read"] as const)
      expect(ROLE_PERMISSIONS.STAFF).not.toContain(p);
  });
  it("customers hold no operational permissions, even if extras are passed", () => {
    expect(permissionsForRole("CUSTOMER", ["conversation.manage"]).size).toBe(0);
    expect(permissionsForRole(null).size).toBe(0);
  });
  it("matches the SQL migration exactly", () => {
    const sql = readFileSync("supabase/migrations/0002_permissions_and_functions.sql", "utf8");
    for (const p of PERMISSIONS) expect(sql).toContain(`('${p}',`);
    for (const p of ROLE_PERMISSIONS.STAFF) expect(sql).toContain(`('STAFF','${p}')`);
    const staffRows = sql.match(/\('STAFF','[a-z.]+'\)/g) ?? [];
    expect(staffRows.length).toBe(ROLE_PERMISSIONS.STAFF.length);
  });
});

describe("conversation access", () => {
  it("admin can view anything but cannot reply unless assigned", () => {
    expect(canViewConversation(admin, convA)).toBe(true);
    expect(canReplyToConversation(admin, convA)).toBe(false);
    expect(canReplyToConversation(admin, { ...convA, assignedTo: "admin" })).toBe(true);
  });
  it("staff see only their assigned conversations", () => {
    expect(canViewConversation(staff1, convA)).toBe(true);
    expect(canViewConversation(staff2, convA)).toBe(false);
    expect(canViewConversation(staff1, convUnassigned)).toBe(false);
    expect(canReplyToConversation(staff2, convA)).toBe(false);
  });
  it("customer A cannot see customer B's conversation", () => {
    expect(canViewConversation(custA, convA)).toBe(true);
    expect(canViewConversation(custB, convA)).toBe(false);
    expect(canViewConversation(custA, { ...convA, channel: "INTERNAL" })).toBe(false);
  });
  it("customers never see internal notes or reply as staff", () => {
    expect(canSeeInternalNotes(custA, convA)).toBe(false);
    expect(canReplyToConversation(custA, convA)).toBe(false);
    expect(canSeeInternalNotes(staff2, convA)).toBe(false);
    expect(canSeeInternalNotes(staff1, convA)).toBe(true);
  });
  it("only holders of conversation.assign can assign", () => {
    expect(canAssignConversation(admin)).toBe(true);
    expect(canAssignConversation(staff1)).toBe(false);
    expect(canAssignConversation(actor("STAFF", "s3", null, ["conversation.assign"]))).toBe(true);
    expect(canAssignConversation(custA)).toBe(false);
  });
});
