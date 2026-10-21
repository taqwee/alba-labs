"use client";

import { createBrowserSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabase();

  const handleSignOut = async () => {
    // 1. Tell Supabase to destroy the session
    await supabase.auth.signOut();
    
    // 2. Force a hard browser redirect to the homepage to clear all Next.js cache and server states
    window.location.href = "/";

  };

  return (
    <button 
      onClick={handleSignOut} 
      className={className || "text-sm font-medium text-muted hover:text-text transition-colors"}
    >
      Sign out
    </button>
  );
}