import { z } from "zod";

// Only the parts of Meta's payload we rely on; everything else is ignored.
const messageSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  timestamp: z.string().optional(),
  type: z.string().default("unknown"),
  text: z.object({ body: z.string() }).optional(),
  button: z.object({ text: z.string().optional() }).optional(),
  interactive: z.object({
    button_reply: z.object({ title: z.string().optional() }).optional(),
    list_reply: z.object({ title: z.string().optional() }).optional(),
  }).optional(),
  image: z.object({ caption: z.string().optional() }).optional(),
  document: z.object({ caption: z.string().optional(), filename: z.string().optional() }).optional(),
  location: z.object({ name: z.string().optional() }).optional(),
});

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: z.string().optional(),
  errors: z.array(z.object({ code: z.number().optional(), title: z.string().optional(), message: z.string().optional() })).optional(),
});

export const webhookPayloadSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(z.object({
    changes: z.array(z.object({
      field: z.string().optional(),
      value: z.object({
        contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string().optional() }).optional() })).optional(),
        messages: z.array(messageSchema).optional(),
        statuses: z.array(statusSchema).optional(),
      }),
    })),
  })),
});
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

export interface InboundMessageEvent {
  kind: "message";
  key: string;
  waId: string;
  profileName: string | null;
  messageId: string;
  messageType: string;
  text: string;
  at: Date;
}
export interface StatusEvent {
  kind: "status";
  key: string;
  messageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  error: string | null;
  at: Date;
}
export type WhatsAppEvent = InboundMessageEvent | StatusEvent;

const toDate = (ts?: string) => (ts && /^\d+$/.test(ts) ? new Date(Number(ts) * 1000) : new Date());

function describeMessage(m: z.infer<typeof messageSchema>): string {
  if (m.type === "text") return m.text?.body ?? "";
  if (m.type === "button") return m.button?.text ?? "[button]";
  if (m.type === "interactive")
    return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "[interactive reply]";
  if (m.type === "image") return m.image?.caption ? `[image] ${m.image.caption}` : "[image]";
  if (m.type === "document") return `[document] ${m.document?.filename ?? m.document?.caption ?? ""}`.trim();
  if (m.type === "location") return `[location] ${m.location?.name ?? ""}`.trim();
  return `[${m.type} message]`;
}

/** Flattens a validated payload into individual, idempotency-keyed events. */
export function extractEvents(payload: WebhookPayload): WhatsAppEvent[] {
  const events: WhatsAppEvent[] = [];
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const names = new Map((change.value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? null]));
      for (const m of change.value.messages ?? []) {
        events.push({
          kind: "message", key: `msg:${m.id}`, waId: m.from, profileName: names.get(m.from) ?? null,
          messageId: m.id, messageType: m.type, text: describeMessage(m), at: toDate(m.timestamp),
        });
      }
      for (const s of change.value.statuses ?? []) {
        const error = s.errors?.[0];
        events.push({
          kind: "status", key: `status:${s.id}:${s.status}`, messageId: s.id,
          status: s.status.toUpperCase() as StatusEvent["status"],
          error: error ? [error.code, error.title ?? error.message].filter(Boolean).join(" ") : null,
          at: toDate(s.timestamp),
        });
      }
    }
  }
  return events;
}
