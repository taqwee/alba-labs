import { describe, expect, it } from "vitest";
import { processWhatsAppEvents, type ContactRecord, type ConversationRecord, type WhatsAppStore } from "@/lib/whatsapp/processor";
import type { WhatsAppEvent } from "@/lib/whatsapp/parse";

/** In-memory store with the same uniqueness rules as the database. */
function memoryStore(seed: { customers?: { id: string; phone: string; hasAccount: boolean }[]; failOn?: string } = {}) {
  const events = new Set<string>();
  const contacts = new Map<string, ContactRecord>();
  const customers = new Map<string, { id: string; phone: string; hasAccount: boolean }>((seed.customers ?? []).map((c) => [c.id, c]));
  const conversations: (ConversationRecord & { contactId: string; status: string })[] = [];
  const messages = new Map<string, { conversationId: string; body: string; status: string }>();
  const notifications: { to: string[]; type: string }[] = [];
  const leads: string[] = [];
  let n = 0;
  const id = (p: string) => `${p}${++n}`;
  const store: WhatsAppStore = {
    claimEvent: async (key) => { if (events.has(key)) return false; events.add(key); return true; },
    finishEvent: async () => undefined,
    releaseEvent: async (key) => { events.delete(key); },
    upsertContact: async ({ waId, isMock }) => {
      const found = contacts.get(waId);
      if (found) return found;
      const c = { id: id("wc"), waId, customerId: null, isMock };
      contacts.set(waId, c); return c;
    },
    findConfidentCustomerByPhone: async (waId) => {
      const m = [...customers.values()].filter((c) => !c.hasAccount && c.phone === waId);
      return m.length === 1 ? m[0].id : null;
    },
    createCustomer: async ({ phone }) => { const c = { id: id("cu"), phone, hasAccount: false }; customers.set(c.id, c); return c.id; },
    linkContactToCustomer: async (contactId, customerId) => { for (const c of contacts.values()) if (c.id === contactId) c.customerId = customerId; },
    createLeadForContact: async ({ customerId }) => { leads.push(customerId); },
    findOpenConversation: async (contactId) => conversations.find((c) => c.contactId === contactId && !["RESOLVED", "CLOSED"].includes(c.status)) ?? null,
    findPreviousAssignee: async (customerId) => conversations.find((c) => c.customerId === customerId && c.assignedTo)?.assignedTo ?? null,
    createConversation: async ({ customerId, contactId, assignedTo }) => {
      const c = { id: id("cv"), customerId, contactId, assignedTo, status: assignedTo ? "OPEN" : "UNASSIGNED" };
      conversations.push(c); return c;
    },
    insertInboundMessage: async ({ conversationId, externalId, body }) => {
      if (seed.failOn === externalId) throw new Error("db down");
      if (messages.has(externalId)) return null;
      messages.set(externalId, { conversationId, body, status: "DELIVERED" }); return { id: externalId };
    },
    applyDeliveryStatus: async (externalId, status) => { const m = messages.get(externalId); if (!m) return false; m.status = status; return true; },
    notifyUsers: async (to, nn) => { notifications.push({ to, type: nn.type }); },
    adminIds: async () => ["admin1"],
  };
  return { store, contacts, customers, conversations, messages, notifications, leads, events };
}

const msg = (messageId: string, waId = "919800000001", text = "hello"): WhatsAppEvent => ({
  kind: "message", key: `msg:${messageId}`, waId, profileName: "Ann", messageId, messageType: "text", text, at: new Date(),
});

describe("WhatsApp processing", () => {
  it("unknown customer: creates unlinked customer + lead + unassigned conversation and notifies admins", async () => {
    const m = memoryStore();
    const r = await processWhatsAppEvents([msg("w1")], m.store, {});
    expect(r).toMatchObject({ processed: 1, createdCustomers: 1, createdConversations: 1, failed: 0 });
    expect(m.leads).toHaveLength(1);
    expect(m.conversations[0].assignedTo).toBeNull();
    expect(m.notifications[0]).toEqual({ to: ["admin1"], type: "NEW_WHATSAPP_MESSAGE" });
  });

  it("duplicate webhook delivery does not create a second message", async () => {
    const m = memoryStore();
    await processWhatsAppEvents([msg("w1")], m.store, {});
    const again = await processWhatsAppEvents([msg("w1")], m.store, {});
    expect(again).toMatchObject({ processed: 0, duplicates: 1 });
    expect(m.messages.size).toBe(1);
    expect(m.conversations).toHaveLength(1);
  });

  it("same event twice in one payload is stored once", async () => {
    const m = memoryStore();
    const r = await processWhatsAppEvents([msg("w1"), msg("w1")], m.store, {});
    expect(r.duplicates).toBe(1);
    expect(m.messages.size).toBe(1);
  });

  it("second message reuses the open conversation and existing customer", async () => {
    const m = memoryStore();
    await processWhatsAppEvents([msg("w1"), msg("w2", "919800000001", "again")], m.store, {});
    expect(m.conversations).toHaveLength(1);
    expect(m.customers.size).toBe(1);
    expect(m.messages.size).toBe(2);
  });

  it("existing unlinked customer with the same phone is reused (no duplicate)", async () => {
    const m = memoryStore({ customers: [{ id: "existing", phone: "919800000001", hasAccount: false }] });
    const r = await processWhatsAppEvents([msg("w1")], m.store, {});
    expect(r.createdCustomers).toBe(0);
    expect(m.conversations[0].customerId).toBe("existing");
  });

  it("never auto-links to a customer that has a portal account (identity is unverified)", async () => {
    const m = memoryStore({ customers: [{ id: "acct", phone: "919800000001", hasAccount: true }] });
    await processWhatsAppEvents([msg("w1")], m.store, {});
    expect(m.conversations[0].customerId).not.toBe("acct");
    expect(m.customers.size).toBe(2);
  });

  it("reuses the previous assignee for a returning customer and notifies them", async () => {
    const m = memoryStore();
    await processWhatsAppEvents([msg("w1")], m.store, {});
    m.conversations[0].assignedTo = "staff1"; m.conversations[0].status = "CLOSED";
    await processWhatsAppEvents([msg("w2")], m.store, {});
    expect(m.conversations).toHaveLength(2);
    expect(m.conversations[1].assignedTo).toBe("staff1");
    expect(m.notifications.at(-1)).toEqual({ to: ["staff1"], type: "NEW_WHATSAPP_MESSAGE" });
  });

  it("failure releases the claim so Meta's retry can succeed", async () => {
    const failing = memoryStore({ failOn: "w1" });
    const r = await processWhatsAppEvents([msg("w1")], failing.store, {});
    expect(r.failed).toBe(1);
    expect(failing.events.has("msg:w1")).toBe(false);
  });

  it("delivery statuses update the stored message", async () => {
    const m = memoryStore();
    await processWhatsAppEvents([msg("w1")], m.store, {});
    const status: WhatsAppEvent = { kind: "status", key: "status:w1:read", messageId: "w1", status: "READ", error: null, at: new Date() };
    await processWhatsAppEvents([status], m.store, {});
    expect(m.messages.get("w1")?.status).toBe("READ");
  });

  it("mock messages are flagged as mock contacts", async () => {
    const m = memoryStore();
    await processWhatsAppEvents([msg("mock1", "999555")], m.store, {}, { isMock: true });
    expect(m.contacts.get("999555")?.isMock).toBe(true);
  });
});
