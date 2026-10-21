import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";

/** Email links and OAuth logins land here. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  
  if (isSupabaseConfigured() && code) {
    const supabase = createServerSupabase();
    
    // Exchange the code for a secure session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.session?.user) {
      const userId = data.session.user.id;

      // 1. Check if this user already has a profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      // 2. If they don't exist, this is a new Google signup. Create their profile.
      if (!existingProfile) {
        // Insert into standard profiles table
        await supabase.from("profiles").insert([{ id: userId }]);
        
        // Insert into customers table so they can access the Customer Portal
        await supabase.from("customers").insert([{ id: userId }]);
      }

      // 3. Send them to their destination
      return NextResponse.redirect(`${publicEnv.siteUrl}${next}`);
    }
  }
  
  return NextResponse.redirect(`${publicEnv.siteUrl}/login?error=link`);
}