import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // If Supabase lands on any page with ?code=..., forward it to the callback
  if (searchParams.has("code") && pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url); // keeps ?code=... in the URL
  }

  return updateSession(request);
}

export const config = {
  // Skip static assets and the webhook (Meta calls it without cookies).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};