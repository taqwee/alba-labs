import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui/basics";
import { timeAgo } from "@/lib/utils";

export default async function Page() {
  const user = await requireRole("STAFF");
  const s = createServerSupabase();
  const [convs, unread, customers, projects, tasks, recent] = await Promise.all([
    s.from("conversations").select("id", { count: "exact", head: true }).not("status", "in", "(RESOLVED,CLOSED)"),
    s.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null).in("type", ["NEW_WHATSAPP_MESSAGE", "NEW_CUSTOMER_MESSAGE"]),
    s.from("customers").select("id", { count: "exact", head: true }),
    s.from("projects").select("id", { count: "exact", head: true }).in("status", ["PLANNING", "IN_PROGRESS", "REVIEW", "REVISION"]),
    s.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE"),
    s.from("conversations").select("id, status, last_message_preview, last_message_at, customers(full_name)").order("last_message_at", { ascending: false }).limit(6),
  ]);
  const rows = (recent.data ?? []) as unknown as { id: string; status: string; last_message_preview: string | null; last_message_at: string; customers: { full_name: string } | null }[];
  return (
    <>
      <PageHeader title="Your day" description="Only work assigned to you appears here." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Assigned conversations" value={convs.count ?? 0} href="/staff/conversations" />
        <StatCard label="Unread messages" value={unread.count ?? 0} href="/staff/notifications" />
        <StatCard label="Customers" value={customers.count ?? 0} href="/staff/customers" />
        <StatCard label="Active projects" value={projects.count ?? 0} href="/staff/projects" />
        <StatCard label="Open tasks" value={tasks.count ?? 0} href="/staff/tasks" />
      </div>
      <h2 className="mb-3 mt-8 text-xl">Latest conversations</h2>
      {rows.length === 0 ? <EmptyState title="Nothing assigned yet" description="When an admin assigns you a conversation, it will appear here." /> : (
        <ul className="card divide-y divide-border">{rows.map((r) => (
          <li key={r.id}><Link href={`/staff/conversations/${r.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-primary/[0.03]">
            <span><span className="font-medium">{r.customers?.full_name}</span><span className="block truncate text-sm text-muted">{r.last_message_preview}</span></span>
            <span className="text-right"><StatusBadge value={r.status} /><span className="mt-1 block text-xs text-muted">{timeAgo(r.last_message_at)}</span></span></Link></li>))}
        </ul>
      )}
    </>
  );
}
