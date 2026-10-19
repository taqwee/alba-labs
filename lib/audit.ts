import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/env";

/** Keys that must never be written to the audit log. */
const SECRET_KEY = /pass(word)?|token|secret|authorization|api[-_]?key|service[-_]?role/i;

export function sanitizeMetadata(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEY.test(key)) continue;
    if (typeof value === "string") out[key] = value.length > 300 ? value.slice(0, 300) + "…" : value;
    else if (value && typeof value === "object" && !Array.isArray(value)) out[key] = sanitizeMetadata(value as Record<string, unknown>);
    else out[key] = value;
  }
  return out;
}

export async function logActivity(entry: {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isServiceRoleConfigured()) return;
  try {
    await createAdminSupabase().from("activity_logs").insert({
      actor_id: entry.actorId,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: sanitizeMetadata(entry.metadata ?? {}),
    });
  } catch (error) {
    console.error("[audit] failed to write activity log", error instanceof Error ? error.message : error);
  }
}
