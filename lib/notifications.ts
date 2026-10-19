import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/env";

export type NotificationType =
  | "NEW_WHATSAPP_MESSAGE" | "NEW_ENQUIRY" | "CONVERSATION_ASSIGNED" | "CONVERSATION_REASSIGNED"
  | "NEW_STAFF_REPLY" | "NEW_CUSTOMER_MESSAGE" | "CUSTOMER_FILE_UPLOADED" | "TASK_ASSIGNED" | "PROJECT_UPDATED";

export interface NotificationInput { type: NotificationType; title: string; body?: string; link?: string }

export async function notify(recipientIds: string[], n: NotificationInput): Promise<void> {
  const unique = [...new Set(recipientIds.filter(Boolean))];
  if (unique.length === 0 || !isServiceRoleConfigured()) return;
  try {
    await createAdminSupabase().from("notifications").insert(
      unique.map((recipient_id) => ({
        recipient_id, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null,
      })),
    );
  } catch (error) {
    console.error("[notify] failed", error instanceof Error ? error.message : error);
  }
}

export async function activeAdminIds(): Promise<string[]> {
  if (!isServiceRoleConfigured()) return [];
  const { data } = await createAdminSupabase().from("profiles").select("id").eq("role", "ADMIN").eq("is_active", true);
  return (data ?? []).map((r: { id: string }) => r.id);
}
