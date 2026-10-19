"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime and re-runs the page's server queries when rows change.
 * RLS still applies to realtime, so users only receive events for rows they may read.
 */
export function RealtimeRefresh({ table, filter }: { table: "messages" | "notifications" | "conversations"; filter?: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createBrowserSupabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`rt-${table}-${filter ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 300);
      })
      .subscribe();
    return () => { clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [table, filter, router]);
  return null;
}
