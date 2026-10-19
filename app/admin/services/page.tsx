import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Service } from "@/types/db";
import { EmptyState, PageHeader, StatusBadge, Table } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { setServiceStatusAction } from "@/app/actions/admin";

export default async function Page() {
  await requirePermission("service.manage");
  const { data } = await createServerSupabase().from("services").select("*").order("sort_order").order("title");
  const rows = (data ?? []) as Service[];
  return (
    <>
      <PageHeader title="Services" description="Only Active services appear on the public website." actions={<Link href="/admin/services/new" className="btn-primary">New service</Link>} />
      {rows.length === 0 ? <EmptyState title="No services yet" description="Add your first service, or run supabase/seed/01_reference_data.sql for the launch set." /> : (
        <Table label="Services"><thead><tr className="border-b border-border"><th className="th">Order</th><th className="th">Service</th><th className="th">Status</th><th className="th">Change status</th></tr></thead>
          <tbody>{rows.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0"><td className="td text-muted">{s.sort_order}</td>
              <td className="td"><Link href={`/admin/services/${s.id}`} className="font-medium hover:text-secondary">{s.title}</Link><p className="text-xs text-muted">/{s.slug}</p></td>
              <td className="td"><StatusBadge value={s.status} /></td>
              <td className="td"><div className="flex gap-1">{(["ACTIVE", "INACTIVE", "ARCHIVED"] as const).filter((x) => x !== s.status).map((x) => (
                <ActionForm key={x} action={setServiceStatusAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value={x} /><SubmitButton className="btn-outline btn-sm" pendingText="…">{x === "ACTIVE" ? "Activate" : x === "INACTIVE" ? "Deactivate" : "Archive"}</SubmitButton></ActionForm>))}</div></td></tr>))}
          </tbody></Table>)}
    </>
  );
}
