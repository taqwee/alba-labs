import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv, isServiceRoleConfigured } from "@/lib/env";
import { hasLiveCredentials } from "@/lib/whatsapp/config";
import { verifyMetaSignature } from "@/lib/whatsapp/signature";
import { extractEvents, webhookPayloadSchema } from "@/lib/whatsapp/parse";
import { processWhatsAppEvents } from "@/lib/whatsapp/processor";
import { createSupabaseWhatsAppStore } from "@/lib/whatsapp/supabase-store";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Meta webhook verification handshake. */
export async function GET(request: NextRequest) {
  const { whatsappVerifyToken } = serverEnv();
  if (!whatsappVerifyToken) return new NextResponse("WhatsApp is not configured", { status: 503 });

  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token") ?? "";
  const challenge = params.get("hub.challenge") ?? "";

  if (mode === "subscribe" && safeEqual(token, whatsappVerifyToken) && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** Incoming messages and delivery statuses. */
export async function POST(request: NextRequest) {
  if (!hasLiveCredentials() || !isServiceRoleConfigured()) {
    return new NextResponse("WhatsApp is not configured", { status: 503 });
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return new NextResponse("Payload too large", { status: 413 });

  // 1. Authenticate: HMAC of the raw body with the app secret.
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), serverEnv().metaAppSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // 2. Validate shape.
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return new NextResponse("Invalid JSON", { status: 400 }); }
  const parsed = webhookPayloadSchema.safeParse(json);
  if (!parsed.success) return new NextResponse("Unsupported payload", { status: 400 });

  // 3. Process idempotently.
  try {
    const store = createSupabaseWhatsAppStore(createAdminSupabase());
    const result = await processWhatsAppEvents(extractEvents(parsed.data), store, json);
    // Non-2xx makes Meta retry only the events whose claim was released.
    return NextResponse.json({ ok: result.failed === 0, ...result }, { status: result.failed > 0 ? 500 : 200 });
  } catch (error) {
    console.error("[whatsapp] webhook error", error instanceof Error ? error.message : error);
    return new NextResponse("Server error", { status: 500 });
  }
}
