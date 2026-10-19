import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui/basics";
import { ProgressBar } from "@/components/portal/views/projects";

export default async function Page() {
  const user = await requireRole("CUSTOMER");
  const supabase = createServerSupabase();
  const [projects, convs, files] = await Promise.all([
    supabase.from("projects").select("id, title, status, progress").order("updated_at", { ascending: false }).limit(5),
    supabase.from("conversations").select("id", { count: "exact", head: true }).neq("status", "CLOSED"),
    supabase.from("files").select("id", { count: "exact", head: true }),
  ]);
  return (
    <>
      <PageHeader title={`Welcome${user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}`} description="Your projects, messages and files in one place." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active projects" value={(projects.data ?? []).filter((p) => !["COMPLETED", "CANCELLED"].includes(p.status)).length} href="/customer/projects" />
        <StatCard label="Open conversations" value={convs.count ?? 0} href="/customer/messages" />
        <StatCard label="Files" value={files.count ?? 0} href="/customer/files" />
      </div>
      <h2 className="mb-3 mt-8 text-xl">Recent projects</h2>
      {(projects.data ?? []).length === 0 ? <EmptyState title="No projects yet" description="Once we start working together, your project will show up here." /> : (
        <ul className="card divide-y divide-border">{(projects.data ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 p-4"><Link href={`/customer/projects/${p.id}`} className="font-medium hover:text-secondary">{p.title}</Link><span className="flex items-center gap-3"><ProgressBar value={p.progress} /><StatusBadge value={p.status} /></span></li>))}
        </ul>
      )}
    </>
  );
}
