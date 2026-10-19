import { serverEnv } from "@/lib/env";

export class WhatsAppApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "WhatsAppApiError"; }
}

/** Removes anything that is not a digit (Meta expects digits, no "+"). */
export function normalizeWaId(input: string): string {
  return input.replace(/\D/g, "");
}

async function post(body: Record<string, unknown>): Promise<string> {
  const env = serverEnv();
  const url = `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.whatsappAccessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...body }),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[]; error?: { message?: string; code?: number };
  };
  if (!res.ok || !json.messages?.[0]?.id) {
    // Log details server-side only. The caller gets a generic error.
    console.error("[whatsapp] send failed", res.status, json.error?.code, json.error?.message);
    throw new WhatsAppApiError(json.error?.message ?? "WhatsApp send failed", res.status);
  }
  return json.messages[0].id;
}

/** Free-form text — only valid inside the 24h window. Returns the WhatsApp message id. */
export function sendTextMessage(to: string, text: string): Promise<string> {
  return post({ to: normalizeWaId(to), type: "text", text: { body: text, preview_url: false } });
}

/** Approved template — required to start/re-open a conversation outside the window. */
export function sendTemplateMessage(to: string, template: string, language: string): Promise<string> {
  return post({ to: normalizeWaId(to), type: "template", template: { name: template, language: { code: language } } });
}
