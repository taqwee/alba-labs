import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client: BYPASSES RLS. Server only. Use it only after you have
 * checked the caller's permission yourself (webhooks, invites, signed URLs, audit log).
 */
export function createAdminSupabase(): SupabaseClient {
  if (cached) return cached;
  const key = serverEnv().serviceRoleKey;
  if (!publicEnv.supabaseUrl || !key) throw new Error("Service role key is not configured");
  cached = createClient(publicEnv.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
