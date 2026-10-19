import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Private file download. The `files` row is read with the caller's own session, so RLS decides
 * whether they may see it. Only then is a short-lived signed URL issued.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse("Not found", { status: 404 });
  const { data: row } = await createServerSupabase().from("files").select("storage_path, file_name").eq("id", params.id).maybeSingle();
  if (!row || !isServiceRoleConfigured()) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await createAdminSupabase().storage.from("private-files").createSignedUrl(row.storage_path, 60, { download: row.file_name });
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "no-store" } });
}
