import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/** Anonymous client for public website content (no cookies => pages can be cached/ISR). RLS limits it to public rows. */
export function createPublicSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
