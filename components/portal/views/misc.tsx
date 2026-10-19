import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/session";
import type { Customer, FileRow, Notification, Task } from "@/types/db";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/db";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import { EmptyState, Field, PageHeader, Select, StatusBadge, Table, enumOptions } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { markNotificationsReadAction, updateProfileAction } from "@/app/actions/account";
import { uploadFileAction } from "@/app/actions/files";
import { saveCustomerAction, saveTaskAction, updateTaskStatusAction } from "@/app/actions/admin";

// ---------------- notifications ----------------
export async function NotificationsView({ user }: { user: SessionUser }) {
  const { data } = await createServerSupabase().from("notifications").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as Notification[];
  const unread = rows.filter((r) => !r.read_at).length;
  return (
    <>
      <PageHeader title="Notifications" actions={unread > 0 ? (
        <ActionForm action={markNotificationsReadAction}><SubmitButton className="btn-outline" pendingText="…">Mark all as read</SubmitButton></ActionForm>) : undefined} />
      {rows.length === 0 ? <EmptyState title="You're all caught up" description="New messages, assignments and updates will show up here." /> : (
        <ul className="card divide-y divide-border">{rows.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-3 p-4 text-sm">
            <div>
              <p className={n.read_at ? "text-muted" : "font-medium"}>{n.link ? <Link href={n.link} className="hover:text-secondary">{n.title}</Link> : n.title}</p>
              {n.body && <p className="mt-0.5 text-muted">{n.body}</p>}
              <p className="mt-1 text-xs text-muted">{timeAgo(n.created_at)}</p>
            </div>
            {!n.read_at && <ActionForm action={markNotificationsReadAction}><input type="hidden" name="id" value={n.id} /><SubmitButton className="btn-ghost btn-sm" pendingText="…">Mark read</SubmitButton></ActionForm>}
          </li>))}
        </ul>
      )}
    </>
  );
}

// ---------------- profile ----------------
export async function ProfileView({ user }: { user: SessionUser }) {
  const supabase = createServerSupabase();
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, email").eq("id", user.id).maybeSingle();
  let company = "";
  if (user.role === "CUSTOMER") {
    const { data } = await supabase.from("customers").select("company").eq("profile_id", user.id).maybeSingle();
    company = data?.company ?? "";
  }
  return (
    <>
      <PageHeader title="Profile" />
      <ActionForm action={updateProfileAction} className="card max-w-xl space-y-4 p-5">
        <Field label="Full name" htmlFor="fullName"><input id="fullName" name="fullName" required defaultValue={profile?.full_name} className="input" /></Field>
        <Field label="Email" htmlFor="email" hint="To change your email, contact the studio."><input id="email" value={profile?.email ?? ""} disabled className="input" readOnly /></Field>
        <Field label="Phone" htmlFor="phone"><input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} className="input" /></Field>
        {user.role === "CUSTOMER" && <Field label="Company" htmlFor="company"><input id="company" name="company" defaultValue={company} className="input" /></Field>}
        <SubmitButton>Save profile</SubmitButton>
      </ActionForm>
    </>
  );
}

