import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PortfolioItem } from "@/types/db";
import { EmptyState, PageHeader, StatusBadge, Table } from "@/components/ui/basics";

export default async function Page() {
  await requirePermission("portfolio.manage");
  const { data } = await createServerSupabase().from("portfolio_items").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as PortfolioItem[];
  return (
    <>
      <PageHeader title="Portfolio" description="Only Published items appear on the public Work page." actions={<Link href="/admin/portfolio/new" className="btn-primary">New project</Link>} />
      {rows.length === 0 ? <EmptyState title="No portfolio items yet" description="Add real projects only — nothing is pre-filled." /> : (
        <Table label="Portfolio"><thead><tr className="border-b border-border"><th className="th">Title</th><th className="th">Category</th><th className="th">Status</th><th className="th">Featured</th></tr></thead>
          <tbody>{rows.map((p) => (<tr key={p.id} className="border-b border-border last:border-0"><td className="td"><Link href={`/admin/portfolio/${p.id}`} className="font-medium hover:text-secondary">{p.title}</Link></td><td className="td text-muted">{p.category ?? "—"}</td><td className="td"><StatusBadge value={p.status} /></td><td className="td">{p.featured ? "Yes" : "—"}</td></tr>))}</tbody></Table>)}
    </>
  );
}
