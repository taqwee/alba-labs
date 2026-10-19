import "server-only";
import { serverEnv } from "@/lib/env";
import { getWhatsAppMode } from "./config";
import { sendTemplateMessage, sendTextMessage } from "./client";
import { replyWindow } from "./window";

export interface OutboundTarget { waId: string; isMock: boolean; lastInboundAt: string | null }
export type DispatchOutcome =
  | { ok: true; externalId: string; via: "live" | "mock"; usedTemplate: boolean }
  | { ok: false; reason: "WHATSAPP_OFF" | "TEMPLATE_REQUIRED" | "SEND_FAILED"; message: string };

/**
 * Decides HOW an outbound WhatsApp message leaves the system.
 * Safety rules:
 *  - a mock contact is NEVER sent through Meta, even in live mode;
 *  - a real contact is NEVER handled by the mock provider;
 *  - outside the 24h window only an approved template can be sent.
 */
export async function dispatchWhatsApp(target: OutboundTarget, text: string): Promise<DispatchOutcome> {
  const mode = getWhatsAppMode();

  if (target.isMock) {
    if (mode !== "mock") {
      return { ok: false, reason: "WHATSAPP_OFF", message: "This is a simulated contact and mock mode is not enabled." };
    }
    return { ok: true, externalId: `mock.${crypto.randomUUID()}`, via: "mock", usedTemplate: false };
  }

  if (mode !== "live") {
    return { ok: false, reason: "WHATSAPP_OFF", message: "WhatsApp is not connected, so this message cannot be delivered." };
  }

  const env = serverEnv();
  const window = replyWindow(target.lastInboundAt);
  try {
    if (window.mode === "FREE_FORM") {
      return { ok: true, externalId: await sendTextMessage(target.waId, text), via: "live", usedTemplate: false };
    }
    if (!env.whatsappTemplate) {
      return {
        ok: false, reason: "TEMPLATE_REQUIRED",
        message: "The 24-hour reply window has closed. WhatsApp only allows an approved template message now, and no template is configured.",
      };
    }
    return {
      ok: true, externalId: await sendTemplateMessage(target.waId, env.whatsappTemplate, env.whatsappTemplateLang),
      via: "live", usedTemplate: true,
    };
  } catch {
    return { ok: false, reason: "SEND_FAILED", message: "WhatsApp could not deliver this message." };
  }
}
