import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isPermission, permissionsForRole, type Permission, type Role } from "@/lib/permissions";
import type { Actor } from "@/lib/permissions/access";

export interface SessionUser extends Actor {
  email: string | null;
  fullName: string;
  isActive: boolean;
}

/** Returns the signed-in user with role + permissions, or null. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, is_active")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;

  const role = profile.role as Role;
  let customerId: string | null = null;
  let extra: Permission[] = [];

  if (role === "CUSTOMER") {
    const { data } = await supabase.from("customers").select("id").eq("profile_id", profile.id).maybeSingle();
    customerId = data?.id ?? null;
  } else {
    const { data } = await supabase.rpc("my_permissions");
    extra = ((data ?? []) as string[]).filter(isPermission);
  }

  return {
    id: profile.id,
    role,
    email: profile.email,
    fullName: profile.full_name,
    isActive: profile.is_active,
    customerId,
    permissions: role === "CUSTOMER" ? new Set() : new Set([...permissionsForRole(role), ...extra]),
  };
});

export function homePathFor(role: Role): string {
  return role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/customer";
}

/** Require any signed-in user of one of the given roles. Redirects otherwise. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(homePathFor(user.role));
  return user;
}

/** Require a specific permission. Redirects home if missing. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireRole("ADMIN", "STAFF");
  if (!user.permissions.has(permission)) redirect(homePathFor(user.role));
  return user;
}

/** For server actions: throws instead of redirecting. */
export class AuthorizationError extends Error {}
export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role === "CUSTOMER" || !user.permissions.has(permission)) {
    throw new AuthorizationError("You do not have permission to do that.");
  }
  return user;
}
export async function assertRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !roles.includes(user.role)) throw new AuthorizationError("You do not have permission to do that.");
  return user;
}
