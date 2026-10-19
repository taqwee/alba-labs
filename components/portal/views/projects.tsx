import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/session";
import type { Project } from "@/types/db";
import { PROJECT_STATUSES } from "@/types/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import { EmptyState, Field, PageHeader, Select, StatusBadge, Table, enumOptions } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { addProjectUpdateAction, saveProjectAction, updateProjectProgressAction } from "@/app/actions/admin";

type ProjectRow = Project & { customers: { full_name: string } | null };

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-primary/10"><div className="h-full bg-secondary" style={{ width: `${value}%` }} /></div>
      <span className="text-xs text-muted">{value}%</span>
    </div>
  );
}

export async function ProjectsList({ base, user }: { base: string; user: SessionUser }) {
  const { data } = await createServerSupabase().from("projects").select("*, customers(full_name)").order("updated_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as unknown as ProjectRow[];
  const canCreate = user.permissions.has("project.manage");
  return (
    <>
      <PageHeader title="Projects" description={user.role === "CUSTOMER" ? "Everything we are working on with you." : undefined}
        actions={canCreate ? <Link href={`${base}/projects/new`} className="btn-primary">New project</Link> : undefined} />
      {rows.length === 0 ? <EmptyState title="No projects yet" description={user.role === "CUSTOMER" ? "Your projects will appear here once we start working together." : "Projects you can access will appear here."} /> : (
        <Table label="Projects">
          <thead><tr className="border-b border-border"><th className="th">Project</th>{user.role !== "CUSTOMER" && <th className="th">Customer</th>}<th className="th">Status</th><th className="th">Progress</th><th className="th">Deadline</th></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-primary/[0.03]">
              <td className="td"><Link href={`${base}/projects/${p.id}`} className="font-medium hover:text-secondary">{p.title}</Link></td>
              {user.role !== "CUSTOMER" && <td className="td text-muted">{p.customers?.full_name}</td>}
              <td className="td"><StatusBadge value={p.status} /></td><td className="td"><ProgressBar value={p.progress} /></td><td className="td text-muted">{formatDate(p.deadline)}</td>
            </tr>))}
          </tbody>
        </Table>
      )}
    </>
  );
}

