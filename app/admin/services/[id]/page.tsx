import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Service } from "@/types/db";
import { SERVICE_STATUSES } from "@/types/db";
import { Field, PageHeader, Select, enumOptions } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { saveServiceAction } from "@/app/actions/admin";

export default async function Page({ params }: { params: { id: string } }) {
  await requirePermission("service.manage");
  let s: Service | null = null;
  if (params.id !== "new") {
    const { data } = await createServerSupabase().from("services").select("*, service_features(id, label, sort_order)").eq("id", params.id).maybeSingle();
    if (!data) notFound();
    s = data as Service;
  }
  const features = [...(s?.service_features ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((f) => f.label).join("\n");
  return (
    <>
      <Link href="/admin/services" className="text-sm text-muted hover:text-text">← Services</Link>
      <PageHeader title={s ? `Edit ${s.title}` : "New service"} />
      <ActionForm action={saveServiceAction} className="card max-w-3xl space-y-4 p-5" encType="multipart/form-data">
        {s && <input type="hidden" name="id" value={s.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="title"><input id="title" name="title" required maxLength={120} defaultValue={s?.title} className="input" /></Field>
          <Field label="URL slug" htmlFor="slug" hint="Lowercase letters, numbers and hyphens"><input id="slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={s?.slug} className="input" /></Field>
          <Field label="Status" htmlFor="status"><Select name="status" defaultValue={s?.status ?? "INACTIVE"} options={enumOptions(SERVICE_STATUSES)} /></Field>
          <Field label="Display order" htmlFor="sortOrder"><input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={s?.sort_order ?? 0} className="input" /></Field>
        </div>
        <Field label="Short summary" htmlFor="summary"><input id="summary" name="summary" maxLength={300} defaultValue={s?.summary} className="input" /></Field>
        <Field label="Description" htmlFor="description"><textarea id="description" name="description" rows={6} maxLength={5000} defaultValue={s?.description} className="input" /></Field>
        <Field label="Features" htmlFor="features" hint="One per line"><textarea id="features" name="features" rows={5} defaultValue={features} className="input" /></Field>
        <Field label="Pricing information" htmlFor="pricingInfo"><input id="pricingInfo" name="pricingInfo" maxLength={300} defaultValue={s?.pricing_info ?? ""} className="input" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button label" htmlFor="ctaLabel"><input id="ctaLabel" name="ctaLabel" required defaultValue={s?.cta_label ?? "Start a project"} className="input" /></Field>
          <Field label="Button link" htmlFor="ctaUrl"><input id="ctaUrl" name="ctaUrl" required defaultValue={s?.cta_url ?? "/contact"} className="input" /></Field>
        </div>
        <Field label="Image" htmlFor="image" hint={s?.image_url ? "Uploading a new image replaces the current one." : "PNG, JPG, WebP or GIF up to 5 MB"}><input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="text-sm" /></Field>
        <SubmitButton>Save service</SubmitButton>
      </ActionForm>
    </>
  );
}
