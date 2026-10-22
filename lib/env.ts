/**
 * Central, crash-proof environment access.
 * Nothing here throws when a variable is missing — features degrade instead.
 * Server-only values must only be read from server code (never import
 * `serverEnv` in a "use client" file).
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://alba-labs-two.vercel.app/").replace(/\/+$/, ""),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    whatsappMode: (process.env.WHATSAPP_MODE ?? "").toLowerCase(),
    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "",
    whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    metaAppSecret: process.env.META_APP_SECRET ?? "",
    whatsappTemplate: process.env.WHATSAPP_REENGAGEMENT_TEMPLATE ?? "",
    whatsappTemplateLang: process.env.WHATSAPP_REENGAGEMENT_TEMPLATE_LANG ?? "en",
    whatsappApiVersion: process.env.WHATSAPP_API_VERSION ?? "v21.0",
  };
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && serverEnv().serviceRoleKey);
}

export const SITE_NAME = "Alba Labs";
