import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  // Use the real origin of this request, not an env variable
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = forwardedHost
    ? `https://${forwardedHost}`
    : request.nextUrl.origin;

  if (isSupabaseConfigured() && code) {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session?.user) {
      const userId = data.session.user.id;

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle(); // .single() errors when no row exists

      if (!existingProfile) {
        await supabase.from("profiles").upsert({ id: userId });
        await supabase.from("customers").upsert({ id: userId });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("exchangeCodeForSession failed:", error?.message);
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}