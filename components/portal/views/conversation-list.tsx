import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Channel, ConversationStatus } from "@/types/db";
import { CONVERSATION_STATUSES } from "@/types/db";
import { humanize, timeAgo } from "@/lib/utils";
import { EmptyState, StatusBadge, Table, Badge } from "@/components/ui/basics";
import { RealtimeRefresh } from "@/components/ui/realtime-refresh";

interface Row {
  id: string; channel: Channel; status: ConversationStatus; subject: string | null; last_message_at: string;
  last_message_preview: string | null; assigned_to: string | null;
  customers: { full_name: string } | null;
  whatsapp_contacts: { wa_id: string; is_mock: boolean } | null;
}

export async function ConversationList({ base, filter }: { base: string; filter?: { status?: string; assigned?: string } }) {
  const supabase = createServerSupabase();
  let q = supabase.from("conversations")
    .select("id, channel, status, subject, last_message_at, last_message_preview, assigned_to, customers(full_name), whatsapp_contacts(wa_id, is_mock)")
    .order("last_message_at", { ascending: false }).limit(100);
    
  if (filter?.status && (CONVERSATION_STATUSES as string[]).includes(filter.status)) q = q.eq("status", filter.status);
  if (filter?.assigned === "none") q = q.is("assigned_to", null);
  
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];

  const ids = [...new Set(rows.map((r) => r.assigned_to).filter((x): x is string => Boolean(x)))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    (people ?? []).forEach((p: { id: string; full_name: string }) => names.set(p.id, p.full_name));
  }

  return (
    <>
      <RealtimeRefresh table="conversations" />
      <nav aria-label="Filter" className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={base} className="btn-outline btn-sm">All</Link>
        <Link href={`${base}?assigned=none`} className="btn-outline btn-sm">Unassigned</Link>
        {["OPEN", "WAITING_FOR_STAFF", "WAITING_FOR_CUSTOMER", "RESOLVED"].map((s) => (
          <Link key={s} href={`${base}?status=${s}`} className="btn-outline btn-sm">{humanize(s)}</Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title="No conversations here" description="Conversations appear when customers message you on WhatsApp or from their portal." />
      ) : (
        <Table label="Conversations">
          <thead><tr className="border-b border-border"><th className="th">Customer</th><th className="th">Channel</th><th className="th">Status</th><th className="th">Assigned</th><th className="th">Last message</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-primary/[0.03]">
                <td className="td">
                  <Link className="font-medium hover:text-secondary" href={`${base}/${r.id}`}>
                    {r.customers?.full_name || "Unknown"}
                  </Link>
                  {/* Phone number hidden here - replaced with generic label */}
                  {r.whatsapp_contacts && <p className="text-xs text-muted">WhatsApp Client {r.whatsapp_contacts.is_mock && " (simulated)"}</p>}
                </td>
                <td className="td"><Badge tone="info">{humanize(r.channel)}</Badge></td>
                <td className="td"><StatusBadge value={r.status} /></td>
                <td className="td text-muted">{r.assigned_to ? names.get(r.assigned_to) ?? "Staff" : "—"}</td>
                <td className="td max-w-xs"><p className="truncate">{r.last_message_preview ?? "—"}</p><p className="text-xs text-muted">{timeAgo(r.last_message_at)}</p></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}