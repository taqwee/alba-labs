import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export async function unreadCount(userId: string): Promise<number> {
  const { count } = await createServerSupabase().from("notifications")
    .select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null);
  return count ?? 0;
}
