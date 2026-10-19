import { requirePermission } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState, PageHeader, Table } from "@/components/ui/basics";
import { formatDateTime } from "@/lib/utils";

interface Row { id: string; actor_id: string | null; action: string; target_type: string | null; target_id: string | null; metadata: Record<string, unknown>; created_at: string }

export default async function Page() {
  await requirePermission("audit.read");
  const s = createServerSupabase();
  const { data } = await s.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Row[];
  const ids = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => Boolean(x)))];
  const names = new Map<string, string>();
  if (ids.length) { const { data: p } = await s.from("profiles").select("id, full_name").in("id", ids); (p ?? []).forEach((x: { id: string; full_name: string }) => names.set(x.id, x.full_name)); }
  return (
    <>
      <PageHeader title="Activity log" description="Who did what, and when. Secrets are never recorded." />
      {rows.length === 0 ? <EmptyState title="No activity yet" /> : (
        <Table label="Activity log"><thead><tr className="border-b border-border"><th className="th">When</th><th className="th">Actor</th><th className="th">Action</th><th className="th">Target</th><th className="th">Details</th></tr></thead>
          <tbody>{rows.map((r) => (<tr key={r.id} className="border-b border-border last:border-0"><td className="td whitespace-nowrap text-muted">{formatDateTime(r.created_at)}</td><td className="td">{r.actor_id ? names.get(r.actor_id) ?? "User" : "Visitor / system"}</td><td className="td font-medium">{r.action}</td><td className="td text-muted">{r.target_type}{r.target_id && ` · ${r.target_id.slice(0, 8)}`}</td><td className="td max-w-xs truncate text-xs text-muted">{Object.keys(r.metadata).length ? JSON.stringify(r.metadata) : ""}</td></tr>))}</tbody></Table>)}
    </>
  );
}
