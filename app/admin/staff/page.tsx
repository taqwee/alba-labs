import { requirePermission } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/permissions";
import { EmptyState, Field, PageHeader, Table, StatusBadge } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { inviteStaffAction, setStaffActiveAction, setStaffPermissionsAction } from "@/app/actions/admin";

interface StaffRow { id: string; full_name: string; email: string | null; is_active: boolean }

export default async function Page() {
  const me = await requirePermission("staff.manage");
  const s = createServerSupabase();
  const [{ data }, grants, open, titles] = await Promise.all([
    s.from("profiles").select("id, full_name, email, is_active").eq("role", "STAFF").order("full_name"),
    s.from("profile_permissions").select("profile_id, permission_key"),
    s.from("conversations").select("assigned_to").not("status", "in", "(RESOLVED,CLOSED)").not("assigned_to", "is", null),
    s.from("staff_profiles").select("profile_id, job_title"),
  ]);
  const rows = (data ?? []) as StaffRow[];
  const extra = new Map<string, Set<string>>();
  (grants.data ?? []).forEach((g: { profile_id: string; permission_key: string }) => { (extra.get(g.profile_id) ?? extra.set(g.profile_id, new Set()).get(g.profile_id)!).add(g.permission_key); });
  const load = new Map<string, number>();
  (open.data ?? []).forEach((r: { assigned_to: string }) => load.set(r.assigned_to, (load.get(r.assigned_to) ?? 0) + 1));
  const title = new Map((titles.data ?? []).map((t: { profile_id: string; job_title: string | null }) => [t.profile_id, t.job_title]));
  const base = new Set<string>(ROLE_PERMISSIONS.STAFF);
  const grantable = PERMISSIONS.filter((p) => !base.has(p));
  void me;
  return (
    <>
      <PageHeader title="Staff" description="Staff accounts are created by invitation only." />
      <ActionForm action={inviteStaffAction} resetOnSuccess className="card mb-6 grid gap-4 p-5 sm:grid-cols-4 sm:items-end">
        <Field label="Full name" htmlFor="fullName"><input id="fullName" name="fullName" required className="input" /></Field>
        <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" required className="input" /></Field>
        <Field label="Job title" htmlFor="jobTitle"><input id="jobTitle" name="jobTitle" className="input" /></Field>
        <SubmitButton pendingText="Sending…">Send invitation</SubmitButton>
      </ActionForm>
      {rows.length === 0 ? <EmptyState title="No staff yet" description="Invite your first team member above. They will get an email to set a password." /> : (
        <Table label="Staff"><thead><tr className="border-b border-border"><th className="th">Member</th><th className="th">Open conversations</th><th className="th">Status</th><th className="th">Extra permissions</th></tr></thead>
          <tbody>{rows.map((m) => (
            <tr key={m.id} className="border-b border-border last:border-0">
              <td className="td"><p className="font-medium">{m.full_name}</p><p className="text-xs text-muted">{m.email}{title.get(m.id) && ` · ${title.get(m.id)}`}</p></td>
              <td className="td text-muted">{load.get(m.id) ?? 0}</td>
              <td className="td"><StatusBadge value={m.is_active ? "ACTIVE" : "INACTIVE"} />
                <ActionForm action={setStaffActiveAction} className="mt-2"><input type="hidden" name="id" value={m.id} /><input type="hidden" name="active" value={String(!m.is_active)} /><SubmitButton className="btn-outline btn-sm" pendingText="…">{m.is_active ? "Deactivate" : "Activate"}</SubmitButton></ActionForm></td>
              <td className="td"><details><summary className="cursor-pointer text-sm text-secondary">Edit ({extra.get(m.id)?.size ?? 0})</summary>
                <ActionForm action={setStaffPermissionsAction} className="mt-2 space-y-1"><input type="hidden" name="id" value={m.id} />
                  {grantable.map((p) => <label key={p} className="flex items-center gap-2 text-xs"><input type="checkbox" name="permissions" value={p} defaultChecked={extra.get(m.id)?.has(p)} />{p}</label>)}
                  <SubmitButton className="btn-outline btn-sm mt-2" pendingText="…">Save</SubmitButton></ActionForm></details></td></tr>))}
          </tbody></Table>)}
    </>
  );
}
