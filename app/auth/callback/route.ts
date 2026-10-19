import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";

/** Email links (confirm signup, reset password, staff invite) land here. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (isSupabaseConfigured() && code) {
    const { error } = await createServerSupabase().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${publicEnv.siteUrl}${next}`);
  }
  return NextResponse.redirect(`${publicEnv.siteUrl}/login?error=link`);
}
