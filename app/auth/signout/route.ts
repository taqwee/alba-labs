import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

export async function POST() {
  if (isSupabaseConfigured()) await createServerSupabase().auth.signOut();
  return NextResponse.redirect(`${publicEnv.siteUrl}/`, { status: 303 });
}
