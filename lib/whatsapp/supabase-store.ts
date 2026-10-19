import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactRecord, ConversationRecord, DeliveryState, WhatsAppStore } from "./processor";

const RANK: Record<string, number> = { PENDING: 0, SENT: 1, DELIVERED: 2, READ: 3 };
const CLOSED = ["RESOLVED", "CLOSED"];

/** Service-role adapter. Only ever used server-side (webhook + mock mode). */
export function createSupabaseWhatsAppStore(db: SupabaseClient): WhatsAppStore {
  return {
    async claimEvent(key, type, payload) {
      const { error } = await db.from("whatsapp_webhook_events").insert({ event_key: key, event_type: type, payload });
      if (!error) return true;
      if (error.code === "23505") return false; // unique violation => duplicate
      throw new Error(`claimEvent: ${error.message}`);
    },
    async finishEvent(key, status, error) {
      await db.from("whatsapp_webhook_events")
        .update({ status, error: error ?? null, processed_at: new Date().toISOString() }).eq("event_key", key);
    },
    async releaseEvent(key) {
      await db.from("whatsapp_webhook_events").delete().eq("event_key", key);
    },

    async upsertContact({ waId, profileName, isMock, at }) {
      const { data: existing } = await db.from("whatsapp_contacts").select("id, wa_id, customer_id, is_mock").eq("wa_id", waId).maybeSingle();
      if (existing) {
        await db.from("whatsapp_contacts").update({
          last_inbound_at: at.toISOString(), ...(profileName ? { profile_name: profileName } : {}),
        }).eq("id", existing.id);
        return { id: existing.id, waId: existing.wa_id, customerId: existing.customer_id, isMock: existing.is_mock } satisfies ContactRecord;
      }
      const { data, error } = await db.from("whatsapp_contacts")
        .insert({ wa_id: waId, profile_name: profileName, is_mock: isMock, last_inbound_at: at.toISOString() })
        .select("id, wa_id, customer_id, is_mock").single();
      if (error || !data) throw new Error(`upsertContact: ${error?.message}`);
      return { id: data.id, waId: data.wa_id, customerId: data.customer_id, isMock: data.is_mock };
    },

    // SECURITY: never auto-link to a customer that has a portal account. Their phone number is
    // self-declared and unverified, so linking could expose someone else's chat to them.
    async findConfidentCustomerByPhone(waId) {
      const { data } = await db.from("customers").select("id").is("profile_id", null).in("phone", [waId, `+${waId}`]).limit(2);
      return data && data.length === 1 ? data[0].id : null;
    },
    async createCustomer({ name, phone }) {
      const { data, error } = await db.from("customers").insert({ full_name: name, phone }).select("id").single();
      if (error || !data) throw new Error(`createCustomer: ${error?.message}`);
      return data.id;
    },
    async linkContactToCustomer(contactId, customerId) {
      await db.from("whatsapp_contacts").update({ customer_id: customerId }).eq("id", contactId);
    },
    async createLeadForContact({ customerId, name, phone, message }) {
      await db.from("leads").insert({
        customer_id: customerId, name, email: "", phone, message, source: "WHATSAPP", status: "NEW",
      });
    },

    async findOpenConversation(contactId) {
      const { data } = await db.from("conversations").select("id, assigned_to, customer_id, status")
        .eq("whatsapp_contact_id", contactId).eq("channel", "WHATSAPP")
        .not("status", "in", `(${CLOSED.join(",")})`).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data ? ({ id: data.id, assignedTo: data.assigned_to, customerId: data.customer_id } satisfies ConversationRecord) : null;
    },
    async findPreviousAssignee(customerId) {
      const { data } = await db.from("conversations").select("assigned_to").eq("customer_id", customerId)
        .not("assigned_to", "is", null).order("last_message_at", { ascending: false }).limit(1).maybeSingle();
      if (!data?.assigned_to) return null;
      const { data: p } = await db.from("profiles").select("id").eq("id", data.assigned_to).eq("is_active", true).maybeSingle();
      return p?.id ?? null;
    },
    async createConversation({ customerId, contactId, assignedTo }) {
      const { data, error } = await db.from("conversations").insert({
        customer_id: customerId, channel: "WHATSAPP", whatsapp_contact_id: contactId,
        assigned_to: assignedTo, status: assignedTo ? "OPEN" : "UNASSIGNED",
      }).select("id, assigned_to, customer_id").single();
      if (error || !data) throw new Error(`createConversation: ${error?.message}`);
      if (assignedTo) {
        await db.from("conversation_assignments").insert({ conversation_id: data.id, from_staff_id: null, to_staff_id: assignedTo, changed_by: null });
      }
      return { id: data.id, assignedTo: data.assigned_to, customerId: data.customer_id };
    },
    async insertInboundMessage({ conversationId, externalId, messageType, body, at }) {
      const { data, error } = await db.from("messages").insert({
        conversation_id: conversationId, direction: "INBOUND", sender_type: "CUSTOMER",
        message_type: messageType, body, external_id: externalId, delivery_status: "DELIVERED", created_at: at.toISOString(),
      }).select("id").single();
      if (error) {
        if (error.code === "23505") return null;
        throw new Error(`insertInboundMessage: ${error.message}`);
      }
      return { id: data.id };
    },

    async applyDeliveryStatus(externalId, status: DeliveryState, error) {
      const { data: msg } = await db.from("messages").select("id, delivery_status").eq("external_id", externalId).maybeSingle();
      if (!msg) return false;
      // Statuses can arrive out of order: never move backwards (READ must not become DELIVERED).
      if (status !== "FAILED" && (RANK[msg.delivery_status] ?? 0) >= RANK[status]) return false;
      await db.from("messages").update({ delivery_status: status, error }).eq("id", msg.id);
      return true;
    },

    async notifyUsers(userIds, n) {
      const ids = [...new Set(userIds)];
      if (ids.length === 0) return;
      await db.from("notifications").insert(ids.map((recipient_id) => ({
        recipient_id, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null,
      })));
    },
    async adminIds() {
      const { data } = await db.from("profiles").select("id").eq("role", "ADMIN").eq("is_active", true);
      return (data ?? []).map((r: { id: string }) => r.id);
    },
  };
}
