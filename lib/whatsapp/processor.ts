import type { InboundMessageEvent, StatusEvent, WhatsAppEvent } from "./parse";

export interface ContactRecord { id: string; waId: string; customerId: string | null; isMock: boolean }
export interface ConversationRecord { id: string; assignedTo: string | null; customerId: string }
export type DeliveryState = "SENT" | "DELIVERED" | "READ" | "FAILED";

/**
 * Persistence port for the WhatsApp pipeline. The Supabase adapter lives in
 * supabase-store.ts; tests use an in-memory adapter. Keeps business rules out of SQL plumbing.
 */
export interface WhatsAppStore {
  /** Returns false if this event was already claimed (duplicate delivery). */
  claimEvent(key: string, type: string, payload: unknown): Promise<boolean>;
  finishEvent(key: string, status: "PROCESSED" | "FAILED", error?: string): Promise<void>;
  /** Un-claims an event so Meta's retry can process it again. */
  releaseEvent(key: string): Promise<void>;

  upsertContact(input: { waId: string; profileName: string | null; isMock: boolean; at: Date }): Promise<ContactRecord>;
  /** Only records that can be matched with confidence (see README "Customer matching"). */
  findConfidentCustomerByPhone(waId: string): Promise<string | null>;
  createCustomer(input: { name: string; phone: string }): Promise<string>;
  linkContactToCustomer(contactId: string, customerId: string): Promise<void>;
  createLeadForContact(input: { customerId: string; name: string; phone: string; message: string }): Promise<void>;

  findOpenConversation(contactId: string): Promise<ConversationRecord | null>;
  findPreviousAssignee(customerId: string): Promise<string | null>;
  createConversation(input: { customerId: string; contactId: string; assignedTo: string | null }): Promise<ConversationRecord>;
  /** Returns null when a message with this external id already exists. */
  insertInboundMessage(input: {
    conversationId: string; externalId: string; messageType: string; body: string; at: Date;
  }): Promise<{ id: string } | null>;

  applyDeliveryStatus(externalId: string, status: DeliveryState, error: string | null): Promise<boolean>;

  notifyUsers(userIds: string[], n: { type: string; title: string; body?: string; link?: string }): Promise<void>;
  adminIds(): Promise<string[]>;
}

export interface ProcessResult {
  processed: number;
  duplicates: number;
  failed: number;
  createdConversations: number;
  createdCustomers: number;
}

export interface ProcessOptions { isMock?: boolean }

async function handleMessage(e: InboundMessageEvent, store: WhatsAppStore, opts: ProcessOptions, result: ProcessResult) {
  const contact = await store.upsertContact({
    waId: e.waId, profileName: e.profileName, isMock: opts.isMock ?? false, at: e.at,
  });

  let customerId = contact.customerId;
  if (!customerId) {
    customerId = await store.findConfidentCustomerByPhone(e.waId);
    if (!customerId) {
      // Cannot match confidently => create an UNLINKED record. An admin can link it later.
      customerId = await store.createCustomer({ name: e.profileName ?? `+${e.waId}`, phone: e.waId });
      await store.createLeadForContact({
        customerId, name: e.profileName ?? `+${e.waId}`, phone: e.waId, message: e.text,
      });
      result.createdCustomers++;
    }
    await store.linkContactToCustomer(contact.id, customerId);
  }

  let conversation = await store.findOpenConversation(contact.id);
  if (!conversation) {
    const previous = await store.findPreviousAssignee(customerId);
    conversation = await store.createConversation({ customerId, contactId: contact.id, assignedTo: previous });
    result.createdConversations++;
  }

  const inserted = await store.insertInboundMessage({
    conversationId: conversation.id, externalId: e.messageId, messageType: e.messageType, body: e.text, at: e.at,
  });
  if (!inserted) return; // already stored (retry after partial failure)

  const who = e.profileName ?? `+${e.waId}`;
  const link = `/conversations/${conversation.id}`;
  if (conversation.assignedTo) {
    await store.notifyUsers([conversation.assignedTo], {
      type: "NEW_WHATSAPP_MESSAGE", title: `New WhatsApp message from ${who}`, body: e.text.slice(0, 120), link: `/staff${link}`,
    });
  } else {
    await store.notifyUsers(await store.adminIds(), {
      type: "NEW_WHATSAPP_MESSAGE", title: `Unassigned WhatsApp message from ${who}`, body: e.text.slice(0, 120), link: `/admin${link}`,
    });
  }
}

async function handleStatus(e: StatusEvent, store: WhatsAppStore) {
  await store.applyDeliveryStatus(e.messageId, e.status, e.error);
}

/**
 * Processes normalised WhatsApp events idempotently. A failure releases that
 * event's claim so Meta's retry can process it; `failed > 0` means "respond 500".
 */
export async function processWhatsAppEvents(
  events: WhatsAppEvent[], store: WhatsAppStore, payload: unknown, opts: ProcessOptions = {},
): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, duplicates: 0, failed: 0, createdConversations: 0, createdCustomers: 0 };
  for (const event of events) {
    const claimed = await store.claimEvent(event.key, event.kind, payload);
    if (!claimed) { result.duplicates++; continue; }
    try {
      if (event.kind === "message") await handleMessage(event, store, opts, result);
      else await handleStatus(event, store);
      await store.finishEvent(event.key, "PROCESSED");
      result.processed++;
    } catch (error) {
      result.failed++;
      console.error("[whatsapp] event failed", event.key, error instanceof Error ? error.message : error);
      await store.finishEvent(event.key, "FAILED", error instanceof Error ? error.message.slice(0, 300) : "error").catch(() => undefined);
      await store.releaseEvent(event.key).catch(() => undefined);
    }
  }
  return result;
}
