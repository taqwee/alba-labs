import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/session";
import { canAssignConversation, canReplyToConversation, canSeeInternalNotes } from "@/lib/permissions/access";
import { replyWindow } from "@/lib/whatsapp/window";
import { getWhatsAppMode } from "@/lib/whatsapp/config";
import type { Channel, ConversationStatus, InternalNote, Message } from "@/types/db";
import { CONVERSATION_STATUSES } from "@/types/db";
import { cn, formatDateTime, humanize } from "@/lib/utils";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { RealtimeRefresh } from "@/components/ui/realtime-refresh";
import { Badge, Notice, Select, StatusBadge, enumOptions } from "@/components/ui/basics";
import { assignAction, customerReplyAction, noteAction, replyAction, statusAction } from "@/app/actions/conversations";

interface Row {
  id: string; customer_id: string; channel: Channel; status: ConversationStatus; subject: string | null;
  assigned_to: string | null; created_at: string; last_message_at: string;
  customers: { full_name: string; email: string | null; phone: string | null } | null;
  whatsapp_contacts: { wa_id: string; is_mock: boolean; last_inbound_at: string | null } | null;
}

/** One conversation for any role. What is shown and allowed comes from the same rules the database enforces. */
export async function ConversationView({ id, user, base }: { id: string; user: SessionUser; base: string }) {
  const supabase = createServerSupabase();
  const { data } = await supabase.from("conversations")
    .select("id, customer_id, channel, status, subject, assigned_to, created_at, last_message_at, customers(full_name, email, phone), whatsapp_contacts(wa_id, is_mock, last_inbound_at)")
    .eq("id", id).maybeSingle();
  const conv = data as unknown as Row | null;
  if (!conv) notFound();

  const access = { customerId: conv.customer_id, assignedTo: conv.assigned_to, channel: conv.channel };
  const isCustomer = user.role === "CUSTOMER";
  const showNotes = canSeeInternalNotes(user, access);
  const canReply = canReplyToConversation(user, access);
  const canAssign = canAssignConversation(user);

  const [{ data: msgs }, notesRes, staffRes, historyRes] = await Promise.all([
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at"),
    showNotes ? supabase.from("internal_notes").select("*").eq("conversation_id", id).order("created_at") : Promise.resolve({ data: [] }),
    canAssign ? supabase.from("profiles").select("id, full_name, role").in("role", ["STAFF", "ADMIN"]).eq("is_active", true).order("full_name") : Promise.resolve({ data: [] }),
    showNotes ? supabase.from("conversation_assignments").select("from_staff_id, to_staff_id, changed_by, created_at").eq("conversation_id", id).order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
  ]);
  const messages = (msgs ?? []) as Message[];
  const notes = (notesRes.data ?? []) as InternalNote[];
  const staff = (staffRes.data ?? []) as { id: string; full_name: string; role: string }[];
  const history = (historyRes.data ?? []) as { from_staff_id: string | null; to_staff_id: string | null; changed_by: string | null; created_at: string }[];

  // Resolve display names for staff authors (customers only ever see "Lunomi team").
  const nameIds = [...new Set([...messages.map((m) => m.sender_id), ...notes.map((n) => n.author_id), conv.assigned_to, ...history.flatMap((h) => [h.from_staff_id, h.to_staff_id, h.changed_by])].filter((x): x is string => Boolean(x)))];
  const names = new Map<string, string>();
  if (!isCustomer && nameIds.length) {
    const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", nameIds);
    (people ?? []).forEach((p: { id: string; full_name: string }) => names.set(p.id, p.full_name));
  }
  const nameOf = (uid: string | null) => (uid ? names.get(uid) ?? "Staff member" : "Nobody");

  type Item = { kind: "msg"; at: string; m: Message } | { kind: "note"; at: string; n: InternalNote };
  const timeline: Item[] = [
    ...messages.map((m): Item => ({ kind: "msg", at: m.created_at, m })),
    ...notes.map((n): Item => ({ kind: "note", at: n.created_at, n })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const wa = conv.whatsapp_contacts;
  const window = conv.channel === "WHATSAPP" && wa ? replyWindow(wa.last_inbound_at) : null;
  const backHref = `${base}/${isCustomer ? "messages" : "conversations"}`;

  return (
    <div>
      <RealtimeRefresh table="messages" filter={`conversation_id=eq.${id}`} />
      <Link href={backHref} className="text-sm text-muted hover:text-text">← Back</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl">{conv.subject ?? conv.customers?.full_name ?? "Conversation"}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone="info">{humanize(conv.channel)}</Badge><StatusBadge value={conv.status} />
            {!isCustomer && <>
              <span>{conv.customers?.full_name}</span>
              {wa && <span>+{wa.wa_id}{wa.is_mock && " (simulated)"}</span>}
              <span>Assigned to: {nameOf(conv.assigned_to)}</span>
            </>}
          </p>
        </div>
        {!isCustomer && (
          <div className="flex flex-wrap gap-2">
            {canAssign && (
              <ActionForm action={assignAction} className="flex items-center gap-2">
                <input type="hidden" name="conversationId" value={id} />
                <label className="sr-only" htmlFor="staffId">Assign to</label>
                <Select name="staffId" id="staffId" defaultValue={conv.assigned_to ?? ""} className="w-44"
                  options={[{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s.id, label: s.full_name || "Unnamed" }))]} />
                <SubmitButton className="btn-outline btn-sm" pendingText="…">Assign</SubmitButton>
              </ActionForm>
            )}
            {(canReply || user.permissions.has("conversation.manage")) && (
              <ActionForm action={statusAction} className="flex items-center gap-2">
                <input type="hidden" name="conversationId" value={id} />
                <label className="sr-only" htmlFor="status">Status</label>
                <Select name="status" id="status" defaultValue={conv.status} options={enumOptions(CONVERSATION_STATUSES)} className="w-48" />
                <SubmitButton className="btn-outline btn-sm" pendingText="…">Update</SubmitButton>
              </ActionForm>
            )}
          </div>
        )}
      </div>

      {conv.channel === "WHATSAPP" && wa?.is_mock && getWhatsAppMode() !== "mock" && (
        <div className="mt-4"><Notice>This is a simulated WhatsApp contact. Mock mode is off, so replies cannot be delivered.</Notice></div>
      )}
      {window && !wa?.is_mock && window.mode === "TEMPLATE_REQUIRED" && !isCustomer && (
        <div className="mt-4"><Notice tone="warning">The 24-hour WhatsApp reply window has closed. Meta only allows an approved template message until the customer writes again.</Notice></div>
      )}

      <div className="mt-6 space-y-3" role="log" aria-label="Conversation">
        {timeline.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
        {timeline.map((item) => {
          if (item.kind === "note") {
            return (
              <div key={item.n.id} className="mx-auto max-w-2xl rounded-lg border border-dashed border-warning/60 bg-warning/10 p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-warning">Internal note — never sent to the customer · {nameOf(item.n.author_id)} · {formatDateTime(item.n.created_at)}</p>
                <p className="whitespace-pre-wrap">{item.n.body}</p>
              </div>
            );
          }
          const m = item.m;
          const fromCustomer = m.sender_type === "CUSTOMER";
          const mine = isCustomer ? fromCustomer : !fromCustomer;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%]", fromCustomer ? "border border-border bg-surface" : "bg-primary text-primary-fg")}>
                <p className={cn("mb-0.5 text-xs", fromCustomer ? "text-muted" : "text-primary-fg/70")}>
                  {fromCustomer ? (isCustomer ? "You" : conv.customers?.full_name ?? "Customer") : isCustomer ? "Lunomi team" : `Staff · ${nameOf(m.sender_id)}`}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-1 flex items-center gap-2 text-[11px]", fromCustomer ? "text-muted" : "text-primary-fg/70")}>
                  {formatDateTime(m.created_at)}
                  {!isCustomer && m.direction === "OUTBOUND" && conv.channel === "WHATSAPP" && <span title={m.error ?? undefined}>· {humanize(m.delivery_status)}{m.error ? ` (${m.error})` : ""}</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-4">
        {isCustomer ? (
          conv.channel === "WEBSITE" && conv.status !== "CLOSED" ? (
            <ActionForm action={customerReplyAction} resetOnSuccess className="card space-y-3 p-4">
              <input type="hidden" name="conversationId" value={id} />
              <label htmlFor="body" className="label">Your message</label>
              <textarea id="body" name="body" rows={3} required maxLength={4000} className="input" />
              <SubmitButton pendingText="Sending…">Send message</SubmitButton>
            </ActionForm>
          ) : <Notice tone="info">{conv.channel === "WHATSAPP" ? "This chat continues on WhatsApp." : "This conversation is closed. Start a new one to contact us again."}</Notice>
        ) : canReply ? (
          conv.status === "CLOSED" ? <Notice tone="info">Closed. Change the status above to reopen it.</Notice> : (
            <ActionForm action={replyAction} resetOnSuccess className="card space-y-3 p-4">
              <input type="hidden" name="conversationId" value={id} />
              <label htmlFor="body" className="label">Reply to customer{conv.channel === "WHATSAPP" ? " (via WhatsApp)" : ""}</label>
              <textarea id="body" name="body" rows={3} required maxLength={4000} className="input" />
              <SubmitButton pendingText="Sending…">Send reply</SubmitButton>
            </ActionForm>
          )
        ) : (
          <Notice tone="info">
            You are viewing this conversation read-only. Nothing you do here is sent to the customer.
            {canAssign && " To reply, assign the conversation to yourself first."}
          </Notice>
        )}

        {showNotes && (
          <ActionForm action={noteAction} resetOnSuccess className="rounded-xl border border-dashed border-warning/60 bg-warning/5 p-4">
            <input type="hidden" name="conversationId" value={id} />
            <label htmlFor="note" className="label">Internal note <span className="font-normal text-muted">(only staff and admins can see this)</span></label>
            <textarea id="note" name="body" rows={2} required maxLength={4000} className="input" />
            <SubmitButton className="btn-outline btn-sm mt-2" pendingText="Saving…">Add note</SubmitButton>
          </ActionForm>
        )}

        {showNotes && history.length > 0 && (
          <details className="card p-4 text-sm">
            <summary className="cursor-pointer font-medium">Assignment history</summary>
            <ul className="mt-3 space-y-1 text-muted">
              {history.map((h, i) => (
                <li key={i}>{formatDateTime(h.created_at)} — {nameOf(h.from_staff_id)} → {nameOf(h.to_staff_id)}{h.changed_by ? ` (by ${nameOf(h.changed_by)})` : " (automatic)"}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
