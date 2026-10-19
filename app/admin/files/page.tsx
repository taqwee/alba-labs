import { requirePermission } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { FilesView } from "@/components/portal/views/misc";

export default async function Page() {
  const user = await requirePermission("customer.manage");
  const { data } = await createServerSupabase().from("customers").select("id, full_name").order("full_name").limit(500);
  return <FilesView user={user} customers={data ?? []} />;
}
