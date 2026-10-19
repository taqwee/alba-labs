/**
 * Role → permission matrix. Keep in sync with supabase/migrations/0002.
 * (tests/permissions.test.ts fails if they drift.)
 * The database is the final authority (RLS); this file drives UI and server checks.
 */
export const ROLES = ["ADMIN", "STAFF", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "conversation.read", "conversation.reply", "conversation.assign", "conversation.manage",
  "customer.read", "customer.manage",
  "staff.read", "staff.manage",
  "project.read", "project.update", "project.manage",
  "task.read", "task.update", "task.manage",
  "service.read", "service.manage",
  "portfolio.manage",
  "lead.read", "lead.manage",
  "whatsapp.manage",
  "settings.manage",
  "audit.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  STAFF: [
    "conversation.read", "conversation.reply",
    "customer.read",
    "project.read", "project.update",
    "task.read", "task.update",
  ],
  CUSTOMER: [],
};

export function permissionsForRole(role: Role | null | undefined, extra: readonly Permission[] = []): Set<Permission> {
  const base = role ? ROLE_PERMISSIONS[role] : [];
  return new Set<Permission>([...base, ...(role && role !== "CUSTOMER" ? extra : [])]);
}

export function can(granted: ReadonlySet<Permission>, permission: Permission): boolean {
  return granted.has(permission);
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
