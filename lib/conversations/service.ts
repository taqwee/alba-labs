import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/env";
import type { SessionUser } from "@/lib/auth/session";
import { canReplyToConversation } from "@/lib/permissions/access";
import { AuthorizationError } from "@/lib/auth/session";
import { UserError } from "@/lib/utils";
import { logActivity } from "@/lib/audit";
import { activeAdminIds, notify } from "@/lib/notifications";
import { dispatchWhatsApp } from "@/lib/whatsapp/dispatch";
import { rateLimit } from "@/lib/utils/rate-limit";
import type { Channel, ConversationStatus } from "@/types/db";

interface ConvRow {
  id: string; customer_id: string; channel: Channel; status: ConversationStatus; assigned_to: string | null;
  whatsapp_contacts: { wa_id: string; is_mock: boolean; last_inbound_at: string | null } | null;
  customers: { profile_id: string | null; full_name: string } | null;
}

const portalBase = (role: string) => (role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/customer");

/** Staff/admin reply. Only the assigned person may send — monitoring never sends. */
export async function sendReply(user: SessionUser, conversationId: string, body: string): Promise<{ warning?: string }> {
  const limit = rateLimit(`reply:${user.id}`, 40, 60_000);
  if (!limit.ok) throw new UserError("You are sending messages very quickly. Wait a moment and try again.");

  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("conversations")
    .select("id, customer_id, channel, status, assigned_to, whatsapp_contacts(wa_id, is_mock, last_inbound_at), customers(profile_id, full_name)")
    .eq("id", conversationId)
    .maybeSingle();
  const conv = data as unknown as ConvRow | null;
  if (!conv) throw new UserError("That conversation could not be found.");

  if (!canReplyToConversation(user, { customerId: conv.customer_id, assignedTo: conv.assigned_to, channel: conv.channel })) {
    throw new AuthorizationError("Only the assigned staff member can reply. Assign this conversation to yourself first.");
  }
  if (conv.status === "CLOSED") throw new UserError("This conversation is closed. Change its status to reopen it.");
  if (conv.channel === "WHATSAPP" && !isServiceRoleConfigured()) {
    throw new UserError("The server is missing SUPABASE_SERVICE_ROLE_KEY, so WhatsApp replies are unavailable.");
  }

  // 1. Save first (RLS re-checks that you are the assignee).
  const { data: message, error } = await supabase.from("messages").insert({
    conversation_id: conversationId, direction: "OUTBOUND", sender_type: "STAFF", sender_id: user.id, body,
    delivery_status: conv.channel === "WHATSAPP" ? "PENDING" : "SENT",
  }).select("id").single();
  if (error || !message) { console.error("[reply] insert failed", error?.message); throw new UserError("Your message could not be saved."); }

  let warning: string | undefined;

  // 2. Deliver through the channel.
  if (conv.channel === "WHATSAPP") {
    const admin = createAdminSupabase();
    const contact = conv.whatsapp_contacts;
    if (!contact) {
      await admin.from("messages").update({ delivery_status: "FAILED", error: "No WhatsApp contact" }).eq("id", message.id);
      throw new UserError("This conversation has no WhatsApp contact to reply to.");
    }
    const outcome = await dispatchWhatsApp(
      { waId: contact.wa_id, isMock: contact.is_mock, lastInboundAt: contact.last_inbound_at }, body,
    );
    if (outcome.ok) {
      await admin.from("messages").update({
        external_id: outcome.externalId, delivery_status: "SENT",
        message_type: outcome.usedTemplate ? "template" : "text",
      }).eq("id", message.id);
      if (outcome.usedTemplate) warning = "The 24-hour window had closed, so the approved template was sent instead of your text.";
    } else {
      await admin.from("messages").update({ delivery_status: "FAILED", error: outcome.message.slice(0, 300) }).eq("id", message.id);
      await logActivity({ actorId: user.id, action: "whatsapp.send_failed", targetType: "conversation", targetId: conversationId, metadata: { reason: outcome.reason } });
      throw new UserError(outcome.message);
    }
  } else if (conv.channel === "WEBSITE" && conv.customers?.profile_id) {
    await notify([conv.customers.profile_id], {
      type: "NEW_STAFF_REPLY", title: "New reply from Lunomi Studio", body: body.slice(0, 120), link: `/customer/messages/${conversationId}`,
    });
  }

  await logActivity({ actorId: user.id, action: "conversation.reply", targetType: "conversation", targetId: conversationId, metadata: { channel: conv.channel } });
  return { warning };
}

export async function addInternalNote(user: SessionUser, conversationId: string, body: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("internal_notes").insert({ conversation_id: conversationId, author_id: user.id, body });
  if (error) throw new AuthorizationError("You cannot add notes to this conversation.");
  await logActivity({ actorId: user.id, action: "conversation.note_added", targetType: "conversation", targetId: conversationId });
}

export async function changeStatus(user: SessionUser, conversationId: string, status: ConversationStatus) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("conversations").update({ status }).eq("id", conversationId).select("id").maybeSingle();
  if (error || !data) throw new AuthorizationError("You cannot change this conversation.");
  await logActivity({ actorId: user.id, action: "conversation.status_changed", targetType: "conversation", targetId: conversationId, metadata: { status } });
}