// ---------------- customers ----------------
export async function CustomersList({ base, q }: { base: string; q?: string }) {
  let query = createServerSupabase().from("customers").select("*").order("created_at", { ascending: false }).limit(200);
  const term = (q ?? "").replace(/[%,()]/g, " ").trim().slice(0, 60);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,company.ilike.%${term}%`);
  const { data } = await query;
  const rows = (data ?? []) as Customer[];
  return (
    <>
      <PageHeader title="Customers" />
      <form className="mb-4 flex max-w-md gap-2" role="search"><label htmlFor="q" className="sr-only">Search customers</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name, email, phone, company" className="input" /><button className="btn-outline">Search</button></form>
      {rows.length === 0 ? <EmptyState title="No customers found" /> : (
        <Table label="Customers"><thead><tr className="border-b border-border"><th className="th">Name</th><th className="th">Contact</th><th className="th">Account</th><th className="th">Added</th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.id} className="border-b border-border last:border-0 hover:bg-primary/[0.03]">
              <td className="td"><Link href={`${base}/${c.id}`} className="font-medium hover:text-secondary">{c.full_name || "Unnamed"}</Link>{c.company && <p className="text-xs text-muted">{c.company}</p>}</td>
              <td className="td text-muted">{c.email}<br />{c.phone}</td>
              <td className="td">{c.profile_id ? <StatusBadge value="ACTIVE" /> : <span className="text-xs text-muted">No portal account</span>}</td>
              <td className="td text-muted">{formatDate(c.created_at)}</td></tr>))}
          </tbody></Table>
      )}
    </>
  );
}

export async function CustomerDetail({ id, user, base }: { id: string; user: SessionUser; base: string }) {
  const supabase = createServerSupabase();
  const { data: c } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!c) return <EmptyState title="Customer not found" description="It may not exist, or you may not have access." />;
  const customer = c as Customer;
  const [projects, convs, leads, files, contacts] = await Promise.all([
    supabase.from("projects").select("id, title, status").eq("customer_id", id),
    supabase.from("conversations").select("id, channel, status, last_message_at, subject").eq("customer_id", id).order("last_message_at", { ascending: false }),
    supabase.from("leads").select("id, status, message, created_at").eq("customer_id", id),
    supabase.from("files").select("id, file_name").eq("customer_id", id),
    supabase.from("whatsapp_contacts").select("id, wa_id, is_mock").eq("customer_id", id),
  ]);
  const canEdit = user.permissions.has("customer.manage");
  const prefix = user.role === "ADMIN" ? "/admin" : "/staff";
  void base;
  return (
    <div className="space-y-6">
      <Link href={`${prefix}/customers`} className="text-sm text-muted hover:text-text">← Customers</Link>
      <PageHeader title={customer.full_name || "Unnamed customer"} description={customer.profile_id ? "Has a portal account" : "No portal account (created from WhatsApp or a manual entry)"} />
      {canEdit && (
        <ActionForm action={saveCustomerAction} className="card grid gap-4 p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={customer.id} />
          <Field label="Name" htmlFor="fullName"><input id="fullName" name="fullName" defaultValue={customer.full_name} className="input" required /></Field>
          <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" defaultValue={customer.email ?? ""} className="input" /></Field>
          <Field label="Phone" htmlFor="phone"><input id="phone" name="phone" defaultValue={customer.phone ?? ""} className="input" /></Field>
          <Field label="Company" htmlFor="company"><input id="company" name="company" defaultValue={customer.company ?? ""} className="input" /></Field>
          <div className="sm:col-span-2"><SubmitButton>Save customer</SubmitButton></div>
        </ActionForm>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <section><h2 className="mb-2 text-xl">Projects</h2>{(projects.data ?? []).length === 0 ? <p className="text-sm text-muted">None.</p> :
          <ul className="card divide-y divide-border text-sm">{(projects.data ?? []).map((p: { id: string; title: string; status: string }) => <li key={p.id} className="flex justify-between p-3"><Link href={`${prefix}/projects/${p.id}`} className="hover:text-secondary">{p.title}</Link><StatusBadge value={p.status} /></li>)}</ul>}</section>
        <section><h2 className="mb-2 text-xl">Conversations</h2>{(convs.data ?? []).length === 0 ? <p className="text-sm text-muted">None.</p> :
          <ul className="card divide-y divide-border text-sm">{(convs.data ?? []).map((v: { id: string; channel: string; status: string; subject: string | null; last_message_at: string }) => <li key={v.id} className="flex justify-between p-3"><Link href={`${prefix}/conversations/${v.id}`} className="hover:text-secondary">{v.subject ?? v.channel} · {timeAgo(v.last_message_at)}</Link><StatusBadge value={v.status} /></li>)}</ul>}</section>
        <section><h2 className="mb-2 text-xl">Leads</h2>{(leads.data ?? []).length === 0 ? <p className="text-sm text-muted">None.</p> :
          <ul className="card divide-y divide-border text-sm">{(leads.data ?? []).map((l: { id: string; status: string; message: string; created_at: string }) => <li key={l.id} className="p-3"><StatusBadge value={l.status} /> <span className="text-muted">{formatDate(l.created_at)}</span><p className="mt-1 line-clamp-2">{l.message}</p></li>)}</ul>}</section>
        <section><h2 className="mb-2 text-xl">Files</h2>{(files.data ?? []).length === 0 ? <p className="text-sm text-muted">None.</p> :
          <ul className="card divide-y divide-border text-sm">{(files.data ?? []).map((f: { id: string; file_name: string }) => <li key={f.id} className="flex justify-between p-3">{f.file_name}<a href={`/api/files/${f.id}`} className="btn-outline btn-sm">Download</a></li>)}</ul>}</section>
      </div>
      {(contacts.data ?? []).length > 0 && <p className="text-sm text-muted">WhatsApp: {(contacts.data ?? []).map((w: { wa_id: string; is_mock: boolean }) => `+${w.wa_id}${w.is_mock ? " (simulated)" : ""}`).join(", ")}</p>}
    </div>
  );
}

// ---------------- tasks ----------------
type TaskRow = Task & { projects: { title: string } | null };
export async function TasksView({ user }: { user: SessionUser }) {
  const supabase = createServerSupabase();
  const [{ data }, projects, staff] = await Promise.all([
    supabase.from("tasks").select("*, projects(title)").order("due_date", { ascending: true, nullsFirst: false }).limit(300),
    user.permissions.has("task.manage") ? supabase.from("projects").select("id, title").order("title") : Promise.resolve({ data: [] }),
    user.permissions.has("task.manage") ? supabase.from("profiles").select("id, full_name").in("role", ["STAFF", "ADMIN"]).eq("is_active", true) : Promise.resolve({ data: [] }),
  ]);
  const rows = (data ?? []) as unknown as TaskRow[];
  const names = new Map((staff.data ?? []).map((s: { id: string; full_name: string }) => [s.id, s.full_name]));
  return (
    <>
      <PageHeader title="Tasks" />
      {user.permissions.has("task.manage") && (
        <ActionForm action={saveTaskAction} resetOnSuccess className="card mb-6 grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Title" htmlFor="t-title"><input id="t-title" name="title" required maxLength={160} className="input" /></Field>
          <Field label="Project" htmlFor="projectId"><Select name="projectId" options={[{ value: "", label: "No project" }, ...(projects.data ?? []).map((p: { id: string; title: string }) => ({ value: p.id, label: p.title }))]} /></Field>
          <Field label="Assign to" htmlFor="assignedTo"><Select name="assignedTo" options={[{ value: "", label: "Unassigned" }, ...(staff.data ?? []).map((s: { id: string; full_name: string }) => ({ value: s.id, label: s.full_name }))]} /></Field>
          <Field label="Priority" htmlFor="priority"><Select name="priority" defaultValue="MEDIUM" options={enumOptions(TASK_PRIORITIES)} /></Field>
          <Field label="Status" htmlFor="t-status"><Select id="t-status" name="status" defaultValue="TODO" options={enumOptions(TASK_STATUSES)} /></Field>
          <Field label="Due date" htmlFor="dueDate"><input id="dueDate" name="dueDate" type="date" className="input" /></Field>
          <input type="hidden" name="description" value="" />
          <div className="sm:col-span-3"><SubmitButton>Add task</SubmitButton></div>
        </ActionForm>
      )}
      {rows.length === 0 ? <EmptyState title="No tasks" description="Tasks assigned to you will appear here." /> : (
        <Table label="Tasks"><thead><tr className="border-b border-border"><th className="th">Task</th><th className="th">Project</th><th className="th">Assignee</th><th className="th">Priority</th><th className="th">Due</th><th className="th">Status</th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-0">
              <td className="td font-medium">{t.title}</td><td className="td text-muted">{t.projects?.title ?? "—"}</td>
              <td className="td text-muted">{t.assigned_to ? names.get(t.assigned_to) ?? "You" : "—"}</td>
              <td className="td"><StatusBadge value={t.priority} /></td><td className="td text-muted">{formatDate(t.due_date)}</td>
              <td className="td"><ActionForm action={updateTaskStatusAction} className="flex items-center gap-1"><input type="hidden" name="id" value={t.id} />
                <Select name="status" id={`s-${t.id}`} defaultValue={t.status} options={enumOptions(TASK_STATUSES)} className="w-36 py-1 text-xs" /><SubmitButton className="btn-ghost btn-sm" pendingText="…">Set</SubmitButton></ActionForm></td>
            </tr>))}
          </tbody></Table>
      )}
    </>
  );
}

// ---------------- files ----------------
export async function FilesView({ user, customers }: { user: SessionUser; customers?: { id: string; full_name: string }[] }) {
  const supabase = createServerSupabase();
  const { data } = await supabase.from("files").select("*").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as FileRow[];
  const owners = new Map((customers ?? []).map((c) => [c.id, c.full_name]));
  return (
    <>
      <PageHeader title="Files" description="Private files. Downloads use short-lived secure links." />
      <ActionForm action={uploadFileAction} resetOnSuccess className="card mb-6 flex flex-wrap items-end gap-3 p-4" encType="multipart/form-data">
        {user.role !== "CUSTOMER" && customers && <Field label="Customer" htmlFor="customerId"><Select name="customerId" options={[{ value: "", label: "Choose a customer" }, ...customers.map((c) => ({ value: c.id, label: c.full_name }))]} /></Field>}
        <Field label="File" htmlFor="file" hint="Images, PDF, Office files, TXT or ZIP · up to 10 MB"><input id="file" name="file" type="file" required className="text-sm" /></Field>
        <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
      </ActionForm>
      {rows.length === 0 ? <EmptyState title="No files yet" /> : (
        <Table label="Files"><thead><tr className="border-b border-border"><th className="th">Name</th>{user.role !== "CUSTOMER" && <th className="th">Customer</th>}<th className="th">Size</th><th className="th">Uploaded</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{rows.map((f) => (
            <tr key={f.id} className="border-b border-border last:border-0"><td className="td">{f.file_name}</td>
              {user.role !== "CUSTOMER" && <td className="td text-muted">{owners.get(f.customer_id) ?? "—"}</td>}
              <td className="td text-muted">{(f.size_bytes / 1024).toFixed(0)} KB</td><td className="td text-muted">{formatDateTime(f.created_at)}</td>
              <td className="td text-right"><a href={`/api/files/${f.id}`} className="btn-outline btn-sm">Download</a></td></tr>))}
          </tbody></Table>
      )}
    </>
  );
}
