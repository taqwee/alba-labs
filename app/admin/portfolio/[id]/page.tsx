import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PortfolioItem } from "@/types/db";
import { CONTENT_STATUSES } from "@/types/db";
import { Field, PageHeader, Select, enumOptions } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { savePortfolioAction } from "@/app/actions/admin";

export default async function Page({ params }: { params: { id: string } }) {
  await requirePermission("portfolio.manage");
  const supabase = createServerSupabase();
  let p: PortfolioItem | null = null;
  let chosen = new Set<string>();
  if (params.id !== "new") {
    const [{ data }, links] = await Promise.all([
      supabase.from("portfolio_items").select("*").eq("id", params.id).maybeSingle(),
      supabase.from("portfolio_services").select("service_id").eq("portfolio_id", params.id),
    ]);
    if (!data) notFound();
    p = data as PortfolioItem;
    chosen = new Set((links.data ?? []).map((l: { service_id: string }) => l.service_id));
  }
  const { data: services } = await supabase.from("services").select("id, title").neq("status", "ARCHIVED").order("title");
  return (
    <>
      <Link href="/admin/portfolio" className="text-sm text-muted hover:text-text">← Portfolio</Link>
      <PageHeader title={p ? `Edit ${p.title}` : "New portfolio item"} />
      <ActionForm action={savePortfolioAction} className="card max-w-3xl space-y-4 p-5" encType="multipart/form-data">
        {p && <input type="hidden" name="id" value={p.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="title"><input id="title" name="title" required maxLength={160} defaultValue={p?.title} className="input" /></Field>
          <Field label="URL slug" htmlFor="slug"><input id="slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={p?.slug} className="input" /></Field>
          <Field label="Category" htmlFor="category"><input id="category" name="category" defaultValue={p?.category ?? ""} className="input" /></Field>
          <Field label="Client / project name" htmlFor="clientName"><input id="clientName" name="clientName" defaultValue={p?.client_name ?? ""} className="input" /></Field>
          <Field label="Status" htmlFor="status"><Select name="status" defaultValue={p?.status ?? "DRAFT"} options={enumOptions(CONTENT_STATUSES)} /></Field>
          <Field label="External URL" htmlFor="externalUrl"><input id="externalUrl" name="externalUrl" type="url" defaultValue={p?.external_url ?? ""} className="input" /></Field>
        </div>
        <Field label="Description" htmlFor="description"><textarea id="description" name="description" rows={6} defaultValue={p?.description} className="input" /></Field>
        <Field label="Technologies" htmlFor="technologies" hint="Comma separated"><input id="technologies" name="technologies" defaultValue={p?.technologies.join(", ")} className="input" /></Field>
        <fieldset><legend className="label">Services involved</legend><div className="flex flex-wrap gap-x-5 gap-y-1">
          {(services ?? []).map((s: { id: string; title: string }) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="serviceIds" value={s.id} defaultChecked={chosen.has(s.id)} />{s.title}</label>)}</div></fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={p?.featured} /> Featured on the home page</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cover image" htmlFor="cover"><input id="cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="text-sm" /></Field>
          <Field label="Add gallery images" htmlFor="images" hint={p?.image_urls.length ? `${p.image_urls.length} already attached` : undefined}><input id="images" name="images" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="text-sm" /></Field>
        </div>
        <SubmitButton>Save portfolio item</SubmitButton>
      </ActionForm>
    </>
  );
}