/** Assign / reassign / unassign (staffId = null). Permission is enforced inside the SQL function too. */
export async function assignConversation(user: SessionUser, conversationId: string, staffId: string | null) {
  const supabase = createServerSupabase();
  const { data: before } = await supabase.from("conversations").select("assigned_to").eq("id", conversationId).maybeSingle();
  if (!before) throw new UserError("That conversation could not be found.");

  const { error } = await supabase.rpc("assign_conversation", { p_conversation: conversationId, p_staff: staffId });
  if (error) {
    if (/Not allowed/i.test(error.message)) throw new AuthorizationError("You cannot assign conversations.");
    if (/active staff/i.test(error.message)) throw new UserError("Choose an active staff member.");
    console.error("[assign] rpc failed", error.message);
    throw new UserError("The assignment could not be saved.");
  }

  const previous = before.assigned_to as string | null;
  if (previous === staffId) return;

  if (staffId) {
    const { data: target } = await supabase.from("profiles").select("role").eq("id", staffId).maybeSingle();
    const base = portalBase(target?.role ?? "STAFF");
    await notify([staffId], {
      type: previous ? "CONVERSATION_REASSIGNED" : "CONVERSATION_ASSIGNED",
      title: previous ? "A conversation was reassigned to you" : "A conversation was assigned to you",
      link: `${base}/conversations/${conversationId}`,
    });
  }
  if (previous && previous !== staffId) {
    await notify([previous], { type: "CONVERSATION_REASSIGNED", title: "A conversation was reassigned away from you" });
  }
  await logActivity({
    actorId: user.id, action: staffId ? (previous ? "conversation.reassigned" : "conversation.assigned") : "conversation.unassigned",
    targetType: "conversation", targetId: conversationId, metadata: { from: previous, to: staffId },
  });
}

// ---------- customer side (website channel) ------------------------------------
export async function startCustomerConversation(user: SessionUser, subject: string, body: string): Promise<string> {
  if (!user.customerId) throw new AuthorizationError("Only customers can start a conversation here.");
  if (!rateLimit(`newconv:${user.id}`, 5, 60_000).ok) throw new UserError("Please wait a moment before sending another message.");
  const supabase = createServerSupabase();

  const { data: conv, error } = await supabase.from("conversations")
    .insert({ customer_id: user.customerId, channel: "WEBSITE", status: "UNASSIGNED", subject }).select("id").single();
  if (error || !conv) { console.error("[customer conv]", error?.message); throw new UserError("Your message could not be sent."); }

  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conv.id, direction: "INBOUND", sender_type: "CUSTOMER", sender_id: user.id, body, delivery_status: "DELIVERED",
  });
  if (msgError) throw new UserError("Your message could not be sent.");

  await notify(await activeAdminIds(), {
    type: "NEW_CUSTOMER_MESSAGE", title: `New message: ${subject}`, body: body.slice(0, 120), link: `/admin/conversations/${conv.id}`,
  });
  await logActivity({ actorId: user.id, action: "customer.conversation_started", targetType: "conversation", targetId: conv.id });
  return conv.id;
}

export async function sendCustomerMessage(user: SessionUser, conversationId: string, body: string) {
  if (!user.customerId) throw new AuthorizationError("Only customers can send messages here.");
  if (!rateLimit(`custmsg:${user.id}`, 20, 60_000).ok) throw new UserError("You are sending messages very quickly. Wait a moment.");
  const supabase = createServerSupabase();

  const { data: conv } = await supabase.from("conversations").select("id, assigned_to, channel, status").eq("id", conversationId).maybeSingle();
  if (!conv || conv.channel !== "WEBSITE") throw new UserError("You can only reply to website conversations here.");
  if (conv.status === "CLOSED") throw new UserError("This conversation is closed. Start a new one to contact us again.");

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId, direction: "INBOUND", sender_type: "CUSTOMER", sender_id: user.id, body, delivery_status: "DELIVERED",
  });
  if (error) throw new UserError("Your message could not be sent.");

  const recipients = conv.assigned_to ? [conv.assigned_to as string] : await activeAdminIds();
  await notify(recipients, {
    type: "NEW_CUSTOMER_MESSAGE", title: "New customer message", body: body.slice(0, 120),
    link: `${conv.assigned_to ? "/staff" : "/admin"}/conversations/${conversationId}`,
  });
}

/** Admin: attach an unlinked WhatsApp contact (and its conversations) to an existing customer. */
export async function linkContactToCustomer(user: SessionUser, contactId: string, customerId: string) {
  if (!user.permissions.has("customer.manage")) throw new AuthorizationError("You cannot link customers.");
  const admin = createAdminSupabase();
  const { data: contact } = await admin.from("whatsapp_contacts").select("customer_id").eq("id", contactId).maybeSingle();
  if (!contact) throw new UserError("Contact not found.");
  const oldCustomerId = contact.customer_id as string | null;

  await admin.from("whatsapp_contacts").update({ customer_id: customerId }).eq("id", contactId);
  await admin.from("conversations").update({ customer_id: customerId }).eq("whatsapp_contact_id", contactId);

  // Remove the old auto-created record if nothing else points at it and it has no portal account.
  if (oldCustomerId && oldCustomerId !== customerId) {
    const [{ count: convs }, { count: projects }, { count: files }, { data: old }] = await Promise.all([
      admin.from("conversations").select("id", { count: "exact", head: true }).eq("customer_id", oldCustomerId),
      admin.from("projects").select("id", { count: "exact", head: true }).eq("customer_id", oldCustomerId),
      admin.from("files").select("id", { count: "exact", head: true }).eq("customer_id", oldCustomerId),
      admin.from("customers").select("profile_id").eq("id", oldCustomerId).maybeSingle(),
    ]);
    if (!convs && !projects && !files && old && !old.profile_id) {
      await admin.from("leads").update({ customer_id: customerId }).eq("customer_id", oldCustomerId);
      await admin.from("customers").delete().eq("id", oldCustomerId);
    }
  }
  await logActivity({ actorId: user.id, action: "whatsapp.contact_linked", targetType: "customer", targetId: customerId, metadata: { contactId } });
}
