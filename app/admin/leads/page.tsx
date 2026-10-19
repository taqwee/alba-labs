import { requirePermission } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Lead } from "@/types/db";
import { LEAD_STATUSES } from "@/types/db";
import { EmptyState, PageHeader, Select, Table, enumOptions } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { updateLeadStatusAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";

export default async function Page() {
  const user = await requirePermission("lead.read");
  const { data } = await createServerSupabase().from("leads").select("*").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Lead[];
  const canManage = user.permissions.has("lead.manage");
  return (
    <>
      <PageHeader title="Leads" description="Enquiries from the website and WhatsApp." />
      {rows.length === 0 ? <EmptyState title="No leads yet" description="When someone fills in the contact form, their enquiry shows up here." /> : (
        <Table label="Leads"><thead><tr className="border-b border-border"><th className="th">Lead</th><th className="th">Enquiry</th><th className="th">Received</th><th className="th">Status</th></tr></thead>
          <tbody>{rows.map((l) => (
            <tr key={l.id} className="border-b border-border last:border-0">
              <td className="td"><p className="font-medium">{l.name}</p><p className="text-xs text-muted">{l.email}{l.phone && ` · ${l.phone}`}{l.company && ` · ${l.company}`}</p><p className="text-xs text-muted">{l.source}</p></td>
              <td className="td max-w-sm"><p className="text-xs text-muted">{l.service_name ?? "General"}{l.budget && ` · ${l.budget}`}</p><p className="line-clamp-3 whitespace-pre-wrap">{l.message}</p></td>
              <td className="td text-muted">{formatDate(l.created_at)}</td>
              <td className="td">{canManage ? (
                <ActionForm action={updateLeadStatusAction} className="flex items-center gap-1"><input type="hidden" name="id" value={l.id} />
                  <Select name="status" id={`l-${l.id}`} defaultValue={l.status} options={enumOptions(LEAD_STATUSES)} className="w-36 py-1 text-xs" /><SubmitButton className="btn-ghost btn-sm" pendingText="…">Set</SubmitButton></ActionForm>) : l.status}</td></tr>))}
          </tbody></Table>)}
    </>
  );
}