export async function ProjectForm({ projectId, user }: { projectId?: string; user: SessionUser }) {
  const supabase = createServerSupabase();
  const [projRes, customers, services, staff, projServices, members] = await Promise.all([
    projectId ? supabase.from("projects").select("*").eq("id", projectId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("customers").select("id, full_name, company").order("full_name").limit(500),
    supabase.from("services").select("id, title").neq("status", "ARCHIVED").order("title"),
    supabase.from("profiles").select("id, full_name").in("role", ["STAFF", "ADMIN"]).eq("is_active", true).order("full_name"),
    projectId ? supabase.from("project_services").select("service_id").eq("project_id", projectId) : Promise.resolve({ data: [] }),
    projectId ? supabase.from("project_members").select("staff_id").eq("project_id", projectId) : Promise.resolve({ data: [] }),
  ]);
  if (projectId && !projRes.data) notFound();
  const p = projRes.data as Project | null;
  const chosenServices = new Set((projServices.data ?? []).map((r: { service_id: string }) => r.service_id));
  const chosenMembers = new Set((members.data ?? []).map((r: { staff_id: string }) => r.staff_id));
  void user;
  return (
    <ActionForm action={saveProjectAction} className="card space-y-4 p-5">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="title"><input id="title" name="title" required maxLength={160} defaultValue={p?.title} className="input" /></Field>
        <Field label="Customer" htmlFor="customerId">
          <Select name="customerId" id="customerId" required defaultValue={p?.customer_id}
            options={[{ value: "", label: "Choose a customer" }, ...(customers.data ?? []).map((c: { id: string; full_name: string; company: string | null }) => ({ value: c.id, label: c.full_name + (c.company ? ` (${c.company})` : "") }))]} />
        </Field>
        <Field label="Status" htmlFor="status"><Select name="status" defaultValue={p?.status ?? "PLANNING"} options={enumOptions(PROJECT_STATUSES)} /></Field>
        <Field label="Progress (%)" htmlFor="progress"><input id="progress" name="progress" type="number" min={0} max={100} defaultValue={p?.progress ?? 0} className="input" /></Field>
        <Field label="Start date" htmlFor="startDate"><input id="startDate" name="startDate" type="date" defaultValue={p?.start_date ?? ""} className="input" /></Field>
        <Field label="Deadline" htmlFor="deadline"><input id="deadline" name="deadline" type="date" defaultValue={p?.deadline ?? ""} className="input" /></Field>
      </div>
      <Field label="Description" htmlFor="description"><textarea id="description" name="description" rows={4} maxLength={5000} defaultValue={p?.description} className="input" /></Field>
      <fieldset><legend className="label">Services</legend><div className="flex flex-wrap gap-x-5 gap-y-1">
        {(services.data ?? []).map((s: { id: string; title: string }) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="serviceIds" value={s.id} defaultChecked={chosenServices.has(s.id)} />{s.title}</label>)}
      </div></fieldset>
      <fieldset><legend className="label">Assigned staff</legend><div className="flex flex-wrap gap-x-5 gap-y-1">
        {(staff.data ?? []).map((s: { id: string; full_name: string }) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="memberIds" value={s.id} defaultChecked={chosenMembers.has(s.id)} />{s.full_name || "Unnamed"}</label>)}
      </div></fieldset>
      <SubmitButton>{p ? "Save project" : "Create project"}</SubmitButton>
    </ActionForm>
  );
}

export async function ProjectDetail({ id, user, base }: { id: string; user: SessionUser; base: string }) {
  const supabase = createServerSupabase();
  const { data } = await supabase.from("projects").select("*, customers(full_name)").eq("id", id).maybeSingle();
  const p = data as unknown as ProjectRow | null;
  if (!p) notFound();
  const [updates, svc, mem, files] = await Promise.all([
    supabase.from("project_updates").select("id, body, created_at, visible_to_customer").eq("project_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("project_services").select("services(title)").eq("project_id", id),
    supabase.from("project_members").select("staff_id").eq("project_id", id),
    supabase.from("files").select("id, file_name, size_bytes, created_at").eq("project_id", id).order("created_at", { ascending: false }),
  ]);
  const memberIds = (mem.data ?? []).map((m: { staff_id: string }) => m.staff_id);
  const names: string[] = [];
  if (user.role !== "CUSTOMER" && memberIds.length) {
    const { data: people } = await supabase.from("profiles").select("full_name").in("id", memberIds);
    (people ?? []).forEach((x: { full_name: string }) => names.push(x.full_name));
  }
  const serviceTitles = (svc.data ?? []).map((r) => (r as unknown as { services: { title: string } | null }).services?.title).filter(Boolean);
  const canPost = user.role !== "CUSTOMER" && (user.permissions.has("project.manage") || user.permissions.has("project.update"));
  const isAdmin = user.permissions.has("project.manage");

  return (
    <div className="space-y-6">
      <Link href={`${base}/projects`} className="text-sm text-muted hover:text-text">← Projects</Link>
      <PageHeader title={p.title} description={p.description || undefined} />
      <dl className="card grid gap-4 p-5 text-sm sm:grid-cols-4">
        <div><dt className="text-muted">Status</dt><dd className="mt-1"><StatusBadge value={p.status} /></dd></div>
        <div><dt className="text-muted">Progress</dt><dd className="mt-1"><ProgressBar value={p.progress} /></dd></div>
        <div><dt className="text-muted">Start</dt><dd className="mt-1">{formatDate(p.start_date)}</dd></div>
        <div><dt className="text-muted">Deadline</dt><dd className="mt-1">{formatDate(p.deadline)}</dd></div>
        {user.role !== "CUSTOMER" && <div><dt className="text-muted">Customer</dt><dd className="mt-1">{p.customers?.full_name}</dd></div>}
        {serviceTitles.length > 0 && <div><dt className="text-muted">Services</dt><dd className="mt-1">{serviceTitles.join(", ")}</dd></div>}
        {names.length > 0 && <div><dt className="text-muted">Team</dt><dd className="mt-1">{names.join(", ")}</dd></div>}
      </dl>

      {isAdmin ? (<section><h2 className="mb-3 text-xl">Edit project</h2><ProjectForm projectId={id} user={user} /></section>)
      : canPost && (
        <ActionForm action={updateProjectProgressAction} className="card flex flex-wrap items-end gap-3 p-4">
          <input type="hidden" name="id" value={id} />
          <Field label="Status" htmlFor="ps"><Select id="ps" name="status" defaultValue={p.status} options={enumOptions(PROJECT_STATUSES)} /></Field>
          <Field label="Progress (%)" htmlFor="pp"><input id="pp" name="progress" type="number" min={0} max={100} defaultValue={p.progress} className="input w-28" /></Field>
          <SubmitButton>Update</SubmitButton>
        </ActionForm>
      )}

      <section>
        <h2 className="mb-3 text-xl">Activity</h2>
        {canPost && (
          <ActionForm action={addProjectUpdateAction} resetOnSuccess className="card mb-4 space-y-3 p-4">
            <input type="hidden" name="projectId" value={id} />
            <label htmlFor="upd" className="label">Post an update</label>
            <textarea id="upd" name="body" rows={2} required maxLength={2000} className="input" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToCustomer" defaultChecked /> Visible to the customer</label>
            <SubmitButton pendingText="Posting…">Post update</SubmitButton>
          </ActionForm>
        )}
        {(updates.data ?? []).length === 0 ? <EmptyState title="No updates yet" /> : (
          <ul className="space-y-3">{(updates.data ?? []).map((u: { id: string; body: string; created_at: string; visible_to_customer: boolean }) => (
            <li key={u.id} className="card p-4 text-sm"><p className="whitespace-pre-wrap">{u.body}</p>
              <p className="mt-1 text-xs text-muted">{formatDateTime(u.created_at)}{!u.visible_to_customer && " · internal only"}</p></li>))}
          </ul>
        )}
      </section>

      {(files.data ?? []).length > 0 && (
        <section><h2 className="mb-3 text-xl">Files</h2>
          <ul className="card divide-y divide-border text-sm">{(files.data ?? []).map((f: { id: string; file_name: string; size_bytes: number }) => (
            <li key={f.id} className="flex items-center justify-between p-3"><span>{f.file_name}</span><a className="btn-outline btn-sm" href={`/api/files/${f.id}`}>Download</a></li>))}
          </ul></section>
      )}
    </div>
  );
}
