import { serverEnv } from "@/lib/env";

export type WhatsAppMode = "off" | "mock" | "live";

export function hasLiveCredentials(): boolean {
  const e = serverEnv();
  return Boolean(e.whatsappAccessToken && e.whatsappPhoneNumberId && e.whatsappVerifyToken && e.metaAppSecret);
}

/**
 * off  – no WhatsApp features (default without credentials)
 * mock – simulated; nothing ever leaves the server
 * live – official Meta WhatsApp Cloud API
 */
export function getWhatsAppMode(): WhatsAppMode {
  const requested = serverEnv().whatsappMode;
  if (requested === "mock") return "mock";
  if (requested === "off") return "off";
  return hasLiveCredentials() ? "live" : "off";
}

/** Safe-to-display status (never returns secret values). */
export function getWhatsAppStatus() {
  const e = serverEnv();
  return {
    mode: getWhatsAppMode(),
    variables: [
      { name: "WHATSAPP_ACCESS_TOKEN", set: Boolean(e.whatsappAccessToken) },
      { name: "WHATSAPP_PHONE_NUMBER_ID", set: Boolean(e.whatsappPhoneNumberId) },
      { name: "WHATSAPP_BUSINESS_ACCOUNT_ID", set: Boolean(e.whatsappBusinessAccountId) },
      { name: "WHATSAPP_VERIFY_TOKEN", set: Boolean(e.whatsappVerifyToken) },
      { name: "META_APP_SECRET", set: Boolean(e.metaAppSecret) },
      { name: "WHATSAPP_REENGAGEMENT_TEMPLATE", set: Boolean(e.whatsappTemplate) },
    ],
  };
}
