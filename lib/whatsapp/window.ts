/**
 * WhatsApp customer-service window: free-form replies are only allowed within
 * 24 hours of the customer's last inbound message. After that Meta requires an
 * approved message template.
 */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ReplyMode = "FREE_FORM" | "TEMPLATE_REQUIRED";

export function replyWindow(lastInboundAt: string | Date | null | undefined, now: Date = new Date()) {
  if (!lastInboundAt) return { mode: "TEMPLATE_REQUIRED" as ReplyMode, expiresAt: null };
  const expiresAt = new Date(new Date(lastInboundAt).getTime() + REPLY_WINDOW_MS);
  return { mode: (expiresAt > now ? "FREE_FORM" : "TEMPLATE_REQUIRED") as ReplyMode, expiresAt };
}
