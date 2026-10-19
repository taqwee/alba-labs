import { requirePermission } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { getWhatsAppStatus } from "@/lib/whatsapp/config";
import { publicEnv } from "@/lib/env";
import { EmptyState, Field, Notice, PageHeader, Table, Badge, Select } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { linkContactAction, mockInboundAction } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/utils";

interface Contact { id: string; wa_id: string; profile_name: string | null; is_mock: boolean; last_inbound_at: string | null; customer_id: string | null; customers: { full_name: string; profile_id: string | null } | null }

export default async function Page() {
  await requirePermission("whatsapp.manage");
  const status = getWhatsAppStatus();
  const s = createServerSupabase();
  const [contacts, customers, events] = await Promise.all([
    s.from("whatsapp_contacts").select("id, wa_id, profile_name, is_mock, last_inbound_at, customer_id, customers(full_name, profile_id)").order("created_at", { ascending: false }).limit(50),
    s.from("customers").select("id, full_name, email").not("profile_id", "is", null).order("full_name").limit(500),
    s.from("whatsapp_webhook_events").select("id, event_type, status, error, received_at").order("received_at", { ascending: false }).limit(10),
  ]);
  const rows = (contacts.data ?? []) as unknown as Contact[];
  return (
    <>
      <PageHeader title="WhatsApp" description="Official Meta WhatsApp Cloud API integration." />
      {status.mode === "off" && <Notice tone="info">WhatsApp integration is not configured.</Notice>}
      {status.mode === "mock" && <Notice tone="warning">Mock mode is ON. Messages are simulated and never leave this server.</Notice>}
      {status.mode === "live" && <Notice tone="success">Live mode: connected to the Meta WhatsApp Cloud API.</Notice>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><h2 className="text-xl">Configuration</h2>
          <ul className="mt-3 space-y-1 text-sm">{status.variables.map((v) => <li key={v.name} className="flex justify-between"><code>{v.name}</code>{v.set ? <Badge tone="success">set</Badge> : <Badge>missing</Badge>}</li>)}</ul>
          <p className="mt-4 text-sm text-muted">Webhook callback URL for Meta:</p>
          <code className="mt-1 block break-all rounded bg-primary/5 p-2 text-xs">{publicEnv.siteUrl}/api/webhooks/whatsapp</code>
          <p className="mt-3 text-xs text-muted">Values are never shown here. Set them in your hosting dashboard. Free-form replies are only allowed within 24 hours of the customer&apos;s last message.</p></section>
        {status.mode === "mock" && (
          <section className="card p-5"><h2 className="text-xl">Simulate an incoming message</h2>
            <ActionForm action={mockInboundAction} className="mt-3 space-y-3">
              <Field label="Fake phone number (digits)" htmlFor="phone"><input id="phone" name="phone" defaultValue="5550100" pattern="\d{8,15}" required className="input" /></Field>
              <Field label="Name" htmlFor="name"><input id="name" name="name" defaultValue="Test Customer" required className="input" /></Field>
              <Field label="Message" htmlFor="body"><textarea id="body" name="body" rows={2} defaultValue="Hi, I need a logo for my new business." required className="input" /></Field>
              <SubmitButton pendingText="Sending…">Simulate customer message</SubmitButton></ActionForm></section>)}
      </div>
      <h2 className="mb-3 mt-8 text-xl">Contacts</h2>
      {rows.length === 0 ? <EmptyState title="No WhatsApp contacts yet" /> : (
        <Table label="WhatsApp contacts"><thead><tr className="border-b border-border"><th className="th">Contact</th><th className="th">Last inbound</th><th className="th">Linked customer</th></tr></thead>
          <tbody>{rows.map((c) => (<tr key={c.id} className="border-b border-border last:border-0"><td className="td">+{c.wa_id} {c.is_mock && <Badge tone="warning">simulated</Badge>}<p className="text-xs text-muted">{c.profile_name}</p></td><td className="td text-muted">{formatDateTime(c.last_inbound_at)}</td>
            <td className="td">{c.customers?.full_name ?? "—"}{c.customers && !c.customers.profile_id && (
              <ActionForm action={linkContactAction} className="mt-2 flex gap-1"><input type="hidden" name="contactId" value={c.id} />
                <Select name="customerId" id={`lk-${c.id}`} options={[{ value: "", label: "Link to existing customer…" }, ...(customers.data ?? []).map((x: { id: string; full_name: string; email: string | null }) => ({ value: x.id, label: `${x.full_name} (${x.email ?? "no email"})` }))]} className="py-1 text-xs" />
                <SubmitButton className="btn-outline btn-sm" pendingText="…">Link</SubmitButton></ActionForm>)}</td></tr>))}</tbody></Table>)}
      <h2 className="mb-3 mt-8 text-xl">Recent webhook events</h2>
      {(events.data ?? []).length === 0 ? <p className="text-sm text-muted">No events received.</p> : (
        <ul className="card divide-y divide-border text-sm">{(events.data ?? []).map((e: { id: string; event_type: string; status: string; error: string | null; received_at: string }) => (<li key={e.id} className="flex justify-between p-3"><span>{e.event_type} · {e.status}{e.error && ` · ${e.error}`}</span><span className="text-muted">{formatDateTime(e.received_at)}</span></li>))}</ul>)}
    </>
  );
}
