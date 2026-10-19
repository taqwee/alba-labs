import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatCard, StatusBadge, Table } from "@/components/ui/basics";
import { getWhatsAppMode } from "@/lib/whatsapp/config";
import { Notice } from "@/components/ui/basics";
import { formatDateTime, timeAgo } from "@/lib/utils";

export default async function Page() {
  const user = await requireRole("ADMIN");
  const s = createServerSupabase();
  const head = { count: "exact" as const, head: true };
  const [customers, leads, active, unassigned, projects, staff, recentLeads, recentConvs, workload, activity] = await Promise.all([
    s.from("customers").select("id", head),
    s.from("leads").select("id", head).eq("status", "NEW"),
    s.from("conversations").select("id", head).not("status", "in", "(RESOLVED,CLOSED)"),
    s.from("conversations").select("id", head).eq("status", "UNASSIGNED"),
    s.from("projects").select("id", head).in("status", ["PLANNING", "IN_PROGRESS", "REVIEW", "REVISION"]),
    s.from("profiles").select("id", head).eq("role", "STAFF").eq("is_active", true),
    s.from("leads").select("id, name, status, service_name, created_at").order("created_at", { ascending: false }).limit(5),
    s.from("conversations").select("id, status, last_message_preview, last_message_at, customers(full_name)").order("last_message_at", { ascending: false }).limit(5),
    s.from("conversations").select("assigned_to").not("assigned_to", "is", null).not("status", "in", "(RESOLVED,CLOSED)"),
    user.permissions.has("audit.read") ? s.from("activity_logs").select("id, action, created_at").order("created_at", { ascending: false }).limit(6) : Promise.resolve({ data: [] }),
  ]);
  const counts = new Map<string, number>();
  (workload.data ?? []).forEach((r: { assigned_to: string }) => counts.set(r.assigned_to, (counts.get(r.assigned_to) ?? 0) + 1));
  const ids = [...counts.keys()];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data } = await s.from("profiles").select("id, full_name").in("id", ids);
    (data ?? []).forEach((p: { id: string; full_name: string }) => names.set(p.id, p.full_name));
  }
  const convRows = (recentConvs.data ?? []) as unknown as { id: string; status: string; last_message_preview: string | null; last_message_at: string; customers: { full_name: string } | null }[];
  return (
    <>
      <PageHeader title="Dashboard" description="What needs attention across the studio." />
      {getWhatsAppMode() === "off" && <div className="mb-6"><Notice tone="info">WhatsApp integration is not configured. Everything else works normally. <Link href="/admin/whatsapp" className="underline">See setup status</Link></Notice></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total customers" value={customers.count ?? 0} href="/admin/customers" />
        <StatCard label="New leads" value={leads.count ?? 0} href="/admin/leads" />
        <StatCard label="Active conversations" value={active.count ?? 0} href="/admin/conversations" />
        <StatCard label="Unassigned conversations" value={unassigned.count ?? 0} href="/admin/conversations?assigned=none" hint="Need an owner" />
        <StatCard label="Active projects" value={projects.count ?? 0} href="/admin/projects" />
        <StatCard label="Active staff" value={staff.count ?? 0} href="/admin/staff" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section><h2 className="mb-3 text-xl">Recent leads</h2>
          {(recentLeads.data ?? []).length === 0 ? <EmptyState title="No leads yet" description="Website enquiries will appear here." /> : (
            <ul className="card divide-y divide-border text-sm">{(recentLeads.data ?? []).map((l: { id: string; name: string; status: string; service_name: string | null; created_at: string }) => (
              <li key={l.id} className="flex items-center justify-between p-3"><span><span className="font-medium">{l.name}</span><span className="block text-muted">{l.service_name ?? "General enquiry"} · {timeAgo(l.created_at)}</span></span><StatusBadge value={l.status} /></li>))}</ul>)}</section>
        <section><h2 className="mb-3 text-xl">Recent conversations</h2>
          {convRows.length === 0 ? <EmptyState title="No conversations yet" /> : (
            <ul className="card divide-y divide-border text-sm">{convRows.map((c) => (
              <li key={c.id}><Link href={`/admin/conversations/${c.id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-primary/[0.03]"><span className="min-w-0"><span className="font-medium">{c.customers?.full_name}</span><span className="block truncate text-muted">{c.last_message_preview}</span></span><StatusBadge value={c.status} /></Link></li>))}</ul>)}</section>
        <section><h2 className="mb-3 text-xl">Staff workload</h2>
          {counts.size === 0 ? <p className="text-sm text-muted">No open conversations are assigned.</p> : (
            <Table label="Staff workload"><tbody>{[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => (
              <tr key={id} className="border-b border-border last:border-0"><td className="td">{names.get(id) ?? "Staff"}</td><td className="td text-right text-muted">{n} open</td></tr>))}</tbody></Table>)}</section>
        {user.permissions.has("audit.read") && <section><h2 className="mb-3 text-xl">Recent activity</h2>
          {(activity.data ?? []).length === 0 ? <p className="text-sm text-muted">No activity recorded yet.</p> : (
            <ul className="card divide-y divide-border text-sm">{(activity.data ?? []).map((a: { id: string; action: string; created_at: string }) => (
              <li key={a.id} className="flex justify-between p-3"><span>{a.action}</span><span className="text-muted">{formatDateTime(a.created_at)}</span></li>))}</ul>)}
          <Link href="/admin/activity" className="mt-2 inline-block text-sm text-secondary hover:underline">View all activity</Link></section>}
      </div>
    </>
  );
}
